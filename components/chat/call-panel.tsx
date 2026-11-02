"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Avatar } from "@/components/chat/avatar";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CloseIcon,
  MicIcon,
  MicOffIcon,
  PhoneIcon,
  PhoneOffIcon,
  RefreshIcon,
  Spinner,
  VideoIcon,
  VideoOffIcon,
} from "@/components/icons";
import type { CallEvent } from "@/lib/chat-types";
import { cn } from "@/lib/cn";

type CallStatus = "idle" | "outgoing" | "incoming" | "connecting" | "active" | "error";

type IncomingCall = {
  callId: string;
  from: string;
  offer: RTCSessionDescriptionInit;
};

const ICE_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];

function makeCallId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `call-${crypto.randomUUID()}`;
    }
  } catch {
    // Fall through to the random suffix.
  }
  return `call-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Non-trickle ICE: wait for the candidate list so one signal carries all of it. */
function waitForIce(pc: RTCPeerConnection, timeoutMs = 4000): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      pc.removeEventListener("icegatheringstatechange", check);
      window.clearTimeout(timer);
      resolve();
    };
    const check = () => {
      if (pc.iceGatheringState === "complete") finish();
    };
    const timer = window.setTimeout(finish, timeoutMs);
    pc.addEventListener("icegatheringstatechange", check);
  });
}

export function CallPanel({
  roomId,
  clientId,
  peerName,
  participants,
  online,
  open,
  signal,
  onOpenChange,
  onActiveChange,
  onToast,
}: {
  roomId: string;
  clientId: string;
  peerName: string;
  participants: number;
  online: boolean;
  open: boolean;
  signal: CallEvent | null;
  onOpenChange: (open: boolean) => void;
  onActiveChange: (active: boolean) => void;
  onToast: (message: string) => void;
}) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [error, setError] = useState("");
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [remoteHasVideo, setRemoteHasVideo] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const statusRef = useRef<CallStatus>("idle");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef<string | null>(null);
  const incomingRef = useRef<IncomingCall | null>(null);
  const startedAtRef = useRef(0);
  const lastSignalSeqRef = useRef(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const updateStatus = useCallback((next: CallStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const sendSignal = useCallback(
    async (kind: "offer" | "answer" | "decline" | "bye", callId: string, payload?: unknown) => {
      try {
        await fetch(`/api/rooms/${roomId}/signal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId, kind, callId, payload }),
        });
      } catch {
        // Signalling is best-effort; the peer will time out if it never arrives.
      }
    },
    [clientId, roomId],
  );

  const releaseMedia = useCallback(() => {
    const pc = pcRef.current;
    pcRef.current = null;
    if (pc) {
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      try {
        pc.close();
      } catch {
        // Already closed.
      }
    }

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    startedAtRef.current = 0;
    setRemoteReady(false);
    setRemoteHasVideo(false);
    setNeedsTap(false);
    setHasCamera(false);
    setCamOn(false);
    setMicOn(true);
    setSeconds(0);
  }, []);

  const closeCall = useCallback(
    (next: CallStatus = "idle", message = "") => {
      releaseMedia();
      callIdRef.current = null;
      incomingRef.current = null;
      setIncoming(null);
      setError(message);
      updateStatus(next);
      if (next === "idle") onOpenChange(false);
    },
    [onOpenChange, releaseMedia, updateStatus],
  );

  const fail = useCallback(
    (message: string) => {
      closeCall("error", message);
      onOpenChange(true);
    },
    [closeCall, onOpenChange],
  );

  const getMedia = useCallback(async (): Promise<MediaStream | null> => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      onToast("This browser doesn't expose camera access. Try Chrome, Edge or Safari.");
      return null;
    }

    const videoConstraints: MediaTrackConstraints = {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: "user",
    };

    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: videoConstraints,
      });
    } catch {
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
        onToast("No camera available — joining with audio only.");
        return audioOnly;
      } catch {
        onToast("Camera and microphone permission is needed to call.");
        return null;
      }
    }
  }, [onToast]);

  const setupPeer = useCallback(
    (callId: string, stream: MediaStream): RTCPeerConnection | null => {
      if (typeof RTCPeerConnection === "undefined") {
        onToast("This browser can't make WebRTC calls.");
        return null;
      }

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        let remote = remoteStreamRef.current;
        if (!remote) {
          remote = new MediaStream();
          remoteStreamRef.current = remote;
        }
        if (!remote.getTracks().some((track) => track.id === event.track.id)) {
          remote.addTrack(event.track);
        }
        if (event.track.kind === "video") setRemoteHasVideo(true);
        setRemoteReady(true);
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === "connected") {
          startedAtRef.current = startedAtRef.current || Date.now();
          updateStatus("active");
          setNeedsTap(false);
        } else if (state === "failed") {
          fail("The call dropped. Check your connection and try again.");
        }
      };

      return pc;
    },
    [fail, onToast, updateStatus],
  );

  const applyLocalStream = useCallback((stream: MediaStream) => {
    localStreamRef.current = stream;
    const hasVideo = stream.getVideoTracks().length > 0;
    setHasCamera(hasVideo);
    setCamOn(hasVideo);
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
  }, []);

  const startCall = useCallback(async () => {
    const current = statusRef.current;
    if (current === "outgoing" || current === "connecting" || current === "active") return;
    if (!online) {
      onToast("You're offline — reconnect before starting a call.");
      return;
    }
    if (participants < 2) {
      onToast("Your guest hasn't joined yet. Send the invite first.");
      return;
    }

    const callId = makeCallId();
    callIdRef.current = callId;
    setIncoming(null);
    incomingRef.current = null;
    setError("");
    updateStatus("outgoing");
    onOpenChange(true);

    const stream = await getMedia();
    if (!stream) {
      closeCall("idle");
      return;
    }
    if (callIdRef.current !== callId) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    const pc = setupPeer(callId, stream);
    if (!pc) {
      stream.getTracks().forEach((track) => track.stop());
      closeCall("idle");
      return;
    }

    applyLocalStream(stream);

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIce(pc);
      await sendSignal("offer", callId, {
        type: pc.localDescription?.type ?? "offer",
        sdp: pc.localDescription?.sdp ?? offer.sdp,
      });
    } catch {
      fail("Couldn't start the call. Please try again.");
    }
  }, [
    applyLocalStream,
    closeCall,
    fail,
    getMedia,
    online,
    onOpenChange,
    onToast,
    participants,
    sendSignal,
    setupPeer,
    updateStatus,
  ]);

  const acceptCall = useCallback(async () => {
    const pending = incomingRef.current;
    if (!pending) return;

    const { callId, offer } = pending;
    callIdRef.current = callId;
    setIncoming(null);
    incomingRef.current = null;
    setError("");
    updateStatus("connecting");
    onOpenChange(true);

    const stream = await getMedia();
    if (!stream) {
      void sendSignal("decline", callId);
      closeCall("idle");
      return;
    }
    if (callIdRef.current !== callId) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    const pc = setupPeer(callId, stream);
    if (!pc) {
      stream.getTracks().forEach((track) => track.stop());
      void sendSignal("decline", callId);
      closeCall("idle");
      return;
    }

    applyLocalStream(stream);

    try {
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitForIce(pc);
      await sendSignal("answer", callId, {
        type: pc.localDescription?.type ?? "answer",
        sdp: pc.localDescription?.sdp ?? answer.sdp,
      });
    } catch {
      void sendSignal("bye", callId);
      fail("Couldn't answer the call. Ask your guest to try again.");
    }
  }, [
    applyLocalStream,
    closeCall,
    fail,
    getMedia,
    onOpenChange,
    sendSignal,
    setupPeer,
    updateStatus,
  ]);

  const declineCall = useCallback(() => {
    const pending = incomingRef.current;
    if (pending) void sendSignal("decline", pending.callId);
    closeCall("idle");
    onToast("Call declined.");
  }, [closeCall, onToast, sendSignal]);

  const hangUp = useCallback(
    (notify = true) => {
      const callId = callIdRef.current;
      if (notify && callId) void sendSignal("bye", callId);
      closeCall("idle");
    },
    [closeCall, sendSignal],
  );

  /* ---------------------------------------------------------------- */
  /* Remote signalling                                                */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!signal || signal.seq === lastSignalSeqRef.current) return;
    lastSignalSeqRef.current = signal.seq;

    const event = signal.signal;
    if (event.from === clientId) return;

    if (event.kind === "offer") {
      const offer = event.payload as RTCSessionDescriptionInit | undefined;
      if (!offer || offer.type !== "offer" || typeof offer.sdp !== "string") return;

      const current = statusRef.current;
      if (current === "outgoing") {
        // Both pressed Call at once: the lower client id stays the caller.
        if (clientId < event.from) return;
        const staleId = callIdRef.current;
        if (staleId) void sendSignal("bye", staleId);
        releaseMedia();
        callIdRef.current = null;
      } else if (
        current === "connecting" ||
        current === "active" ||
        current === "incoming"
      ) {
        return;
      }

      const next: IncomingCall = { callId: event.callId, from: event.from, offer };
      incomingRef.current = next;
      setIncoming(next);
      setError("");
      updateStatus("incoming");
      onOpenChange(true);
      return;
    }

    const callId = callIdRef.current;
    if (!callId || event.callId !== callId) return;

    if (event.kind === "answer") {
      const answer = event.payload as RTCSessionDescriptionInit | undefined;
      const pc = pcRef.current;
      if (!pc || !answer || answer.type !== "answer" || typeof answer.sdp !== "string") return;
      void (async () => {
        try {
          await pc.setRemoteDescription(answer);
          updateStatus("connecting");
        } catch {
          fail("Call setup failed. Please try again.");
        }
      })();
    } else if (event.kind === "decline") {
      onToast(`${peerName || "Your guest"} declined the call.`);
      closeCall("idle");
    } else if (event.kind === "bye") {
      onToast("Your guest ended the call.");
      closeCall("idle");
    }
  }, [
    clientId,
    closeCall,
    fail,
    onOpenChange,
    onToast,
    peerName,
    releaseMedia,
    sendSignal,
    signal,
    updateStatus,
  ]);

  /* Bind media to the <video> elements once they are mounted. */
  useEffect(() => {
    const video = localVideoRef.current;
    if (!video) return;
    video.srcObject = localStreamRef.current;
  }, [open, status, hasCamera]);

  useEffect(() => {
    const video = remoteVideoRef.current;
    if (!video) return;
    video.srcObject = remoteStreamRef.current;
    if (remoteStreamRef.current) {
      const played = video.play();
      if (played) played.then(() => setNeedsTap(false)).catch(() => setNeedsTap(true));
    }
  }, [open, status, remoteReady]);

  useEffect(() => {
    if (status !== "active") return;
    const tick = () => {
      if (!startedAtRef.current) startedAtRef.current = Date.now();
      setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => {
    onActiveChange(
      status === "outgoing" ||
        status === "incoming" ||
        status === "connecting" ||
        status === "active",
    );
  }, [onActiveChange, status]);

  /* If the other person leaves the room, there is nobody left to call. */
  useEffect(() => {
    if (participants >= 2) return;
    if (
      statusRef.current === "outgoing" ||
      statusRef.current === "connecting" ||
      statusRef.current === "active"
    ) {
      onToast("Your guest left the room, so the call ended.");
      hangUp(false);
    }
  }, [hangUp, onToast, participants]);

  /* Escape closes the panel or ends the call. */
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const current = statusRef.current;
      if (current === "incoming") declineCall();
      else if (current === "outgoing" || current === "connecting" || current === "active") {
        hangUp(true);
      } else onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [declineCall, hangUp, onOpenChange, open]);

  /* Leaving the page ends the call for the other side too. */
  useEffect(() => {
    return () => {
      const callId = callIdRef.current;
      if (callId && typeof navigator !== "undefined" && navigator.sendBeacon) {
        try {
          navigator.sendBeacon(
            `/api/rooms/${roomId}/signal`,
            new Blob([JSON.stringify({ clientId, kind: "bye", callId })], {
              type: "application/json",
            }),
          );
        } catch {
          // Best-effort.
        }
      }
      const pc = pcRef.current;
      pc?.close();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [clientId, roomId]);

  /* ---------------------------------------------------------------- */
  /* Controls                                                         */
  /* ---------------------------------------------------------------- */

  function toggleMic() {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !micOn;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setMicOn(next);
  }

  function toggleCamera() {
    const stream = localStreamRef.current;
    if (!stream || !hasCamera) return;
    const next = !camOn;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setCamOn(next);
  }

  function resumeRemote() {
    const video = remoteVideoRef.current;
    if (!video) return;
    video.play().then(() => setNeedsTap(false)).catch(() => setNeedsTap(true));
  }

  const inCall = status === "connecting" || status === "active";
  const minimized =
    !open && (status === "active" || status === "connecting" || status === "outgoing");
  const showStage = open || status !== "idle";

  if (!showStage) return null;

  const label = peerName || "your guest";

  /* Minimised: keep the call visible in the corner of the chat room. */
  if (!open && minimized) {
    return (
      <div
        data-call-status={status}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-3 z-[70] sm:bottom-6 sm:right-6"
      >
        <div className="w-[11.5rem] overflow-hidden rounded-2xl border border-white/15 bg-[#080713] text-white shadow-2xl shadow-black/60 sm:w-[15.5rem]">
          <button
            type="button"
            onClick={() => {
              if (remoteReady) resumeRemote();
              onOpenChange(true);
            }}
            aria-label="Expand video call"
            className="group relative block aspect-video w-full cursor-pointer overflow-hidden bg-black text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
          >
            <video
              ref={remoteVideoRef}
              data-call-remote
              autoPlay
              playsInline
              className={cn(
                "h-full w-full object-cover transition-opacity duration-300",
                remoteReady && remoteHasVideo ? "opacity-100" : "opacity-0",
              )}
            />

            {!(remoteReady && remoteHasVideo) && (
              <span className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#16122b] via-[#0d0b1c] to-black">
                <Avatar name={label} className="h-12 w-12 text-sm ring-2 ring-white/10" />
              </span>
            )}

            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[9.5px] font-semibold backdrop-blur">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  status === "active" ? "animate-live bg-emerald-400" : "bg-amber-400",
                )}
              />
              {status === "active"
                ? formatDuration(seconds)
                : status === "outgoing"
                  ? "Calling…"
                  : "Connecting…"}
            </span>

            <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] font-medium text-violet-100/85 opacity-0 backdrop-blur transition group-hover:opacity-100">
              <ChevronUpIcon className="h-3 w-3" />
              Expand
            </span>
          </button>

          <div className="flex items-center justify-center gap-2 border-t border-white/10 px-2 py-1.5">
            {inCall ? (
              <>
                <button
                  type="button"
                  onClick={toggleMic}
                  aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
                  title={micOn ? "Mute" : "Unmute"}
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50",
                    micOn
                      ? "border-white/10 bg-white/5 text-violet-100/80 hover:bg-white/10"
                      : "border-rose-400/30 bg-rose-500/20 text-rose-200",
                  )}
                >
                  {micOn ? <MicIcon className="h-4 w-4" /> : <MicOffIcon className="h-4 w-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => hangUp(true)}
                  aria-label="End call"
                  title="End call"
                  className="grid h-9 w-9 place-items-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/30 transition hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/60"
                >
                  <PhoneOffIcon className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onOpenChange(true)}
                  aria-label="Expand video call"
                  title="Expand"
                  className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-violet-100/80 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
                >
                  <VideoIcon className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <span className="min-w-0 flex-1 truncate text-[10.5px] font-medium text-violet-100/60">
                  Calling {label}…
                </span>
                <button
                  type="button"
                  onClick={() => hangUp(true)}
                  aria-label="Cancel call"
                  title="Cancel"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/30 transition hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/60"
                >
                  <PhoneOffIcon className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-stretch justify-center bg-slate-950/70 backdrop-blur-md sm:items-center sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Video call"
        data-call-status={status}
        className="relative flex h-[100dvh] w-full max-w-3xl flex-col overflow-hidden border-white/10 bg-[#080713] text-white shadow-2xl shadow-black/60 sm:h-[min(78dvh,640px)] sm:rounded-[1.9rem] sm:border"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent"
        />

        {/* Header */}
        <div className="relative z-10 flex items-center gap-2.5 border-b border-white/10 px-4 py-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20">
            <VideoIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold tracking-tight">
              Video call
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.12em] text-emerald-300">
                P2P
              </span>
            </p>
            <p className="truncate text-[10.5px] text-violet-100/50">
              {inCall && status === "active"
                ? `With ${label} · ${formatDuration(seconds)}`
                : status === "outgoing"
                  ? `Calling ${label}…`
                  : status === "incoming"
                    ? `${label} is calling`
                    : status === "connecting"
                      ? "Connecting securely…"
                      : status === "error"
                        ? "Call failed"
                        : "Audio and video go straight between your browsers"}
            </p>
          </div>

          {inCall || status === "outgoing" ? (
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Minimize call"
              title="Minimize"
              className="grid h-9 w-9 place-items-center rounded-full text-violet-100/60 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
            >
              <ChevronDownIcon className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (status === "incoming") declineCall();
                else onOpenChange(false);
              }}
              aria-label="Close video call"
              className="grid h-9 w-9 place-items-center rounded-full text-violet-100/60 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Body */}
        {inCall ? (
          <div className="relative min-h-0 flex-1 bg-black">
            <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#16122b] via-[#0d0b1c] to-black">
              <div className="flex flex-col items-center gap-3 text-center">
                <Avatar name={label} className="h-20 w-20 text-xl ring-2 ring-white/10" />
                {!remoteReady ? (
                  <>
                    <Spinner className="h-5 w-5 text-cyan-300" />
                    <p className="text-[12px] font-medium text-violet-100/70">
                      Ringing {label}&apos;s browser…
                    </p>
                  </>
                ) : !remoteHasVideo ? (
                  <p className="text-[12px] font-medium text-violet-100/70">
                    {label} joined with audio only
                  </p>
                ) : (
                  <p className="text-[12px] font-medium text-violet-100/70">Camera off</p>
                )}
              </div>
            </div>

            <video
              ref={remoteVideoRef}
              data-call-remote
              autoPlay
              playsInline
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
                remoteReady && remoteHasVideo ? "opacity-100" : "opacity-0",
              )}
            />

            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent" />

            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-violet-50 backdrop-blur">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  status === "active" ? "animate-live bg-emerald-400" : "bg-amber-400",
                )}
              />
              {status === "active" ? formatDuration(seconds) : "Connecting…"}
              <span className="text-violet-100/50">· {label}</span>
            </div>

            {/* Local preview */}
            <div className="absolute bottom-3 right-3 h-24 w-[4.5rem] overflow-hidden rounded-xl border border-white/20 bg-[#0d0b1c] shadow-xl shadow-black/40 sm:h-32 sm:w-48">
              <video
                ref={localVideoRef}
                data-call-local
                autoPlay
                playsInline
                muted
                className={cn(
                  "h-full w-full object-cover [transform:scaleX(-1)]",
                  camOn ? "opacity-100" : "opacity-0",
                )}
              />
              {!camOn && (
                <div className="absolute inset-0 grid place-items-center">
                  <VideoOffIcon className="h-5 w-5 text-violet-100/50" />
                </div>
              )}
            </div>

            {needsTap && remoteReady && (
              <div className="absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-[2px]">
                <button
                  type="button"
                  onClick={resumeRemote}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[12.5px] font-semibold text-slate-900 shadow-xl transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <PlayBadge />
                  Tap to enable sound
                </button>
              </div>
            )}
          </div>
        ) : status === "incoming" ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-6 py-10 text-center">
            <div className="relative">
              <span className="absolute -inset-3 animate-ping rounded-full bg-cyan-400/20" />
              <Avatar name={label} className="relative h-24 w-24 text-2xl ring-2 ring-cyan-400/30" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
                Incoming video call
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">{label} is calling</h2>
              <p className="mt-1.5 text-[12px] text-violet-100/50">
                Accepting asks your browser for camera and microphone access.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={declineCall}
                aria-label="Decline video call"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500/15 px-5 text-[12.5px] font-semibold text-rose-200 transition hover:bg-rose-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50"
              >
                <PhoneOffIcon className="h-4 w-4" />
                Decline
              </button>
              <button
                type="button"
                onClick={acceptCall}
                aria-label="Accept video call"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-6 text-[12.5px] font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
              >
                <VideoIcon className="h-4 w-4" />
                Accept
              </button>
            </div>
          </div>
        ) : status === "outgoing" ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-6 py-10 text-center">
            <div className="relative">
              <span className="absolute -inset-3 animate-ping rounded-full bg-cyan-400/15" />
              <Avatar name={label} className="relative h-24 w-24 text-2xl ring-2 ring-white/10" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Calling {label}…</h2>
              <p className="mt-1.5 text-[12px] text-violet-100/50">
                Waiting for them to answer. You can cancel any time.
              </p>
            </div>
            <button
              type="button"
              onClick={() => hangUp(true)}
              aria-label="Cancel call"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-rose-500 px-5 text-[12.5px] font-semibold text-white shadow-lg shadow-rose-500/25 transition hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60"
            >
              <PhoneOffIcon className="h-4 w-4" />
              Cancel
            </button>
          </div>
        ) : status === "error" ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-amber-400/15 text-amber-300">
              <PhoneOffIcon className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Call ended</h2>
              <p className="mx-auto mt-1.5 max-w-xs text-[12px] leading-relaxed text-violet-100/55">
                {error || "Something interrupted the call."}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={startCall}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 text-[12.5px] font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
              >
                <RefreshIcon className="h-4 w-4" />
                Try again
              </button>
              <button
                type="button"
                onClick={() => closeCall("idle")}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-[12.5px] font-semibold text-violet-100/80 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-6 py-10 text-center">
            <Avatar name={label} className="h-20 w-20 text-xl ring-2 ring-white/10" />
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Video call</h2>
              <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-violet-100/55">
                Talk face to face with {label}. Audio and video travel directly between
                your browsers — the relay only carries the handshake.
              </p>
            </div>
            <button
              type="button"
              onClick={startCall}
              disabled={!online || participants < 2}
              aria-label="Start video call"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-6 text-[12.5px] font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <PhoneIcon className="h-4 w-4" />
              Start video call
            </button>
            <p className="max-w-xs text-[10.5px] leading-relaxed text-violet-100/35">
              {participants < 2
                ? "Waiting for your guest to join before you can call."
                : "Needs camera + microphone permission. Nothing is recorded."}
            </p>
          </div>
        )}

        {/* Controls */}
        {inCall && (
          <div className="relative z-10 flex items-center justify-center gap-3 border-t border-white/10 bg-[#0a0817] px-4 py-3">
            <button
              type="button"
              onClick={toggleMic}
              aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
              title={micOn ? "Mute" : "Unmute"}
              className={cn(
                "grid h-11 w-11 place-items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50",
                micOn
                  ? "border-white/10 bg-white/5 text-violet-100/80 hover:bg-white/10"
                  : "border-rose-400/30 bg-rose-500/20 text-rose-200",
              )}
            >
              {micOn ? <MicIcon className="h-5 w-5" /> : <MicOffIcon className="h-5 w-5" />}
            </button>

            <button
              type="button"
              onClick={() => hangUp(true)}
              aria-label="End call"
              title="End call"
              className="grid h-12 w-12 place-items-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/30 transition hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/60"
            >
              <PhoneOffIcon className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={toggleCamera}
              disabled={!hasCamera}
              aria-label={camOn ? "Turn off camera" : "Turn on camera"}
              title={camOn ? "Camera off" : "Camera on"}
              className={cn(
                "grid h-11 w-11 place-items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 disabled:cursor-not-allowed disabled:opacity-40",
                camOn
                  ? "border-white/10 bg-white/5 text-violet-100/80 hover:bg-white/10"
                  : "border-amber-400/30 bg-amber-400/15 text-amber-200",
              )}
            >
              {camOn ? <VideoIcon className="h-5 w-5" /> : <VideoOffIcon className="h-5 w-5" />}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function PlayBadge() {
  return (
    <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-900 text-white">
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden="true">
        <path d="M8.5 5.2 19 12 8.5 18.8V5.2Z" />
      </svg>
    </span>
  );
}
