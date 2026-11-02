/**
 * Types shared by the browser and the realtime route handlers.
 * The server only ever handles the encrypted envelope — never plaintext.
 */

export type StoredMessage = {
  id: string;
  clientId: string;
  iv: string;
  ciphertext: string;
  createdAt: number;
  seq: number;
};

/** The JSON we encrypt in the browser before handing anything to the server. */
export type SecretPayload = {
  v: 1;
  text: string;
  sender: string;
  nonce: string;
  sentAt: number;
};

/**
 * Shared movie state. `position` is the playback cursor at `updatedAt`
 * (server clock); the relay also sends a freshly computed `serverTime` so
 * clients can start from "now" without trusting their own clock.
 */
export type WatchState = {
  videoId: string;
  playing: boolean;
  position: number;
  updatedAt: number;
  updatedBy: string;
};

export type WatchEvent = WatchState & {
  serverTime: number;
};

export type InitEvent = {
  messages: StoredMessage[];
  participants: number;
  capacity: number;
  serverTime: number;
  watch: WatchEvent | null;
};

export type PresenceEvent = {
  count: number;
  capacity: number;
};

/* -------------------------------------------------------------------------- */
/* WebRTC signalling                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Signals only ever carry SDP/ICE blobs. The relay broadcasts them to the
 * other participant; media itself flows directly between the two browsers.
 */
export type CallSignalKind = "offer" | "answer" | "ice" | "decline" | "bye";

export type CallSignal = {
  kind: CallSignalKind;
  /** Groups signals that belong to one call attempt. */
  callId: string;
  /** RTCSessionDescriptionInit or RTCIceCandidateInit — opaque to the server. */
  payload?: unknown;
};

export type CallSignalEvent = CallSignal & {
  from: string;
};

export type CallEvent = {
  seq: number;
  signal: CallSignalEvent;
};

export type TypingEvent = {
  clientId: string;
};

export type JoinResponse = {
  ok: boolean;
  participants: number;
  capacity: number;
  error?: "full" | "invalid";
};

export type ConnectionState = "connecting" | "online" | "reconnecting" | "offline";

export type ChatMessage = {
  /** Server id, or a local id while the message is still in flight. */
  id: string;
  clientId: string;
  seq?: number;
  nonce: string;
  text: string;
  sender: string;
  sentAt: number;
  createdAt: number;
  status: "pending" | "sent" | "failed";
  undecryptable?: boolean;
};
