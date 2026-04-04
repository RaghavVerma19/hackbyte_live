"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Peer from "simple-peer";
import { io, Socket } from "socket.io-client";
import {
  Check,
  Copy,
  MessageSquareText,
  MonitorUp,
  ShieldAlert,
  ShieldCheck,
  Users,
  Wifi,
} from "lucide-react";
import { ControlBar } from "@/components/control-bar";
import { VideoTile } from "@/components/video-tile";

type RemoteParticipant = {
  peerId: string;
  stream?: MediaStream;
  peer: Peer.Instance;
};

type PeerMap = Record<string, Peer.Instance>;

type MediaState = Record<
  string,
  {
    muted: boolean;
    cameraOff: boolean;
    name: string;
  }
>;

function getSignalingServerUrl() {
  if (process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL) {
    return process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL;
  }

  if (typeof window === "undefined") {
    return "http://localhost:4000";
  }

  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  if (isLocalhost) {
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    return `${protocol}//${window.location.hostname}:4000`;
  }

  return "";
}

function buildIceServers() {
  const stunUrl = process.env.NEXT_PUBLIC_STUN_URL;
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  return [
    stunUrl ? { urls: stunUrl } : { urls: "stun:stun.l.google.com:19302" },
    turnUrl && turnUsername && turnCredential
      ? {
          urls: turnUrl,
          username: turnUsername,
          credential: turnCredential,
        }
      : null,
  ].filter(Boolean) as RTCIceServer[];
}

