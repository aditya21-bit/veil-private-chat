/**
 * YouTube link helpers.
 *
 * We only ever store the 11-character video id. The rest of a pasted URL is
 * discarded so both partners end up on exactly the same embed.
 */

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function isYouTubeVideoId(value: string): boolean {
  return VIDEO_ID.test(value);
}

function fromPath(value: string): string | null {
  const candidate = value.split(/[/?#&]/)[0] ?? "";
  return isYouTubeVideoId(candidate) ? candidate : null;
}

export function parseYouTubeVideoId(input: string): string | null {
  const raw = input.trim().replace(/^[<"'\s]+|[>"'\s]+$/g, "");
  if (!raw) return null;
  if (isYouTubeVideoId(raw)) return raw;

  // Share sheets often wrap the link in extra text ("Check this out: …").
  // Pull a known video id pattern out of the raw string before giving up.
  const loose = raw.match(
    /(?:v=|youtu\.be\/|shorts\/|embed\/|live\/|v\/)([A-Za-z0-9_-]{11})(?:[&#?/\s]|$)/i,
  );
  if (loose) return loose[1];

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");

  if (host === "youtu.be") {
    return fromPath(url.pathname.replace(/^\//, ""));
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

    return fromPath(url.pathname.replace(/^\//, ""));
  }

  return null;
}
