import type { SVGProps } from "react";

import { cn } from "@/lib/cn";

type IconProps = SVGProps<SVGSVGElement>;

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function LockIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <rect x="4.5" y="10" width="15" height="10" rx="2.5" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
      <path d="M12 14v2.2" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <path d="M12 3.5 19 6v5.6c0 4.4-2.8 7.9-7 9.4-4.2-1.5-7-5-7-9.4V6l7-2.5Z" />
      <path d="m9.2 11.9 1.9 1.9 3.7-3.7" />
    </svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <path d="M20.5 3.5 3.8 10.2a.7.7 0 0 0 .05 1.3l6.3 2.3 2.3 6.3a.7.7 0 0 0 1.3.05L20.5 3.5Z" />
      <path d="m10.15 13.85 4.9-4.9" />
    </svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2.4" />
      <path d="M15 6.5v-.9A2.1 2.1 0 0 0 12.9 3.5H6.1A2.1 2.1 0 0 0 4 5.6v6.8a2.1 2.1 0 0 0 2.1 2.1h.9" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <path d="m5 12.8 4.2 4.2L19 7.2" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <circle cx="12" cy="12" r="3.6" />
      <path d="M12 2.8v2M12 19.2v2M4.5 4.5l1.4 1.4M18.1 18.1l1.4 1.4M2.8 12h2M19.2 12h2M4.5 19.5l1.4-1.4M18.1 5.9l1.4-1.4" />
    </svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <path d="M20.5 14.3A8.6 8.6 0 0 1 9.7 3.5a8.6 8.6 0 1 0 10.8 10.8Z" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <path d="M4 12h16M14 6l6 6-6 6" />
    </svg>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <path d="M20 12H4M10 6l-6 6 6 6" />
    </svg>
  );
}

export function KeyIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <circle cx="8" cy="8" r="3.6" />
      <path d="m10.6 10.6 8.4 8.4M15.8 15.8l1.8 1.8M18.2 13.4l1.8 1.8" />
    </svg>
  );
}

export function LinkIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <path d="M10.2 13.8a4 4 0 0 0 5.7 0l2.4-2.4a4 4 0 0 0-5.7-5.7l-1.2 1.2" />
      <path d="M13.8 10.2a4 4 0 0 0-5.7 0l-2.4 2.4a4 4 0 0 0 5.7 5.7l1.2-1.2" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <circle cx="9" cy="8.4" r="3.2" />
      <path d="M3.4 19c.5-3 2.6-4.8 5.6-4.8s5.1 1.8 5.6 4.8" />
      <path d="M15.6 5.6a3 3 0 0 1 0 5.8M17 14.6c2.1.4 3.4 1.9 3.7 4.4" />
    </svg>
  );
}

export function MessageIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <path d="M20.5 12c0 4-3.8 7.2-8.5 7.2-1 0-2-.15-2.9-.42L4 20.5l1.1-3.9C3.9 15.2 3.5 13.6 3.5 12c0-4 3.8-7.2 8.5-7.2s8.5 3.2 8.5 7.2Z" />
    </svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 11v5M12 7.8h.01" />
    </svg>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <circle cx="5.5" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LogOutIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <path d="M14.5 4.5h3A2.5 2.5 0 0 1 20 7v10a2.5 2.5 0 0 1-2.5 2.5h-3" />
      <path d="M10 8l-4 4 4 4M6 12h9" />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <path d="M10.3 4.3 2.7 17.5A1.9 1.9 0 0 0 4.4 20.4h15.2a1.9 1.9 0 0 0 1.7-2.9L13.7 4.3a1.9 1.9 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 16.5h.01" />
    </svg>
  );
}

export function WifiIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <path d="M3.5 8.8a13 13 0 0 1 17 0M6.6 12.3a8.6 8.6 0 0 1 10.8 0M9.7 15.7a4.2 4.2 0 0 1 4.6 0" />
      <path d="M12 19.2h.01" strokeWidth={2.4} />
    </svg>
  );
}

export function WifiOffIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <path d="M3.5 8.8a13 13 0 0 1 5.2-2.4M15.6 7a13 13 0 0 1 4.9 1.8M6.6 12.3a8.6 8.6 0 0 1 3.1-1.4M14.6 11.2a8.6 8.6 0 0 1 2.8 1.1M9.7 15.7a4.2 4.2 0 0 1 4.6 0" />
      <path d="M12 19.2h.01" strokeWidth={2.4} />
      <path d="m4 4 16 16" />
    </svg>
  );
}

