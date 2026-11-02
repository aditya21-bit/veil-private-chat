"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import {
  CheckIcon,
  CloseIcon,
  CopyIcon,
  FilmIcon,
  FingerprintIcon,
  KeyIcon,
  LinkIcon,
  LockIcon,
  LogOutIcon,
  ShareIcon,
  ShieldIcon,
  TimerIcon,
  UsersIcon,
} from "@/components/icons";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/cn";

export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);

    const focusTimer = window.setTimeout(() => {
      const target = panelRef.current?.querySelector<HTMLElement>(
        "[data-autofocus], button, input, a[href]",
      );
      target?.focus();
    }, 40);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div
        aria-hidden
        onClick={onClose}
        className="animate-backdrop-in absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="animate-pop-in relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[1.75rem] border border-violet-900/10 bg-[#fbfaff] shadow-2xl shadow-violet-950/25 sm:rounded-[1.75rem] dark:border-white/10 dark:bg-[#0d0a1c] dark:shadow-black/60"
      >
        <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-slate-300 sm:hidden dark:bg-white/15" />

        <div className="flex items-start gap-3 px-5 pb-3 pt-4 sm:px-6 sm:pt-5">
          {icon}
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="text-[16px] font-semibold tracking-tight text-slate-900 dark:text-white"
            >
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-[12.5px] leading-relaxed text-slate-500 dark:text-violet-100/50">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-violet-900/5 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 dark:text-violet-100/40 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="chat-scroll overflow-y-auto px-5 pb-5 sm:px-6">{children}</div>

        {footer && (
          <div className="border-t border-violet-900/10 bg-white/50 px-5 py-3.5 sm:px-6 dark:border-white/10 dark:bg-white/[0.02]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function InviteDialog({
  open,
  onClose,
  inviteUrl,
  roomId,
  participants,
}: {
  open: boolean;
  onClose: () => void;
  inviteUrl: string;
  roomId: string;
  participants: number;
}) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setCanShare(true);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setCopyFailed(false);
    }
  }, [open]);

  async function handleCopy() {
    const ok = await copyText(inviteUrl);
    setCopied(ok);
    setCopyFailed(!ok);
    if (!ok) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }

  async function handleShare() {
    if (canShare) {
      try {
        await navigator.share({
          title: "Join my private Veil room",
          text: "This link holds the key to our encrypted room. Keep it between us.",
          url: inviteUrl,
        });
        return;
      } catch {
        // The user dismissed the share sheet — fall through to copy.
      }
    }
    await handleCopy();
  }

  const full = participants >= 2;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invite your person"
      description={
        full
          ? "Both seats are taken. This room is closed to anyone else."
          : "Send this link to the one person you want in the room. It is also the key."
      }
      icon={
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/25">
          <LinkIcon className="h-5 w-5" />
        </span>
      }
      footer={
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleCopy}
            data-autofocus
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-[13px] font-semibold text-white shadow-lg shadow-fuchsia-600/20 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50"
          >
            {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
            {copied ? "Link copied" : copyFailed ? "Select the link" : "Copy invite link"}
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-violet-900/10 bg-white px-4 text-[13px] font-semibold text-slate-700 transition hover:border-violet-400/40 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 dark:border-white/10 dark:bg-white/5 dark:text-violet-100/80 dark:hover:border-white/20 dark:hover:text-white"
          >
            <ShareIcon className="h-4 w-4" />
            Share
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor="veil-invite-url"
            className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-violet-100/35"
          >
            Secret invite link
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-violet-900/10 bg-white p-1.5 pl-3 dark:border-white/10 dark:bg-white/[0.04]">
            <LockIcon className="h-4 w-4 shrink-0 text-emerald-500" />
            <input
              id="veil-invite-url"
              ref={inputRef}
              readOnly
              value={inviteUrl}
              onFocus={(event) => event.currentTarget.select()}
              className="min-w-0 flex-1 truncate bg-transparent font-mono text-[11px] text-slate-600 outline-none dark:text-violet-100/60"
            />
          </div>
          <p className="mt-1.5 text-[10.5px] text-slate-400 dark:text-violet-100/35">
            Room <span className="font-mono">{roomId}</span> · {Math.max(1, participants)}/2 seats filled
          </p>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-amber-700 dark:text-amber-200/80">
            <KeyIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              The text after <span className="font-mono">#</span> is the encryption
              key. Anyone who has it can join this room, so share it over a channel
              you trust.
            </span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-violet-900/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <UsersIcon className="h-4 w-4 text-violet-500 dark:text-violet-300" />
            <p className="mt-1.5 text-[12px] font-semibold text-slate-800 dark:text-white">
              Exactly two
            </p>
            <p className="text-[10.5px] text-slate-400 dark:text-violet-100/35">
              A third visitor is turned away
            </p>
          </div>
          <div className="rounded-xl border border-violet-900/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <TimerIcon className="h-4 w-4 text-violet-500 dark:text-violet-300" />
            <p className="mt-1.5 text-[12px] font-semibold text-slate-800 dark:text-white">
              Memory only
            </p>
            <p className="text-[10.5px] text-slate-400 dark:text-violet-100/35">
              Nothing is written to disk
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function SecurityDialog({
  open,
  onClose,
  fingerprint,
  roomId,
  participants,
  encryptedCount,
  undecryptableCount,
}: {
  open: boolean;
  onClose: () => void;
  fingerprint: string;
  roomId: string;
  participants: number;
  encryptedCount: number;
  undecryptableCount: number;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="This room is sealed"
      description="Verify the safety code with your guest, then compare what the server can see."
      icon={
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/25">
          <ShieldIcon className="h-5 w-5" />
        </span>
      }
      footer={
        <a
          href="/"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 text-[13px] font-semibold text-rose-600 transition hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 dark:text-rose-300"
        >
          <LogOutIcon className="h-4 w-4" />
          Leave this room
        </a>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-violet-900/10 bg-white/70 p-4 text-center dark:border-white/10 dark:bg-white/[0.04]">
          <p className="flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-violet-100/35">
            <FingerprintIcon className="h-3.5 w-3.5" />
            Safety code
          </p>
          <p className="mt-2 font-mono text-[19px] font-semibold tracking-[0.18em] text-slate-900 sm:text-[21px] dark:text-white">
            {fingerprint}
          </p>
          <p className="mt-1.5 text-[10.5px] text-slate-400 dark:text-violet-100/35">
            Compare this with your guest&apos;s screen. If it matches, nobody is in
            the middle.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-violet-900/10 bg-white/50 px-3.5 py-3 text-[12px] dark:border-white/10 dark:bg-white/[0.03]">
          <span className="text-slate-500 dark:text-violet-100/45">Room</span>
          <span className="font-mono font-medium text-slate-800 dark:text-violet-100/80">
            {roomId}
          </span>
        </div>

        <dl className="space-y-2.5 text-[12px]">
          {[
            {
              icon: LockIcon,
              label: "Transport",
              value: "AES-256-GCM, sealed on this device",
              tone: "text-emerald-500",
            },
            {
              icon: UsersIcon,
              label: "Occupancy",
              value: `${Math.max(1, participants)} of 2 seats filled`,
              tone: "text-violet-500 dark:text-violet-300",
            },
            {
              icon: FilmIcon,
              label: "Watch-along",
              value: "Video id + playhead only, never the link",
              tone: "text-rose-500 dark:text-rose-300",
            },
            {
              icon: TimerIcon,
              label: "Retention",
              value: "Server memory only; pruned automatically",
              tone: "text-violet-500 dark:text-violet-300",
            },
            {
              icon: KeyIcon,
              label: "Key location",
              value: "URL #fragment — never sent to us",
              tone: "text-fuchsia-500 dark:text-fuchsia-300",
            },
          ].map((row) => (
            <div key={row.label} className="flex items-start gap-2.5">
              <row.icon className={cn("mt-0.5 h-4 w-4 shrink-0", row.tone)} />
              <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
                <dt className="shrink-0 text-slate-500 dark:text-violet-100/45">{row.label}</dt>
                <dd className="text-right text-slate-800 dark:text-violet-100/75">{row.value}</dd>
              </div>
            </div>
          ))}
        </dl>

        <div className="rounded-xl border border-violet-900/10 bg-white/50 px-3.5 py-3 text-[11px] leading-relaxed text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-violet-100/40">
          <span className="font-semibold text-slate-700 dark:text-violet-100/70">
            {encryptedCount} sealed message{encryptedCount === 1 ? "" : "s"}
          </span>{" "}
          relayed in this session.
          {undecryptableCount > 0 && (
            <span className="mt-1 block text-amber-600 dark:text-amber-300">
              {undecryptableCount} message{undecryptableCount === 1 ? "" : "s"} could
              not be decoded — you may be using a different invite link.
            </span>
          )}
        </div>
      </div>
    </Modal>
  );
}
