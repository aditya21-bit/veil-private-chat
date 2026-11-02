/**
 * A tiny in-memory realtime hub.
 *
 * Rooms live for as long as this server process does. Ciphertext is capped
 * and pruned, so nothing accumulates forever. Replace this module with Redis
 * pub/sub or a database + websockets if you need multi-instance durability.
 */

import type {
  CallSignal,
  CallSignalEvent,
  PresenceEvent,
  StoredMessage,
  TypingEvent,
  WatchEvent,
  WatchState,
} from "@/lib/chat-types";

export const ROOM_CAPACITY = 2;
export const MAX_MESSAGES = 200;
export const MAX_CIPHERTEXT_BYTES = 16_000;
const MAX_ROOM_CIPHERTEXT = 512_000;
const MAX_SIGNAL_BYTES = 64_000;
export const CLIENT_TIMEOUT_MS = 30_000;
const ROOM_IDLE_MS = 2 * 60 * 60 * 1000;
const MAX_ROOMS = 200;
const MAX_WATCH_POSITION = 24 * 60 * 60;

type Subscriber = {
  clientId: string;
  send: (event: string, data: unknown) => void;
};

type Participant = {
  lastSeen: number;
};

type Room = {
  id: string;
  messages: StoredMessage[];
  participants: Map<string, Participant>;
  subscribers: Set<Subscriber>;
  watch: WatchState | null;
  seq: number;
  lastActivity: number;
};

type RoomRegistry = Map<string, Room>;

// Survives Next.js dev-server module re-evaluation and is shared by every
// route handler in the same process.
const globalStore = globalThis as typeof globalThis & {
  __veilRooms?: RoomRegistry;
};

const rooms: RoomRegistry = (globalStore.__veilRooms ??= new Map());

const ROOM_ID = /^[a-z0-9]{8,40}$/;

export function isValidRoomId(roomId: string): boolean {
  return ROOM_ID.test(roomId);
}

function pruneParticipants(room: Room, now = Date.now()) {
  let changed = false;
  for (const [clientId, participant] of room.participants) {
    if (now - participant.lastSeen > CLIENT_TIMEOUT_MS) {
      room.participants.delete(clientId);
      changed = true;
    }
  }
  return changed;
}

