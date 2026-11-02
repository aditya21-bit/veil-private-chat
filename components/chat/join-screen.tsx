"use client";

import { useEffect, useId, useState } from "react";

import { Avatar } from "@/components/chat/avatar";
import {
  AlertIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  FingerprintIcon,
  KeyIcon,
  LockIcon,
  LogoMark,
  ShieldIcon,
  Spinner,
  UsersIcon,
} from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/cn";

function ScreenHeader() {
  return (
    <div className="relative z-10 flex w-full max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
      <a href="/" className="flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40">
        <LogoMark className="h-9 w-9" />
        <span className="flex flex-col leading-none">
          <span className="text-[16px] font-semibold tracking-tight text-slate-900 dark:text-white">
            Veil
          </span>
          <span className="mt-0.5 text-[9.5px] font-medium uppercase tracking-[0.18em] text-violet-500/80 dark:text-violet-300/70">
            private chat
          </span>
        </span>
      </a>
      <ThemeToggle />
    </div>
  );
}

function ScreenShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="veil-grid absolute inset-0" />
        <div className="animate-aurora absolute -top-52 left-1/2 h-[36rem] w-[42rem] -translate-x-1/2 rounded-full bg-violet-400/25 blur-3xl dark:bg-violet-600/20" />
        <div className="animate-aurora absolute -bottom-52 -right-32 h-[30rem] w-[30rem] rounded-full bg-fuchsia-300/25 blur-3xl [animation-delay:-7s] dark:bg-fuchsia-600/12" />
        <div className="animate-aurora absolute -bottom-40 -left-32 h-[26rem] w-[26rem] rounded-full bg-cyan-300/30 blur-3xl [animation-delay:-13s] dark:bg-cyan-500/10" />
        <div className="veil-noise absolute inset-0" />
      </div>

      <ScreenHeader />
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-10 pt-2">
        {children}
      </main>
    </div>
  );
}

export function RoomLoading() {
  return (
    <ScreenShell>
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-white shadow-xl shadow-fuchsia-500/25">
          <LockIcon className="h-7 w-7" />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-white">
            Checking your key…
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-violet-100/45">
            Everything happens locally in this browser.
          </p>
        </div>
        <Spinner className="h-5 w-5 text-violet-500" />
      </div>
    </ScreenShell>
  );
}

export function RoomKeyError({ reason }: { reason: "missing" | "unsupported" }) {
  return (
    <ScreenShell>
      <div className="w-full max-w-md rounded-[2rem] border border-violet-900/10 bg-white/80 p-7 text-center shadow-2xl shadow-violet-900/10 backdrop-blur-xl sm:p-9 dark:border-white/10 dark:bg-[#0b0918]/90">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-rose-400 to-orange-500 text-white shadow-xl shadow-rose-500/25">
          <AlertIcon className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
          {reason === "missing" ? "This invite is incomplete" : "Encryption isn't available"}
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-500 dark:text-violet-100/50">
          {reason === "missing"
            ? "The part after the # in the link holds the room key. Ask your host to resend the full invite link."
            : "Veil needs the Web Crypto API, which only runs on HTTPS or localhost in a modern browser."}
        </p>
        <a
          href="/"
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-[13px] font-semibold text-white shadow-lg shadow-fuchsia-600/20 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to safety
        </a>
      </div>
    </ScreenShell>
  );
}

