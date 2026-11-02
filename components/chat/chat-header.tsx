"use client";

import {
  ArrowLeftIcon,
  FilmIcon,
  InfoIcon,
  LockIcon,
  PhoneIcon,
  ShareIcon,
} from "@/components/icons";
import { Avatar } from "@/components/chat/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import type { ConnectionState } from "@/lib/chat-types";
import { cn } from "@/lib/cn";

export function ChatHeader({
  peerName,
  participants,
  status,
  watchActive,
  callActive,
  onInvite,
  onInfo,
  onWatch,
  onCall,
}: {
  peerName: string;
  participants: number;
  status: ConnectionState;
  watchActive: boolean;
  callActive: boolean;
  onInvite: () => void;
  onInfo: () => void;
  onWatch: () => void;
  onCall: () => void;
}) {
  const online = status === "online";
  const connected = online && participants >= 2;

  const subtitle = !online
    ? status === "reconnecting"
      ? "Reconnecting…"
      : status === "connecting"
        ? "Opening a secure channel…"
        : "Offline — check your connection"
    : connected
      ? `${peerName || "Your guest"} is here`
      : "Waiting for your guest to join";

  return (
    <header className="relative z-20 flex items-center gap-3 border-b border-violet-900/10 bg-white/70 px-3 py-2.5 backdrop-blur-xl sm:px-5 sm:py-3 dark:border-white/10 dark:bg-[#0a0818]/80">
      <a
        href="/"
        aria-label="Leave room and go home"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-violet-900/5 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 dark:text-violet-100/50 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <ArrowLeftIcon className="h-[18px] w-[18px]" />
      </a>

      <div className="relative shrink-0">
        <Avatar name={peerName || "Veil"} className="h-10 w-10 text-[13px]" />
        <span className="absolute -bottom-0.5 -right-0.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-white dark:bg-[#0a0818]">
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              connected
                ? "animate-live bg-emerald-500"
                : online
                  ? "bg-amber-400"
                  : status === "reconnecting"
                    ? "bg-amber-400"
                    : "bg-slate-400",
            )}
          />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[14px] font-semibold tracking-tight text-slate-900 dark:text-white">
            {connected && peerName ? peerName : "Private room"}
          </p>
          <span className="hidden shrink-0 items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-emerald-700 sm:inline-flex dark:text-emerald-300">
            <LockIcon className="h-2.5 w-2.5" />
            E2EE
          </span>
        </div>
        <p
          className={cn(
            "truncate text-[11.5px] font-medium",
            connected
              ? "text-emerald-600 dark:text-emerald-400"
              : online
                ? "text-amber-600 dark:text-amber-300"
                : "text-slate-500 dark:text-violet-100/45",
          )}
          aria-live="polite"
        >
          {subtitle}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onWatch}
          aria-label={watchActive ? "Return to watch together" : "Watch together on YouTube"}
          title="Watch together"
          className={cn(
            "relative inline-flex h-9 items-center gap-1.5 rounded-full border px-2.5 text-[12.5px] font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/40 sm:px-3",
            watchActive
              ? "border-rose-400/40 bg-gradient-to-r from-rose-500/15 to-fuchsia-500/15 text-rose-600 dark:border-rose-400/30 dark:text-rose-300"
              : "border-violet-900/10 bg-white/70 text-violet-700 hover:border-violet-400/40 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-violet-200 dark:hover:border-white/20 dark:hover:bg-white/10",
          )}
        >
          <FilmIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Watch</span>
          {watchActive && (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#0a0818]" />
          )}
        </button>

        <button
          type="button"
          onClick={onCall}
          aria-label={callActive ? "Return to video call" : "Start a video call"}
          title="Video call"
          className={cn(
            "relative inline-flex h-9 items-center gap-1.5 rounded-full border px-2.5 text-[12.5px] font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 sm:px-3",
            callActive
              ? "border-emerald-400/40 bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 text-emerald-600 dark:border-emerald-400/30 dark:text-emerald-300"
              : "border-violet-900/10 bg-white/70 text-cyan-700 hover:border-cyan-400/40 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-cyan-200 dark:hover:border-white/20 dark:hover:bg-white/10",
          )}
        >
          <PhoneIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Call</span>
          {callActive && (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-live rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0a0818]" />
          )}
        </button>

        <button
          type="button"
          onClick={onInvite}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-violet-900/10 bg-white/70 px-2.5 text-[12.5px] font-semibold text-violet-700 shadow-sm transition hover:border-violet-400/40 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 sm:px-3.5 dark:border-white/10 dark:bg-white/5 dark:text-violet-200 dark:hover:border-white/20 dark:hover:bg-white/10"
          aria-label="Invite your guest"
        >
          <ShareIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Invite</span>
        </button>

        <button
          type="button"
          onClick={onInfo}
          aria-label="Room security details"
          className="grid h-9 w-9 place-items-center rounded-full border border-violet-900/10 bg-white/70 text-slate-500 shadow-sm transition hover:border-violet-400/40 hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 dark:border-white/10 dark:bg-white/5 dark:text-violet-100/60 dark:hover:border-white/20 dark:hover:text-white"
        >
          <InfoIcon className="h-4 w-4" />
        </button>

        <ThemeToggle className="h-9 w-9 border-violet-900/10 bg-white/70 text-slate-500 shadow-sm hover:text-slate-900 dark:bg-white/5 dark:text-violet-100/60 dark:hover:text-white [&_svg]:h-4 [&_svg]:w-4" />
      </div>
    </header>
  );
}
