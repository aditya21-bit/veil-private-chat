"use client";

import { MoonIcon, SunIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

/**
 * Flips the `dark` class on <html>, remembers the choice, and lets CSS decide
 * which icon to show (so there is no hydration mismatch).
 */
export function ThemeToggle({ className }: { className?: string }) {
  function toggleTheme() {
    const root = document.documentElement;
    const isDark = root.classList.toggle("dark");
    root.style.colorScheme = isDark ? "dark" : "light";

    try {
      window.localStorage.setItem("veil-theme", isDark ? "dark" : "light");
    } catch {
      // Storage can be disabled (private mode); the theme still applies.
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className={cn(
        "group grid h-10 w-10 place-items-center rounded-full border border-violet-900/10 bg-white/70 text-violet-700/70 shadow-sm backdrop-blur transition hover:border-violet-400/40 hover:text-violet-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 dark:border-white/10 dark:bg-white/5 dark:text-violet-200/70 dark:hover:border-white/20 dark:hover:text-white",
        className,
      )}
    >
      <MoonIcon className="h-[18px] w-[18px] transition-transform duration-300 group-hover:-rotate-12 dark:hidden" />
      <SunIcon className="hidden h-[18px] w-[18px] transition-transform duration-300 group-hover:rotate-45 dark:block" />
    </button>
  );
}
