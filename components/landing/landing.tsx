"use client";

import { useId, useState } from "react";

import {
  AlertIcon,
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  FilmIcon,
  FingerprintIcon,
  KeyIcon,
  LinkIcon,
  LockIcon,
  LogoMark,
  MessageIcon,
  ShieldIcon,
  SparklesIcon,
  Spinner,
  TimerIcon,
  UsersIcon,
  VideoIcon,
  WifiIcon,
} from "@/components/icons";
import { ChatPreview } from "@/components/landing/chat-preview";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/cn";
import { buildInviteUrl, createRoomId, createRoomSecret, parseInvite } from "@/lib/crypto";

const steps = [
  {
    title: "Open a room",
    body: "One tap creates a random room and a 256-bit key that exists only in your browser.",
    icon: LockIcon,
  },
  {
    title: "Send the link",
    body: "The invite carries the key in its #fragment, which browsers never send to a server.",
    icon: LinkIcon,
  },
  {
    title: "Talk freely",
    body: "Messages are sealed on your device, relayed as ciphertext, and opened only by your guest.",
    icon: MessageIcon,
  },
];

const features = [
  {
    title: "Sealed in your browser",
    body: "Every message is encrypted with AES-256-GCM via the Web Crypto API before it leaves your device.",
    icon: ShieldIcon,
    tone: "from-emerald-400 to-teal-500",
  },
  {
    title: "No accounts, ever",
    body: "No email, no phone number, no password. Choose a display name and you are in the room.",
    icon: SparklesIcon,
    tone: "from-violet-500 to-fuchsia-500",
  },
  {
    title: "Exactly two seats",
    body: "A room is capped at two participants. A third visitor is politely turned away at the door.",
    icon: UsersIcon,
    tone: "from-sky-400 to-blue-500",
  },
  {
    title: "Nothing worth leaking",
    body: "The relay keeps opaque ciphertext envelopes in memory only. Restart it and the room is gone.",
    icon: TimerIcon,
    tone: "from-amber-400 to-orange-500",
  },
  {
    title: "Verify in person",
    body: "Compare the eight-byte safety code shown on both screens to rule out a middleman.",
    icon: FingerprintIcon,
    tone: "from-fuchsia-500 to-rose-500",
  },
  {
    title: "Face to face",
    body: "Start a peer-to-peer video or voice call without leaving the room. Camera and mic streams travel straight between your browsers; the relay only carries the handshake.",
    icon: VideoIcon,
    tone: "from-cyan-400 to-blue-500",
  },
  {
    title: "Movie night, synced",
    body: "Share a YouTube link and watch together. Either of you can play, pause or seek — both screens stay on the same frame.",
    icon: FilmIcon,
    tone: "from-rose-500 to-fuchsia-600",
  },
  {
    title: "Made for any screen",
    body: "A mobile-first layout with safe-area support, a thumb-friendly composer and keyboard shortcuts.",
    icon: WifiIcon,
    tone: "from-cyan-400 to-teal-500",
  },
];

