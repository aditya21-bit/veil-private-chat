import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { attachSubscriber, getOrCreateRoom, isValidRoomId, joinRoom, snapshot, touchClient } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CLIENT_ID = /^[a-zA-Z0-9-]{8,64}$/;
const HEARTBEAT_MS = 15_000;

/**
 * Server-sent events stream for a room.
 *
 * The server relays opaque ciphertext envelopes. It knows a client id and a
 * room id, but never the room key, sender name, or message body.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;
  const clientId = request.nextUrl.searchParams.get("clientId") ?? "";

  if (!isValidRoomId(roomId) || !CLIENT_ID.test(clientId)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const room = getOrCreateRoom(roomId);
  const joined = joinRoom(room, clientId);

  if (!joined.ok) {
    return NextResponse.json({ error: "full" }, { status: 409 });
  }

  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          closed = true;
        }
      };

      const detach = attachSubscriber(room, clientId, send);

      const heartbeat = setInterval(() => {
        touchClient(room, clientId);
        send("ping", { t: Date.now() });
      }, HEARTBEAT_MS);

      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        detach();
        try {
          controller.close();
        } catch {
          // Already closed by the client.
        }
      };

      request.signal.addEventListener("abort", cleanup);

      // Atomic snapshot: subscriptions are attached first, so no message can
      // slip between the snapshot and the live stream.
      send("init", snapshot(room));
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
