"use client";

import { CheckIcon, ClockIcon, LockIcon, LogoMark, SendIcon } from "@/components/icons";

/** Decorative product preview used in the hero. */
export function ChatPreview() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[26rem] lg:mx-0">
      <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-br from-violet-500/30 via-fuchsia-500/20 to-cyan-400/25 blur-3xl" />

      <div className="animate-float relative">
        <div className="ring-aurora relative overflow-hidden rounded-[2rem] shadow-[0_30px_80px_-24px_rgba(76,29,149,0.45)] dark:shadow-[0_30px_90px_-20px_rgba(139,92,246,0.35)]">
          <div className="bg-white/80 backdrop-blur-xl dark:bg-[#0b0918]/85">
            {/* Mini header */}
            <div className="flex items-center gap-3 border-b border-violet-900/10 px-4 py-3.5 dark:border-white/10">
              <LogoMark className="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-slate-900 dark:text-white">
                  Maya &amp; you
                </p>
                <p className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Encrypted · both online
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                <LockIcon className="h-3 w-3" />
                E2EE
              </span>
            </div>

            {/* Messages */}
            <div className="space-y-3 px-4 py-5">
              <div className="flex justify-center">
                <span className="rounded-full bg-violet-900/5 px-2.5 py-1 text-[10px] font-medium text-violet-900/50 dark:bg-white/5 dark:text-violet-100/40">
                  Today · room created 2m ago
                </span>
              </div>

              <div className="flex items-end gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-[10px] font-bold text-white">
                  M
                </span>
                <div className="max-w-[78%] rounded-2xl rounded-bl-md border border-violet-900/10 bg-violet-50/80 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-violet-50/85">
                  Link received. Love that there&apos;s no sign-up 😌
                  <span className="mt-1 flex items-center gap-1 text-[9.5px] text-slate-400 dark:text-violet-100/35">
                    9:41
                  </span>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="max-w-[82%] rounded-2xl rounded-br-md bg-gradient-to-br from-violet-600 to-fuchsia-600 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-white shadow-lg shadow-violet-600/25">
                  Told you. The key never reaches the server.
                  <span className="mt-1 flex items-center justify-end gap-1 text-[9.5px] text-white/65">
                    9:41
                    <CheckIcon className="h-3 w-3" />
                  </span>
                </div>
              </div>

              <div className="flex items-end gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-[10px] font-bold text-white">
                  M
                </span>
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-violet-900/10 bg-violet-50/80 px-3.5 py-3 dark:border-white/10 dark:bg-white/[0.06]">
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-violet-500 dark:bg-violet-300" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-violet-500 dark:bg-violet-300" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-violet-500 dark:bg-violet-300" />
                </div>
              </div>
            </div>

            {/* Composer mock */}
            <div className="border-t border-violet-900/10 p-3 dark:border-white/10">
              <div className="flex items-center gap-2 rounded-2xl border border-violet-900/10 bg-white px-3.5 py-2.5 dark:border-white/10 dark:bg-white/5">
                <span className="flex-1 text-[12px] text-slate-400 dark:text-violet-100/30">
                  Write something private…
                </span>
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-600/30">
                  <SendIcon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 dark:text-violet-100/30">
                <ClockIcon className="h-3 w-3" />
                Nothing is stored after the room closes
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <div className="absolute -right-3 -top-5 hidden items-center gap-2 rounded-2xl border border-white/60 bg-white/90 px-3 py-2 text-[11px] font-semibold text-violet-900 shadow-xl shadow-violet-900/10 backdrop-blur sm:flex dark:border-white/10 dark:bg-[#141127]/90 dark:text-violet-100">
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-white">
          <LockIcon className="h-3.5 w-3.5" />
        </span>
        AES-256-GCM
      </div>
      <div className="absolute -bottom-5 -left-3 hidden items-center gap-2 rounded-2xl border border-white/60 bg-white/90 px-3 py-2 text-[11px] font-semibold text-violet-900 shadow-xl shadow-violet-900/10 backdrop-blur sm:flex dark:border-white/10 dark:bg-[#141127]/90 dark:text-violet-100">
        <span className="flex -space-x-1.5">
          <span className="h-5 w-5 rounded-full border-2 border-white bg-gradient-to-br from-violet-400 to-fuchsia-500 dark:border-[#141127]" />
          <span className="h-5 w-5 rounded-full border-2 border-white bg-gradient-to-br from-cyan-400 to-blue-500 dark:border-[#141127]" />
        </span>
        Exactly 2 seats
      </div>
    </div>
  );
}
