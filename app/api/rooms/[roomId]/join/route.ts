import { NextResponse } from "next/server";

import { isValidRoomId, joinRoom, getOrCreateRoom } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CLIENT_ID = /^[a-zA-Z0-9-]{8,64}$/;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;

  if (!isValidRoomId(roomId)) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as { clientId?: unknown } | null;
  const clientId = typeof body?.clientId === "string" ? body.clientId : "";

  if (!CLIENT_ID.test(clientId)) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const room = getOrCreateRoom(roomId);
  const result = joinRoom(room, clientId);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, participants: 2, error: "full" },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { ok: true, participants: room.participants.size, capacity: 2 },
    { headers: { "Cache-Control": "no-store" } },
  );
}