export function SparklesIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <path d="m12 3.5 1.9 4.9 4.9 1.9-4.9 1.9L12 17.1l-1.9-4.9-4.9-1.9 4.9-1.9L12 3.5Z" />
      <path d="M18.6 15.4l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" />
    </svg>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <circle cx="18" cy="5.5" r="2.6" />
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="18" cy="18.5" r="2.6" />
      <path d="m8.3 10.8 7.4-4M8.3 13.2l7.4 4" />
    </svg>
  );
}

export function SmileIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M8.6 14.2a4.3 4.3 0 0 0 6.8 0" />
      <path d="M9 9.6h.01M15 9.6h.01" strokeWidth={2.4} />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function ChevronUpIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <path d="m6 15 6-6 6 6" />
    </svg>
  );
}

export function FilmIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <rect x="3.2" y="4.4" width="17.6" height="15.2" rx="2.6" />
      <path d="M7.6 4.4v15.2M16.4 4.4v15.2M3.2 9.2h4.4M16.4 9.2h4.4M3.2 14.8h4.4M16.4 14.8h4.4" />
    </svg>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <path d="M9 5v14M15 5v14" strokeWidth={2.6} />
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <path d="M8.5 5.2 19 12 8.5 18.8V5.2Z" />
    </svg>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <path d="M21.5 16.9v3a2 2 0 0 1-2.2 2 19.6 19.6 0 0 1-8.6-3.1 19.3 19.3 0 0 1-5.9-5.9A19.6 19.6 0 0 1 1.7 4.3 2 2 0 0 1 3.7 2.1h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L7.6 9.9a16 16 0 0 0 6 6l1.2-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2Z" />
    </svg>
  );
}

export function PhoneOffIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <path d="M3.3 14.4c5.1-4.6 12.3-4.6 17.4 0l-2.3 2.5a1.6 1.6 0 0 1-2 .3l-2.2-1.3a2 2 0 0 1-.9-1.5l-.2-1.7a11.8 11.8 0 0 0-4.2 0l-.2 1.7a2 2 0 0 1-.9 1.5l-2.2 1.3a1.6 1.6 0 0 1-2-.3l-2.3-2.5Z" />
    </svg>
  );
}

export function MicIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M19 10.5v1.8a7 7 0 0 1-14 0v-1.8M12 19.3v2.2" />
    </svg>
  );
}

export function MicOffIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <path d="M15 9.4V5.5a3 3 0 0 0-5.6-1.5M9 9v2.5a3 3 0 0 0 4.5 2.6" />
      <path d="M19 10.5v1.8a7 7 0 0 1-1.4 4.2M5 10.5v1.8a7 7 0 0 0 10.4 6M12 19.3v2.2" />
      <path d="m3 3 18 18" />
    </svg>
  );
}

export function VideoIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <rect x="2.5" y="6" width="13.5" height="12" rx="2.4" />
      <path d="m16 10.2 5.5-3.1v9.8L16 13.8" />
    </svg>
  );
}

export function VideoOffIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <path d="M16 10.2 21.5 7v9.8L16 13.8M14.4 6H4.9A2.4 2.4 0 0 0 2.5 8.4v7.2A2.4 2.4 0 0 0 4.9 18h9.5a2.4 2.4 0 0 0 2.4-2.4V8.4" />
      <path d="m3 3 18 18" />
    </svg>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <path d="M20.2 11a8.2 8.2 0 1 0-2.1 6.2" />
      <path d="M20.5 4.3v6.9h-6.9" />
    </svg>
  );
}

export function TimerIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <path d="M9 2.8h6" />
      <circle cx="12" cy="14" r="7.2" />
      <path d="M12 10.4V14l2.4 1.5" />
    </svg>
  );
}

export function FingerprintIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <path d="M6.2 7.2A8 8 0 0 1 19.4 12c0 2.3-.2 4.3-.8 6.1" />
      <path d="M4.9 12a7.1 7.1 0 0 1 10.2-6.4" />
      <path d="M7.4 12a4.6 4.6 0 0 1 9.2 0c0 2.7-.2 4.7-.7 6.4" />
      <path d="M9.9 12a2.1 2.1 0 0 1 4.2 0c0 2.6-.2 4.4-.6 5.8" />
      <path d="M5.4 15.5c-.1.9-.3 1.9-.6 3" />
    </svg>
  );
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-[30%] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-white shadow-lg shadow-fuchsia-500/30 ring-1 ring-inset ring-white/25",
        className ?? "h-10 w-10",
      )}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.45),transparent_60%)]" />
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="relative h-[56%] w-[56%]">
        <path
          d="M20 11.5c0 3.9-3.6 7-8 7-.9 0-1.8-.12-2.6-.35L5 20l1.1-3.4A6.6 6.6 0 0 1 4 11.5c0-3.9 3.6-7 8-7s8 3.1 8 7Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="11.5" r="1.9" stroke="currentColor" strokeWidth="1.7" />
        <path d="M12 13.4v1.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    </span>
  );
}
