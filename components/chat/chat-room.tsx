"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChatHeader } from "@/components/chat/chat-header";
import { CallPanel } from "@/components/chat/call-panel";
import { Composer } from "@/components/chat/composer";
import { JoinScreen, RoomKeyError, RoomLoading } from "@/components/chat/join-screen";
import { MessageList } from "@/components/chat/message-list";
import { InviteDialog, SecurityDialog } from "@/components/chat/room-dialogs";
import { WatchPanel } from "@/components/chat/watch-panel";
import { AlertIcon } from "@/components/icons";
import type {
  CallEvent,
  ChatMessage,
  ConnectionState,
  InitEvent,
  PresenceEvent,
  StoredMessage,
  TypingEvent,
  WatchEvent,
} from "@/lib/chat-types";
import {
  buildInviteUrl,
  decryptMessage,
  encryptMessage,
  importRoomKey,
  type RoomKey,
} from "@/lib/crypto";

const MAX_TEXT = 2000;

function makeId(prefix: string): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `${prefix}-${crypto.randomUUID()}`;
    }
  } catch {
    // Fall back below.
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function sortMessages(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((a, b) => {
    const aSeq = a.seq ?? Number.MAX_SAFE_INTEGER;
    const bSeq = b.seq ?? Number.MAX_SAFE_INTEGER;
    if (aSeq !== bSeq) return aSeq - bSeq;
    return a.createdAt - b.createdAt;
  });
}

function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const merged = [...current];

  for (const message of incoming) {
    const index = merged.findIndex(
      (candidate) =>
        candidate.id === message.id ||
        (message.nonce !== "" && candidate.nonce === message.nonce),
    );
    if (index >= 0) merged[index] = message;
    else merged.push(message);
  }

  return sortMessages(merged);
}

