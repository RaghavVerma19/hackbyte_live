"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Peer from "simple-peer";
import { io, Socket } from "socket.io-client";
import {
  Check,
  Copy,
  MonitorUp,
  MicOff,
  VideoOff,
  Monitor,
  Camera,
} from "lucide-react";
import { ControlBar } from "@/components/control-bar";
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
type AiScoreState = {
  aiLikelihood: number | null;
  confidence: "idle" | "low" | "medium" | "high";
  samplesAnalyzed: number;
  updatedAt: number | null;
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
const EMPTY_AI_SCORE: AiScoreState = {
  aiLikelihood: null,
  confidence: "idle",
  samplesAnalyzed: 0,
  updatedAt: null,
};

/* ─── pure helpers ─── */
function getSignalingServerUrl() {
  if (process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL)
    return process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL;
  if (typeof window === "undefined") return "http://localhost:4000";
  const local =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  if (local)
    return `${window.location.protocol === "https:" ? "https:" : "http:"}//${window.location.hostname}:4000`;
  return "";
}
function buildFallbackIceServers(): RTCIceServer[] {
  return [{ urls: "stun:stun.l.google.com:19302" }];
}
function normalizeIceServers(s: IceServerConfig[]): RTCIceServer[] {
  if (!s.length) return buildFallbackIceServers();
  return s.map((x) => ({
    urls: x.urls,
    username: x.username,
    credential: x.credential,
  }));
}
function formatClock(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}
function stopTracks(s: MediaStream | null) {
  s?.getTracks().forEach((t) => t.stop());
}
function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}
function getAudioRecorderMimeType() {
  if (typeof MediaRecorder === "undefined") return "";

  const options = ["audio/webm;codecs=opus", "audio/webm"];
  return options.find((option) => MediaRecorder.isTypeSupported(option)) ?? "";
}
function getStreamScore(stream?: MediaStream) {
  const t = stream?.getVideoTracks()[0];
  if (!t) return 0;
  const s = t.getSettings();
  if (s.displaySurface === "monitor") return Number.MAX_SAFE_INTEGER;
  return (
    (typeof s.width === "number" ? s.width : 0) *
    (typeof s.height === "number" ? s.height : 0)
  );
}
function classifyRemoteParticipants(
  participants: RemoteParticipant[],
  knownUsers: MediaState,
): DecoratedRemoteParticipant[] {
  const grouped = new Map<string, RemoteParticipant[]>();
  participants.forEach((p) => {
    const c = grouped.get(p.peerId) ?? [];
    c.push(p);
    grouped.set(p.peerId, c);
  });
  return participants.map((p) => {
    const user = knownUsers[p.peerId];
    const peers = grouped.get(p.peerId) ?? [p];
    let kind: RemoteStreamKind = "camera";
    if (user?.role === "candidate" && user.shareActive && peers.length > 1) {
      const top = [...peers].sort(
        (a, b) => getStreamScore(b.stream) - getStreamScore(a.stream),
      )[0];
      if (top?.streamId === p.streamId) kind = "screen";
    }
    return { ...p, kind };
  });
}

/* ─── Avatar ─── */
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const palette = [
    "bg-[#1a73e8]",
    "bg-[#0f9d58]",
    "bg-[#f29900]",
    "bg-[#ea4335]",
    "bg-[#7b1fa2]",
    "bg-[#00796b]",
  ];
  const bg = palette[(name.charCodeAt(0) ?? 0) % palette.length];
  return (
    <div
      className={`flex h-16 w-16 items-center justify-center rounded-full ${bg} select-none text-xl font-medium text-white`}
    >
      {initials || "?"}
    </div>
  );
}

