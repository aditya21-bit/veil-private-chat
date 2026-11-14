"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AlertIcon,
  ChevronUpIcon,
  CloseIcon,
  FilmIcon,
  LinkIcon,
  PauseIcon,
  PlayIcon,
  RefreshIcon,
} from "@/components/icons";
import {
  DailymotionStage,
  EmbedStage,
  NativeVideoStage,
  VimeoStage,
  YouTubeStage,
  type PlayerAdapter,
} from "@/components/chat/watch-stages";
import type { WatchEvent } from "@/lib/chat-types";
import { cn } from "@/lib/cn";
import {
  parseVideoSource,
  parseVideoSourceString,
  serializeVideoSource,
  videoSourceLabel,
  videoSourcePageUrl,
  type VideoSource,
} from "@/lib/video";

/** Seconds of playback applied to remote events to cover relay latency. */
const REMOTE_BUFFER = 0.35;
/** How far the local cursor may drift before we treat it as a seek. */
const SEEK_THRESHOLD = 3;
/** Ignore player events triggered by our own remote-apply calls. */
const SUPPRESS_MS = 1800;

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
  onStart: (source: string) => void;
  onChange: (update: { source: string; playing: boolean; position: number }) => void;
  onEnd: () => void;
  onHide: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [inputError, setInputError] = useState("");
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [needsTap, setNeedsTap] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const playerRef = useRef<PlayerAdapter | null>(null);
  const stateRef = useRef<WatchEvent | null>(state);
  const onChangeRef = useRef(onChange);
  const baselineRef = useRef<{ position: number; playing: boolean; at: number } | null>(null);
  const suppressUntilRef = useRef(0);
  const tapTimerRef = useRef<number | undefined>(undefined);
  const lastHeartbeatRef = useRef(0);

  stateRef.current = state;
  onChangeRef.current = onChange;

  const sourceKey = state?.source ?? null;
  const source = useMemo<VideoSource | null>(
    () => (sourceKey ? parseVideoSourceString(sourceKey) : null),
    [sourceKey],
  );

  const reportLocal = useCallback((playing: boolean, position: number) => {
    const current = stateRef.current;
    if (!current) return;
    baselineRef.current = { position, playing, at: Date.now() };
    onChangeRef.current({
      source: current.source,
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

    try {
      if (force || Math.abs(player.currentTime() - target) > 1.2) {
        player.seek(target);
      }
      if (next.playing) player.play();
      else player.pause();
    } catch {
      // The player may have been torn down between render and this call.
    }

    baselineRef.current = { position: target, playing: next.playing, at: now };

    window.clearTimeout(tapTimerRef.current);
    if (next.playing) {
      setNeedsTap(false);
      tapTimerRef.current = window.setTimeout(() => {
        const active = playerRef.current;
        if (!active) return;
        try {
          const current = active.playerState();
          if (current !== 1 && current !== 3) setNeedsTap(true);
        } catch {
          setNeedsTap(true);
        }
      }, 3600);
    } else {
      setNeedsTap(false);
    }
  }, []);

  const handleReady = useCallback(
    (adapter: PlayerAdapter | null) => {
      playerRef.current = adapter;
      baselineRef.current = null;

      if (!adapter) {
        window.clearTimeout(tapTimerRef.current);
        setNeedsTap(false);
        return;
      }

      suppressUntilRef.current = Date.now() + 300;
      applyRemote(stateRef.current, true);
    },
    [applyRemote],
  );

  const handleLocal = useCallback(
    (playing: boolean, position: number) => {
      if (Date.now() < suppressUntilRef.current) return;
      reportLocal(playing, position);
    },
    [reportLocal],
  );

  const handleError = useCallback((message: string) => {
    setPlayerError(message);
    playerRef.current = null;
    window.clearTimeout(tapTimerRef.current);
    setNeedsTap(false);
  }, []);

  const retryPlayer = useCallback(() => {
    setPlayerError(null);
    setNeedsTap(false);
    playerRef.current = null;
    baselineRef.current = null;
    setRetryKey((key) => key + 1);
  }, []);

  useEffect(() => {
    return () => window.clearTimeout(tapTimerRef.current);
  }, []);

  /* A new video should never inherit the previous player's error overlay. */
  useEffect(() => {
    setPlayerError(null);
    setNeedsTap(false);
    baselineRef.current = null;
  }, [sourceKey]);

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

  /* Catch seeks and play/pause taps made inside the player. */
  useEffect(() => {
    if (!sourceKey) return;

    const interval = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      if (Date.now() < suppressUntilRef.current) return;

      let playerState: number;
      let actual: number;
      try {
        playerState = player.playerState();
        actual = player.currentTime();
      } catch {
        // The player was torn down between the timer firing and this call.
        return;
      }
      if (playerState === 3 || playerState === -1 || playerState === 5) return;

      const baseline = baselineRef.current;
      const playingNow = playerState === 1;

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
  }, [sourceKey, reportLocal, myClientId]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseVideoSource(draft);
    if (!parsed) {
      setInputError(
        "Paste a video link from YouTube, Vimeo, Dailymotion, or a direct MP4/WebM URL.",
      );
      return;
    }
    setInputError("");
    setDraft("");
    onStart(serializeVideoSource(parsed));
  }

  function joinPlayback() {
    const player = playerRef.current;
    if (!player || !state) return;
    const target = state.position + REMOTE_BUFFER;
    try {
      player.seek(target);
      player.play();
    } catch {
      // The player was torn down between render and click.
    }
    baselineRef.current = { position: target, playing: true, at: Date.now() };
    suppressUntilRef.current = Date.now() + 600;
    setNeedsTap(false);
  }

  /** Reliable play/pause that does not depend on the provider's chrome. */
  function togglePlayback() {
    const player = playerRef.current;
    if (!player || !state) return;

    try {
      if (state.playing) {
        player.pause();
        reportLocal(false, player.currentTime());
      } else {
        player.seek(state.position);
        player.play();
        reportLocal(true, state.position);
        setNeedsTap(false);
      }
    } catch {
      // The player was torn down between render and click.
    }
  }

  const watchedUrl = source ? videoSourcePageUrl(source) : "";
  const stageKey = `${sourceKey ?? "none"}:${retryKey}`;
  const stageProps = {
    onReady: handleReady,
    onLocal: handleLocal,
    onError: handleError,
    onRetry: retryPlayer,
  };

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
              {source ? videoSourceLabel(source) : "Video"}
            </span>
          </p>
          <p className="truncate text-[10.5px] text-slate-500 dark:text-violet-100/45">
            {state
              ? source?.kind === "embed"
                ? `Playing in an embedded frame${peerName ? ` with ${peerName}` : ""} · sync isn't available`
                : `In sync with ${peerName || "your guest"} · either of you can pause or seek`
              : "Paste a link and both screens follow the same playhead"}
          </p>
        </div>

        {state && source?.kind !== "embed" && (
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
            aria-label="Open this video in a new tab"
            title="Open video"
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
                placeholder="Paste a video link (YouTube, Vimeo, MP4…)"
                aria-label="Video link"
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
              "YouTube, Vimeo, Dailymotion and direct MP4/WebM links stay in sync. Other sites can still play in an embedded frame."}
          </p>
        </form>
      ) : (
        <div className="px-3 pb-3 sm:px-5">
          <div className="relative mx-auto aspect-video w-full max-w-[72dvh] overflow-hidden rounded-xl bg-black shadow-lg shadow-violet-950/20 ring-1 ring-black/10 dark:ring-white/10">
            {source?.kind === "youtube" && (
              <YouTubeStage key={stageKey} source={source} {...stageProps} />
            )}
            {source?.kind === "file" && (
              <NativeVideoStage key={stageKey} source={source} {...stageProps} />
            )}
            {source?.kind === "vimeo" && (
              <VimeoStage key={stageKey} source={source} {...stageProps} />
            )}
            {source?.kind === "dailymotion" && (
              <DailymotionStage key={stageKey} source={source} {...stageProps} />
            )}
            {source?.kind === "embed" && (
              <EmbedStage key={stageKey} source={source} {...stageProps} />
            )}

            {!source && (
              <div className="absolute inset-0 z-20 grid place-items-center bg-gradient-to-br from-[#1a1024] to-[#05040c] px-6 text-center">
                <div className="max-w-xs">
                  <AlertIcon className="mx-auto h-6 w-6 text-amber-300" />
                  <p className="mt-2 text-[12px] font-semibold text-white">
                    This video link couldn&apos;t be opened
                  </p>
                  <button
                    type="button"
                    onClick={onEnd}
                    className="mt-3 inline-flex h-8 items-center rounded-full bg-white px-3 text-[11px] font-semibold text-slate-900 transition hover:bg-white/90"
                  >
                    End video
                  </button>
                </div>
              </div>
            )}

            {playerError && (
              <div className="absolute inset-0 z-20 grid place-items-center bg-gradient-to-br from-[#1a1024] to-[#05040c] px-6 text-center">
                <div className="max-w-xs">
                  <AlertIcon className="mx-auto h-6 w-6 text-amber-300" />
                  <p className="mt-2 text-[12px] font-semibold text-white">
                    This video can&apos;t be played here
                  </p>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-violet-200/60">
                    {playerError}
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
                      Open video
                    </a>
                  </div>
                </div>
              </div>
            )}

            {needsTap && !playerError && (
              <div className="absolute inset-0 z-20 grid place-items-center bg-black/55 backdrop-blur-[2px]">
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
