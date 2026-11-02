import { ArrowLeftIcon, LockIcon, LogoMark } from "@/components/icons";

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="veil-grid absolute inset-0" />
        <div className="absolute -top-40 left-1/2 h-[30rem] w-[36rem] -translate-x-1/2 rounded-full bg-violet-400/25 blur-3xl dark:bg-violet-600/15" />
        <div className="veil-noise absolute inset-0" />
      </div>

      <div className="relative w-full max-w-md rounded-[2rem] border border-violet-900/10 bg-white/80 p-8 text-center shadow-2xl shadow-violet-900/10 backdrop-blur-xl dark:border-white/10 dark:bg-[#0b0918]/90">
        <LogoMark className="mx-auto h-14 w-14" />
        <p className="mt-5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-500 dark:text-violet-300">
          404 · sealed
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          This room doesn&apos;t exist.
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-500 dark:text-violet-100/50">
          The link may be mistyped, or the room was closed and its memory
          cleared. Start a fresh one — it takes a tap.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-[13px] font-semibold text-white shadow-lg shadow-fuchsia-600/20 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Veil
        </a>
        <p className="mt-4 inline-flex items-center gap-1.5 text-[10.5px] text-slate-400 dark:text-violet-100/30">
          <LockIcon className="h-3.5 w-3.5" />
          Rooms are ephemeral by design
        </p>
      </div>
    </div>
  );
}
