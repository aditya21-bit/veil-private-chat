"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { Spinner } from "@/components/icons";

/* -------------------------------------------------------------------------- */
/* Shared adapter                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The sync loop in WatchPanel only needs these five operations. Every player
 * (YouTube, native <video>, Vimeo, Dailymotion) is wrapped in this shape so
 * play/pause/seek/position behave the same everywhere.
 */
export type PlayerAdapter = {
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  /** Last known playhead, in seconds. */
  currentTime(): number;
  /** 1 = playing, 2 = paused, 3 = buffering, 0 = ended, -1 = unstarted. */
  playerState(): number;
};

type CommonStageProps = {
  onReady: (adapter: PlayerAdapter | null) => void;
  onLocal: (playing: boolean, position: number) => void;
  onError: (message: string) => void;
  onRetry: () => void;
};

type Callbacks = Pick<CommonStageProps, "onReady" | "onLocal" | "onError">;

type YouTubeSource = { kind: "youtube"; id: string };
type VimeoSource = { kind: "vimeo"; id: string; hash?: string };
type DailymotionSource = { kind: "dailymotion"; id: string };
type NativeSource = { kind: "file"; url: string };
type EmbedSource = { kind: "embed"; url: string };

/* -------------------------------------------------------------------------- */
/* Third-party globals                                                        */
/* -------------------------------------------------------------------------- */

type YTPlayerLike = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  destroy(): void;
};

type YTConstructor = new (
  element: HTMLElement,
  options: {
    videoId: string;
    playerVars?: Record<string, string | number>;
    events?: {
      onReady?: () => void;
      onStateChange?: (event: { data: number }) => void;
      onError?: (event: { data: number }) => void;
    };
  },
) => YTPlayerLike;

type VimeoPlayerLike = {
  ready(): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  setCurrentTime(seconds: number): Promise<number>;
  destroy(): Promise<void>;
  on(event: string, callback: (data?: { seconds?: number }) => void): void;
};

type VimeoConstructor = new (
  element: HTMLIFrameElement,
  options?: Record<string, unknown>,
) => VimeoPlayerLike;

type DailymotionPlayerLike = {
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  currentTime: number;
  paused: boolean;
  addEventListener(event: string, callback: () => void): void;
  destroy?(): void;
};

type DailymotionConstructor = new (
  element: HTMLElement,
  options: { video: string; params?: Record<string, string | number> },
) => DailymotionPlayerLike;

declare global {
  interface Window {
    YT?: { Player: YTConstructor };
    Vimeo?: { Player: VimeoConstructor };
    DM?: { player: DailymotionConstructor };
  }
}

/* -------------------------------------------------------------------------- */
/* Script loader                                                              */
/* -------------------------------------------------------------------------- */

const SCRIPT_TIMEOUT_MS = 12_000;

function loadScript(src: string, ready: () => boolean): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no_window"));
  if (ready()) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    let settled = false;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      window.clearInterval(poll);
      if (error) reject(error);
      else resolve();
    };

    const timeout = window.setTimeout(() => finish(new Error("timeout")), SCRIPT_TIMEOUT_MS);
    const poll = window.setInterval(() => {
      if (ready()) finish();
    }, 200);

    if (document.querySelector(`script[src="${src}"]`)) return;

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      if (ready()) finish();
    };
    script.onerror = () => {
      script.remove();
      finish(new Error("load_failed"));
    };
    document.head.appendChild(script);
  });
}

function withTimeout<T>(promise: Promise<T>, ms = SCRIPT_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/* -------------------------------------------------------------------------- */
/* Shared UI                                                                  */
/* -------------------------------------------------------------------------- */

function LoadingOverlay({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-gradient-to-br from-[#120f24] to-[#05040c] text-violet-200">
      <div className="flex flex-col items-center gap-2">
        <Spinner className="h-6 w-6" />
        <span className="text-[11px] font-medium">{label}</span>
      </div>
    </div>
  );
}

function NoSyncNote({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-2">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/75 px-3 py-1 text-[10px] font-medium text-violet-100/85 backdrop-blur">
        {children}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full bg-white/15 px-2 py-0.5 font-semibold text-white transition hover:bg-white/25"
          >
            Retry sync
          </button>
        )}
      </div>
    </div>
  );
}

function useCallbacks(onReady: CommonStageProps["onReady"], onLocal: CommonStageProps["onLocal"], onError: CommonStageProps["onError"]) {
  const callbacks = useRef<Callbacks>({ onReady, onLocal, onError });
  callbacks.current = { onReady, onLocal, onError };
  return callbacks;
}