function formatClock(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function stopTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function RoomClient({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [socketConnected, setSocketConnected] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isScreenSharePending, setIsScreenSharePending] = useState(false);
  const [mediaState, setMediaState] = useState<MediaState>({});
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [screenShareError, setScreenShareError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState("--:--");
  const [currentRoomLink, setCurrentRoomLink] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<PeerMap>({});
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const interviewStreamRef = useRef<MediaStream | null>(null);
  const isLeavingRef = useRef(false);
  const displayName = "Candidate";
  const signalingServerUrl = useMemo(() => getSignalingServerUrl(), []);
  const gridClassName = useMemo(() => {
    const count = participants.length;

    if (count <= 1) {
      return "grid-cols-1";
    }

    if (count === 2) {
      return "md:grid-cols-2";
    }

    if (count <= 4) {
      return "md:grid-cols-2 xl:grid-cols-2";
    }

    return "md:grid-cols-2 xl:grid-cols-3";
  }, [participants.length]);

  const releaseRoomConnection = (announceLeave = true) => {
    const socket = socketRef.current;
    const socketId = socket?.id;

    Object.values(peersRef.current).forEach((peer) => peer.destroy());
    peersRef.current = {};

    if (announceLeave && socket && socketId) {
      socket.emit("leave-room", {
        roomId,
        peerId: socketId,
      });
    }

    socket?.disconnect();
    socketRef.current = null;
    setSocketConnected(false);
    setParticipants([]);
    setMediaState({});
  };

  const handleScreenShareEnded = () => {
    if (isLeavingRef.current) {
      return;
    }

    releaseRoomConnection();
    stopTracks(screenStreamRef.current);
    screenStreamRef.current = null;
    interviewStreamRef.current = null;
    setLocalStream(null);
    setIsScreenSharing(false);
    setScreenShareError(
      "Screen sharing is required for the interview. Share your screen again to rejoin.",
    );
  };

  const ensureCameraAndMic = async () => {
    const existingStream = cameraStreamRef.current;
    const existingTracks = existingStream?.getTracks().filter((track) => track.readyState === "live");

    if (existingStream && existingTracks?.length) {
      return existingStream;
    }

    const media = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 60 },
      },
    });

    cameraStreamRef.current = media;
    return media;
  };

  const createPeer = (
    targetPeerId: string,
    callerId: string,
    stream: MediaStream,
    socket: Socket,
    initiator: boolean,
  ) => {
    const peer = new Peer({
      initiator,
      trickle: true,
      stream,
      config: {
        iceServers: buildIceServers(),
      },
    });

    peer.on("signal", (signal) => {
      const signalData = signal as { type?: string; candidate?: unknown };
      const type =
        signalData.type === "answer"
          ? "answer"
          : signalData.candidate
            ? "ice-candidate"
            : "offer";

      socket.emit(type, {
        roomId,
        targetPeerId,
        from: callerId,
        signal,
        candidate: signal,
      });
    });

    peer.on("stream", (remoteStream) => {
      setParticipants((current) => {
        const existing = current.find(
          (participant) => participant.peerId === targetPeerId,
        );

        if (existing) {
          return current.map((participant) =>
            participant.peerId === targetPeerId
              ? { ...participant, stream: remoteStream, peer }
              : participant,
          );
        }

        return [...current, { peerId: targetPeerId, stream: remoteStream, peer }];
      });
    });

    peer.on("close", () => {
      setParticipants((current) =>
        current.filter((participant) => participant.peerId !== targetPeerId),
      );
      delete peersRef.current[targetPeerId];
    });

    peer.on("error", () => {
      setParticipants((current) =>
        current.filter((participant) => participant.peerId !== targetPeerId),
      );
      delete peersRef.current[targetPeerId];
      peer.destroy();
    });

    return peer;
  };

  const connectToRoom = (stream: MediaStream) => {
    releaseRoomConnection(false);

    const socket = io(signalingServerUrl, {
      autoConnect: true,
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      const socketId: string = socket.id ?? "";

      if (!socketId) {
        return;
      }

      setSocketConnected(true);
      setConnectionError(null);
      setMediaState({
        [socketId]: {
          muted: isMuted,
          cameraOff: false,
          name: displayName,
        },
      });
      socket.emit("join-room", {
        roomId,
        peerId: socketId,
        name: displayName,
      });
    });

    socket.on("room-users", ({ users }) => {
      const socketId = socket.id;
      const nextMediaState: MediaState = {};

      users.forEach(
        (user: {
          peerId: string;
          muted: boolean;
          cameraOff: boolean;
          name: string;
        }) => {
          nextMediaState[user.peerId] = {
            muted: user.muted,
            cameraOff: user.cameraOff,
            name: user.name,
          };

          if (
            socketId &&
            user.peerId !== socketId &&
            !peersRef.current[user.peerId]
          ) {
            const peer = createPeer(user.peerId, socketId, stream, socket, true);
            peersRef.current[user.peerId] = peer;
          }
        },
      );

      setMediaState((current) => ({
        ...current,
        ...nextMediaState,
      }));
    });

    socket.on("peer-joined", ({ peerId, name, muted, cameraOff }) => {
      const socketId = socket.id;

      setMediaState((current) => ({
        ...current,
        [peerId]: {
          muted,
          cameraOff,
          name,
        },
      }));

      if (socketId && !peersRef.current[peerId]) {
        const peer = createPeer(peerId, socketId, stream, socket, false);
        peersRef.current[peerId] = peer;
      }
    });

    socket.on("offer", ({ from, signal }) => {
      const socketId = socket.id;

      if (socketId && !peersRef.current[from]) {
        const peer = createPeer(from, socketId, stream, socket, false);
        peersRef.current[from] = peer;
      }

      peersRef.current[from]?.signal(signal);
    });

    socket.on("answer", ({ from, signal }) => {
      peersRef.current[from]?.signal(signal);
    });

    socket.on("ice-candidate", ({ from, candidate }) => {
      if (candidate) {
        peersRef.current[from]?.signal(candidate);
      }
    });

    socket.on("media-state-changed", ({ peerId, muted, cameraOff }) => {
      setMediaState((current) => ({
        ...current,
        [peerId]: {
          ...(current[peerId] ?? { name: "Participant" }),
          muted,
          cameraOff,
        },
      }));
    });

    socket.on("peer-left", ({ peerId }) => {
      peersRef.current[peerId]?.destroy();
      delete peersRef.current[peerId];
      setParticipants((current) =>
        current.filter((participant) => participant.peerId !== peerId),
      );
      setMediaState((current) => {
        const next = { ...current };
        delete next[peerId];
        return next;
      });
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    socket.on("connect_error", (connectError) => {
      setSocketConnected(false);
      setConnectionError(
        `Unable to reach signaling server at ${signalingServerUrl}. ${connectError.message}`,
      );
    });
  };

  const startScreenShare = async () => {
    if (!signalingServerUrl) {
      setConnectionError(
        "Missing NEXT_PUBLIC_SIGNALING_SERVER_URL. Point the frontend to your separately deployed signaling server.",
      );
      return;
    }

    setIsScreenSharePending(true);
    setError(null);
    setScreenShareError(null);

    try {
      const cameraStream = await ensureCameraAndMic();
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 15, max: 30 },
        },
        audio: false,
      });
      const screenTrack = screenStream.getVideoTracks()[0];

      if (!screenTrack) {
        throw new Error("No display track was returned.");
      }

      stopTracks(screenStreamRef.current);
      screenTrack.addEventListener("ended", handleScreenShareEnded, {
        once: true,
      });

      const interviewStream = new MediaStream([screenTrack]);
      const audioTrack = cameraStream.getAudioTracks()[0];

      if (audioTrack) {
        audioTrack.enabled = !isMuted;
        interviewStream.addTrack(audioTrack);
      }

      screenStreamRef.current = screenStream;
      interviewStreamRef.current = interviewStream;
      setLocalStream(interviewStream);
      setIsScreenSharing(true);
      connectToRoom(interviewStream);
    } catch {
      setIsScreenSharing(false);
      setLocalStream(null);
      setScreenShareError(
        "This interview only starts after the candidate shares their screen.",
      );
    } finally {
      setIsScreenSharePending(false);
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharePending) {
      return;
    }

    if (isScreenSharing) {
      stopTracks(screenStreamRef.current);
      handleScreenShareEnded();
      return;
    }

    await startScreenShare();
  };

  useEffect(() => {
    setNow(formatClock(new Date()));
    setCurrentRoomLink(window.location.href);

    const interval = window.setInterval(() => {
      setNow(formatClock(new Date()));
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      isLeavingRef.current = true;
      releaseRoomConnection(false);
      stopTracks(screenStreamRef.current);
      stopTracks(cameraStreamRef.current);
      screenStreamRef.current = null;
      cameraStreamRef.current = null;
      interviewStreamRef.current = null;
    };
  }, []);

  const updateMediaState = (nextMuted: boolean) => {
    const socket = socketRef.current;

    if (!socket) {
      return;
    }

    const socketId: string = socket.id ?? "";

    if (!socketId) {
      return;
    }

    setMediaState((current) => {
      const next = { ...current };
      next[socketId] = {
        ...(current[socketId] ?? { name: displayName }),
        muted: nextMuted,
        cameraOff: !isScreenSharing,
      };
      return next;
    });

    socket.emit("media-state", {
      roomId,
      peerId: socketId,
      muted: nextMuted,
      cameraOff: !isScreenSharing,
    });
  };

  const toggleMute = () => {
    const audioTrack = cameraStreamRef.current?.getAudioTracks()[0];

    if (!audioTrack) {
      return;
    }

    const nextMuted = !isMuted;
    audioTrack.enabled = !nextMuted;
    setIsMuted(nextMuted);
    updateMediaState(nextMuted);
  };

  const copyRoomLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const leaveRoom = () => {
    isLeavingRef.current = true;
    releaseRoomConnection();
    stopTracks(screenStreamRef.current);
    stopTracks(cameraStreamRef.current);
    screenStreamRef.current = null;
    cameraStreamRef.current = null;
    interviewStreamRef.current = null;
    router.push("/");
  };

  const interviewLocked = !isScreenSharing;

  return (
    <main className="min-h-screen bg-[#202124] text-white">
      <header className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden h-10 w-10 items-center justify-center rounded-2xl bg-white/5 sm:flex">
            <span className="text-lg font-semibold">H</span>
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-medium sm:text-lg">
              hackbyte interview
            </div>
            <div className="truncate text-xs text-white/60 sm:text-sm">
              {roomId}
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-3 text-sm text-white/75 md:flex">
          <span>{now}</span>
          <span className="text-white/30">|</span>
          <span className="font-medium">{roomId.slice(0, 12)}</span>
        </div>

        <div className="flex items-center gap-2">
          <TopChip
            icon={<Users className="h-4 w-4" />}
            label={`${participants.length + (socketConnected ? 1 : 0)}`}
          />
          <TopChip
            icon={<Wifi className="h-4 w-4" />}
            label={socketConnected ? "Connected" : "Waiting"}
          />
          <TopChip
            icon={isScreenSharing ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
            label={isScreenSharing ? "Screen shared" : "Share required"}
            className="hidden sm:inline-flex"
          />
        </div>
      </header>

      <section className="relative px-3 pb-32 sm:px-4 md:px-6">
        {connectionError && (
          <div className="mx-auto mb-4 max-w-7xl rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {connectionError}
          </div>
        )}

        {screenShareError && (
          <div className="mx-auto mb-4 max-w-7xl rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {screenShareError}
          </div>
        )}

        {error && (
          <div className="mx-auto mb-4 max-w-7xl rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-100">
            {error}
          </div>
        )}

        <div className="mx-auto grid max-w-7xl gap-4 xl:grid-cols-[minmax(0,1fr)_328px]">
          <section className="relative min-h-[calc(100vh-180px)] overflow-hidden rounded-[28px] bg-[#161718] p-3 sm:p-4">
            <div className={`grid h-full gap-3 ${gridClassName}`}>
              {participants.length === 0 ? (
                <div className="flex min-h-[420px] items-center justify-center rounded-[24px] bg-[#2b2c2f] text-center text-white/68">
                  <div>
                    <p className="text-lg">
                      {interviewLocked ? "Interview is locked" : "Waiting for interviewer"}
                    </p>
                    <p className="mt-2 text-sm text-white/50">
                      {interviewLocked
                        ? "The candidate must share their screen before this room can start."
                        : "Share the meeting link if the interviewer has not joined yet."}
                    </p>
                  </div>
                </div>
              ) : (
                participants.map((participant) => (
                  <VideoTile
                    key={participant.peerId}
                    label={mediaState[participant.peerId]?.name ?? "Participant"}
                    stream={participant.stream}
                    isMuted={mediaState[participant.peerId]?.muted}
                    isCameraOff={mediaState[participant.peerId]?.cameraOff}
                    priority={participants.length === 1}
                  />
                ))
              )}
            </div>

            <div className="absolute left-5 top-5 hidden rounded-full bg-black/20 px-3 py-1.5 text-xs text-white/75 backdrop-blur md:inline-flex">
              Interview stage
            </div>

            {interviewLocked && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0f1011]/88 p-4 backdrop-blur-sm">
                <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-[#1d1f20] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ea4335]/15 text-[#ff8a80]">
                    <MonitorUp className="h-7 w-7" />
                  </div>
                  <h2 className="mt-5 text-2xl font-semibold text-white">
                    Screen sharing is mandatory
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-white/70 sm:text-base">
                    This interview does not begin until the candidate shares their
                    screen. Start sharing to unlock the room and connect to the
                    interviewer.
                  </p>
                  <button
                    onClick={() => void startScreenShare()}
                    disabled={isScreenSharePending}
                    className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-[#8ab4f8] px-6 text-sm font-semibold text-[#0b1220] transition hover:bg-[#9bc0fa] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isScreenSharePending ? "Starting screen share..." : "Share screen & start interview"}
                  </button>
                </div>
              </div>
            )}
          </section>

          <aside className="flex flex-col gap-4">
            <div className="rounded-[28px] bg-[#161718] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/55">You</p>
                  <h2 className="text-lg font-medium">{displayName}</h2>
                </div>
                <div
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    isScreenSharing
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-[#ea4335]/15 text-[#ff8a80]"
                  }`}
                >
                  {isScreenSharing ? "Sharing screen" : "Locked"}
                </div>
              </div>
              <VideoTile
                label={isScreenSharing ? "Your shared screen" : "Screen share required"}
                stream={localStream ?? undefined}
                isMuted={isMuted}
                isCameraOff={!isScreenSharing}
                compact
                className="min-h-[240px] sm:min-h-[300px]"
              />
            </div>

            <div className="rounded-[28px] bg-[#161718] p-4 text-sm text-white/72">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-base font-medium text-white">
                  Interview details
                </div>
                <button
                  onClick={copyRoomLink}
                  className="inline-flex items-center gap-2 rounded-full bg-[#303134] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#3c4043]"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy link
                    </>
                  )}
                </button>
              </div>
              <div className="rounded-2xl bg-[#2b2c2f] px-4 py-3 text-xs leading-6 text-white/68">
                {currentRoomLink}
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#2b2c2f] px-4 py-3">
                <MessageSquareText className="h-4 w-4 text-white/60" />
                <span>
                  Screen sharing stays mandatory. If it stops, the candidate is removed
                  until sharing resumes.
                </span>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <ControlBar
        isMuted={isMuted}
        isScreenSharing={isScreenSharing}
        isScreenSharePending={isScreenSharePending}
        controlsLocked={interviewLocked}
        onToggleMute={toggleMute}
        onToggleScreenShare={() => void toggleScreenShare()}
        onCopyLink={copyRoomLink}
        onLeave={leaveRoom}
      />
    </main>
  );
}

function TopChip({
  icon,
  label,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex h-10 items-center gap-2 rounded-full bg-white/6 px-3 text-sm text-white/80 ${className ?? ""}`}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}
