import { NextResponse } from "next/server";

import { clearWatch, getRoom, isValidRoomId, setWatch } from "@/lib/realtime";
import { isYouTubeVideoId } from "@/lib/youtube";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CLIENT_ID = /^[a-zA-Z0-9-]{8,64}$/;
const MAX_POSITION = 24 * 60 * 60;

function readClientId(request: Request): Promise<unknown> {
  return request
    .json()
    .then((body: unknown) =>
      body && typeof body === "object" && "clientId" in body
        ? (body as { clientId?: unknown }).clientId
        : undefined,
    )
    .catch(() => undefined);
}

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
    videoId?: unknown;
    playing?: unknown;
    position?: unknown;
  } | null;

  const clientId = typeof body?.clientId === "string" ? body.clientId : "";
  const videoId = typeof body?.videoId === "string" ? body.videoId : "";
  const playing = body?.playing;
  const position = typeof body?.position === "number" ? body.position : NaN;

  if (
    !CLIENT_ID.test(clientId) ||
    !isYouTubeVideoId(videoId) ||
    typeof playing !== "boolean" ||
    !Number.isFinite(position) ||
    position < 0 ||
    position > MAX_POSITION
  ) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const room = getRoom(roomId);
  if (!room) {
    return NextResponse.json({ error: "missing" }, { status: 404 });
  }
  if (!room.participants.has(clientId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const watch = setWatch(room, clientId, {
    videoId,
    playing,
    position,
  });

  return NextResponse.json(
    { watch },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;

  if (!isValidRoomId(roomId)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const raw = await readClientId(request);
  const clientId = typeof raw === "string" ? raw : "";

  if (!CLIENT_ID.test(clientId)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const room = getRoom(roomId);
  if (!room) {
    return NextResponse.json({ error: "missing" }, { status: 404 });
  }
  if (!room.participants.has(clientId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  clearWatch(room, clientId);
  return NextResponse.json(
    { watch: null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
