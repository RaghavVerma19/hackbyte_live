"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Peer from "simple-peer";
import { io, Socket } from "socket.io-client";
import { Check, Copy, MonitorUp, MicOff, VideoOff } from "lucide-react";
import { ControlBar } from "@/components/control-bar";
import { VideoTile } from "@/components/video-tile";
import {
  clearSession,
  fetchIceServers,
  readSession,
  type AuthSession,
  type AuthRole,
  type IceServerConfig,
} from "@/lib/auth";

type Role = AuthRole;
type RemoteStreamKind = "camera" | "screen";
type RemoteParticipant = {
  peerId: string;
  streamId: string;
  stream?: MediaStream;
  peer: Peer.Instance;
};
type DecoratedRemoteParticipant = RemoteParticipant & {
  kind: RemoteStreamKind;
};
type PeerMap = Record<string, Peer.Instance>;
type UserSnapshot = {
  peerId: string;
  name: string;
  role: Role;
  muted: boolean;
  cameraOff: boolean;
  shareActive: boolean;
  displaySurface: string | null;
  joinedAt?: number;
};
type MediaState = Record<string, UserSnapshot>;
type RoomState = {
  roomId: string;
  interviewStarted: boolean;
  hasCandidate: boolean;
  hasInterviewer: boolean;
  shareRequirementMet: boolean;
  activeSharePeerId: string | null;
  activeShareRole: Role | null;
  activeShareSurface: string | null;
  waitingFor: string;
  participantCount: number;
};

const EMPTY_ROOM_STATE: RoomState = {
  roomId: "",
  interviewStarted: false,
  hasCandidate: false,
  hasInterviewer: false,
  shareRequirementMet: false,
  activeSharePeerId: null,
  activeShareRole: null,
  activeShareSurface: null,
  waitingFor: "candidate",
  participantCount: 0,
};

function getSignalingServerUrl() {
  if (process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL)
    return process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL;
  if (typeof window === "undefined") return "http://localhost:4000";
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  if (isLocalhost) {
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    return `${protocol}//${window.location.hostname}:4000`;
  }
  return "";
}

function buildFallbackIceServers() {
  return [{ urls: "stun:stun.l.google.com:19302" }] as RTCIceServer[];
}

function normalizeIceServers(iceServers: IceServerConfig[]) {
  if (!iceServers.length) return buildFallbackIceServers();
  return iceServers.map((server) => ({
    urls: server.urls,
    username: server.username,
    credential: server.credential,
  })) as RTCIceServer[];
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

function roleLabel(role: Role) {
  return role === "candidate" ? "Candidate" : "Interviewer";
}

function getStreamScore(stream?: MediaStream) {
  const track = stream?.getVideoTracks()[0];
  if (!track) return 0;
  const settings = track.getSettings();
  if (settings.displaySurface === "monitor") return Number.MAX_SAFE_INTEGER;
  const width = typeof settings.width === "number" ? settings.width : 0;
  const height = typeof settings.height === "number" ? settings.height : 0;
  return width * height;
}

function classifyRemoteParticipants(
  participants: RemoteParticipant[],
  knownUsers: MediaState,
): DecoratedRemoteParticipant[] {
  const groupedParticipants = new Map<string, RemoteParticipant[]>();
  participants.forEach((participant) => {
    const current = groupedParticipants.get(participant.peerId) ?? [];
    current.push(participant);
    groupedParticipants.set(participant.peerId, current);
  });
  return participants.map((participant) => {
    const user = knownUsers[participant.peerId];
    const peerStreams = groupedParticipants.get(participant.peerId) ?? [
      participant,
    ];
    let kind: RemoteStreamKind = "camera";
    if (
      user?.role === "candidate" &&
      user.shareActive &&
      peerStreams.length > 1
    ) {
      const screenStream = [...peerStreams].sort(
        (left, right) =>
          getStreamScore(right.stream) - getStreamScore(left.stream),
      )[0];
      if (screenStream?.streamId === participant.streamId) kind = "screen";
    }
    return { ...participant, kind };
  });
}

/** Initials avatar shown when camera is off */
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const colors = [
    "bg-[#1a73e8]",
    "bg-[#0f9d58]",
    "bg-[#f29900]",
    "bg-[#ea4335]",
    "bg-[#7b1fa2]",
    "bg-[#00796b]",
  ];
  const color = colors[(name.charCodeAt(0) ?? 0) % colors.length];
  return (
    <div
      className={`flex h-20 w-20 items-center justify-center rounded-full ${color} text-2xl font-medium text-white select-none`}
    >
      {initials || "?"}
    </div>
  );
}

