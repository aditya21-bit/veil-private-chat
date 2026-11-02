import { NextResponse } from "next/server";

import {
  addMessage,
  getOrCreateRoom,
  isValidRoomId,
  MAX_CIPHERTEXT_BYTES,
} from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CLIENT_ID = /^[a-zA-Z0-9-]{8,64}$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;

  if (!isValidRoomId(roomId)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const raw = await request.text();
  if (raw.length > MAX_CIPHERTEXT_BYTES + 2_048) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  let body: { clientId?: unknown; iv?: unknown; ciphertext?: unknown } | null = null;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const clientId = typeof body?.clientId === "string" ? body.clientId : "";
  const iv = typeof body?.iv === "string" ? body.iv : "";
  const ciphertext = typeof body?.ciphertext === "string" ? body.ciphertext : "";

  if (
    !CLIENT_ID.test(clientId) ||
    !BASE64URL.test(iv) ||
    !BASE64URL.test(ciphertext) ||
    iv.length > 64 ||
    ciphertext.length > MAX_CIPHERTEXT_BYTES
  ) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const room = getOrCreateRoom(roomId);
  const message = addMessage(room, clientId, iv, ciphertext);

  if (!message) {
    return NextResponse.json({ error: "rejected" }, { status: 422 });
  }

  return NextResponse.json(
    { message },
    { headers: { "Cache-Control": "no-store" } },
  );
}