function pruneRooms(now = Date.now()) {
  for (const [id, room] of rooms) {
    if (now - room.lastActivity > ROOM_IDLE_MS && room.subscribers.size === 0) {
      rooms.delete(id);
    }
  }

  if (rooms.size <= MAX_ROOMS) return;

  const removable = Array.from(rooms.values())
    .filter((room) => room.subscribers.size === 0)
    .sort((a, b) => a.lastActivity - b.lastActivity);

  for (const room of removable) {
    if (rooms.size <= MAX_ROOMS) break;
    rooms.delete(room.id);
  }
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function getOrCreateRoom(roomId: string): Room {
  const now = Date.now();
  const existing = rooms.get(roomId);
  if (existing) {
    existing.lastActivity = now;
    pruneParticipants(existing, now);
    return existing;
  }

  pruneRooms(now);

  const room: Room = {
    id: roomId,
    messages: [],
    participants: new Map(),
    subscribers: new Set(),
    watch: null,
    seq: 0,
    lastActivity: now,
  };
  rooms.set(roomId, room);
  return room;
}

export function participantCount(room: Room): number {
  pruneParticipants(room);
  return room.participants.size;
}

function presencePayload(room: Room): PresenceEvent {
  return { count: participantCount(room), capacity: ROOM_CAPACITY };
}

function broadcast(room: Room, event: string, data: unknown, except?: string) {
  for (const subscriber of room.subscribers) {
    if (except && subscriber.clientId === except) continue;
    try {
      subscriber.send(event, data);
    } catch {
      // A dead connection is cleaned up by its own abort handler.
    }
  }
}

function publishPresence(room: Room) {
  broadcast(room, "presence", presencePayload(room));
}

export function touchClient(room: Room, clientId: string) {
  const existing = room.participants.get(clientId);
  if (existing) {
    existing.lastSeen = Date.now();
  } else {
    room.participants.set(clientId, { lastSeen: Date.now() });
  }
  room.lastActivity = Date.now();
}

/**
 * Registers a participant before the event stream opens. Returns `full` when
 * a third person tries to enter a two-seat room.
 */
export function joinRoom(
  room: Room,
  clientId: string,
): { ok: true } | { ok: false; reason: "full" } {
  const now = Date.now();
  pruneParticipants(room, now);

  if (!room.participants.has(clientId) && room.participants.size >= ROOM_CAPACITY) {
    return { ok: false, reason: "full" };
  }

  room.participants.set(clientId, { lastSeen: now });
  room.lastActivity = now;
  publishPresence(room);
  return { ok: true };
}

export function attachSubscriber(
  room: Room,
  clientId: string,
  send: Subscriber["send"],
): () => void {
  const subscriber: Subscriber = { clientId, send };
  room.subscribers.add(subscriber);
  touchClient(room, clientId);
  publishPresence(room);

  let detached = false;
  return () => {
    if (detached) return;
    detached = true;
    room.subscribers.delete(subscriber);

    const stillConnected = Array.from(room.subscribers).some(
      (entry) => entry.clientId === clientId,
    );
    if (!stillConnected) {
      room.participants.delete(clientId);
      publishPresence(room);
    }
    room.lastActivity = Date.now();
  };
}

export function addMessage(
  room: Room,
  clientId: string,
  iv: string,
  ciphertext: string,
): StoredMessage | null {
  if (ciphertext.length > MAX_CIPHERTEXT_BYTES) return null;

  const message: StoredMessage = {
    id: `m${room.seq + 1}_${Math.random().toString(36).slice(2, 8)}`,
    clientId,
    iv,
    ciphertext,
    createdAt: Date.now(),
    seq: room.seq + 1,
  };

  room.seq += 1;
  room.lastActivity = Date.now();
  touchClient(room, clientId);

  let bytes = room.messages.reduce((total, entry) => total + entry.ciphertext.length, 0);
  while (
    room.messages.length > 0 &&
    (room.messages.length >= MAX_MESSAGES || bytes + ciphertext.length > MAX_ROOM_CIPHERTEXT)
  ) {
    const removed = room.messages.shift();
    if (removed) bytes -= removed.ciphertext.length;
  }

  room.messages.push(message);
  broadcast(room, "message", message);
  return message;
}

export function publishTyping(room: Room, clientId: string) {
  touchClient(room, clientId);
  const payload: TypingEvent = { clientId };
  broadcast(room, "typing", payload, clientId);
}

function clampPosition(position: number): number {
  if (!Number.isFinite(position)) return 0;
  return Math.min(Math.max(0, position), MAX_WATCH_POSITION);
}

/**
 * Turns the stored baseline into a "playhead at this instant" event. The
 * server clock is the single source of truth, so two clients joining at
 * different times land on the same frame.
 */
export function watchSnapshot(room: Room, now = Date.now()): WatchEvent | null {
  const watch = room.watch;
  if (!watch) return null;

  const elapsed = watch.playing ? (now - watch.updatedAt) / 1000 : 0;
  return {
    videoId: watch.videoId,
    playing: watch.playing,
    position: clampPosition(watch.position + elapsed),
    updatedAt: now,
    updatedBy: watch.updatedBy,
    serverTime: now,
  };
}

export function setWatch(
  room: Room,
  clientId: string,
  input: { videoId: string; playing: boolean; position: number },
): WatchEvent {
  const now = Date.now();
  room.watch = {
    videoId: input.videoId,
    playing: input.playing,
    position: clampPosition(input.position),
    updatedAt: now,
    updatedBy: clientId,
  };
  room.lastActivity = now;
  touchClient(room, clientId);

  const event = watchSnapshot(room, now) as WatchEvent;
  broadcast(room, "watch", event);
  return event;
}

export function clearWatch(room: Room, clientId: string) {
  room.watch = null;
  room.lastActivity = Date.now();
  touchClient(room, clientId);
  broadcast(room, "watch", null);
}

/**
 * Fans a WebRTC setup signal out to the other person in the room. The server
 * never inspects the SDP or ICE payload; it only enforces the size cap.
 */
export function publishCallSignal(
  room: Room,
  clientId: string,
  signal: CallSignal,
): boolean {
  let serialized: string;
  try {
    serialized = JSON.stringify(signal);
  } catch {
    return false;
  }
  if (serialized.length > MAX_SIGNAL_BYTES) return false;

  room.lastActivity = Date.now();
  touchClient(room, clientId);

  const event: CallSignalEvent = { ...signal, from: clientId };
  broadcast(room, "call", event, clientId);
  return true;
}

export function snapshot(room: Room) {
  pruneParticipants(room);
  return {
    messages: room.messages,
    participants: room.participants.size,
    capacity: ROOM_CAPACITY,
    serverTime: Date.now(),
    watch: watchSnapshot(room),
  };
}
