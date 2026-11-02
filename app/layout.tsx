import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Veil — private encrypted chat for two",
  description:
    "Open an end-to-end encrypted room, share one link, and talk privately. No accounts, no phone numbers, no message history left behind.",
  applicationName: "Veil",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Veil — private encrypted chat for two",
    description:
      "End-to-end encrypted rooms for exactly two people. No sign-up, no trace.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5ff" },
    { media: "(prefers-color-scheme: dark)", color: "#060510" },
  ],
};

/**
 * Applies the saved (or OS) color scheme before first paint so the page never
 * flashes the wrong theme.
 */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem("veil-theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var isDark = stored === "dark" || (stored !== "light" && prefersDark);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  } catch (error) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh bg-[#f7f5ff] font-sans text-[#141225] antialiased transition-colors duration-300 dark:bg-[#060510] dark:text-[#f5f3ff]">
        {children}
      </body>
    </html>
  );
}
