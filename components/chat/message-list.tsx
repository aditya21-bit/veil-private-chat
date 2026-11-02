"use client";

import type { RefObject } from "react";

import { Avatar } from "@/components/chat/avatar";
import {
  AlertIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  KeyIcon,
  LockIcon,
  ShareIcon,
  SparklesIcon,
  UsersIcon,
} from "@/components/icons";
import type { ChatMessage } from "@/lib/chat-types";
import { cn } from "@/lib/cn";

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});

function dayKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diff = Math.round((today - target) / 86_400_000);

  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return dayFormatter.format(date);
}

function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (/^https?:\/\//.test(part)) {
          return (
            <a
              key={`${index}-${part.slice(0, 12)}`}
              href={part}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="break-all underline decoration-current/40 underline-offset-2 transition hover:decoration-current"
            >
              {part}
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

function MessageStatus({ message }: { message: ChatMessage }) {
  if (message.status === "pending") {
    return (
      <span className="inline-flex items-center gap-0.5" title="Sending">
        <ClockIcon className="h-3 w-3" />
      </span>
    );
  }
  if (message.status === "failed") {
    return (
      <span className="inline-flex items-center gap-0.5 text-rose-200" title="Not sent">
        <AlertIcon className="h-3 w-3" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5" title="Sealed and sent">
      <CheckIcon className="h-3 w-3" />
    </span>
  );
}

function EmptyState({ onInvite }: { onInvite: () => void }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-12 text-center">
      <div className="relative">
        <div
          aria-hidden
          className="absolute -inset-8 rounded-full bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-cyan-400/20 blur-2xl"
        />
        <div className="relative grid h-20 w-20 place-items-center rounded-[1.6rem] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-white shadow-xl shadow-fuchsia-500/25 ring-1 ring-inset ring-white/30">
          <LockIcon className="h-9 w-9" />
        </div>
        <span className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full border border-white/60 bg-white text-fuchsia-500 shadow-md dark:border-white/10 dark:bg-[#141127]">
          <SparklesIcon className="h-3.5 w-3.5" />
        </span>
      </div>

      <h2 className="mt-6 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
        A quiet room, for now.
      </h2>
      <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-slate-500 dark:text-violet-100/50">
        No messages yet. Invite your person, or just say hello — everything from
        here on is sealed on your device.
      </p>

      <button
        type="button"
        onClick={onInvite}
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 text-[13px] font-semibold text-white shadow-lg shadow-fuchsia-600/20 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/40"
      >
        <ShareIcon className="h-4 w-4" />
        Share the invite link
      </button>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-slate-400 dark:text-violet-100/35">
        <span className="inline-flex items-center gap-1.5">
          <UsersIcon className="h-3.5 w-3.5" />
          Two seats
        </span>
        <span className="h-1 w-1 rounded-full bg-current opacity-40" />
        <span className="inline-flex items-center gap-1.5">
          <LockIcon className="h-3.5 w-3.5" />
          AES-256-GCM
        </span>
        <span className="h-1 w-1 rounded-full bg-current opacity-40" />
        <span className="inline-flex items-center gap-1.5">
          <KeyIcon className="h-3.5 w-3.5" />
          Key stays here
        </span>
      </div>
    </div>
  );
}

export function MessageList({
  messages,
  myClientId,
  peerName,
  typing,
  atBottom,
  unread,
  scrollRef,
  endRef,
  onScroll,
  onJump,
  onInvite,
  onRetry,
}: {
  messages: ChatMessage[];
  myClientId: string;
  peerName: string;
  typing: boolean;
  atBottom: boolean;
  unread: number;
  scrollRef: RefObject<HTMLDivElement | null>;
  endRef: RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  onJump: () => void;
  onInvite: () => void;
  onRetry: (message: ChatMessage) => void;
}) {
  return (
    <div className="relative h-full">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="chat-scroll h-full overflow-y-auto scroll-smooth px-3 pb-4 pt-3 sm:px-6 sm:pt-5"
        role="log"
        aria-live="polite"
        aria-label="Encrypted messages"
      >
        {messages.length === 0 && !typing ? (
          <EmptyState onInvite={onInvite} />
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col">
            {messages.map((message, index) => {
              const previous = index > 0 ? messages[index - 1] : null;
              const next = index < messages.length - 1 ? messages[index + 1] : null;
              const mine = message.clientId === myClientId;
              const newDay = !previous || dayKey(previous.createdAt) !== dayKey(message.createdAt);
              const grouped =
                !newDay &&
                previous !== null &&
                previous.clientId === message.clientId &&
                message.createdAt - previous.createdAt < 5 * 60_000;
              const groupStart = !grouped;
              const groupEnd =
                newDay ||
                next === null ||
                next.clientId !== message.clientId ||
                next.createdAt - message.createdAt >= 5 * 60_000;

              return (
                <div key={message.id}>
                  {newDay && (
                    <div className="sticky top-0 z-10 my-3 flex justify-center">
                      <span className="rounded-full border border-violet-900/5 bg-white/80 px-3 py-1 text-[10.5px] font-medium text-slate-500 shadow-sm backdrop-blur dark:border-white/5 dark:bg-[#141127]/85 dark:text-violet-100/45">
                        {dayLabel(message.createdAt)}
                      </span>
                    </div>
                  )}

                  <div
                    className={cn(
                      "animate-bubble-in flex items-end gap-2",
                      mine ? "justify-end" : "justify-start",
                      groupStart && !newDay ? "mt-3" : groupStart ? "mt-1" : "mt-1",
                    )}
                  >
                    {!mine && (
                      <div className="w-6 shrink-0">
                        {groupEnd ? (
                          <Avatar
                            name={message.sender || "guest"}
                            className="h-6 w-6 text-[9px]"
                          />
                        ) : null}
                      </div>
                    )}

                    <div className={cn("flex max-w-[82%] flex-col sm:max-w-[72%]", mine ? "items-end" : "items-start")}>
                      {!mine && groupStart && (
                        <span className="mb-1 pl-1 text-[10.5px] font-semibold text-violet-600/90 dark:text-violet-300/80">
                          {message.sender || peerName || "Guest"}
                        </span>
                      )}

                      <div
                        className={cn(
                          "relative px-3.5 py-2 text-[13.5px] leading-relaxed shadow-sm sm:text-sm",
                          mine
                            ? "rounded-2xl rounded-br-md bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-600/20"
                            : "rounded-2xl rounded-bl-md border border-violet-900/10 bg-white/90 text-slate-800 dark:border-white/10 dark:bg-white/[0.07] dark:text-violet-50/90",
                          message.status === "failed" && "opacity-80 ring-1 ring-rose-400/60",
                        )}
                      >
                        {message.undecryptable ? (
                          <span className="inline-flex items-center gap-1.5 text-[12px] italic opacity-75">
                            <LockIcon className="h-3.5 w-3.5 shrink-0" />
                            This message couldn&apos;t be opened with this room key.
                          </span>
                        ) : (
                          <p className="whitespace-pre-wrap break-words">
                            <LinkifiedText text={message.text} />
                          </p>
                        )}

                        <span
                          className={cn(
                            "mt-1 flex items-center justify-end gap-1 text-[9.5px] tabular-nums",
                            mine ? "text-white/60" : "text-slate-400 dark:text-violet-100/35",
                          )}
                        >
                          {timeFormatter.format(message.sentAt || message.createdAt)}
                          {mine && <MessageStatus message={message} />}
                        </span>
                      </div>

                      {message.status === "failed" && (
                        <button
                          type="button"
                          onClick={() => onRetry(message)}
                          className="mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-medium text-rose-500 transition hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 dark:text-rose-300"
                        >
                          <AlertIcon className="h-3 w-3" />
                          Not sent · Tap to retry
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {typing && (
              <div className="animate-bubble-in mt-3 flex items-end gap-2">
                <Avatar name={peerName || "guest"} className="h-6 w-6 text-[9px]" />
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-violet-900/10 bg-white/90 px-3.5 py-3 dark:border-white/10 dark:bg-white/[0.07]">
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-violet-500 dark:bg-violet-300" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-violet-500 dark:bg-violet-300" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-violet-500 dark:bg-violet-300" />
                </div>
                <span className="pb-1 text-[10.5px] text-slate-400 dark:text-violet-100/35">
                  {peerName || "Your guest"} is typing
                </span>
              </div>
            )}

            <div ref={endRef} className="h-px w-full" />
          </div>
        )}
      </div>

      {!atBottom && messages.length > 0 && (
        <button
          type="button"
          onClick={onJump}
          className="animate-pop-in absolute bottom-4 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-violet-900/10 bg-white/90 px-3.5 py-2 text-[11.5px] font-semibold text-violet-700 shadow-lg shadow-violet-900/10 backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 dark:border-white/10 dark:bg-[#141127]/90 dark:text-violet-200"
        >
          <ChevronDownIcon className="h-3.5 w-3.5" />
          {unread > 0 ? `${unread} new message${unread === 1 ? "" : "s"}` : "Jump to latest"}
        </button>
      )}
    </div>
  );
}
