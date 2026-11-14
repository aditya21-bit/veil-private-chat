/**
 * Video source helpers.
 *
 * The relay stores one compact string per video so both browsers render the
 * exact same thing:
 *
 *   yt:<11-char id>            YouTube
 *   vimeo:<id>[:<hash>]        Vimeo (hash is for unlisted videos)
 *   dm:<id>                    Dailymotion
 *   file:<url>                 Direct video file (MP4, WebM, HLS, …)
 *   embed:<url>                Any other page we can put in an iframe
 */

import { isYouTubeVideoId } from "@/lib/youtube";

export type VideoSource =
  | { kind: "youtube"; id: string }
  | { kind: "vimeo"; id: string; hash?: string }
  | { kind: "dailymotion"; id: string }
  | { kind: "file"; url: string }
  | { kind: "embed"; url: string };

const VIMEO_ID = /^\d{3,12}$/;
const VIMEO_HASH = /^[A-Za-z0-9]{6,32}$/;
const DAILYMOTION_ID = /^[A-Za-z0-9]{4,32}$/;
const FILE_EXTENSION = /\.(?:mp4|m4v|webm|ogv|ogg|mov|m3u8|mpd)(?:$|[?#])/i;
const MAX_URL_LENGTH = 4096;

function stripWrappers(input: string): string {
  return input
    .trim()
    .replace(/^[<"'\s]+|[>"'\s]+$/g, "")
    .replace(/[.,;!?]+$/, "");
}

function toUrl(raw: string): URL | null {
  // Share sheets often omit the scheme ("youtu.be/…"), so assume https.
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

function cleanHost(url: URL): string {
  return url.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
}

function pathSegment(value: string): string {
  return value.split(/[/?#&]/)[0] ?? "";
}

function parseYouTubeUrl(url: URL, host: string): string | null {
  if (host === "youtu.be") {
    const id = pathSegment(url.pathname.replace(/^\//, ""));
    return isYouTubeVideoId(id) ? id : null;
  }

  if (
    host === "youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtube-nocookie.com"
  ) {
    const direct = url.searchParams.get("v");
    if (direct && isYouTubeVideoId(direct)) return direct;

    const match = url.pathname.match(
      /^\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})(?:[/?#]|$)/,
    );
    if (match) return match[1];

    const id = pathSegment(url.pathname.replace(/^\//, ""));
    return isYouTubeVideoId(id) ? id : null;
  }

  return null;
}

function parseVimeoUrl(url: URL): VideoSource | null {
  const parts = url.pathname.split("/").filter(Boolean);
  const videoIndex = parts.indexOf("video");

  let id = "";
  if (videoIndex >= 0 && VIMEO_ID.test(parts[videoIndex + 1] ?? "")) {
    id = parts[videoIndex + 1] ?? "";
  } else {
    // Prefer the last numeric segment: /groups/123/videos/456 should not
    // mistake the group id for the video id.
    const numeric = parts.filter((part) => VIMEO_ID.test(part));
    id = numeric[numeric.length - 1] ?? "";
  }

  if (!id) return null;

  let hash = url.searchParams.get("h") ?? "";
  if (!hash) {
    const index = parts.indexOf(id);
    const after = index >= 0 ? parts[index + 1] : undefined;
    if (after && VIMEO_HASH.test(after)) hash = after;
  }

  if (hash && !VIMEO_HASH.test(hash)) hash = "";
  return hash ? { kind: "vimeo", id, hash } : { kind: "vimeo", id };
}

function parseDailymotionUrl(url: URL): VideoSource | null {
  const parts = url.pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  const id = last.split("_")[0] ?? "";
  if (!DAILYMOTION_ID.test(id)) return null;
  return { kind: "dailymotion", id };
}

/** Rewrites a handful of well-known share links into their embeddable form. */
function embeddableUrl(url: URL): string {
  const host = cleanHost(url);
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "streamable.com" && parts.length === 1) {
    return `https://streamable.com/e/${parts[0]}`;
  }

  if (host === "loom.com" && parts[0] === "share" && parts[1]) {
    return `https://www.loom.com/embed/${parts[1]}`;
  }

  if (host === "drive.google.com" && parts[0] === "file" && parts[1] === "d" && parts[2]) {
    return `https://drive.google.com/file/d/${parts[2]}/preview`;
  }

  if (host === "tiktok.com" && parts.includes("video")) {
    const id = parts[parts.length - 1] ?? "";
    if (/^\d{6,25}$/.test(id)) return `https://www.tiktok.com/embed/v2/${id}`;
  }

  if (
    host === "instagram.com" &&
    (parts[0] === "p" || parts[0] === "reel" || parts[0] === "tv") &&
    parts[1]
  ) {
    return `https://www.instagram.com/${parts[0]}/${parts[1]}/embed/`;
  }

  return url.toString();
}

export function parseVideoSource(input: string): VideoSource | null {
  const raw = stripWrappers(input);
  if (!raw) return null;

  // A bare YouTube id is still the fastest thing to paste.
  if (isYouTubeVideoId(raw)) return { kind: "youtube", id: raw };

  // Shared text such as "Watch this: https://youtu.be/…".
  if (/youtu\.?be/i.test(raw)) {
    const loose = raw.match(
      /(?:v=|youtu\.be\/|shorts\/|embed\/|live\/|v\/)([A-Za-z0-9_-]{11})(?:[&#?/\s]|$)/i,
    );
    if (loose) return { kind: "youtube", id: loose[1] };
  }

  // Pull the first real URL out of shared text such as
  // "Check this out: https://vimeo.com/123".
  const embedded = raw.match(/https?:\/\/[^\s<>"']+/i)?.[0];
  const url = toUrl(embedded ?? raw);
  if (!url) return null;

  const host = cleanHost(url);

  const youtubeId = parseYouTubeUrl(url, host);
  if (youtubeId) return { kind: "youtube", id: youtubeId };

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const vimeo = parseVimeoUrl(url);
    if (vimeo) return vimeo;
  }

  if (host === "dailymotion.com" || host === "dai.ly") {
    const dailymotion = parseDailymotionUrl(url);
    if (dailymotion) return dailymotion;
  }

  if (url.toString().length > MAX_URL_LENGTH) return null;

  if (FILE_EXTENSION.test(url.pathname) || FILE_EXTENSION.test(url.search)) {
    return { kind: "file", url: url.toString() };
  }

  return { kind: "embed", url: embeddableUrl(url) };
}

export function serializeVideoSource(source: VideoSource): string {
  switch (source.kind) {
    case "youtube":
      return `yt:${source.id}`;
    case "vimeo":
      return source.hash ? `vimeo:${source.id}:${source.hash}` : `vimeo:${source.id}`;
    case "dailymotion":
      return `dm:${source.id}`;
    case "file":
      return `file:${source.url}`;
    case "embed":
      return `embed:${source.url}`;
  }
}

function safeUrl(value: string): string | null {
  if (value.length > MAX_URL_LENGTH) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function parseVideoSourceString(value: string): VideoSource | null {
  if (typeof value !== "string" || value.length > MAX_URL_LENGTH + 32) return null;

  const separator = value.indexOf(":");
  if (separator < 1) return null;

  const prefix = value.slice(0, separator);
  const rest = value.slice(separator + 1);

  switch (prefix) {
    case "yt":
      return isYouTubeVideoId(rest) ? { kind: "youtube", id: rest } : null;

    case "vimeo": {
      const [id, hash, ...extra] = rest.split(":");
      if (extra.length > 0 || !VIMEO_ID.test(id ?? "")) return null;
      if (hash && !VIMEO_HASH.test(hash)) return null;
      return hash ? { kind: "vimeo", id: id!, hash } : { kind: "vimeo", id: id! };
    }

    case "dm":
      return DAILYMOTION_ID.test(rest) ? { kind: "dailymotion", id: rest } : null;

    case "file":
    case "embed": {
      const url = safeUrl(rest);
      if (!url) return null;
      return { kind: prefix, url };
    }

    default:
      return null;
  }
}

export function isValidVideoSource(value: string): boolean {
  return parseVideoSourceString(value) !== null;
}

export function videoSourceLabel(source: VideoSource): string {
  switch (source.kind) {
    case "youtube":
      return "YouTube";
    case "vimeo":
      return "Vimeo";
    case "dailymotion":
      return "Dailymotion";
    case "file":
      return "Video file";
    default:
      return "Embed";
  }
}

export function videoSourcePageUrl(source: VideoSource): string {
  switch (source.kind) {
    case "youtube":
      return `https://www.youtube.com/watch?v=${source.id}`;
    case "vimeo":
      return source.hash
        ? `https://vimeo.com/${source.id}/${source.hash}`
        : `https://vimeo.com/${source.id}`;
    case "dailymotion":
      return `https://www.dailymotion.com/video/${source.id}`;
    default:
      return source.url;
  }
}