/* -------------------------------------------------------------------------- */
/* YouTube                                                                    */
/* -------------------------------------------------------------------------- */

function youtubeErrorCopy(code: number): string {
  switch (code) {
    case 2:
      return "That YouTube link didn't look right. Paste the full URL and try again.";
    case 5:
      return "YouTube's player couldn't start in this browser. Reload the player or try another video.";
    case 100:
      return "This video is private, removed, or unavailable in your region.";
    case 101:
    case 150:
      return "The creator disabled embedding, so this one can only be watched on YouTube itself.";
    default:
      return "The creator may have blocked embedding, or YouTube's player didn't load. Reload it or open the video on YouTube.";
  }
}

export function YouTubeStage({
  source,
  onReady,
  onLocal,
  onError,
  onRetry,
}: CommonStageProps & { source: YouTubeSource }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerLike | null>(null);
  const callbacks = useCallbacks(onReady, onLocal, onError);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");

  useEffect(() => {
    let disposed = false;
    setStatus("loading");

    loadScript("https://www.youtube.com/iframe_api", () => Boolean(window.YT?.Player))
      .then(() => {
        if (disposed) return;
        const host = hostRef.current;
        const YT = window.YT;
        if (!host || !YT?.Player) return;

        const mount = document.createElement("div");
        mount.className = "h-full w-full";
        host.replaceChildren(mount);

        const player = new YT.Player(mount, {
          videoId: source.id,
          playerVars: {
            autoplay: 1,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (disposed) return;
              playerRef.current = player;
              setStatus("ready");
              callbacks.current.onReady({
                play: () => player.playVideo(),
                pause: () => player.pauseVideo(),
                seek: (seconds) => player.seekTo(seconds, true),
                currentTime: () => player.getCurrentTime(),
                playerState: () => player.getPlayerState(),
              });
            },
            onStateChange: (event) => {
              if (disposed) return;
              const active = playerRef.current;
              if (!active) return;
              try {
                if (event.data === 1) callbacks.current.onLocal(true, active.getCurrentTime());
                else if (event.data === 2) callbacks.current.onLocal(false, active.getCurrentTime());
                else if (event.data === 0) callbacks.current.onLocal(false, 0);
              } catch {
                // The iframe was torn down between the event and this call.
              }
            },
            onError: (event) => {
              if (disposed) return;
              callbacks.current.onError(youtubeErrorCopy(event.data));
            },
          },
        });

        playerRef.current = player;
      })
      .catch(() => {
        if (disposed) return;
        // A plain embed still plays; only frame-perfect sync is lost.
        hostRef.current?.replaceChildren();
        setStatus("fallback");
        callbacks.current.onReady(null);
      });

    return () => {
      disposed = true;
      const player = playerRef.current;
      playerRef.current = null;
      callbacks.current.onReady(null);
      try {
        player?.destroy();
      } catch {
        // The iframe may already be gone.
      }
      hostRef.current?.replaceChildren();
    };
    // The stage is remounted (keyed by source + retry) instead of patched.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.id]);

  return (
    <>
      <div ref={hostRef} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" />

      {status === "loading" && <LoadingOverlay label="Loading the projector…" />}

      {status === "fallback" && (
        <>
          <iframe
            src={`https://www.youtube.com/embed/${source.id}?rel=0&modestbranding=1&playsinline=1`}
            title="YouTube player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
          <NoSyncNote onRetry={onRetry}>Playing without sync</NoSyncNote>
        </>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Native <video> (MP4, WebM, Ogg, HLS where the browser supports it)         */
/* -------------------------------------------------------------------------- */

function nativeErrorCopy(code: number | undefined): string {
  switch (code) {
    case 1:
      return "Playback was interrupted. Try again.";
    case 2:
      return "The video couldn't be downloaded from that link.";
    case 3:
      return "The video file looks corrupted or is only partially available.";
    case 4:
      return "This browser can't play that video format. Try an MP4 or WebM link.";
    default:
      return "That link didn't load as a playable video file.";
  }
}

export function NativeVideoStage({
  source,
  onReady,
  onLocal,
  onError,
}: CommonStageProps & { source: NativeSource }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const callbacks = useCallbacks(onReady, onLocal, onError);
  const [status, setStatus] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let ready = false;

    const adapter: PlayerAdapter = {
      play: () => {
        const promise = video.play();
        if (promise) promise.catch(() => {});
      },
      pause: () => video.pause(),
      seek: (seconds) => {
        try {
          video.currentTime = Math.max(0, seconds);
        } catch {
          // Metadata may not be loaded yet.
        }
      },
      currentTime: () => (Number.isFinite(video.currentTime) ? video.currentTime : 0),
      playerState: () => {
        if (video.ended) return 0;
        if (video.paused) return 2;
        if (video.seeking) return 3;
        return 1;
      },
    };

    const markReady = () => {
      if (ready) return;
      ready = true;
      setStatus("ready");
      callbacks.current.onReady(adapter);
    };

    const handlePlay = () => callbacks.current.onLocal(true, video.currentTime);
    const handlePause = () => {
      if (!video.ended) callbacks.current.onLocal(false, video.currentTime);
    };
    const handleEnded = () => callbacks.current.onLocal(false, 0);
    const handleSeeked = () => callbacks.current.onLocal(!video.paused, video.currentTime);
    const handleError = () => callbacks.current.onError(nativeErrorCopy(video.error?.code));

    video.addEventListener("loadedmetadata", markReady);
    video.addEventListener("canplay", markReady);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("error", handleError);

    return () => {
      ready = false;
      callbacks.current.onReady(null);
      video.removeEventListener("loadedmetadata", markReady);
      video.removeEventListener("canplay", markReady);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("error", handleError);
    };
  }, []);

  return (
    <>
      <video
        ref={videoRef}
        src={source.url}
        controls
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full bg-black"
      />
      {status === "loading" && <LoadingOverlay label="Loading the video…" />}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Vimeo                                                                      */
/* -------------------------------------------------------------------------- */

function vimeoEmbedUrl(source: VimeoSource): string {
  const hash = source.hash ? `&h=${source.hash}` : "";
  return `https://player.vimeo.com/video/${source.id}?autoplay=1&title=0&byline=0&portrait=0&dnt=1${hash}`;
}

export function VimeoStage({
  source,
  onReady,
  onLocal,
  onError,
  onRetry,
}: CommonStageProps & { source: VimeoSource }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<VimeoPlayerLike | null>(null);
  const callbacks = useCallbacks(onReady, onLocal, onError);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");

  useEffect(() => {
    let disposed = false;
    setStatus("loading");

    loadScript("https://player.vimeo.com/api/player.js", () => Boolean(window.Vimeo?.Player))
      .then(async () => {
        if (disposed) return;
        const host = hostRef.current;
        const Vimeo = window.Vimeo;
        if (!host || !Vimeo?.Player) return;

        const iframe = document.createElement("iframe");
        iframe.src = vimeoEmbedUrl(source);
        iframe.title = "Vimeo player";
        iframe.allow = "autoplay; fullscreen; picture-in-picture; clipboard-write";
        iframe.allowFullscreen = true;
        iframe.className = "h-full w-full";
        host.replaceChildren(iframe);

        const player = new Vimeo.Player(iframe);
        playerRef.current = player;

        let current = 0;
        let playing = false;
        let buffering = false;

        const adapter: PlayerAdapter = {
          play: () => {
            void player.play().catch(() => {});
          },
          pause: () => {
            void player.pause().catch(() => {});
          },
          seek: (seconds) => {
            current = Math.max(0, seconds);
            void player.setCurrentTime(current).catch(() => {});
          },
          currentTime: () => current,
          playerState: () => (buffering ? 3 : playing ? 1 : 2),
        };

        player.on("timeupdate", (data) => {
          if (typeof data?.seconds === "number") current = data.seconds;
        });
        player.on("play", () => {
          playing = true;
          callbacks.current.onLocal(true, current);
        });
        player.on("pause", () => {
          playing = false;
          callbacks.current.onLocal(false, current);
        });
        player.on("seeking", (data) => {
          if (typeof data?.seconds === "number") current = data.seconds;
        });
        player.on("seeked", (data) => {
          if (typeof data?.seconds === "number") current = data.seconds;
          callbacks.current.onLocal(playing, current);
        });
        player.on("ended", () => {
          playing = false;
          callbacks.current.onLocal(false, 0);
        });
        player.on("bufferstart", () => {
          buffering = true;
        });
        player.on("bufferend", () => {
          buffering = false;
        });
        player.on("error", () => {
          callbacks.current.onError(
            "Vimeo couldn't play that video. It may be private or block embedding.",
          );
        });

        await withTimeout(player.ready());
        if (disposed) return;
        setStatus("ready");
        callbacks.current.onReady(adapter);
      })
      .catch(() => {
        if (disposed) return;
        hostRef.current?.replaceChildren();
        setStatus("fallback");
        callbacks.current.onReady(null);
      });

    return () => {
      disposed = true;
      callbacks.current.onReady(null);
      const player = playerRef.current;
      playerRef.current = null;
      try {
        void player?.destroy().catch(() => {});
      } catch {
        // The iframe may already be gone.
      }
      hostRef.current?.replaceChildren();
    };
    // Keyed remount handles source changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.id, source.hash]);

  return (
    <>
      <div ref={hostRef} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" />

      {status === "loading" && <LoadingOverlay label="Loading the Vimeo player…" />}

      {status === "fallback" && (
        <>
          <iframe
            src={vimeoEmbedUrl(source)}
            title="Vimeo player"
            allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
          <NoSyncNote onRetry={onRetry}>Playing without sync</NoSyncNote>
        </>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Dailymotion                                                                */
/* -------------------------------------------------------------------------- */

function dailymotionEmbedUrl(source: DailymotionSource): string {
  return `https://www.dailymotion.com/embed/video/${source.id}?autoplay=1`;
}

export function DailymotionStage({
  source,
  onReady,
  onLocal,
  onError,
  onRetry,
}: CommonStageProps & { source: DailymotionSource }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<DailymotionPlayerLike | null>(null);
  const callbacks = useCallbacks(onReady, onLocal, onError);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");

  useEffect(() => {
    let disposed = false;
    setStatus("loading");

    loadScript("https://api.dmcdn.net/all.js", () => Boolean(window.DM?.player))
      .then(() => {
        if (disposed) return;
        const host = hostRef.current;
        const DM = window.DM;
        if (!host || !DM?.player) return;

        host.replaceChildren();
        const player = new DM.player(host, {
          video: source.id,
          params: { autoplay: 1, mute: 0 },
        });
        playerRef.current = player;

        let current = 0;
        let playing = false;
        let buffering = false;

        const adapter: PlayerAdapter = {
          play: () => player.play(),
          pause: () => player.pause(),
          seek: (seconds) => {
            current = Math.max(0, seconds);
            player.seek(current);
          },
          currentTime: () => (Number.isFinite(player.currentTime) ? player.currentTime : current),
          playerState: () => (buffering ? 3 : player.paused ? 2 : 1),
        };

        player.addEventListener("apiready", () => {
          if (disposed) return;
          setStatus("ready");
          callbacks.current.onReady(adapter);
        });
        player.addEventListener("timeupdate", () => {
          if (Number.isFinite(player.currentTime)) current = player.currentTime;
        });
        player.addEventListener("play", () => {
          playing = true;
          callbacks.current.onLocal(true, current);
        });
        player.addEventListener("pause", () => {
          playing = false;
          callbacks.current.onLocal(false, current);
        });
        player.addEventListener("seeked", () => {
          if (Number.isFinite(player.currentTime)) current = player.currentTime;
          callbacks.current.onLocal(playing, current);
        });
        player.addEventListener("ended", () => {
          playing = false;
          callbacks.current.onLocal(false, 0);
        });
        player.addEventListener("waiting", () => {
          buffering = true;
        });
        player.addEventListener("playing", () => {
          buffering = false;
        });
        player.addEventListener("error", () => {
          callbacks.current.onError(
            "Dailymotion couldn't play that video. It may be private or block embedding.",
          );
        });
      })
      .catch(() => {
        if (disposed) return;
        hostRef.current?.replaceChildren();
        setStatus("fallback");
        callbacks.current.onReady(null);
      });

    return () => {
      disposed = true;
      callbacks.current.onReady(null);
      const player = playerRef.current;
      playerRef.current = null;
      try {
        player?.destroy?.();
      } catch {
        // The iframe may already be gone.
      }
      hostRef.current?.replaceChildren();
    };
    // Keyed remount handles source changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.id]);

  return (
    <>
      <div ref={hostRef} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" />

      {status === "loading" && <LoadingOverlay label="Loading the Dailymotion player…" />}

      {status === "fallback" && (
        <>
          <iframe
            src={dailymotionEmbedUrl(source)}
            title="Dailymotion player"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
          <NoSyncNote onRetry={onRetry}>Playing without sync</NoSyncNote>
        </>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Generic iframe embed                                                       */
/* -------------------------------------------------------------------------- */

export function EmbedStage({ source, onReady }: CommonStageProps & { source: EmbedSource }) {
  useEffect(() => {
    // Generic embeds expose no playback API, so the panel runs without sync.
    onReady(null);
  }, [onReady]);

  return (
    <>
      <iframe
        src={source.url}
        title="Embedded video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        allowFullScreen
        referrerPolicy="no-referrer"
        className="absolute inset-0 h-full w-full"
      />
      <NoSyncNote>This site plays in its own frame — sync is unavailable.</NoSyncNote>
    </>
  );
}
