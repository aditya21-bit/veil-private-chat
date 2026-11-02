import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ChatRoom } from "@/components/chat/chat-room";
import { isValidRoomId } from "@/lib/crypto";

export const metadata: Metadata = {
  title: "Private room · Veil",
  description: "A sealed, end-to-end encrypted conversation between two people.",
  robots: { index: false, follow: false },
};

export default async function ChatPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;

  if (!isValidRoomId(roomId)) {
    notFound();
  }

  return <ChatRoom roomId={roomId} />;
}