export function Landing() {
  const [creating, setCreating] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [invite, setInvite] = useState("");
  const [error, setError] = useState("");
  const inputId = useId();

  function startRoom() {
    if (creating) return;
    setCreating(true);
    // Let the pressed state paint before the navigation.
    window.setTimeout(() => {
      const roomId = createRoomId();
      const secret = createRoomSecret();
      window.location.href = buildInviteUrl(roomId, secret);
    }, 240);
  }

  function submitInvite(event: React.FormEvent) {
    event.preventDefault();
    const parsed = parseInvite(invite);
    if (!parsed) {
      setError("Paste the full invite link — it carries the key that unlocks the room.");
      return;
    }
    setError("");
    window.location.href = `/chat/${parsed.roomId}#k=${parsed.secret}`;
  }

  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="veil-grid absolute inset-0" />
        <div className="animate-aurora absolute -top-56 left-1/2 h-[42rem] w-[52rem] -translate-x-1/2 rounded-full bg-violet-400/25 blur-3xl dark:bg-violet-600/20" />
        <div className="animate-aurora absolute -right-40 top-1/3 h-[30rem] w-[30rem] rounded-full bg-fuchsia-300/25 blur-3xl [animation-delay:-6s] dark:bg-fuchsia-600/12" />
        <div className="animate-aurora absolute -left-40 top-2/3 h-[28rem] w-[28rem] rounded-full bg-cyan-300/30 blur-3xl [animation-delay:-12s] dark:bg-cyan-500/12" />
        <div className="veil-noise absolute inset-0" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
      </div>

      <header className="sticky top-0 z-40 border-b border-transparent bg-[#f7f5ff]/70 backdrop-blur-xl dark:bg-[#060510]/65">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <a
            href="#top"
            className="group flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
          >
            <LogoMark className="h-9 w-9 transition-transform duration-300 group-hover:-rotate-6" />
            <span className="flex flex-col leading-none">
              <span className="text-[17px] font-semibold tracking-tight text-slate-900 dark:text-white">
                Veil
              </span>
              <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-violet-500/80 dark:text-violet-300/70">
                private chat
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-1 text-sm text-slate-600 md:flex dark:text-violet-100/60">
            <a
              href="#how-it-works"
              className="rounded-full px-3.5 py-2 transition hover:bg-violet-900/5 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white"
            >
              How it works
            </a>
            <a
              href="#security"
              className="rounded-full px-3.5 py-2 transition hover:bg-violet-900/5 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white"
            >
              Security
            </a>
            <a
              href="#features"
              className="rounded-full px-3.5 py-2 transition hover:bg-violet-900/5 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white"
            >
              Features
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={startRoom}
              disabled={creating}
              className="hidden h-10 items-center gap-2 rounded-full bg-slate-900 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-70 sm:inline-flex dark:bg-white dark:text-slate-900 dark:hover:bg-violet-50"
            >
              {creating ? <Spinner className="h-4 w-4" /> : <LockIcon className="h-4 w-4" />}
              New room
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="relative z-10">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pb-16 pt-12 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-24 lg:pt-20">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-white/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700 shadow-sm backdrop-blur dark:border-violet-400/20 dark:bg-white/5 dark:text-violet-200">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              End-to-end encrypted
            </span>

            <h1 className="mt-6 text-[2.75rem] font-semibold leading-[0.98] tracking-[-0.045em] text-slate-900 sm:text-6xl lg:text-[4.25rem] dark:text-white">
              A private room
              <br />
              for <span className="text-aurora">exactly two.</span>
            </h1>

            <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-slate-600 sm:text-base dark:text-violet-100/60">
              Spin up an encrypted chat in one tap. Share a single link, skip the
              sign-up, and chat, hop on a video call, or watch a YouTube video
              together. The key never leaves your browser.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={startRoom}
                disabled={creating}
                className="group inline-flex h-13 items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 bg-[length:200%_100%] px-7 text-[15px] font-semibold text-white shadow-xl shadow-fuchsia-600/25 transition-[background-position,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:bg-[position:100%_0] hover:shadow-2xl hover:shadow-fuchsia-600/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f5ff] disabled:cursor-wait disabled:opacity-80 dark:focus-visible:ring-offset-[#060510]"
              >
                {creating ? <Spinner className="h-[18px] w-[18px]" /> : <LockIcon className="h-[18px] w-[18px]" />}
                {creating ? "Opening your room…" : "Create a private room"}
                {!creating && (
                  <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setJoinOpen((open) => !open);
                  setError("");
                }}
                aria-expanded={joinOpen}
                aria-controls={inputId}
                className="inline-flex h-13 items-center justify-center gap-2 rounded-full border border-violet-900/10 bg-white/60 px-6 text-[15px] font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:border-violet-400/40 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 dark:border-white/10 dark:bg-white/5 dark:text-violet-100/80 dark:hover:border-white/20 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <LinkIcon className="h-4 w-4 text-violet-500 dark:text-violet-300" />
                I have an invite
              </button>
            </div>

            {joinOpen && (
              <form
                onSubmit={submitInvite}
                className="animate-pop-in mt-4 max-w-xl rounded-2xl border border-violet-900/10 bg-white/75 p-3 shadow-lg shadow-violet-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
              >
                <label htmlFor={inputId} className="sr-only">
                  Invite link
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <LinkIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-400 dark:text-violet-300/60" />
                    <input
                      id={inputId}
                      type="text"
                      inputMode="url"
                      autoComplete="off"
                      spellCheck={false}
                      value={invite}
                      onChange={(event) => {
                        setInvite(event.target.value);
                        if (error) setError("");
                      }}
                      placeholder="Paste your invite link…"
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? `${inputId}-error` : undefined}
                      className="h-11 w-full rounded-xl border border-violet-900/10 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 dark:border-white/10 dark:bg-[#0a0818] dark:text-white dark:placeholder:text-violet-100/25 dark:focus:border-violet-400/60"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-md shadow-violet-600/20 transition hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
                  >
                    Join room
                    <ArrowRightIcon className="h-4 w-4" />
                  </button>
                </div>
                {error && (
                  <p
                    id={`${inputId}-error`}
                    role="alert"
                    className="mt-2 flex items-start gap-1.5 px-1 text-xs text-rose-600 dark:text-rose-300"
                  >
                    <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0" />
                    {error}
                  </p>
                )}
                <p className="mt-2 px-1 text-[11px] text-slate-500 dark:text-violet-100/40">
                  The key lives after the <span className="font-mono">#</span> in the link
                  and is never sent to the server.
                </p>
              </form>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-xs text-slate-500 dark:text-violet-100/45">
              {[
                { icon: LockIcon, label: "AES-256-GCM" },
                { icon: UsersIcon, label: "Two-person rooms" },
                { icon: ClockIcon, label: "No accounts" },
                { icon: TimerIcon, label: "Memory only" },
              ].map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1.5">
                  <item.icon className="h-3.5 w-3.5 text-violet-500/80 dark:text-violet-300/70" />
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          <div className="animate-fade-up [animation-delay:120ms]">
            <ChatPreview />
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 py-16 sm:px-8 lg:py-24">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">
              Three steps, no friction
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-4xl dark:text-white">
              From link to locked room in seconds.
            </h2>
          </div>

          <div className="relative mt-10 grid gap-4 md:grid-cols-3">
            <div
              aria-hidden
              className="absolute left-[16%] right-[16%] top-[3.4rem] hidden border-t border-dashed border-violet-300/50 md:block dark:border-violet-500/25"
            />
            {steps.map((step, index) => (
              <article
                key={step.title}
                className="group relative rounded-3xl border border-violet-900/10 bg-white/65 p-6 shadow-sm backdrop-blur-xl transition hover:-translate-y-1 hover:border-violet-400/30 hover:shadow-xl hover:shadow-violet-900/5 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/25">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-xs font-medium text-violet-400/80 dark:text-violet-300/50">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-[17px] font-semibold text-slate-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-violet-100/55">
                  {step.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Security */}
        <section id="security" className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 py-16 sm:px-8 lg:py-24">
          <div className="relative overflow-hidden rounded-[2rem] border border-violet-900/10 bg-white/60 shadow-xl shadow-violet-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035]">
            <div
              aria-hidden
              className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl dark:bg-emerald-500/10"
            />
            <div className="grid gap-10 p-7 sm:p-10 lg:grid-cols-2 lg:items-center lg:gap-14">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                  <ShieldIcon className="h-3.5 w-3.5" />
                  Zero-knowledge relay
                </span>
                <h2 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-4xl dark:text-white">
                  Built so we can&apos;t read your messages.
                </h2>
                <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-600 sm:text-[15px] dark:text-violet-100/55">
                  The link&apos;s <span className="font-mono text-[13px]">#fragment</span>{" "}
                  holds a 256-bit key. Browsers never transmit it, so the server
                  only ever holds sealed envelopes it cannot open.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "AES-256-GCM authenticated encryption, generated on-device",
                    "The key is generated fresh for every room and never logged",
                    "Messages live in server memory only, capped and pruned",
                    "A safety code lets you verify there is no middleman",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-violet-100/70">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        <CheckIcon className="h-3.5 w-3.5" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative">
                <div
                  aria-hidden
                  className="absolute -inset-4 rounded-[1.75rem] bg-gradient-to-br from-violet-500/15 via-transparent to-cyan-400/15 blur-2xl"
                />
                <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#0a0818] shadow-2xl shadow-violet-950/30">
                  <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                    <span className="ml-2 font-mono text-[11px] text-violet-200/50">
                      relay.log
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      live
                    </span>
                  </div>
                  <div className="space-y-3 p-4 font-mono text-[11.5px] leading-relaxed sm:p-5">
                    {[
                      { key: "room_id", value: "x7k2m9p4q1", tone: "text-sky-300" },
                      { key: "participants", value: "2", tone: "text-amber-300" },
                      { key: "sender", value: "••••••••", tone: "text-violet-300" },
                      { key: "body", value: "9f3c1b…a71e", tone: "text-fuchsia-300" },
                      { key: "key", value: "never received", tone: "text-emerald-300" },
                    ].map((row) => (
                      <div key={row.key} className="flex items-center justify-between gap-4">
                        <span className="text-violet-200/35">{row.key}</span>
                        <span className={cn("truncate", row.tone)}>{row.value}</span>
                      </div>
                    ))}
                    <div className="border-t border-white/10 pt-3 text-violet-200/30">
                      <span className="text-emerald-300/80">✓</span> nothing readable was
                      stored
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-4 -left-3 hidden items-center gap-2 rounded-xl border border-white/10 bg-[#141127]/95 px-3 py-2 text-[11px] font-semibold text-violet-100 shadow-xl backdrop-blur sm:flex">
                  <CopyIcon className="h-3.5 w-3.5 text-emerald-400" />
                  0 bytes of plaintext
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 py-16 sm:px-8 lg:py-24">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">
                Privacy, by default
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-4xl dark:text-white">
                Small app. Serious guardrails.
              </h2>
            </div>
            <p className="max-w-xs text-sm text-slate-500 dark:text-violet-100/45">
              Everything you need for a short, candid conversation — and nothing
              that follows you afterwards.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="group relative overflow-hidden rounded-3xl border border-violet-900/10 bg-white/65 p-6 shadow-sm backdrop-blur-xl transition hover:-translate-y-1 hover:border-violet-400/30 hover:shadow-xl hover:shadow-violet-900/5 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20"
              >
                <div
                  aria-hidden
                  className={cn(
                    "absolute -right-10 -top-10 h-24 w-24 rounded-full bg-gradient-to-br opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-25",
                    feature.tone,
                  )}
                />
                <span
                  className={cn(
                    "grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white shadow-lg",
                    feature.tone,
                  )}
                >
                  <feature.icon className="h-[18px] w-[18px]" />
                </span>
                <h3 className="mt-4 text-[15px] font-semibold text-slate-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-600 dark:text-violet-100/55">
                  {feature.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto w-full max-w-6xl px-5 pb-20 pt-6 sm:px-8">
          <div className="relative overflow-hidden rounded-[2rem] bg-[#0b0718] px-6 py-14 text-center shadow-2xl shadow-violet-950/30 sm:px-12 sm:py-16">
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="animate-aurora absolute -left-20 -top-24 h-80 w-80 rounded-full bg-violet-600/40 blur-3xl" />
              <div className="animate-aurora absolute -bottom-28 -right-10 h-80 w-80 rounded-full bg-cyan-500/25 blur-3xl [animation-delay:-8s]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#0b0718_95%)]" />
              <div className="veil-noise absolute inset-0" />
            </div>
            <div className="relative">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-200">
                <KeyIcon className="h-3.5 w-3.5" />
                Your key · your room
              </span>
              <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl lg:text-[2.75rem]">
                Two people. One link.
                <br className="hidden sm:block" /> Zero paper trail.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-violet-200/60 sm:text-[15px]">
                No sign-up screens, no inbox to clean up. Open a room, send the
                link, and say what you actually mean.
              </p>
              <button
                type="button"
                onClick={startRoom}
                disabled={creating}
                className="group mt-8 inline-flex h-12 items-center justify-center gap-2.5 rounded-full bg-white px-7 text-sm font-semibold text-slate-900 shadow-xl shadow-black/25 transition hover:-translate-y-0.5 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0718] disabled:opacity-70"
              >
                {creating ? <Spinner className="h-4 w-4" /> : <LockIcon className="h-4 w-4" />}
                {creating ? "Opening your room…" : "Open a private room"}
                <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </button>
              <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-violet-200/35">
                <ShieldIcon className="h-3.5 w-3.5" />
                Encrypted before anything leaves your device
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-violet-900/10 bg-white/40 backdrop-blur dark:border-white/5 dark:bg-white/[0.02]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-5 px-5 py-8 text-xs text-slate-500 sm:flex-row sm:px-8 dark:text-violet-100/40">
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-7 w-7" />
            <span>
              <span className="font-semibold text-slate-800 dark:text-white">Veil</span>{" "}
              · private chat for two
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <span className="inline-flex items-center gap-1.5">
              <ShieldIcon className="h-3.5 w-3.5 text-emerald-500" />
              Web Crypto API
            </span>
            <a href="#how-it-works" className="transition hover:text-slate-900 dark:hover:text-white">
              How it works
            </a>
            <a href="#security" className="transition hover:text-slate-900 dark:hover:text-white">
              Security
            </a>
            <span>© 2026 Veil</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