/** A Google Meet–style video tile: dark bg, name pill bottom-left, status icons */
function MeetTile({
  stream,
  name,
  muted = false,
  cameraOff = false,
  mirrored = false,
  className = "",
}: {
  stream?: MediaStream;
  name: string;
  muted?: boolean;
  cameraOff?: boolean;
  mirrored?: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !stream) return;
    el.srcObject = stream;
    el.play().catch(() => {});
    return () => {
      el.srcObject = null;
    };
  }, [stream]);

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-[#3c4043] flex items-center justify-center ${className}`}
    >
      {/* Video */}
      {!cameraOff && stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 h-full w-full object-cover ${mirrored ? "scale-x-[-1]" : ""}`}
        />
      )}

      {/* Avatar when camera off */}
      {cameraOff && (
        <div className="flex flex-col items-center gap-2">
          <Avatar name={name} />
        </div>
      )}

      {/* Gradient scrim for name legibility */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />

      {/* Name + mic status pill – bottom left */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
        {muted && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ea4335]">
            <MicOff className="h-3 w-3 text-white" />
          </span>
        )}
        <span className="rounded-sm bg-black/50 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
          {name}
        </span>
      </div>

      {/* Camera-off badge */}
      {cameraOff && (
        <div className="absolute bottom-2 right-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/50">
            <VideoOff className="h-3 w-3 text-white/70" />
          </span>
        </div>
      )}
    </div>
  );
}

export function RoomClient({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isScreenSharePending, setIsScreenSharePending] = useState(false);
  const [isSessionPending, setIsSessionPending] = useState(false);
  const [mediaState, setMediaState] = useState<MediaState>({});
  const [roomState, setRoomState] = useState<RoomState>({
    ...EMPTY_ROOM_STATE,
    roomId,
  });
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [screenShareError, setScreenShareError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState("--:--");
  const [currentRoomLink, setCurrentRoomLink] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<PeerMap>({});
  const roomStateRef = useRef<RoomState>({ ...EMPTY_ROOM_STATE, roomId });
  const knownUsersRef = useRef<Record<string, UserSnapshot>>({});
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const publishedStreamsRef = useRef<MediaStream[]>([]);
  const iceServersRef = useRef<RTCIceServer[]>(buildFallbackIceServers());
  const pendingJoinShareStateRef = useRef({
    active: false,
    displaySurface: null as string | null,
  });
  const isLeavingRef = useRef(false);
  const signalingServerUrl = useMemo(() => getSignalingServerUrl(), []);
  const selectedRole = session?.user.role ?? null;
  const displayName = session?.user.email ?? "";
  const decoratedParticipants = useMemo(
    () => classifyRemoteParticipants(participants, mediaState),
    [mediaState, participants],
  );
  const interviewerPeerId = useMemo(
    () =>
      Object.values(knownUsersRef.current).find((u) => u.role === "interviewer")
        ?.peerId ?? null,
    [mediaState],
  );
  const candidatePeerId = useMemo(
    () =>
      Object.values(knownUsersRef.current).find((u) => u.role === "candidate")
        ?.peerId ?? null,
    [mediaState],
  );

  /* ── helpers (unchanged) ── */
  const syncKnownUsers = (users: UserSnapshot[]) => {
    const next: Record<string, UserSnapshot> = {};
    users.forEach((u) => {
      next[u.peerId] = u;
    });
    knownUsersRef.current = next;
    setMediaState(next);
  };

  const createPeer = (
    targetPeerId: string,
    callerId: string,
    streams: MediaStream[],
    socket: Socket,
    initiator: boolean,
  ) => {
    const peer = new Peer({
      initiator,
      trickle: true,
      streams,
      config: { iceServers: iceServersRef.current },
    });
    peer.on("signal", (signal) => {
      const s = signal as { type?: string; candidate?: unknown };
      const type =
        s.type === "answer"
          ? "answer"
          : s.candidate
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
      setParticipants((cur) => {
        const idx = cur.findIndex(
          (p) => p.peerId === targetPeerId && p.streamId === remoteStream.id,
        );
        if (idx >= 0)
          return cur.map((p, i) =>
            i === idx ? { ...p, stream: remoteStream, peer } : p,
          );
        return [
          ...cur,
          {
            peerId: targetPeerId,
            streamId: remoteStream.id,
            stream: remoteStream,
            peer,
          },
        ];
      });
    });
    peer.on("close", () => {
      setParticipants((cur) => cur.filter((p) => p.peerId !== targetPeerId));
      delete peersRef.current[targetPeerId];
    });
    peer.on("error", () => {
      setParticipants((cur) => cur.filter((p) => p.peerId !== targetPeerId));
      delete peersRef.current[targetPeerId];
      peer.destroy();
    });
    return peer;
  };

  const teardownPeerMesh = () => {
    Object.values(peersRef.current).forEach((p) => p.destroy());
    peersRef.current = {};
    setParticipants([]);
  };

  const ensurePeerConnections = () => {
    const socket = socketRef.current;
    const streams = publishedStreamsRef.current;
    if (!socket || !streams.length || !roomStateRef.current.interviewStarted)
      return;
    const socketId = socket.id;
    if (!socketId) return;
    Object.values(knownUsersRef.current).forEach((u) => {
      if (u.peerId === socketId || peersRef.current[u.peerId]) return;
      const initiator = socketId.localeCompare(u.peerId) < 0;
      peersRef.current[u.peerId] = createPeer(
        u.peerId,
        socketId,
        streams,
        socket,
        initiator,
      );
    });
  };

  const releaseRoomConnection = (announceLeave = true) => {
    const socket = socketRef.current;
    const socketId = socket?.id;
    teardownPeerMesh();
    if (announceLeave && socket && socketId)
      socket.emit("leave-room", { roomId, peerId: socketId });
    socket?.disconnect();
    socketRef.current = null;
    setSocketConnected(false);
    syncKnownUsers([]);
    const next = { ...EMPTY_ROOM_STATE, roomId };
    setRoomState(next);
    roomStateRef.current = next;
  };

  const ensureCameraAndMic = async () => {
    const existing = cameraStreamRef.current;
    if (
      existing &&
      existing.getTracks().filter((t) => t.readyState === "live").length
    )
      return existing;
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

  const handleCandidateShareEnded = () => {
    if (isLeavingRef.current) return;
    releaseRoomConnection();
    stopTracks(screenStreamRef.current);
    screenStreamRef.current = null;
    publishedStreamsRef.current = cameraStreamRef.current
      ? [cameraStreamRef.current]
      : [];
    setLocalStream(cameraStreamRef.current);
    setIsScreenSharing(false);
    setScreenShareError(
      "Candidate screen sharing is mandatory. Share the entire screen again to rejoin.",
    );
  };

  const connectToRoom = (
    streams: MediaStream[],
    previewStream: MediaStream,
  ) => {
    if (!selectedRole || !session?.token) return;
    releaseRoomConnection(false);
    publishedStreamsRef.current = streams;
    const socket = io(signalingServerUrl, {
      autoConnect: true,
      transports: ["websocket"],
      auth: { token: session.token },
    });
    socketRef.current = socket;
    socket.on("connect", () => {
      const socketId = socket.id ?? "";
      if (!socketId) return;
      setSocketConnected(true);
      setConnectionError(null);
      setServerError(null);
      socket.emit(
        "join-room",
        {
          roomId,
          peerId: socketId,
          shareState: pendingJoinShareStateRef.current,
        },
        (response: { ok: boolean; message?: string }) => {
          if (!response.ok) {
            setServerError(response.message ?? "Unable to join this room.");
            releaseRoomConnection(false);
          }
        },
      );
    });
    socket.on("room-users", ({ users }: { users: UserSnapshot[] }) => {
      syncKnownUsers(users);
      ensurePeerConnections();
    });
    socket.on("room-state", (nextRoomState: RoomState) => {
      setRoomState(nextRoomState);
      roomStateRef.current = nextRoomState;
      if (nextRoomState.interviewStarted) ensurePeerConnections();
      else teardownPeerMesh();
    });
    socket.on("peer-joined", (user: UserSnapshot) => {
      syncKnownUsers([...Object.values(knownUsersRef.current), user]);
      ensurePeerConnections();
    });
    socket.on("offer", ({ from, signal }) => {
      const localSocket = socketRef.current;
      const localStreams = publishedStreamsRef.current;
      const socketId = localSocket?.id;
      if (!localSocket || !localStreams.length || !socketId) return;
      if (!peersRef.current[from])
        peersRef.current[from] = createPeer(
          from,
          socketId,
          localStreams,
          localSocket,
          false,
        );
      peersRef.current[from]?.signal(signal);
    });
    socket.on("answer", ({ from, signal }) => {
      peersRef.current[from]?.signal(signal);
    });
    socket.on("ice-candidate", ({ from, candidate }) => {
      if (candidate) peersRef.current[from]?.signal(candidate);
    });
    socket.on(
      "share-state-changed",
      ({ peerId, shareActive, displaySurface }) => {
        syncKnownUsers(
          Object.values(knownUsersRef.current).map((u) =>
            u.peerId === peerId
              ? {
                  ...u,
                  shareActive,
                  displaySurface,
                  cameraOff:
                    u.role === "candidate" ? !shareActive : u.cameraOff,
                }
              : u,
          ),
        );
      },
    );
    socket.on("media-state-changed", ({ peerId, muted, cameraOff }) => {
      syncKnownUsers(
        Object.values(knownUsersRef.current).map((u) =>
          u.peerId === peerId ? { ...u, muted, cameraOff } : u,
        ),
      );
    });
    socket.on("peer-left", ({ peerId }) => {
      peersRef.current[peerId]?.destroy();
      delete peersRef.current[peerId];
      syncKnownUsers(
        Object.values(knownUsersRef.current).filter((u) => u.peerId !== peerId),
      );
    });
    socket.on("room-error", ({ message }) => setServerError(message));
    socket.on("disconnect", () => setSocketConnected(false));
    socket.on("connect_error", (err) => {
      setSocketConnected(false);
      setConnectionError(
        `Unable to reach signaling server at ${signalingServerUrl}. ${err.message}`,
      );
    });
  };

  const ensureIceServers = async () => {
    if (!session?.token) {
      iceServersRef.current = buildFallbackIceServers();
      return;
    }
    try {
      const servers = await fetchIceServers(session.token);
      iceServersRef.current = normalizeIceServers(servers);
    } catch {
      iceServersRef.current = buildFallbackIceServers();
    }
  };

  const startInterviewerSession = async () => {
    if (!signalingServerUrl) {
      setConnectionError("Missing NEXT_PUBLIC_SIGNALING_SERVER_URL.");
      return;
    }
    setIsSessionPending(true);
    setError(null);
    setServerError(null);
    try {
      await ensureIceServers();
      const media = await ensureCameraAndMic();
      pendingJoinShareStateRef.current = {
        active: false,
        displaySurface: null,
      };
      setLocalStream(media);
      setIsScreenSharing(false);
      connectToRoom([media], media);
    } catch {
      setError("Unable to access camera or microphone.");
    } finally {
      setIsSessionPending(false);
    }
  };

  const startCandidateSession = async () => {
    if (!signalingServerUrl) {
      setConnectionError("Missing NEXT_PUBLIC_SIGNALING_SERVER_URL.");
      return;
    }
    setIsScreenSharePending(true);
    setError(null);
    setScreenShareError(null);
    setServerError(null);
    try {
      await ensureIceServers();
      const cameraStream = await ensureCameraAndMic();
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 15, max: 30 } },
        audio: false,
      });
      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack) throw new Error("No display track.");
      const displaySurface = screenTrack.getSettings().displaySurface ?? null;
      if (displaySurface !== "monitor") {
        stopTracks(screenStream);
        setScreenShareError(
          "Share the entire screen to start the interview. Window or tab sharing is not allowed.",
        );
        return;
      }
      stopTracks(screenStreamRef.current);
      screenTrack.addEventListener("ended", handleCandidateShareEnded, {
        once: true,
      });
      const screenOnlyStream = new MediaStream([screenTrack]);
      const audioTrack = cameraStream.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = !isMuted;
      screenStreamRef.current = screenStream;
      pendingJoinShareStateRef.current = { active: true, displaySurface };
      publishedStreamsRef.current = [cameraStream, screenOnlyStream];
      setLocalStream(cameraStream);
      setIsScreenSharing(true);
      connectToRoom([cameraStream, screenOnlyStream], cameraStream);
    } catch {
      setIsScreenSharing(false);
      setLocalStream(cameraStreamRef.current);
      setScreenShareError(
        "The interview will start only after the candidate shares their entire screen.",
      );
    } finally {
      setIsScreenSharePending(false);
    }
  };

  const toggleScreenShare = async () => {
    if (selectedRole !== "candidate" || isScreenSharePending) return;
    if (isScreenSharing) {
      stopTracks(screenStreamRef.current);
      handleCandidateShareEnded();
      return;
    }
    await startCandidateSession();
  };

  useEffect(() => {
    const activeSession = readSession();
    if (!activeSession) {
      router.replace("/login");
      return;
    }
    setSession(activeSession);
  }, [router]);

  useEffect(() => {
    setNow(formatClock(new Date()));
    setCurrentRoomLink(`${window.location.origin}/room/${roomId}`);
    const interval = window.setInterval(
      () => setNow(formatClock(new Date())),
      30000,
    );
    return () => window.clearInterval(interval);
  }, [roomId]);

  useEffect(() => {
    if (!selectedRole || !displayName || selectedRole !== "interviewer") return;
    if (socketRef.current || isSessionPending || localStream) return;
    void startInterviewerSession();
  }, [displayName, isSessionPending, localStream, selectedRole]);

  useEffect(() => {
    return () => {
      isLeavingRef.current = true;
      releaseRoomConnection(false);
      stopTracks(screenStreamRef.current);
      stopTracks(cameraStreamRef.current);
      screenStreamRef.current = null;
      cameraStreamRef.current = null;
      publishedStreamsRef.current = [];
    };
  }, []);

  const updateMediaState = (nextMuted: boolean) => {
    const socket = socketRef.current;
    if (!socket) return;
    const socketId = socket.id ?? "";
    if (!socketId) return;
    syncKnownUsers(
      Object.values(knownUsersRef.current).map((u) =>
        u.peerId === socketId ? { ...u, muted: nextMuted } : u,
      ),
    );
    socket.emit("media-state", {
      roomId,
      peerId: socketId,
      muted: nextMuted,
      cameraOff: selectedRole === "candidate" ? !isScreenSharing : false,
    });
  };

  const toggleMute = () => {
    const audioTrack = cameraStreamRef.current?.getAudioTracks()[0];
    if (!audioTrack) return;
    const next = !isMuted;
    audioTrack.enabled = !next;
    setIsMuted(next);
    updateMediaState(next);
  };

  const copyRoomLink = async () => {
    await navigator.clipboard.writeText(currentRoomLink);
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
    publishedStreamsRef.current = [];
    router.push("/");
  };

  /* ── derived participants ── */
  const candidateScreenParticipant = decoratedParticipants.find(
    (p) => p.peerId === candidatePeerId && p.kind === "screen",
  );
  const candidateCameraParticipant = decoratedParticipants.find(
    (p) => p.peerId === candidatePeerId && p.kind === "camera",
  );
  const interviewerCameraParticipant = decoratedParticipants.find(
    (p) => p.peerId === interviewerPeerId && p.kind === "camera",
  );

  const authMissing = !session;
  const candidateLocked = selectedRole === "candidate" && !isScreenSharing;

  /* ─────────────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────────────── */
  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[#202124] text-white">
      {/* ── Top bar ── */}
      <header className="flex flex-shrink-0 items-center justify-between px-4 py-2">
        {/* Left: room name + id */}
        <div className="flex min-w-0 flex-col">
          <span className="text-[15px] font-medium leading-5 text-white/90">
            hackbyte interview
          </span>
          <span className="text-[11px] text-white/50">{roomId}</span>
        </div>

        {/* Centre: clock */}
        <span className="hidden text-sm text-white/60 md:block">{now}</span>

        {/* Right: copy link */}
        <button
          onClick={copyRoomLink}
          className="flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/12"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy link
            </>
          )}
        </button>
      </header>

      {/* ── Error banners ── */}
      {(connectionError || serverError || screenShareError || error) && (
        <div className="mx-4 mb-1 flex flex-col gap-1">
          {connectionError && (
            <div className="rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-200">
              {connectionError}
            </div>
          )}
          {serverError && (
            <div className="rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-200">
              {serverError}
            </div>
          )}
          {screenShareError && (
            <div className="rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-200">
              {screenShareError}
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}
        </div>
      )}

      {/* ── Main stage ── */}
      <main className="relative flex flex-1 overflow-hidden p-2 pb-0">
        {/* ════════════════════════════════════
            INTERVIEWER VIEW
            Left: candidate screen (main)
            Right strip: candidate cam + self cam
        ════════════════════════════════════ */}
        {selectedRole === "interviewer" && (
          <div className="flex flex-1 gap-2">
            {/* Candidate screen — fills remaining width */}
            <div className="flex flex-1 flex-col">
              {candidateScreenParticipant ? (
                <MeetTile
                  stream={candidateScreenParticipant.stream}
                  name={`${mediaState[candidateScreenParticipant.peerId]?.name ?? "Candidate"}'s screen`}
                  muted={false}
                  cameraOff={false}
                  className="h-full"
                />
              ) : (
                <WaitingPlaceholder
                  message={
                    !roomState.interviewStarted
                      ? roomState.waitingFor === "interviewer"
                        ? "Waiting for interviewer to join…"
                        : roomState.waitingFor === "candidate_screen"
                          ? "Waiting for candidate to share their screen…"
                          : "Waiting for candidate to join…"
                      : "Waiting for candidate screen…"
                  }
                />
              )}
            </div>

            {/* Right strip: 240 px wide */}
            <div className="flex w-[220px] flex-shrink-0 flex-col gap-2">
              {/* Candidate camera */}
              {candidateCameraParticipant ? (
                <MeetTile
                  stream={candidateCameraParticipant.stream}
                  name={
                    mediaState[candidateCameraParticipant.peerId]?.name ??
                    "Candidate"
                  }
                  muted={mediaState[candidateCameraParticipant.peerId]?.muted}
                  cameraOff={
                    mediaState[candidateCameraParticipant.peerId]?.cameraOff
                  }
                  className="flex-1"
                />
              ) : (
                <div className="flex flex-1 items-center justify-center rounded-xl bg-[#3c4043] text-xs text-white/40">
                  No candidate feed
                </div>
              )}

              {/* Self cam */}
              <MeetTile
                stream={localStream ?? undefined}
                name={`${displayName || "You"} (you)`}
                muted={isMuted}
                cameraOff={false}
                mirrored
                className="flex-1"
              />
            </div>
          </div>
        )}

        {/* ════════════════════════════════════
            CANDIDATE VIEW
            Two equal tiles: self + interviewer
        ════════════════════════════════════ */}
        {selectedRole === "candidate" && !candidateLocked && (
          <div className="flex flex-1 items-center justify-center gap-2">
            {/* Self cam */}
            <MeetTile
              stream={localStream ?? undefined}
              name={`${displayName || "You"} (you)`}
              muted={isMuted}
              cameraOff={false}
              mirrored
              className="h-full flex-1"
            />

            {/* Interviewer cam */}
            {interviewerCameraParticipant ? (
              <MeetTile
                stream={interviewerCameraParticipant.stream}
                name={
                  mediaState[interviewerCameraParticipant.peerId]?.name ??
                  "Interviewer"
                }
                muted={mediaState[interviewerCameraParticipant.peerId]?.muted}
                cameraOff={
                  mediaState[interviewerCameraParticipant.peerId]?.cameraOff
                }
                className="h-full flex-1"
              />
            ) : (
              <div className="flex h-full flex-1 items-center justify-center rounded-xl bg-[#3c4043] text-sm text-white/40">
                Waiting for interviewer…
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════
            CANDIDATE LOCKED — share screen gate
        ════════════════════════════════════ */}
        {selectedRole === "candidate" && candidateLocked && !authMissing && (
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-md rounded-2xl bg-[#292a2d] p-8 text-center shadow-xl">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#ea4335]/15">
                <MonitorUp className="h-7 w-7 text-[#ea4335]" />
              </div>
              <h2 className="text-xl font-semibold text-white">
                Share your entire screen to join
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/55">
                This interview requires full-screen sharing. Window and tab
                sharing are not accepted.
              </p>
              <button
                onClick={() => void startCandidateSession()}
                disabled={isScreenSharePending}
                className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-[#1a73e8] px-6 text-sm font-medium text-white transition hover:bg-[#1765cc] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isScreenSharePending ? "Starting…" : "Share screen"}
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════
            AUTH MISSING
        ════════════════════════════════════ */}
        {authMissing && (
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-sm rounded-2xl bg-[#292a2d] p-8 text-center shadow-xl">
              <h2 className="text-xl font-semibold text-white">
                Session expired
              </h2>
              <p className="mt-3 text-sm text-white/55">
                Sign in again to continue.
              </p>
              <button
                onClick={() => {
                  clearSession();
                  router.push("/login");
                }}
                className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-[#1a73e8] px-6 text-sm font-medium text-white transition hover:bg-[#1765cc]"
              >
                Go to login
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Control bar (unchanged component, Google Meet places it at bottom centre) ── */}
      <div className="flex-shrink-0">
        <ControlBar
          isMuted={isMuted}
          isScreenSharing={isScreenSharing}
          isScreenSharePending={isScreenSharePending}
          showScreenShareControl={selectedRole === "candidate"}
          controlsLocked={
            selectedRole === "candidate" ? candidateLocked : false
          }
          onToggleMute={toggleMute}
          onToggleScreenShare={() => void toggleScreenShare()}
          onCopyLink={copyRoomLink}
          onLeave={leaveRoom}
        />
      </div>
    </div>
  );
}

/* ── Reusable waiting placeholder ── */
function WaitingPlaceholder({ message }: { message: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-xl bg-[#3c4043]">
      <div className="text-center">
        <div className="mx-auto mb-3 h-2.5 w-2.5 animate-pulse rounded-full bg-amber-400" />
        <p className="text-sm text-white/50">{message}</p>
      </div>
    </div>
  );
}
