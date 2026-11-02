import { NextResponse } from "next/server";

import { getRoom, isValidRoomId, publishTyping } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CLIENT_ID = /^[a-zA-Z0-9-]{8,64}$/;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;

  if (!isValidRoomId(roomId)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as { clientId?: unknown } | null;
  const clientId = typeof body?.clientId === "string" ? body.clientId : "";

  if (!CLIENT_ID.test(clientId)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const room = getRoom(roomId);
  if (!room || !room.participants.has(clientId)) {
    return NextResponse.json({ error: "not_joined" }, { status: 404 });
  }

  publishTyping(room, clientId);
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
