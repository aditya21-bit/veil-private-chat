# Veil · private chat for two

A mobile-first, end-to-end encrypted chat app built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS v4** and the browser's **Web Crypto API**.

Open a room, send one link, and chat privately. No accounts, no phone numbers, no passwords — and no readable messages on the server. You can also paste a YouTube link and watch together with synced playback.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

```bash
npm run build   # production build
npm start       # serve the production build
npm run typecheck
```

> Encryption uses `crypto.subtle`, which browsers only expose on **HTTPS** or **localhost**. Use a modern browser.

## Try a conversation

1. Open http://localhost:3000 and press **Create a private room**.
2. Choose a display name and enter the room.
3. Press **Invite**, copy the link, and open it in a **second browser profile or a private/incognito window** (a normal second tab is fine too — each tab gets its own client id).
4. Chat in both windows. Messages appear instantly over server-sent events.
5. Press **Watch** in the room header, paste a YouTube link, and press **Start watching**. Either of you can play, pause or seek; both players follow.

To test the two-seat limit, open the same invite in a third profile.

## How the encryption works

| Piece | Where it lives |
| --- | --- |
| 256-bit AES-GCM key | Generated in the browser, stored in the invite link's `#fragment` |
| Message plaintext | Only inside the two browsers |
| Ciphertext + random IV | Relay server memory, capped at 200 envelopes (512 KB) per room |
| Sender name, timestamps | Encrypted inside each message payload |
| Safety code | SHA-256 fingerprint of the key, comparable between both screens |

1. Creating a room generates 32 random bytes and a room id.
2. The key is encoded as base64url and placed after `#` in the invite URL. URL fragments are **never sent to the server** by the browser.
3. Each message is `JSON { text, sender, nonce, sentAt }`, encrypted with **AES-256-GCM** using a fresh 12-byte IV and the room id as additional authenticated data.
4. The relay only receives `{ iv, ciphertext, clientId }`. It cannot decrypt, and every client-side failure to decrypt is shown as a sealed placeholder.
5. The room is capped at two active participants. Presence, typing and history snapshots travel over SSE; the relay keeps everything in memory and prunes idle rooms.

The safety code matters: if someone could swap the link mid-flight, comparing the fingerprint on both screens (in person or over another trusted channel) proves both browsers hold the same key.

## Watch together

Paste a YouTube link into the **Watch** panel. Only the 11-character video id and a playback cursor are relayed, never the full URL or the page that contained it. The relay stores `{ videoId, playing, position, updatedAt, updatedBy }` alongside the room and broadcasts changes over the same SSE stream.

- Either partner can play, pause or seek. The last person to touch playback is the sync leader.
- A slow heartbeat (every 8 seconds) lets the other player recover from buffering drift.
- Remote play is applied with a small latency buffer, and if the browser blocks autoplay a **Tap to join playback** overlay appears.
- Hiding the panel stops local playback but leaves the shared movie running for your guest. **End** clears it for both.

Limits worth knowing:

- The video must allow embedding. Many full-length movies, premium titles and region-locked videos do not.
- The server sees the video id and playback position. That is metadata, not message plaintext, but it does reveal what you are watching.
- This is YouTube only. Netflix, Prime Video and other DRM services cannot be embedded or synced this way.
- Sync is best-effort; a long buffering stall is corrected on the next heartbeat or user action.

## Video calls

Press **Call** in the room header to ring the other person. The browser asks for camera and microphone access, then opens a direct WebRTC connection.

- **Peer-to-peer media.** Audio and video are encrypted in transit with DTLS-SRTP and never pass through the Next.js server.
- **The relay only signals.** `POST /api/rooms/[roomId]/signal` forwards SDP offers/answers and hang-up notices over the room's SSE stream. Call payloads are capped at 64 KB and are never stored.
- **Graceful fallbacks.** No camera? The call continues with audio only. Autoplay blocked? A **Tap to enable sound** overlay appears. The guest can Accept or Decline, and either side can hang up or mute.
- **Connection setup** uses Google's public STUN servers. There is no TURN relay, so symmetric NATs, strict corporate firewalls and some mobile networks may fail to connect.

Like the rest of the app, calls require **HTTPS or localhost** because browsers only expose `getUserMedia` and `RTCPeerConnection` in a secure context.

## Features

