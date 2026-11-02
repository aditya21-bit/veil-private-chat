"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  AlertIcon,
  ChevronUpIcon,
  CloseIcon,
  FilmIcon,
  LinkIcon,
  PauseIcon,
  PlayIcon,
  RefreshIcon,
  Spinner,
} from "@/components/icons";
import type { WatchEvent } from "@/lib/chat-types";
import { cn } from "@/lib/cn";
import { parseYouTubeVideoId } from "@/lib/youtube";

/* -------------------------------------------------------------------------- */
/* YouTube IFrame API                                                          */
/* -------------------------------------------------------------------------- */

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getPlayerState: () => number;
  destroy: () => void;
};

type YTConstructor = new (
  element: HTMLElement,
  options: {
    videoId: string;
    host?: string;
    playerVars?: Record<string, string | number>;
    events?: {
      onReady?: () => void;
      onStateChange?: (event: { data: number }) => void;
      onError?: (event: { data: number }) => void;
    };
  },
) => YTPlayer;

declare global {
  interface Window {
    YT?: { Player: YTConstructor };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no_window"));
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<void>((resolve, reject) => {
    let settled = false;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      window.clearInterval(poll);
      if (error) {
        apiPromise = null;
        reject(error);
      } else {
        resolve();
      }
    };

    // The script can silently never call onYouTubeIframeAPIReady (blocked by
    // an extension, a proxy, or a flaky network), so poll and time out.
    const timeout = window.setTimeout(() => finish(new Error("yt_timeout")), 12_000);
    const poll = window.setInterval(() => {
      if (window.YT?.Player) finish();
    }, 200);

    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try {
        previous?.();
      } catch {
        // Another callback failed; ours still needs to run.
      }
      finish();
    };

    if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      script.remove();
      finish(new Error("yt_load_failed"));
    };
    document.head.appendChild(script);
  });

  return apiPromise;
}

/* -------------------------------------------------------------------------- */
/* Panel                                                                      */
/* -------------------------------------------------------------------------- */

/** Seconds of playback applied to remote events to cover relay latency. */
const REMOTE_BUFFER = 0.35;
/** How far the local cursor may drift before we treat it as a seek. */
const SEEK_THRESHOLD = 3;
/** Ignore player events triggered by our own remote-apply calls. */
const SUPPRESS_MS = 1800;