/* ─── MeetTile ─── */
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
      className={`relative flex items-center justify-center overflow-hidden rounded-xl bg-[#3c4043] ${className}`}
    >
      {!cameraOff && stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 h-full w-full object-cover ${mirrored ? "scale-x-[-1]" : ""}`}
        />
      )}
      {cameraOff && <Avatar name={name} />}
      {/* scrim */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/55 to-transparent" />
      {/* name + mic */}
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
      {cameraOff && (
        <div className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/50">
          <VideoOff className="h-3 w-3 text-white/70" />
        </div>
      )}
    </div>
  );
}

/* ─── CrossFadeTile — swaps with an opacity cross-fade on animKey change ─── */
function CrossFadeTile(props: {
  animKey: string;
  stream?: MediaStream;
  name: string;
  muted?: boolean;
  cameraOff?: boolean;
  className?: string;
}) {
  const { animKey, ...tileProps } = props;

  // Two layers: we always render both, alternate which is on top
  const [slot, setSlot] = useState<0 | 1>(0);
  const [slots, setSlots] = useState([
    { ...tileProps },
    { ...tileProps },
  ] as (typeof tileProps)[]);
  const [opacities, setOpacities] = useState([1, 0]);
  const transitioning = useRef(false);

  useEffect(() => {
    // always keep non-animating props (muted/cameraOff) in sync live
    if (!transitioning.current) {
      setSlots((prev) => {
        const next = [...prev] as typeof slots;
        next[slot] = { ...tileProps };
        return next;
      });
      return;
    }
  });

  const prevKey = useRef(animKey);
  useEffect(() => {
    if (animKey === prevKey.current) return;
    prevKey.current = animKey;

    const incoming = slot === 0 ? 1 : 0;
    transitioning.current = true;

    // Stage incoming layer with new content, invisible
    setSlots((prev) => {
      const next = [...prev] as typeof slots;
      next[incoming] = { ...tileProps };
      return next;
    });

    // Cross-fade: fade out current, fade in incoming
    const raf = requestAnimationFrame(() => {
      setOpacities((prev) => {
        const next = [...prev];
        next[slot] = 0;
        next[incoming] = 1;
        return next;
      });
    });

    const done = setTimeout(() => {
      setSlot(incoming as 0 | 1);
      transitioning.current = false;
    }, 380);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(done);
    };
  }, [animKey]);

  const TRANS = "opacity 340ms cubic-bezier(0.4,0,0.2,1)";

  return (
    <div
      className={`relative ${props.className ?? ""}`}
      style={{ isolation: "isolate" }}
    >
      {([0, 1] as const).map((i) => (
        <div
          key={i}
          className="absolute inset-0"
          style={{
            opacity: opacities[i],
            transition: TRANS,
            zIndex: i === slot ? 1 : 0,
            willChange: "opacity",
          }}
        >
          <MeetTile {...slots[i]} className="h-full w-full" />
        </div>
      ))}
    </div>
  );
}

/* ─── ViewToggle pill ─── */
function ViewToggle({
  value,
  onChange,
  screenAvailable,
}: {
  value: "screen" | "camera";
  onChange: (v: "screen" | "camera") => void;
  screenAvailable: boolean;
}) {
  return (
    <div
      className="flex items-center gap-0.5 rounded-full p-1 backdrop-blur-md"
      style={{
        background: "rgba(0,0,0,0.45)",
        boxShadow: "0 2px 18px rgba(0,0,0,0.5)",
      }}
    >
      <PillBtn
        active={value === "screen"}
        disabled={!screenAvailable}
        icon={<Monitor className="h-3.5 w-3.5" />}
        label="Screen"
        onClick={() => screenAvailable && onChange("screen")}
      />
      <PillBtn
        active={value === "camera"}
        icon={<Camera className="h-3.5 w-3.5" />}
        label="Camera"
        onClick={() => onChange("camera")}
      />
    </div>
  );
}

function PillBtn({
  active,
  disabled = false,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        transition:
          "background 240ms cubic-bezier(0.4,0,0.2,1), color 240ms cubic-bezier(0.4,0,0.2,1), opacity 240ms",
        background: active ? "rgba(255,255,255,0.18)" : "transparent",
        color: active ? "#fff" : "rgba(255,255,255,0.5)",
        opacity: disabled ? 0.35 : 1,
      }}
      className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed"
    >
      {icon}
      {label}
    </button>
  );
}

/* ─── WaitingPlaceholder ─── */
function WaitingPlaceholder({ message }: { message: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-xl bg-[#3c4043]">
      <div className="text-center">
        <div className="mx-auto mb-3 h-2 w-2 animate-pulse rounded-full bg-amber-400" />
        <p className="text-sm text-white/40">{message}</p>
      </div>
    </div>
  );
}

function AiSignalCard({ score }: { score: AiScoreState }) {
  const percentage = score.aiLikelihood ?? 0;
  const tone =
    percentage >= 70
      ? {
          label: "High",
          accent: "bg-red-400",
          text: "text-red-200",
        }
      : percentage >= 40
        ? {
            label: "Medium",
            accent: "bg-amber-300",
            text: "text-amber-100",
          }
        : {
            label: "Low",
            accent: "bg-emerald-400",
            text: "text-emerald-200",
          };

  return (
    <div className="meet-slide rounded-xl bg-[#2a2b2f] px-4 py-3" style={{ animationDelay: "20ms" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
            Live AI signal
          </div>
          <div className="mt-1 text-2xl font-semibold text-white">
            {score.aiLikelihood === null ? "--" : `${score.aiLikelihood}%`}
          </div>
        </div>
        <span className={`rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-medium ${tone.text}`}>
          {score.aiLikelihood === null ? "Listening" : tone.label}
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
        <div
          className={`h-full rounded-full transition-all duration-500 ${tone.accent}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-white/45">
        <span>{score.samplesAnalyzed} sample{score.samplesAnalyzed === 1 ? "" : "s"}</span>
        <span className="capitalize">{score.confidence}</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ROOM CLIENT
══════════════════════════════════════════════════════════════════ */
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
  const [aiScore, setAiScore] = useState<AiScoreState>(EMPTY_AI_SCORE);
  /* which feed the interviewer sees as main */
  const [interviewerMainView, setInterviewerMainView] = useState<
    "screen" | "camera"
  >("screen");

  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<PeerMap>({});
  const roomStateRef = useRef<RoomState>({ ...EMPTY_ROOM_STATE, roomId });
  const knownUsersRef = useRef<Record<string, UserSnapshot>>({});
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const publishedStreamsRef = useRef<MediaStream[]>([]);
  const iceServersRef = useRef<RTCIceServer[]>(buildFallbackIceServers());
  const isMutedRef = useRef(false);
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

  /* ── sync helpers ── */
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
    peer.on("signal", (sig) => {
      const s = sig as { type?: string; candidate?: unknown };
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
        signal: sig,
        candidate: sig,
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
      setParticipants((c) => c.filter((p) => p.peerId !== targetPeerId));
      delete peersRef.current[targetPeerId];
    });
    peer.on("error", () => {
      setParticipants((c) => c.filter((p) => p.peerId !== targetPeerId));
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
    const sid = socket.id;
    if (!sid) return;
    Object.values(knownUsersRef.current).forEach((u) => {
      if (u.peerId === sid || peersRef.current[u.peerId]) return;
      const initiator = sid.localeCompare(u.peerId) < 0;
      peersRef.current[u.peerId] = createPeer(
        u.peerId,
        sid,
        streams,
        socket,
        initiator,
      );
    });
  };

  const releaseRoomConnection = (announceLeave = true) => {
    const socket = socketRef.current;
    const sid = socket?.id;
    teardownPeerMesh();
    if (announceLeave && socket && sid)
      socket.emit("leave-room", { roomId, peerId: sid });
    socket?.disconnect();
    socketRef.current = null;
    setSocketConnected(false);
    setAiScore(EMPTY_AI_SCORE);
    syncKnownUsers([]);
    const next = { ...EMPTY_ROOM_STATE, roomId };
    setRoomState(next);
    roomStateRef.current = next;
  };

  const ensureCameraAndMic = async () => {
    const ex = cameraStreamRef.current;
    if (ex && ex.getTracks().filter((t) => t.readyState === "live").length)
      return ex;
    const m = await navigator.mediaDevices.getUserMedia({
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
    cameraStreamRef.current = m;
    return m;
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
      const sid = socket.id ?? "";
      if (!sid) return;
      setSocketConnected(true);
      setConnectionError(null);
      setServerError(null);
      socket.emit(
        "join-room",
        { roomId, peerId: sid, shareState: pendingJoinShareStateRef.current },
        (r: { ok: boolean; message?: string }) => {
          if (!r.ok) {
            setServerError(r.message ?? "Unable to join.");
            releaseRoomConnection(false);
          }
        },
      );
    });
    socket.on("room-users", ({ users }: { users: UserSnapshot[] }) => {
      syncKnownUsers(users);
      ensurePeerConnections();
    });
    socket.on("room-state", (next: RoomState) => {
      setRoomState(next);
      roomStateRef.current = next;
      if (next.interviewStarted) ensurePeerConnections();
      else teardownPeerMesh();
    });
    socket.on("peer-joined", (u: UserSnapshot) => {
      syncKnownUsers([...Object.values(knownUsersRef.current), u]);
      ensurePeerConnections();
    });
    socket.on("offer", ({ from, signal }) => {
      const s = socketRef.current;
      const st = publishedStreamsRef.current;
      const sid = s?.id;
      if (!s || !st.length || !sid) return;
      if (!peersRef.current[from])
        peersRef.current[from] = createPeer(from, sid, st, s, false);
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
    socket.on("ai-score-update", (nextAiScore: AiScoreState) => {
      setAiScore(nextAiScore);
    });
    socket.on("room-error", ({ message }) => setServerError(message));
    socket.on("disconnect", () => setSocketConnected(false));
    socket.on("connect_error", (e) => {
      setSocketConnected(false);
      setConnectionError(`Unable to reach server. ${e.message}`);
    });
  };

  const ensureIceServers = async () => {
    if (!session?.token) {
      iceServersRef.current = buildFallbackIceServers();
      return;
    }
    try {
      iceServersRef.current = normalizeIceServers(
        await fetchIceServers(session.token),
      );
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
      const m = await ensureCameraAndMic();
      pendingJoinShareStateRef.current = {
        active: false,
        displaySurface: null,
      };
      setLocalStream(m);
      setIsScreenSharing(false);
      connectToRoom([m], m);
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
      const cam = await ensureCameraAndMic();
      const screen = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 15, max: 30 } },
        audio: false,
      });
      const screenTrack = screen.getVideoTracks()[0];
      if (!screenTrack) throw new Error("No display track.");
      const surface = screenTrack.getSettings().displaySurface ?? null;
      if (surface !== "monitor") {
        stopTracks(screen);
        setScreenShareError(
          "Share the entire screen. Window or tab sharing is not allowed.",
        );
        return;
      }
      stopTracks(screenStreamRef.current);
      screenTrack.addEventListener("ended", handleCandidateShareEnded, {
        once: true,
      });
      const screenOnly = new MediaStream([screenTrack]);
      const audio = cam.getAudioTracks()[0];
      if (audio) audio.enabled = !isMuted;
      screenStreamRef.current = screen;
      pendingJoinShareStateRef.current = {
        active: true,
        displaySurface: surface,
      };
      publishedStreamsRef.current = [cam, screenOnly];
      setLocalStream(cam);
      setIsScreenSharing(true);
      connectToRoom([cam, screenOnly], cam);
    } catch {
      setIsScreenSharing(false);
      setLocalStream(cameraStreamRef.current);
      setScreenShareError(
        "The interview will start only after sharing the entire screen.",
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

  /* ── effects ── */
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    const s = readSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    setSession(s);
  }, [router]);

  useEffect(() => {
    setNow(formatClock(new Date()));
    setCurrentRoomLink(`${window.location.origin}/room/${roomId}`);
    const id = window.setInterval(() => setNow(formatClock(new Date())), 30000);
    return () => window.clearInterval(id);
  }, [roomId]);

  useEffect(() => {
    if (!selectedRole || !displayName || selectedRole !== "interviewer") return;
    if (socketRef.current || isSessionPending || localStream) return;
    void startInterviewerSession();
  }, [displayName, isSessionPending, localStream, selectedRole]);

  useEffect(() => {
    if (
      selectedRole !== "candidate" ||
      !localStream ||
      !socketConnected ||
      !roomState.interviewStarted
    ) {
      return;
    }

    const audioTrack = localStream.getAudioTracks()[0];
    const socket = socketRef.current;
    if (!audioTrack || !socket || typeof MediaRecorder === "undefined") {
      return;
    }

    const mimeType = getAudioRecorderMimeType();
    const audioStream = new MediaStream([audioTrack]);
    const recorder = mimeType
      ? new MediaRecorder(audioStream, { mimeType })
      : new MediaRecorder(audioStream);

    recorder.ondataavailable = async (event) => {
      if (!event.data.size || isMutedRef.current) return;

      const activeSocket = socketRef.current;
      const peerId = activeSocket?.id;
      if (!activeSocket || !peerId || activeSocket.disconnected) return;

      try {
        const audioBase64 = arrayBufferToBase64(await event.data.arrayBuffer());
        activeSocket.emit("candidate-audio-chunk", {
          roomId,
          peerId,
          mimeType: event.data.type || mimeType || "audio/webm",
          audioBase64,
        });
      } catch (transcriptionError) {
        console.error("Hidden transcription upload failed:", transcriptionError);
      }
    };

    recorder.start(8000);

    return () => {
      recorder.ondataavailable = null;
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
    };
  }, [localStream, roomId, roomState.interviewStarted, selectedRole, socketConnected]);

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

  /* Auto-switch to camera if screen share disappears, back to screen when it appears */
  const candidateScreenParticipant = decoratedParticipants.find(
    (p) => p.peerId === candidatePeerId && p.kind === "screen",
  );
  const candidateCameraParticipant = decoratedParticipants.find(
    (p) => p.peerId === candidatePeerId && p.kind === "camera",
  );
  const interviewerCameraParticipant = decoratedParticipants.find(
    (p) => p.peerId === interviewerPeerId && p.kind === "camera",
  );
  const hasScreenShare = !!candidateScreenParticipant;

  useEffect(() => {
    if (!hasScreenShare) setInterviewerMainView("camera");
    else
      setInterviewerMainView((prev) =>
        prev === "camera" && hasScreenShare ? "screen" : prev,
      );
  }, [hasScreenShare]);

  const toggleMute = () => {
    const t = cameraStreamRef.current?.getAudioTracks()[0];
    if (!t) return;
    const next = !isMuted;
    t.enabled = !next;
    setIsMuted(next);
    const socket = socketRef.current;
    if (!socket) return;
    const sid = socket.id ?? "";
    syncKnownUsers(
      Object.values(knownUsersRef.current).map((u) =>
        u.peerId === sid ? { ...u, muted: next } : u,
      ),
    );
    socket.emit("media-state", {
      roomId,
      peerId: sid,
      muted: next,
      cameraOff: selectedRole === "candidate" ? !isScreenSharing : false,
    });
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

  const authMissing = !session;
  const candidateLocked = selectedRole === "candidate" && !isScreenSharing;

  /* ── main tile data for interviewer ── */
  const mainParticipant =
    interviewerMainView === "screen"
      ? candidateScreenParticipant
      : candidateCameraParticipant;
  const secondaryCandidateParticipant =
    interviewerMainView === "screen"
      ? candidateCameraParticipant
      : candidateScreenParticipant;
  const mainMuted =
    interviewerMainView === "camera"
      ? (mediaState[mainParticipant?.peerId ?? ""]?.muted ?? false)
      : false;
  const mainCameraOff =
    interviewerMainView === "camera"
      ? (mediaState[mainParticipant?.peerId ?? ""]?.cameraOff ?? false)
      : false;
  const mainName =
    interviewerMainView === "screen"
      ? `${mediaState[mainParticipant?.peerId ?? ""]?.name ?? "Candidate"}'s screen`
      : (mediaState[mainParticipant?.peerId ?? ""]?.name ?? "Candidate");
  const secondaryCandidateMuted =
    interviewerMainView === "camera"
      ? false
      : (mediaState[secondaryCandidateParticipant?.peerId ?? ""]?.muted ?? false);
  const secondaryCandidateCameraOff =
    interviewerMainView === "camera"
      ? false
      : (mediaState[secondaryCandidateParticipant?.peerId ?? ""]?.cameraOff ?? false);
  const secondaryCandidateName =
    interviewerMainView === "camera"
      ? `${mediaState[secondaryCandidateParticipant?.peerId ?? ""]?.name ?? "Candidate"}'s screen`
      : (mediaState[secondaryCandidateParticipant?.peerId ?? ""]?.name ?? "Candidate");

  /* ═══════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════ */
  return (
    <>
      <style>{`
        @keyframes meetFadeIn {
          from { opacity: 0; transform: scale(0.975); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes meetSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .meet-fade   { animation: meetFadeIn  0.38s cubic-bezier(0.4,0,0.2,1) both; }
        .meet-slide  { animation: meetSlideUp 0.34s cubic-bezier(0.34,1.2,0.64,1) both; }
      `}</style>

      <div className="relative flex h-screen flex-col overflow-hidden bg-[#202124] text-white">
        {/* ── Top bar ── */}
        <header className="flex flex-shrink-0 items-center justify-between px-5 py-2.5">
          <div className="flex flex-col">
            <span className="text-[15px] font-medium text-white/90">
              hackbyte interview
            </span>
            <span className="text-[11px] text-white/45">{roomId}</span>
          </div>
          <span className="hidden text-sm text-white/50 md:block">{now}</span>
          <button
            onClick={copyRoomLink}
            className="flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/14"
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
              <div className="rounded-lg bg-amber-500/12 px-3 py-2 text-xs text-amber-200">
                {connectionError}
              </div>
            )}
            {serverError && (
              <div className="rounded-lg bg-red-500/12 px-3 py-2 text-xs text-red-200">
                {serverError}
              </div>
            )}
            {screenShareError && (
              <div className="rounded-lg bg-red-500/12 px-3 py-2 text-xs text-red-200">
                {screenShareError}
              </div>
            )}
            {error && (
              <div className="rounded-lg bg-red-500/12 px-3 py-2 text-xs text-red-200">
                {error}
              </div>
            )}
          </div>
        )}

        {/* ── Main stage — pb-[88px] keeps videos above the control bar ── */}
        <main className="relative flex flex-1 gap-2 overflow-hidden px-2 pb-[88px]">
          {/* ════════════════════════════════════
              INTERVIEWER VIEW
          ════════════════════════════════════ */}
          {selectedRole === "interviewer" && (
            <div className="flex flex-1 gap-2">
              {/* Main tile — cross-fades between screen and camera */}
              <div className="relative flex-1">
                {mainParticipant ? (
                  <CrossFadeTile
                    animKey={interviewerMainView}
                    stream={mainParticipant.stream}
                    name={mainName}
                    muted={mainMuted}
                    cameraOff={mainCameraOff}
                    className="h-full"
                  />
                ) : (
                  <WaitingPlaceholder
                    message={
                      !roomState.interviewStarted
                        ? roomState.waitingFor === "candidate_screen"
                          ? "Waiting for candidate to share their screen…"
                          : "Waiting for candidate to join…"
                        : "Waiting for candidate feed…"
                    }
                  />
                )}

                {/* Toggle pill — top-right of main tile, only when candidate is present */}
                {(candidateScreenParticipant || candidateCameraParticipant) && (
                  <div
                    className="absolute right-3 top-3 z-10 meet-slide"
                    style={{ animationDelay: "120ms" }}
                  >
                    <ViewToggle
                      value={interviewerMainView}
                      onChange={setInterviewerMainView}
                      screenAvailable={!!candidateScreenParticipant}
                    />
                  </div>
                )}
              </div>

              {/* Right strip: candidate cam (top) + self cam (bottom) */}
              <div className="flex w-[210px] flex-shrink-0 flex-col gap-2">
                <AiSignalCard score={aiScore} />

                <div
                  className="meet-slide flex-1"
                  style={{ animationDelay: "40ms" }}
                >
                  {secondaryCandidateParticipant ? (
                    <button
                      type="button"
                      onClick={() =>
                        setInterviewerMainView((prev) =>
                          prev === "screen" ? "camera" : "screen",
                        )
                      }
                      className="group relative h-full w-full text-left"
                    >
                      <MeetTile
                        stream={secondaryCandidateParticipant.stream}
                        name={secondaryCandidateName}
                        muted={secondaryCandidateMuted}
                        cameraOff={secondaryCandidateCameraOff}
                        className="h-full transition duration-300 group-hover:scale-[1.01] group-hover:shadow-[0_12px_36px_rgba(0,0,0,0.35)]"
                      />
                      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center pt-2">
                        <span className="rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm">
                          Click to swap
                        </span>
                      </div>
                    </button>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-xl bg-[#3c4043] text-xs text-white/35">
                      No candidate feed
                    </div>
                  )}
                </div>

                <div
                  className="meet-slide flex-1"
                  style={{ animationDelay: "80ms" }}
                >
                  <MeetTile
                    stream={localStream ?? undefined}
                    name={`${displayName || "You"} (you)`}
                    muted={isMuted}
                    cameraOff={false}
                    mirrored
                    className="h-full"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════
              CANDIDATE VIEW
          ════════════════════════════════════ */}
          {selectedRole === "candidate" && !candidateLocked && (
            <div className="flex flex-1 gap-2">
              <div className="meet-fade flex-1">
                <MeetTile
                  stream={localStream ?? undefined}
                  name={`${displayName || "You"} (you)`}
                  muted={isMuted}
                  cameraOff={false}
                  mirrored
                  className="h-full"
                />
              </div>

              {interviewerCameraParticipant ? (
                <div
                  className="meet-fade flex-1"
                  style={{ animationDelay: "70ms" }}
                >
                  <MeetTile
                    stream={interviewerCameraParticipant.stream}
                    name={
                      mediaState[interviewerCameraParticipant.peerId]?.name ??
                      "Interviewer"
                    }
                    muted={
                      mediaState[interviewerCameraParticipant.peerId]?.muted
                    }
                    cameraOff={
                      mediaState[interviewerCameraParticipant.peerId]?.cameraOff
                    }
                    className="h-full"
                  />
                </div>
              ) : (
                <div
                  className="meet-fade flex flex-1 items-center justify-center rounded-xl bg-[#3c4043] text-sm text-white/40"
                  style={{ animationDelay: "70ms" }}
                >
                  Waiting for interviewer…
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════
              CANDIDATE — screen share gate
          ════════════════════════════════════ */}
          {selectedRole === "candidate" && candidateLocked && !authMissing && (
            <div className="meet-fade flex flex-1 items-center justify-center">
              <div className="w-full max-w-md rounded-2xl bg-[#292a2d] p-8 text-center shadow-2xl">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#ea4335]/15">
                  <MonitorUp className="h-7 w-7 text-[#ea4335]" />
                </div>
                <h2 className="text-xl font-semibold text-white">
                  Share your entire screen to join
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/50">
                  This interview requires full-screen sharing. Window and tab
                  sharing are not accepted.
                </p>
                <button
                  onClick={() => void startCandidateSession()}
                  disabled={isScreenSharePending}
                  className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-[#1a73e8] px-6 text-sm font-medium text-white transition hover:bg-[#1765cc] disabled:opacity-60"
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
            <div className="meet-fade flex flex-1 items-center justify-center">
              <div className="w-full max-w-sm rounded-2xl bg-[#292a2d] p-8 text-center shadow-2xl">
                <h2 className="text-xl font-semibold text-white">
                  Session expired
                </h2>
                <p className="mt-3 text-sm text-white/50">
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

        {/* ── Control bar — absolutely positioned, floats above video ── */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-4 pointer-events-none">
          <div className="pointer-events-auto">
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
      </div>
    </>
  );
}