- **One-tap room creation** and link-based joining, no sign-up.
- **True E2EE** in the browser — AES-256-GCM, per-message IVs, room-bound AAD.
- **Realtime messaging** via SSE with auto-reconnect, encrypted history snapshots and optimistic send states.
- **Watch together**: paste a YouTube link and keep both players on the same frame. Either partner can play, pause or seek; the last person to touch playback becomes the sync leader and sends slow drift corrections.
- **Video calls**: press **Call** for a peer-to-peer audio/video call. Media flows browser-to-browser over WebRTC (DTLS-SRTP); the relay only carries the offer/answer handshake. Mute, camera toggle, accept/decline and a call timer are built in.
- **Two-person rooms** with a server-enforced capacity and live presence.
- **Typing indicators**, day separators, message grouping, timestamps and send/retry states.
- **Invite sheet** with copy, native share, and a plain-language key warning.
- **Security sheet** with safety-code fingerprint and a "what the server sees" breakdown.
- **Mobile-first UI**: dynamic viewport height, safe-area padding, thumb-friendly composer, bottom-sheet dialogs, emoji picker, keyboard shortcuts.
- **Dark / light theme** applied before first paint and remembered locally.
- **Ephemeral by design**: ciphertext only in memory, capped history, idle pruning.

## Project map

```
app/
  layout.tsx                        Metadata, viewport, no-flash theme script
  page.tsx                          Landing page
  not-found.tsx                     404 screen
  globals.css                       Tokens, ambient backgrounds, animations
  chat/[roomId]/page.tsx            Validates the room id, renders the room
  api/rooms/[roomId]/join/route.ts  Seat reservation (capacity = 2)
  api/rooms/[roomId]/events/route.ts SSE stream: init, message, presence, typing
  api/rooms/[roomId]/messages/route.ts Encrypted envelope intake
  api/rooms/[roomId]/typing/route.ts Typing relay
  api/rooms/[roomId]/watch/route.ts   Shared video id + playhead
  api/rooms/[roomId]/signal/route.ts  WebRTC offer/answer/hang-up relay
components/
  landing/landing.tsx               Hero, steps, security, features, CTA
  landing/chat-preview.tsx          Decorative hero product shot
  chat/chat-room.tsx                Client state, crypto, SSE, optimistic sends
  chat/chat-header.tsx              Presence, watch, invite, security, theme
  chat/watch-panel.tsx              YouTube player + two-way playback sync
  chat/call-panel.tsx               WebRTC audio/video call, mute, camera toggle
  chat/message-list.tsx             Bubbles, grouping, empty state, typing
  chat/composer.tsx                 Auto-growing input, emoji picker, send
  chat/join-screen.tsx              Name gate, loading and key-error screens
  chat/room-dialogs.tsx             Invite and security sheets
  chat/avatar.tsx                   Deterministic gradient avatars
  theme-toggle.tsx                  Light/dark switch
  icons.tsx                         Inline SVG icon set (no icon dependency)
lib/
  crypto.ts                         Key generation, AES-GCM, fingerprints, invites
  realtime.ts                       In-memory rooms, presence, SSE fan-out, call signals
  youtube.ts                        YouTube URL → video id parsing
  chat-types.ts                     Shared client/server envelope + call signal types
  clipboard.ts                      Clipboard with a legacy fallback
  cn.ts                             Tiny class-name helper
```

## Scaling it for production

This repo intentionally keeps the relay tiny and dependency-free. For a real deployment:

1. **Replace `lib/realtime.ts`** with Redis pub/sub, Postgres, or a managed realtime service. The current store is per-process, so horizontal scaling needs a shared bus. Everything is already envelope-shaped, so ciphertext storage stays zero-knowledge.
2. **Serve over HTTPS** and set strict security headers (CSP, HSTS, `Referrer-Policy: no-referrer` so invite links never leak through referrers).
3. **Add abuse controls** — per-IP rate limits, message-size limits (already enforced server-side at 16 KB of ciphertext), signaling-size limits (already enforced at 64 KB), and room TTLs.
4. **Run a TURN server** (coturn, Twilio Network Traversal, Cloudflare Calls, Metered) for reliable calls. The demo uses public STUN only, which is enough for most home networks but fails behind symmetric NATs and strict corporate firewalls. Keep credentials short-lived and never ship the static TURN secret to the browser.
5. **Keep keys out of URLs if you need server-side privacy from browser history.** The `#fragment` avoids network leakage but remains in history and shared links by design. Consider a one-time `postMessage` handshake or WebRTC data channels for stronger metadata privacy.
6. **Pin the crypto details** with test vectors and consider the Web Crypto API's origin guarantees in your threat model.

> The in-memory relay means rooms disappear when the server restarts. That is a feature for this demo, not a durability guarantee.
