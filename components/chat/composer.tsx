"use client";

import { useEffect, useRef, useState } from "react";

import { LockIcon, SendIcon, SmileIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

const EMOJIS = [
  "😀", "😂", "🥹", "😊", "😍", "😎", "🤔", "🙃",
  "😅", "😭", "😤", "🥳", "🤝", "🙏", "👋", "👍",
  "👀", "💜", "🔥", "✨", "🎉", "☕", "🌙", "☀️",
  "💬", "🔒", "🫶", "😴", "🤯", "🫡", "🥂", "🍕",
  "🎵", "🐈", "🌊", "🌸", "⚡", "💯", "🌈", "🕊️",
];

export function Composer({
  disabled,
  onSend,
  onTyping,
  maxLength = 2000,
}: {
  disabled: boolean;
  onSend: (text: string) => void;
  onTyping: () => void;
  maxLength?: number;
}) {
  const [value, setValue] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 132)}px`;
  }, [value]);

  useEffect(() => {
    if (!emojiOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (pickerRef.current?.contains(target)) return;
      setEmojiOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setEmojiOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [emojiOpen]);

  function submit() {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text.slice(0, maxLength));
    setValue("");
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(0, 0);
    });
  }

  function insertEmoji(emoji: string) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const next = `${value.slice(0, start)}${emoji}${value.slice(end)}`.slice(0, maxLength);
    setValue(next);
    onTyping();
    requestAnimationFrame(() => {
      textarea?.focus();
      const cursor = start + emoji.length;
      textarea?.setSelectionRange(cursor, cursor);
    });
  }

  const remaining = maxLength - value.length;

  return (
    <div className="relative z-20 border-t border-violet-900/10 bg-white/75 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-xl sm:px-5 dark:border-white/10 dark:bg-[#0a0818]/85">
      {emojiOpen && (
        <div
          ref={pickerRef}
          className="animate-pop-in absolute bottom-full left-3 right-3 z-30 mb-2 origin-bottom rounded-2xl border border-violet-900/10 bg-white/95 p-2.5 shadow-2xl shadow-violet-900/15 backdrop-blur-xl sm:left-5 sm:right-auto sm:w-[19rem] dark:border-white/10 dark:bg-[#141127]/95 dark:shadow-black/50"
        >
          <p className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-violet-100/35">
            Quick reactions
          </p>
          <div className="grid grid-cols-8 gap-0.5 sm:grid-cols-8">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                aria-label={`Insert ${emoji}`}
                className="grid h-8 w-8 place-items-center rounded-lg text-[17px] transition hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 dark:hover:bg-white/10"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-2xl items-end gap-2">
        <div
          className={cn(
            "flex flex-1 items-end gap-0.5 rounded-[1.6rem] border border-violet-900/10 bg-white/90 px-1.5 py-1.5 shadow-sm transition focus-within:border-violet-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-violet-500/10 dark:border-white/10 dark:bg-white/[0.055] dark:focus-within:border-violet-400/50 dark:focus-within:bg-white/[0.08]",
            disabled && "opacity-70",
          )}
        >
          <button
            type="button"
            onClick={() => setEmojiOpen((open) => !open)}
            disabled={disabled}
            aria-label="Open emoji picker"
            aria-expanded={emojiOpen}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-violet-100 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 disabled:cursor-not-allowed dark:text-violet-100/40 dark:hover:bg-white/10 dark:hover:text-violet-200"
          >
            <SmileIcon className="h-[19px] w-[19px]" />
          </button>

          <label htmlFor="veil-composer" className="sr-only">
            Message
          </label>
          <textarea
            id="veil-composer"
            ref={textareaRef}
            rows={1}
            value={value}
            disabled={disabled}
            onChange={(event) => {
              setValue(event.target.value);
              onTyping();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder={disabled ? "Connecting…" : "Write something private…"}
            maxLength={maxLength}
            className="max-h-[132px] min-h-9 flex-1 resize-none bg-transparent py-2 pl-1 pr-2 text-[13.5px] leading-relaxed text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed sm:text-sm dark:text-white dark:placeholder:text-violet-100/25"
          />
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={disabled || value.trim().length === 0}
          aria-label="Send message"
          className="group grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/25 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0"
        >
          <SendIcon className="h-[18px] w-[18px] transition-transform duration-200 group-hover:rotate-6 group-disabled:rotate-0" />
        </button>
      </div>

      <div className="mx-auto mt-1.5 flex w-full max-w-2xl items-center justify-between gap-3 px-1.5 text-[10px] text-slate-400 dark:text-violet-100/30">
        <span className="inline-flex items-center gap-1">
          <LockIcon className="h-3 w-3" />
          Encrypted on this device
        </span>
        {remaining <= 250 ? (
          <span
            className={cn(
              "tabular-nums",
              remaining <= 50 && "font-semibold text-amber-600 dark:text-amber-400",
            )}
          >
            {remaining} characters left
          </span>
        ) : (
          <span className="hidden sm:inline">Enter to send · Shift + Enter for a new line</span>
        )}
      </div>
    </div>
  );
}