export function JoinScreen({
  roomId,
  fingerprint,
  initialName,
  joining,
  error,
  onJoin,
}: {
  roomId: string;
  fingerprint: string;
  initialName: string;
  joining: boolean;
  error: "full" | "network" | null;
  onJoin: (name: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const inputId = useId();
  const trimmed = name.trim();

  useEffect(() => {
    setName((current) => (current ? current : initialName));
  }, [initialName]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!trimmed || joining) return;
    onJoin(trimmed);
  }

  return (
    <ScreenShell>
      <div className="w-full max-w-md">
        <div className="ring-aurora overflow-hidden rounded-[2rem] shadow-2xl shadow-violet-900/15">
          <div className="bg-white/85 px-5 pb-7 pt-7 backdrop-blur-2xl sm:px-8 sm:pb-8 sm:pt-8 dark:bg-[#0b0918]/92">
            <div className="flex items-start justify-between gap-3">
              <div className="relative">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-white shadow-xl shadow-fuchsia-500/25 ring-1 ring-inset ring-white/25">
                  <LockIcon className="h-6 w-6" />
                </span>
                <span className="absolute -bottom-1.5 -right-1.5 grid h-6 w-6 place-items-center rounded-full border border-white bg-emerald-500 text-white shadow-md dark:border-[#0b0918]">
                  <ShieldIcon className="h-3.5 w-3.5" />
                </span>
              </div>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                <LockIcon className="h-3 w-3" />
                Sealed
              </span>
            </div>

            <h1 className="mt-5 text-[1.6rem] font-semibold leading-tight tracking-[-0.035em] text-slate-900 sm:text-[1.75rem] dark:text-white">
              You&apos;ve been handed a key.
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-500 dark:text-violet-100/50">
              No account, no sign-up. Pick the name your guest will see and step
              into the room. The key arrived in your link and never left this
              browser.
            </p>

            <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-violet-900/10 bg-white/60 px-3.5 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-violet-100/40">
                <FingerprintIcon className="h-4 w-4 text-violet-500 dark:text-violet-300" />
                Safety code
              </span>
              <span className="font-mono text-[11.5px] font-semibold tracking-[0.14em] text-slate-800 dark:text-violet-100/80">
                {fingerprint}
              </span>
            </div>

            {error && (
              <div
                role="alert"
                className={cn(
                  "mt-4 flex items-start gap-2 rounded-xl border p-3 text-[11.5px] leading-relaxed",
                  error === "full"
                    ? "border-amber-500/25 bg-amber-500/5 text-amber-800 dark:text-amber-200/85"
                    : "border-rose-500/25 bg-rose-500/5 text-rose-700 dark:text-rose-300",
                )}
              >
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {error === "full"
                    ? "Both seats in this room are taken. Ask your host for a fresh link, or try again once someone leaves."
                    : "We couldn't reach the room. Check your connection and try again."}
                </span>
              </div>
            )}

            <form onSubmit={submit} className="mt-5">
              <label
                htmlFor={inputId}
                className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-violet-100/35"
              >
                What should we call you?
              </label>
              <div className="flex items-center gap-2.5 rounded-xl border border-violet-900/10 bg-white p-1.5 pl-2 transition focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/10 dark:border-white/10 dark:bg-[#0a0818] dark:focus-within:border-violet-400/60">
                <Avatar name={trimmed || "guest"} className="h-9 w-9 text-[11px]" />
                <input
                  id={inputId}
                  data-autofocus
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value.slice(0, 32))}
                  placeholder="Your first name"
                  maxLength={32}
                  autoComplete="given-name"
                  enterKeyHint="go"
                  className="h-9 min-w-0 flex-1 bg-transparent pr-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-violet-100/25"
                />
                <span className="pr-1.5 text-[10px] tabular-nums text-slate-300 dark:text-violet-100/20">
                  {name.length}/32
                </span>
              </div>

              <button
                type="submit"
                disabled={!trimmed || joining}
                className="group mt-3 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 bg-[length:200%_100%] text-sm font-semibold text-white shadow-lg shadow-fuchsia-600/25 transition-[background-position,transform,box-shadow] duration-300 hover:bg-[position:100%_0] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {joining ? <Spinner className="h-4 w-4" /> : <KeyIcon className="h-[18px] w-[18px]" />}
                {joining ? "Unlocking the room…" : "Enter the room"}
                {!joining && (
                  <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                )}
              </button>
            </form>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10.5px] text-slate-400 dark:text-violet-100/30">
              <span className="inline-flex items-center gap-1.5">
                <UsersIcon className="h-3.5 w-3.5" />
                2 seats
              </span>
              <span className="h-1 w-1 rounded-full bg-current opacity-40" />
              <span className="inline-flex items-center gap-1.5">
                <LockIcon className="h-3.5 w-3.5" />
                AES-256-GCM
              </span>
              <span className="h-1 w-1 rounded-full bg-current opacity-40" />
              <span className="font-mono">room {roomId}</span>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[10.5px] leading-relaxed text-slate-400 dark:text-violet-100/30">
          Your display name is encrypted inside each message. The relay never
          sees it.
        </p>
      </div>
    </ScreenShell>
  );
}
