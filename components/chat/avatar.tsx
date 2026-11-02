import { cn } from "@/lib/cn";

const PALETTES = [
  "from-violet-500 to-fuchsia-500 shadow-fuchsia-500/25",
  "from-cyan-400 to-blue-500 shadow-blue-500/25",
  "from-emerald-400 to-teal-500 shadow-teal-500/25",
  "from-amber-400 to-orange-500 shadow-orange-500/25",
  "from-rose-400 to-pink-500 shadow-pink-500/25",
  "from-sky-400 to-indigo-500 shadow-indigo-500/25",
];

function hashName(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  className,
  ring = false,
}: {
  name: string;
  className?: string;
  ring?: boolean;
}) {
  const palette = PALETTES[hashName(name || "guest") % PALETTES.length];

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-semibold text-white shadow-md",
        palette,
        ring && "ring-2 ring-white/70 dark:ring-[#0a0818]",
        className ?? "h-9 w-9 text-xs",
      )}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
}
