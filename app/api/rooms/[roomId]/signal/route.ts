import { NextResponse } from "next/server";

import type { CallSignalKind } from "@/lib/chat-types";
import { getRoom, isValidRoomId, publishCallSignal } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CLIENT_ID = /^[a-zA-Z0-9-]{8,64}$/;
const CALL_ID = /^[a-zA-Z0-9-]{6,80}$/;
const KINDS: ReadonlySet<CallSignalKind> = new Set([
  "offer",
  "answer",
  "ice",
  "decline",
  "bye",
]);

/**
 * Relays a WebRTC handshake message to the other participant.
 *
 * The body is `{ clientId, kind, callId, payload }`. An offer/answer payload
 * is `{ type, sdp }`; an ICE payload is a candidate object (or null for the
 * end-of-candidates marker). The server treats both as opaque blobs.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;

  if (!isValidRoomId(roomId)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as {
    clientId?: unknown;
    kind?: unknown;
    callId?: unknown;
    payload?: unknown;
  } | null;

  const clientId = typeof body?.clientId === "string" ? body.clientId : "";
  const kind = typeof body?.kind === "string" ? body.kind : "";
  const callId = typeof body?.callId === "string" ? body.callId : "";

  if (
    !CLIENT_ID.test(clientId) ||
    !CALL_ID.test(callId) ||
    !KINDS.has(kind as CallSignalKind)
  ) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  if ((kind === "offer" || kind === "answer") && !isDescription(body?.payload)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  if (kind === "ice" && body?.payload !== null && !isCandidate(body?.payload)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const room = getRoom(roomId);
  if (!room) {
    return NextResponse.json({ error: "missing" }, { status: 404 });
  }
  if (!room.participants.has(clientId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const published = publishCallSignal(room, clientId, {
    kind: kind as CallSignalKind,
    callId,
    payload: body?.payload,
  });

  if (!published) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

function isDescription(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const description = value as { type?: unknown; sdp?: unknown };
  return (
    (description.type === "offer" || description.type === "answer") &&
    typeof description.sdp === "string"
  );
}

function isCandidate(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { candidate?: unknown };
  return typeof candidate.candidate === "string";
}