function playerErrorCopy(code: number | null): string {
  switch (code) {
    case 2:
      return "The video link didn't look right. Paste the full YouTube URL and try again.";
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

export function WatchPanel({
  state,
  myClientId,
  peerName,
  onStart,
  onChange,
  onEnd,
  onHide,
}: {
  state: WatchEvent | null;
  myClientId: string;
  peerName: string;
  onStart: (videoId: string) => void;
  onChange: (update: { videoId: string; playing: boolean; position: number }) => void;
  onEnd: () => void;
  onHide: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [inputError, setInputError] = useState("");
  const [apiState, setApiState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [needsTap, setNeedsTap] = useState(false);
  const [playerError, setPlayerError] = useState(false);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const stateRef = useRef<WatchEvent | null>(state);
  const onChangeRef = useRef(onChange);
  const baselineRef = useRef<{ position: number; playing: boolean; at: number } | null>(null);
  const suppressUntilRef = useRef(0);
  const tapTimerRef = useRef<number | undefined>(undefined);
  const lastHeartbeatRef = useRef(0);

  stateRef.current = state;
  onChangeRef.current = onChange;

  const videoId = state?.videoId ?? null;

  /* Make sure the iframe API is fetched only when we actually need it. */
  useEffect(() => {
    if (!videoId) {
      setApiState("idle");
      return;
    }

    let cancelled = false;
    setApiState((current) => (current === "ready" ? current : "loading"));

    loadYouTubeApi()
      .then(() => {
        if (!cancelled) setApiState("ready");
      })
      .catch(() => {
        if (!cancelled) setApiState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [videoId, retryKey]);

  const reportLocal = useCallback((playing: boolean, position: number) => {
    const current = stateRef.current;
    if (!current) return;
    baselineRef.current = { position, playing, at: Date.now() };
    onChangeRef.current({
      videoId: current.videoId,
      playing,
      position: Math.max(0, position),
    });
  }, []);

  /* Apply a partner's playhead to this browser. */
  const applyRemote = useCallback((next: WatchEvent | null, force = false) => {
    const player = playerRef.current;
    if (!next || !player) return;

    const now = Date.now();
    const target = Math.max(0, next.position + (next.playing ? REMOTE_BUFFER : 0));
    suppressUntilRef.current = now + SUPPRESS_MS;

    if (force || Math.abs(player.getCurrentTime() - target) > 1.2) {
      player.seekTo(target, true);
    }
    if (next.playing) player.playVideo();
    else player.pauseVideo();

    baselineRef.current = { position: target, playing: next.playing, at: now };

    window.clearTimeout(tapTimerRef.current);
    if (next.playing) {
      setNeedsTap(false);
      tapTimerRef.current = window.setTimeout(() => {
        const active = playerRef.current;
        if (!active) return;
        try {
          const state = active.getPlayerState();
          if (state !== 1 && state !== 3) setNeedsTap(true);
        } catch {
          setNeedsTap(true);
        }
      }, 3600);
    } else {
      setNeedsTap(false);
    }
  }, []);

  /* Mount / replace the player whenever the video changes. */
  useEffect(() => {
    const host = mountRef.current;
    if (apiState !== "ready" || !videoId || !host) return;

    const YT = window.YT;
    if (!YT?.Player) return;

    setPlayerError(false);
    setErrorCode(null);
    setNeedsTap(false);

    const mount = document.createElement("div");
    mount.className = "h-full w-full";
    host.replaceChildren(mount);

    const player = new YT.Player(mount, {
      videoId,
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
          playerRef.current = player;
          applyRemote(stateRef.current, true);
        },
        onStateChange: (event) => {
          if (Date.now() < suppressUntilRef.current) return;
          const active = playerRef.current;
          if (!active) return;

          if (event.data === 1) reportLocal(true, active.getCurrentTime());
          else if (event.data === 2) reportLocal(false, active.getCurrentTime());
          else if (event.data === 0) reportLocal(false, 0);
        },
        onError: (event) => {
          setPlayerError(true);
          setErrorCode(typeof event?.data === "number" ? event.data : null);
        },
      },
    });

    playerRef.current = player;

    return () => {
      window.clearTimeout(tapTimerRef.current);
      playerRef.current = null;
      baselineRef.current = null;
      try {
        player.destroy();
      } catch {
        // The iframe may already be gone.
      }
      host.replaceChildren();
    };
  }, [apiState, videoId, applyRemote, reportLocal, retryKey]);

  /* React to remote state; local echoes only refresh our baseline. */
  useEffect(() => {
    if (!state) return;

    if (state.updatedBy === myClientId) {
      baselineRef.current = {
        position: state.position,
        playing: state.playing,
        at: Date.now(),
      };
      return;
    }

    applyRemote(state);
  }, [state, myClientId, applyRemote]);

  /* Catch seeks and play/pause taps made inside the YouTube iframe. */
  useEffect(() => {
    if (!videoId) return;

    const interval = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      if (Date.now() < suppressUntilRef.current) return;

      let ytState: number;
      let actual: number;
      try {
        ytState = player.getPlayerState();
        actual = player.getCurrentTime();
      } catch {
        // The iframe was torn down between the timer firing and this call.
        return;
      }
      if (ytState === 3 || ytState === -1 || ytState === 5) return;

      const baseline = baselineRef.current;
      const playingNow = ytState === 1;

      if (!baseline) {
        baselineRef.current = { position: actual, playing: playingNow, at: Date.now() };
        return;
      }

      if (playingNow && baseline.playing) {
        const elapsed = (Date.now() - baseline.at) / 1000;
        if (Math.abs(actual - (baseline.position + elapsed)) > SEEK_THRESHOLD) {
          reportLocal(true, actual);
          return;
        }

        // Whoever touched playback last acts as the leader and emits a slow
        // heartbeat so the follower can recover from buffering drift.
        if (
          stateRef.current?.updatedBy === myClientId &&
          Date.now() - lastHeartbeatRef.current > 8000
        ) {
          lastHeartbeatRef.current = Date.now();
          reportLocal(true, actual);
        }
      } else if (!playingNow && !baseline.playing) {
        if (Math.abs(actual - baseline.position) > 1.5) {
          reportLocal(false, actual);
        }
      } else {
        reportLocal(playingNow, actual);
      }
    }, 1200);

    return () => window.clearInterval(interval);
  }, [videoId, reportLocal, myClientId]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = parseYouTubeVideoId(draft);
    if (!id) {
      setInputError("Paste a YouTube video link or an 11-character video id.");
      return;
    }
    setInputError("");
    setDraft("");
    onStart(id);
  }

  function joinPlayback() {
    const player = playerRef.current;
    if (!player || !state) return;
    const target = state.position + REMOTE_BUFFER;
    player.seekTo(target, true);
    player.playVideo();
    baselineRef.current = { position: target, playing: true, at: Date.now() };
    suppressUntilRef.current = Date.now() + 600;
    setNeedsTap(false);
  }

  /** Reliable play/pause that does not depend on the YouTube iframe chrome. */
  function togglePlayback() {
    const player = playerRef.current;
    if (!player || !state) return;

    try {
      if (state.playing) {
        player.pauseVideo();
        reportLocal(false, player.getCurrentTime());
      } else {
        player.seekTo(state.position, true);
        player.playVideo();
        reportLocal(true, state.position);
        setNeedsTap(false);
      }
    } catch {
      // The iframe was torn down between render and click.
    }
  }

  function retryPlayer() {
    setPlayerError(false);
    setErrorCode(null);
    setNeedsTap(false);
    if (apiState === "error") setApiState("loading");
    setRetryKey((key) => key + 1);
  }

  const watchedUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : "";

  return (
    <section
      aria-label="Watch together"
      className="relative z-10 shrink-0 border-b border-violet-900/10 bg-gradient-to-b from-violet-50/70 to-white/20 dark:border-white/10 dark:from-violet-500/[0.06] dark:to-transparent"
    >
      <div className="flex items-center gap-2.5 px-3 py-2 sm:px-5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-fuchsia-600 text-white shadow-md shadow-fuchsia-500/20">
          <FilmIcon className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[12.5px] font-semibold tracking-tight text-slate-900 dark:text-white">
            Watch together
            <span className="hidden items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.12em] text-rose-600 sm:inline-flex dark:text-rose-300">
              YouTube
            </span>
          </p>
          <p className="truncate text-[10.5px] text-slate-500 dark:text-violet-100/45">
            {state
              ? `In sync with ${peerName || "your guest"} · either of you can pause or seek`
              : "Paste a link and both screens follow the same playhead"}
          </p>
        </div>

        {state && (
          <button
            type="button"
            onClick={togglePlayback}
            aria-label={state.playing ? "Pause for both" : "Play for both"}
            title={state.playing ? "Pause for both" : "Play for both"}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 text-[11.5px] font-semibold text-emerald-700 transition hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:border-emerald-400/25 dark:text-emerald-300"
          >
            {state.playing ? (
              <PauseIcon className="h-3.5 w-3.5" />
            ) : (
              <PlayIcon className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">{state.playing ? "Pause" : "Play"}</span>
          </button>
        )}

        {state && (
          <a
            href={watchedUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open this video on YouTube"
            title="Open on YouTube"
            className="hidden h-8 w-8 place-items-center rounded-full text-slate-500 transition hover:bg-violet-900/5 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 sm:grid dark:text-violet-100/50 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <LinkIcon className="h-4 w-4" />
          </a>
        )}

        {state && (
          <button
            type="button"
            onClick={onEnd}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-violet-900/10 bg-white/70 px-2.5 text-[11.5px] font-semibold text-slate-600 transition hover:border-rose-300/60 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 dark:border-white/10 dark:bg-white/5 dark:text-violet-100/70 dark:hover:border-rose-400/40 dark:hover:text-rose-300"
          >
            <CloseIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">End</span>
          </button>
        )}

        <button
          type="button"
          onClick={onHide}
          aria-label="Hide the video panel"
          className="grid h-8 w-8 place-items-center rounded-full text-slate-500 transition hover:bg-violet-900/5 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 dark:text-violet-100/50 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <ChevronUpIcon className="h-4 w-4" />
        </button>
      </div>

      {!state ? (
        <form onSubmit={submit} className="px-3 pb-3 sm:px-5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-violet-900/10 bg-white/80 px-3 py-1.5 focus-within:border-violet-400/50 focus-within:ring-2 focus-within:ring-violet-500/15 dark:border-white/10 dark:bg-white/[0.05]">
              <LinkIcon className="h-4 w-4 shrink-0 text-violet-400" />
              <input
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  if (inputError) setInputError("");
                }}
                placeholder="https://youtube.com/watch?v=…"
                aria-label="YouTube video link"
                className="min-w-0 flex-1 bg-transparent py-1.5 text-[12.5px] text-slate-800 outline-none placeholder:text-slate-400 dark:text-violet-50 dark:placeholder:text-violet-100/30"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-fuchsia-600 px-4 text-[12.5px] font-semibold text-white shadow-lg shadow-fuchsia-600/20 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50"
            >
              <PlayIcon className="h-4 w-4" />
              Start watching
            </button>
          </div>
          <p
            className={cn(
              "mt-1.5 text-[10.5px] leading-relaxed",
              inputError
                ? "text-rose-500 dark:text-rose-300"
                : "text-slate-400 dark:text-violet-100/35",
            )}
          >
            {inputError ||
              "Only videos the creator allows to be embedded will play. The link is never stored on the server — only the video id is relayed."}
          </p>
        </form>
      ) : (
        <div className="px-3 pb-3 sm:px-5">
          <div className="relative mx-auto aspect-video w-full max-w-[72dvh] overflow-hidden rounded-xl bg-black shadow-lg shadow-violet-950/20 ring-1 ring-black/10 dark:ring-white/10">
            <div ref={mountRef} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" />

            {apiState === "error" && (
              <>
                {/* The JS API failed (blocked script or strict privacy mode).
                    A plain embed still plays; only frame-perfect sync is lost. */}
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`}
                  title="YouTube player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-2">
                  <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/75 px-3 py-1 text-[10px] font-medium text-violet-100/85 backdrop-blur">
                    Playing without sync
                    <button
                      type="button"
                      onClick={retryPlayer}
                      className="rounded-full bg-white/15 px-2 py-0.5 font-semibold text-white transition hover:bg-white/25"
                    >
                      Retry sync
                    </button>
                  </div>
                </div>
              </>
            )}

            {(apiState === "loading" || apiState === "idle") && !playerError && (
              <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#120f24] to-[#05040c] text-violet-200">
                <div className="flex flex-col items-center gap-2">
                  <Spinner className="h-6 w-6" />
                  <span className="text-[11px] font-medium">Loading the projector…</span>
                </div>
              </div>
            )}

            {playerError && (
              <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#1a1024] to-[#05040c] px-6 text-center">
                <div className="max-w-xs">
                  <AlertIcon className="mx-auto h-6 w-6 text-amber-300" />
                  <p className="mt-2 text-[12px] font-semibold text-white">
                    This video can&apos;t be played here
                  </p>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-violet-200/60">
                    {playerErrorCopy(errorCode)}
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={retryPlayer}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[11px] font-semibold text-slate-900 transition hover:bg-white/90"
                    >
                      <RefreshIcon className="h-3.5 w-3.5" />
                      Reload player
                    </button>
                    <a
                      href={watchedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/10 px-3 text-[11px] font-semibold text-white transition hover:bg-white/20"
                    >
                      Open on YouTube
                    </a>
                  </div>
                </div>
              </div>
            )}

            {needsTap && !playerError && apiState === "ready" && (
              <div className="absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-[2px]">
                <button
                  type="button"
                  onClick={joinPlayback}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[12.5px] font-semibold text-slate-900 shadow-xl transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <PlayIcon className="h-4 w-4" />
                  Tap to join playback
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