export function ChatRoom({ roomId }: { roomId: string }) {
  const [secret, setSecret] = useState("");
  const [roomKey, setRoomKey] = useState<RoomKey | null>(null);
  const [keyState, setKeyState] = useState<"loading" | "ready" | "missing" | "unsupported">(
    "loading",
  );
  const [clientId, setClientId] = useState("");
  const [storedName, setStoredName] = useState("");

  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<"full" | "network" | null>(null);
  const [myName, setMyName] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState(1);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [peerTyping, setPeerTyping] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [unread, setUnread] = useState(0);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [watchOpen, setWatchOpen] = useState(false);
  const [watchState, setWatchState] = useState<WatchEvent | null>(null);
  const [callOpen, setCallOpen] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [callEvent, setCallEvent] = useState<CallEvent | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<number | undefined>(undefined);
  const toastTimerRef = useRef<number | undefined>(undefined);
  const lastTypingRef = useRef(0);
  const previousCountRef = useRef(0);
  const watchInitializedRef = useRef(false);
  const lastWatchVideoRef = useRef<string | null>(null);
  const callSeqRef = useRef(0);

  /* ---------------------------------------------------------------- */
  /* Boot: client id, saved name, room key from the URL fragment      */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    let id = "";
    try {
      id = window.sessionStorage.getItem("veil-client") ?? "";
      if (!id) {
        id = makeId("c");
        window.sessionStorage.setItem("veil-client", id);
      }
    } catch {
      id = makeId("c");
    }
    setClientId(id);

    try {
      setStoredName(window.localStorage.getItem("veil-name") ?? "");
    } catch {
      // Storage can be unavailable; the join form still works.
    }

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setKeyState("unsupported");
      return;
    }

    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const fragmentKey = params.get("k") ?? "";

    if (!fragmentKey) {
      setKeyState("missing");
      return;
    }

    setSecret(fragmentKey);

    importRoomKey(fragmentKey)
      .then((imported) => {
        if (!imported) {
          setKeyState("missing");
          return;
        }
        setRoomKey(imported);
        setKeyState("ready");
      })
      .catch(() => setKeyState("missing"));
  }, []);

  useEffect(() => {
    return () => {
      window.clearTimeout(typingTimerRef.current);
      window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = useCallback((text: string) => {
    setToast(text);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3600);
  }, []);

  /* ---------------------------------------------------------------- */
  /* Join                                                             */
  /* ---------------------------------------------------------------- */

  const join = useCallback(
    async (displayName: string) => {
      if (joining || !clientId) return;
      setJoining(true);
      setJoinError(null);

      try {
        const response = await fetch(`/api/rooms/${roomId}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId }),
        });

        if (response.status === 409) {
          setJoinError("full");
          return;
        }
        if (!response.ok) {
          setJoinError("network");
          return;
        }

        const cleanName = displayName.trim().slice(0, 32) || "Anonymous";
        setMyName(cleanName);
        setConnection("connecting");
        setJoined(true);

        try {
          window.localStorage.setItem("veil-name", cleanName);
        } catch {
          // Non-fatal.
        }
      } catch {
        setJoinError("network");
      } finally {
        setJoining(false);
      }
    },
    [clientId, joining, roomId],
  );

  /* ---------------------------------------------------------------- */
  /* Decrypt a stored envelope                                        */
  /* ---------------------------------------------------------------- */

  const decryptStored = useCallback(
    async (stored: StoredMessage): Promise<ChatMessage> => {
      if (!roomKey) {
        return {
          id: stored.id,
          clientId: stored.clientId,
          seq: stored.seq,
          nonce: "",
          text: "",
          sender: "",
          sentAt: stored.createdAt,
          createdAt: stored.createdAt,
          status: "sent",
          undecryptable: true,
        };
      }

      const opened = await decryptMessage(roomKey, roomId, stored.iv, stored.ciphertext);

      return {
        id: stored.id,
        clientId: stored.clientId,
        seq: stored.seq,
        nonce: opened?.nonce ?? "",
        text: opened?.text ?? "",
        sender: opened?.sender ?? "",
        sentAt: opened?.sentAt ?? stored.createdAt,
        createdAt: stored.createdAt,
        status: "sent",
        undecryptable: !opened,
      };
    },
    [roomKey, roomId],
  );

  /* ---------------------------------------------------------------- */
  /* Live stream                                                      */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!joined || !roomKey || !clientId) return;

    let active = true;
    setConnection("connecting");

    const source = new EventSource(
      `/api/rooms/${roomId}/events?clientId=${encodeURIComponent(clientId)}`,
    );

    source.onopen = () => {
      if (active) setConnection("online");
    };

    source.addEventListener("init", (event) => {
      void (async () => {
        try {
          const data = JSON.parse((event as MessageEvent).data) as InitEvent;
          const decoded = await Promise.all(data.messages.map(decryptStored));
          if (!active) return;
          setMessages((current) => mergeMessages(current, decoded));
          setParticipants(data.participants);
          setWatchState(data.watch ?? null);
          lastWatchVideoRef.current = data.watch?.videoId ?? null;
          if (data.watch && !watchInitializedRef.current) setWatchOpen(true);
          watchInitializedRef.current = true;
          setConnection("online");
          setAtBottom(true);
          setUnread(0);
          requestAnimationFrame(() => {
            const node = scrollRef.current;
            node?.scrollTo({ top: node.scrollHeight });
          });
        } catch {
          // Ignore malformed frames and let the stream continue.
        }
      })();
    });

    source.addEventListener("message", (event) => {
      void (async () => {
        try {
          const stored = JSON.parse((event as MessageEvent).data) as StoredMessage;
          const decoded = await decryptStored(stored);
          if (!active) return;
          setMessages((current) => mergeMessages(current, [decoded]));
        } catch {
          // Ignore malformed frames.
        }
      })();
    });

    source.addEventListener("presence", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as PresenceEvent;
        if (!active) return;
        setParticipants(data.count);
        if (data.count < 2) setPeerTyping(false);
      } catch {
        // Ignore.
      }
    });

    source.addEventListener("typing", (event) => {
      if (!active) return;
      try {
        const data = JSON.parse((event as MessageEvent).data) as TypingEvent;
        if (data.clientId === clientId) return;
      } catch {
        return;
      }
      setPeerTyping(true);
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = window.setTimeout(() => setPeerTyping(false), 3200);
    });

    source.addEventListener("watch", (event) => {
      if (!active) return;
      try {
        const data = JSON.parse((event as MessageEvent).data) as WatchEvent | null;
        if (data && data.updatedBy === clientId) return;
        watchInitializedRef.current = true;
        const isNewVideo = data ? data.videoId !== lastWatchVideoRef.current : false;
        lastWatchVideoRef.current = data?.videoId ?? null;
        setWatchState(data);
        // A partner's sync heartbeat must not reopen a panel the user hid.
        if (data && isNewVideo) setWatchOpen(true);
      } catch {
        // Ignore malformed frames.
      }
    });

    source.addEventListener("call", (event) => {
      if (!active) return;
      try {
        const signal = JSON.parse((event as MessageEvent).data) as CallEvent["signal"];
        if (!signal || signal.from === clientId) return;
        callSeqRef.current += 1;
        setCallEvent({ seq: callSeqRef.current, signal });
      } catch {
        // Ignore malformed frames.
      }
    });

    source.onerror = () => {
      if (!active) return;
      setConnection(source.readyState === EventSource.CLOSED ? "offline" : "reconnecting");
    };

    return () => {
      active = false;
      source.close();
      window.clearTimeout(typingTimerRef.current);
    };
  }, [clientId, decryptStored, joined, roomId, roomKey]);

  /* ---------------------------------------------------------------- */
  /* Sending                                                          */
  /* ---------------------------------------------------------------- */

  const transmit = useCallback(
    async (payload: { text: string; nonce: string; sentAt: number; sender: string }) => {
      if (!roomKey) return;

      try {
        const sealed = await encryptMessage(roomKey, roomId, payload);
        const response = await fetch(`/api/rooms/${roomId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId,
            iv: sealed.iv,
            ciphertext: sealed.ciphertext,
          }),
        });

        if (!response.ok) throw new Error("send_failed");

        const data = (await response.json()) as { message: StoredMessage };
        const stored = data.message;

        setMessages((current) => {
          const withoutLocal = current.filter((message) => message.nonce !== payload.nonce);
          return sortMessages([
            ...withoutLocal,
            {
              id: stored.id,
              clientId,
              seq: stored.seq,
              nonce: payload.nonce,
              text: payload.text,
              sender: payload.sender,
              sentAt: payload.sentAt,
              createdAt: stored.createdAt,
              status: "sent",
            },
          ]);
        });
      } catch {
        setMessages((current) =>
          current.map((message) =>
            message.nonce === payload.nonce
              ? { ...message, status: "failed" as const }
              : message,
          ),
        );
        showToast("Message not sent. Tap the bubble to retry.");
      }
    },
    [clientId, roomId, roomKey, showToast],
  );

  const sendMessage = useCallback(
    (raw: string) => {
      if (!roomKey || !clientId || !myName) return;
      const text = raw.trim().slice(0, MAX_TEXT);
      if (!text) return;

      const nonce = makeId("n");
      const sentAt = Date.now();

      setMessages((current) =>
        sortMessages([
          ...current,
          {
            id: `local-${nonce}`,
            clientId,
            nonce,
            text,
            sender: myName,
            sentAt,
            createdAt: sentAt,
            status: "pending",
          },
        ]),
      );
      setAtBottom(true);
      setUnread(0);

      void transmit({ text, nonce, sentAt, sender: myName });
    },
    [clientId, myName, roomKey, transmit],
  );

  const retryMessage = useCallback(
    (message: ChatMessage) => {
      if (!message.text) return;
      setMessages((current) =>
        current.map((candidate) =>
          candidate.id === message.id
            ? { ...candidate, status: "pending" as const }
            : candidate,
        ),
      );
      void transmit({
        text: message.text,
        nonce: message.nonce || makeId("n"),
        sentAt: message.sentAt,
        sender: message.sender || myName,
      });
    },
    [myName, transmit],
  );

  const notifyTyping = useCallback(() => {
    if (!clientId) return;
    const now = Date.now();
    if (now - lastTypingRef.current < 1400) return;
    lastTypingRef.current = now;

    void fetch(`/api/rooms/${roomId}/typing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    }).catch(() => {
      // Typing is best-effort.
    });
  }, [clientId, roomId]);

  /* ---------------------------------------------------------------- */
  /* Watch together                                                   */
  /* ---------------------------------------------------------------- */

  const startWatch = useCallback(
    (videoId: string) => {
      const now = Date.now();
      lastWatchVideoRef.current = videoId;
      setWatchState({
        videoId,
        playing: true,
        position: 0,
        updatedAt: now,
        updatedBy: clientId,
        serverTime: now,
      });
      setWatchOpen(true);

      void fetch(`/api/rooms/${roomId}/watch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          videoId,
          playing: true,
          position: 0,
        }),
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("watch_failed");
          return (await response.json()) as { watch: WatchEvent };
        })
        .then((data) => {
          if (data.watch) setWatchState(data.watch);
        })
        .catch(() => {
          lastWatchVideoRef.current = null;
          setWatchState(null);
          showToast("Couldn't start the movie. Check your connection.");
        });
    },
    [clientId, roomId, showToast],
  );

  const changeWatch = useCallback(
    (update: { videoId: string; playing: boolean; position: number }) => {
      const now = Date.now();
      setWatchState({
        ...update,
        updatedAt: now,
        updatedBy: clientId,
        serverTime: now,
      });

      void fetch(`/api/rooms/${roomId}/watch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, ...update }),
      }).catch(() => {
        showToast("Playback sync paused. Check your connection.");
      });
    },
    [clientId, roomId, showToast],
  );

  const endWatch = useCallback(() => {
    lastWatchVideoRef.current = null;
    setWatchState(null);
    setWatchOpen(false);

    void fetch(`/api/rooms/${roomId}/watch`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    }).catch(() => {
      showToast("Couldn't end the movie for your guest.");
    });
  }, [clientId, roomId, showToast]);

  /* ---------------------------------------------------------------- */
  /* Scrolling                                                        */
  /* ---------------------------------------------------------------- */

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior });
  }, []);

  const handleScroll = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    const nearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 120;
    setAtBottom(nearBottom);
    if (nearBottom) setUnread(0);
  }, []);

  useEffect(() => {
    if (messages.length === previousCountRef.current) return;
    const grew = messages.length > previousCountRef.current;
    previousCountRef.current = messages.length;
    if (!grew) return;

    const last = messages[messages.length - 1];
    if (atBottom || last?.clientId === clientId) {
      requestAnimationFrame(() => scrollToBottom("smooth"));
      setUnread(0);
    } else {
      setUnread((count) => count + 1);
    }
  }, [atBottom, clientId, messages, scrollToBottom]);

  const jumpToLatest = useCallback(() => {
    scrollToBottom("smooth");
    setAtBottom(true);
    setUnread(0);
  }, [scrollToBottom]);

  /* ---------------------------------------------------------------- */
  /* Derived values                                                   */
  /* ---------------------------------------------------------------- */

  const peerName = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message.clientId !== clientId && message.sender) return message.sender;
    }
    return "";
  }, [clientId, messages]);

  const undecryptableCount = useMemo(
    () => messages.filter((message) => message.undecryptable).length,
    [messages],
  );

  const inviteUrl = useMemo(
    () => (secret ? buildInviteUrl(roomId, secret) : ""),
    [roomId, secret],
  );

  const closeInvite = useCallback(() => setInviteOpen(false), []);
  const closeSecurity = useCallback(() => setSecurityOpen(false), []);

  /* ---------------------------------------------------------------- */
  /* Screens                                                          */
  /* ---------------------------------------------------------------- */

  if (keyState === "loading") return <RoomLoading />;
  if (keyState === "missing" || keyState === "unsupported") {
    return <RoomKeyError reason={keyState} />;
  }

  if (!joined || !roomKey) {
    return (
      <JoinScreen
        roomId={roomId}
        fingerprint={roomKey?.fingerprint ?? ""}
        initialName={storedName}
        joining={joining}
        error={joinError}
        onJoin={join}
      />
    );
  }

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="veil-grid absolute inset-0 opacity-60" />
        <div className="absolute -top-48 left-1/2 h-[32rem] w-[40rem] -translate-x-1/2 rounded-full bg-violet-400/20 blur-3xl dark:bg-violet-600/15" />
        <div className="absolute -bottom-40 -right-32 h-[26rem] w-[26rem] rounded-full bg-fuchsia-300/15 blur-3xl dark:bg-fuchsia-600/10" />
        <div className="absolute -bottom-40 -left-32 h-[24rem] w-[24rem] rounded-full bg-cyan-300/15 blur-3xl dark:bg-cyan-500/10" />
        <div className="veil-noise absolute inset-0" />
      </div>

      <div className="relative z-10 mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col sm:px-4 sm:py-4 lg:py-6">
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden border-violet-900/10 bg-white/60 shadow-2xl shadow-violet-950/10 backdrop-blur-xl sm:rounded-[2rem] sm:border dark:border-white/10 dark:bg-[#0a0818]/75 dark:shadow-black/50">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-400/60 to-transparent"
          />

          <ChatHeader
            peerName={peerName}
            participants={participants}
            status={connection}
            watchActive={Boolean(watchState)}
            callActive={callActive}
            onInvite={() => setInviteOpen(true)}
            onInfo={() => setSecurityOpen(true)}
            onWatch={() => setWatchOpen((open) => !open)}
            onCall={() => setCallOpen(true)}
          />

          {watchOpen && (
            <WatchPanel
              state={watchState}
              myClientId={clientId}
              peerName={peerName}
              onStart={startWatch}
              onChange={changeWatch}
              onEnd={endWatch}
              onHide={() => setWatchOpen(false)}
            />
          )}

          <div className="relative min-h-0 flex-1 bg-gradient-to-b from-violet-50/30 via-transparent to-white/30 dark:from-violet-500/[0.03] dark:via-transparent dark:to-black/20">
            <MessageList
              messages={messages}
              myClientId={clientId}
              peerName={peerName}
              typing={peerTyping}
              atBottom={atBottom}
              unread={unread}
              scrollRef={scrollRef}
              endRef={endRef}
              onScroll={handleScroll}
              onJump={jumpToLatest}
              onInvite={() => setInviteOpen(true)}
              onRetry={retryMessage}
            />
          </div>

          <Composer
            disabled={connection === "offline"}
            onSend={sendMessage}
            onTyping={notifyTyping}
            maxLength={MAX_TEXT}
          />
        </div>
      </div>

      <InviteDialog
        open={inviteOpen}
        onClose={closeInvite}
        inviteUrl={inviteUrl}
        roomId={roomId}
        participants={participants}
      />

      <SecurityDialog
        open={securityOpen}
        onClose={closeSecurity}
        fingerprint={roomKey.fingerprint}
        roomId={roomId}
        participants={participants}
        encryptedCount={
          messages.filter((message) => !message.undecryptable && message.status === "sent")
            .length
        }
        undecryptableCount={undecryptableCount}
      />

      <CallPanel
        roomId={roomId}
        clientId={clientId}
        peerName={peerName}
        participants={participants}
        online={connection === "online"}
        open={callOpen}
        signal={callEvent}
        onOpenChange={setCallOpen}
        onActiveChange={setCallActive}
        onToast={showToast}
      />

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
          <div className="animate-pop-in pointer-events-auto flex items-center gap-2 rounded-full border border-rose-200/70 bg-white/95 px-4 py-2 text-[12px] font-medium text-slate-700 shadow-xl shadow-rose-900/10 backdrop-blur dark:border-white/10 dark:bg-[#141127]/95 dark:text-violet-100">
            <AlertIcon className="h-4 w-4 shrink-0 text-rose-500" />
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
