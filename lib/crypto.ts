/**
 * A 256-bit AES-GCM key lives in the URL hash. Hashes are never sent to the
 * server, so the relay only ever sees ciphertext.
 */

const KEY_BYTES = 32;
const IV_BYTES = 12;
const ROOM_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
const ROOM_ID_LENGTH = 12;
const KEY_PATTERN = /^[A-Za-z0-9_-]{40,64}$/;

export type RoomKey = {
  cryptoKey: CryptoKey;
  /** Short, human-comparable code derived from the key. */
  fingerprint: string;
};

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded + "===".slice((padded.length + 3) % 4));
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

export function createRoomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ROOM_ID_LENGTH));
  let id = "";
  for (const byte of bytes) {
    id += ROOM_ALPHABET[byte % ROOM_ALPHABET.length];
  }
  return id;
}

export function isValidRoomId(roomId: string): boolean {
  return /^[a-z0-9]{8,40}$/.test(roomId);
}

export function createRoomSecret(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(KEY_BYTES)));
}

export function buildInviteUrl(roomId: string, secret: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/chat/${roomId}#k=${secret}`;
}

export function parseInvite(input: string): { roomId: string; secret: string } | null {
  const value = input.trim();
  if (!value) return null;

  let pathname = "";
  let hash = "";

  try {
    if (value.includes("://")) {
      const url = new URL(value);
      pathname = url.pathname;
      hash = url.hash;
    } else {
      const normalized = value.replace(/^\/+/, "");
      pathname = normalized.startsWith("chat/") ? `/${normalized}` : normalized;
      const hashIndex = normalized.indexOf("#");
      if (hashIndex >= 0) {
        pathname = pathname.slice(0, pathname.indexOf("#"));
        hash = normalized.slice(hashIndex);
      }
    }
  } catch {
    return null;
  }

  let roomId = "";
  const chatMatch = pathname.match(/\/chat\/([a-z0-9]{8,40})\/?$/i);
  if (chatMatch) {
    roomId = chatMatch[1].toLowerCase();
  } else {
    const bare = pathname.replace(/^\//, "").replace(/\/$/, "");
    if (/^[a-z0-9]{8,40}$/i.test(bare)) roomId = bare.toLowerCase();
  }

  if (!roomId) return null;

  const params = new URLSearchParams(hash.replace(/^#/, "").replace(/^\?/, ""));
  const secret = params.get("k") ?? params.get("key") ?? "";
  if (!KEY_PATTERN.test(secret)) return null;

  return { roomId, secret };
}

export async function importRoomKey(secret: string): Promise<RoomKey | null> {
  if (!KEY_PATTERN.test(secret)) return null;

  const raw = fromBase64Url(secret);
  if (!raw || raw.byteLength !== KEY_BYTES) return null;

  try {
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      raw,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"],
    );

    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", raw));
    const fingerprint = Array.from(digest.slice(0, 8))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
      .match(/.{1,4}/g)!
      .join(" ");

    return { cryptoKey, fingerprint };
  } catch {
    return null;
  }
}

export async function encryptMessage(
  roomKey: RoomKey,
  roomId: string,
  payload: { text: string; sender: string; nonce: string; sentAt: number },
): Promise<{ iv: string; ciphertext: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encoded = new TextEncoder().encode(
    JSON.stringify({
      v: 1,
      text: payload.text,
      sender: payload.sender,
      nonce: payload.nonce,
      sentAt: payload.sentAt,
    }),
  );

  const sealed = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: new TextEncoder().encode(roomId),
    },
    roomKey.cryptoKey,
    encoded,
  );

  return {
    iv: toBase64Url(iv),
    ciphertext: toBase64Url(new Uint8Array(sealed)),
  };
}

export async function decryptMessage(
  roomKey: RoomKey,
  roomId: string,
  iv: string,
  ciphertext: string,
): Promise<{ text: string; sender: string; nonce: string; sentAt: number } | null> {
  const ivBytes = fromBase64Url(iv);
  const cipherBytes = fromBase64Url(ciphertext);
  if (!ivBytes || !cipherBytes) return null;

  try {
    const plain = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivBytes,
        additionalData: new TextEncoder().encode(roomId),
      },
      roomKey.cryptoKey,
      cipherBytes,
    );

    const parsed = JSON.parse(new TextDecoder().decode(plain)) as {
      text?: unknown;
      sender?: unknown;
      nonce?: unknown;
      sentAt?: unknown;
    };

    if (
      typeof parsed.text !== "string" ||
      typeof parsed.sender !== "string" ||
      typeof parsed.nonce !== "string" ||
      typeof parsed.sentAt !== "number" ||
      parsed.text.length === 0 ||
      parsed.text.length > 4_000 ||
      parsed.sender.length === 0 ||
      parsed.sender.length > 48 ||
      parsed.nonce.length > 80
    ) {
      return null;
    }

    return {
      text: parsed.text,
      sender: parsed.sender.slice(0, 48),
      nonce: parsed.nonce,
      sentAt: parsed.sentAt,
    };
  } catch {
    return null;
  }
}
