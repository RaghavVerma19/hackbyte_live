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
import {
  clearSession,
  fetchIceServers,
  readSession,
  type AuthSession,
  type AuthRole,
  type IceServerConfig,
} from "@/lib/auth";

type Role = AuthRole;
type RemoteParticipant = { peerId: string; stream?: MediaStream; peer: Peer.Instance };
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
  if (process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL) return process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL;
  if (typeof window === "undefined") return "http://localhost:4000";
  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
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
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

function stopTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function roleLabel(role: Role) {
  return role === "candidate" ? "Candidate" : "Interviewer";
}

function buildTileLabel(user: { name: string; role: Role; shareActive: boolean }) {
  return user.shareActive ? `${user.name} · shared screen` : `${user.name} · ${roleLabel(user.role)}`;
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
  const [roomState, setRoomState] = useState<RoomState>({ ...EMPTY_ROOM_STATE, roomId });
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
  const publishedStreamRef = useRef<MediaStream | null>(null);
  const iceServersRef = useRef<RTCIceServer[]>(buildFallbackIceServers());
  const pendingJoinShareStateRef = useRef({ active: false, displaySurface: null as string | null });
  const isLeavingRef = useRef(false);
  const signalingServerUrl = useMemo(() => getSignalingServerUrl(), []);
  const selectedRole = session?.user.role ?? null;
  const displayName = session?.user.email ?? "";
  const gridClassName = useMemo(() => {
    const count = participants.length;
    if (count <= 1) return "grid-cols-1";
    if (count === 2) return "md:grid-cols-2";
    if (count <= 4) return "md:grid-cols-2 xl:grid-cols-2";
    return "md:grid-cols-2 xl:grid-cols-3";
  }, [participants.length]);

  const syncKnownUsers = (users: UserSnapshot[]) => {
    const nextKnownUsers: Record<string, UserSnapshot> = {};
    users.forEach((user) => {
      nextKnownUsers[user.peerId] = user;
    });
    knownUsersRef.current = nextKnownUsers;
    setMediaState(nextKnownUsers);
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
      config: { iceServers: iceServersRef.current },
    });

    peer.on("signal", (signal) => {
      const signalData = signal as { type?: string; candidate?: unknown };
      const type = signalData.type === "answer" ? "answer" : signalData.candidate ? "ice-candidate" : "offer";
      socket.emit(type, { roomId, targetPeerId, from: callerId, signal, candidate: signal });
    });

    peer.on("stream", (remoteStream) => {
      setParticipants((current) => {
        const existing = current.find((participant) => participant.peerId === targetPeerId);
        if (existing) {
          return current.map((participant) =>
            participant.peerId === targetPeerId ? { ...participant, stream: remoteStream, peer } : participant,
          );
        }
        return [...current, { peerId: targetPeerId, stream: remoteStream, peer }];
      });
    });

    peer.on("close", () => {
      setParticipants((current) => current.filter((participant) => participant.peerId !== targetPeerId));
      delete peersRef.current[targetPeerId];
    });

    peer.on("error", () => {
      setParticipants((current) => current.filter((participant) => participant.peerId !== targetPeerId));
      delete peersRef.current[targetPeerId];
      peer.destroy();
    });

    return peer;
  };

  const teardownPeerMesh = () => {
    Object.values(peersRef.current).forEach((peer) => peer.destroy());
    peersRef.current = {};
    setParticipants([]);
  };

  const ensurePeerConnections = () => {
    const socket = socketRef.current;
    const stream = publishedStreamRef.current;
    if (!socket || !stream || !roomStateRef.current.interviewStarted) return;
    const socketId = socket.id;
    if (!socketId) return;

    Object.values(knownUsersRef.current).forEach((user) => {
      if (user.peerId === socketId || peersRef.current[user.peerId]) return;
      const initiator = socketId.localeCompare(user.peerId) < 0;
      peersRef.current[user.peerId] = createPeer(user.peerId, socketId, stream, socket, initiator);
    });
  };

  const releaseRoomConnection = (announceLeave = true) => {
    const socket = socketRef.current;
    const socketId = socket?.id;
    teardownPeerMesh();
    if (announceLeave && socket && socketId) {
      socket.emit("leave-room", { roomId, peerId: socketId });
    }
    socket?.disconnect();
    socketRef.current = null;
    setSocketConnected(false);
    syncKnownUsers([]);
    const nextRoomState = { ...EMPTY_ROOM_STATE, roomId };
    setRoomState(nextRoomState);
    roomStateRef.current = nextRoomState;
  };

  const ensureCameraAndMic = async () => {
    const existingStream = cameraStreamRef.current;
    const existingTracks = existingStream?.getTracks().filter((track) => track.readyState === "live");
    if (existingStream && existingTracks?.length) return existingStream;
    const media = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 60 } },
    });
    cameraStreamRef.current = media;
    return media;
  };

  const handleCandidateShareEnded = () => {
    if (isLeavingRef.current) return;
    releaseRoomConnection();
    stopTracks(screenStreamRef.current);
    screenStreamRef.current = null;
    publishedStreamRef.current = null;
    setLocalStream(null);
    setIsScreenSharing(false);
    setScreenShareError("Candidate screen sharing is mandatory. Share the entire screen again to rejoin.");
  };

  const connectToRoom = (stream: MediaStream) => {
    if (!selectedRole || !session?.token) return;
    releaseRoomConnection(false);
    publishedStreamRef.current = stream;

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
      const localStream = publishedStreamRef.current;
      const socketId = localSocket?.id;
      if (!localSocket || !localStream || !socketId) return;
      if (!peersRef.current[from]) {
        peersRef.current[from] = createPeer(from, socketId, localStream, localSocket, false);
      }
      peersRef.current[from]?.signal(signal);
    });

    socket.on("answer", ({ from, signal }) => {
      peersRef.current[from]?.signal(signal);
    });

    socket.on("ice-candidate", ({ from, candidate }) => {
      if (candidate) peersRef.current[from]?.signal(candidate);
    });

    socket.on("share-state-changed", ({ peerId, shareActive, displaySurface }) => {
      syncKnownUsers(
        Object.values(knownUsersRef.current).map((user) =>
          user.peerId === peerId
            ? { ...user, shareActive, displaySurface, cameraOff: user.role === "candidate" ? !shareActive : user.cameraOff }
            : user,
        ),
      );
    });

    socket.on("media-state-changed", ({ peerId, muted, cameraOff }) => {
      syncKnownUsers(
        Object.values(knownUsersRef.current).map((user) =>
          user.peerId === peerId ? { ...user, muted, cameraOff } : user,
        ),
      );
    });

    socket.on("peer-left", ({ peerId }) => {
      peersRef.current[peerId]?.destroy();
      delete peersRef.current[peerId];
      syncKnownUsers(Object.values(knownUsersRef.current).filter((user) => user.peerId !== peerId));
    });

    socket.on("room-error", ({ message }) => setServerError(message));
    socket.on("disconnect", () => setSocketConnected(false));
    socket.on("connect_error", (connectError) => {
      setSocketConnected(false);
      setConnectionError(`Unable to reach signaling server at ${signalingServerUrl}. ${connectError.message}`);
    });
  };

  const ensureIceServers = async () => {
    if (!session?.token) {
      iceServersRef.current = buildFallbackIceServers();
      return;
    }

    try {
      const iceServers = await fetchIceServers(session.token);
      iceServersRef.current = normalizeIceServers(iceServers);
    } catch {
      iceServersRef.current = buildFallbackIceServers();
    }
  };

  const startInterviewerSession = async () => {
    if (!signalingServerUrl) {
      setConnectionError("Missing NEXT_PUBLIC_SIGNALING_SERVER_URL. Point the frontend to your signaling server.");
      return;
    }
    setIsSessionPending(true);
    setError(null);
    setServerError(null);
    try {
      await ensureIceServers();
      const media = await ensureCameraAndMic();
      pendingJoinShareStateRef.current = { active: false, displaySurface: null };
      setLocalStream(media);
      setIsScreenSharing(false);
      connectToRoom(media);
    } catch {
      setError("Unable to access camera or microphone. Check browser permissions and try again.");
    } finally {
      setIsSessionPending(false);
    }
  };

  const startCandidateSession = async () => {
    if (!signalingServerUrl) {
      setConnectionError("Missing NEXT_PUBLIC_SIGNALING_SERVER_URL. Point the frontend to your signaling server.");
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
      if (!screenTrack) throw new Error("No display track was returned.");

      const displaySurface = screenTrack.getSettings().displaySurface ?? null;
      if (displaySurface !== "monitor") {
        stopTracks(screenStream);
        setScreenShareError("Share the entire screen to start the interview. Window or tab sharing is not allowed.");
        return;
      }

      stopTracks(screenStreamRef.current);
      screenTrack.addEventListener("ended", handleCandidateShareEnded, { once: true });

      const interviewStream = new MediaStream([screenTrack]);
      const audioTrack = cameraStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMuted;
        interviewStream.addTrack(audioTrack);
      }

      screenStreamRef.current = screenStream;
      pendingJoinShareStateRef.current = { active: true, displaySurface };
      publishedStreamRef.current = interviewStream;
      setLocalStream(interviewStream);
      setIsScreenSharing(true);
      connectToRoom(interviewStream);
    } catch {
      setIsScreenSharing(false);
      setLocalStream(null);
      setScreenShareError("The interview will start only after the candidate shares their entire screen.");
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
    const interval = window.setInterval(() => setNow(formatClock(new Date())), 30000);
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
      publishedStreamRef.current = null;
    };
  }, []);

  const updateMediaState = (nextMuted: boolean) => {
    const socket = socketRef.current;
    if (!socket) return;
    const socketId = socket.id ?? "";
    if (!socketId) return;

    syncKnownUsers(
      Object.values(knownUsersRef.current).map((user) =>
        user.peerId === socketId ? { ...user, muted: nextMuted } : user,
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
    const nextMuted = !isMuted;
    audioTrack.enabled = !nextMuted;
    setIsMuted(nextMuted);
    updateMediaState(nextMuted);
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
    publishedStreamRef.current = null;
    router.push("/");
  };

  const participantCount = Object.keys(mediaState).length;
  const authMissing = !session;
  const candidateLocked = selectedRole === "candidate" && !isScreenSharing;
  const statusCopy =
    roomState.waitingFor === "candidate"
      ? "Waiting for a candidate to join."
      : roomState.waitingFor === "interviewer"
        ? "Waiting for an interviewer to join."
        : roomState.waitingFor === "candidate_screen"
          ? "Waiting for the candidate to share their entire screen."
          : roomState.waitingFor === "single_screen_share"
            ? "Only one screen share is allowed in the room."
            : "Interview is live.";

  return (
    <main className="min-h-screen bg-[#202124] text-white">
      <header className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden h-10 w-10 items-center justify-center rounded-2xl bg-white/5 sm:flex">
            <span className="text-lg font-semibold">H</span>
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-medium sm:text-lg">hackbyte interview</div>
            <div className="truncate text-xs text-white/60 sm:text-sm">{roomId}</div>
          </div>
        </div>

        <div className="hidden items-center gap-3 text-sm text-white/75 md:flex">
          <span>{now}</span>
          <span className="text-white/30">|</span>
          <span className="font-medium">{roomId.slice(0, 12)}</span>
        </div>

        <div className="flex items-center gap-2">
          <TopChip icon={<Users className="h-4 w-4" />} label={`${participantCount}`} />
          <TopChip icon={<Wifi className="h-4 w-4" />} label={socketConnected ? "Connected" : "Waiting"} />
          <TopChip
            icon={roomState.interviewStarted ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
            label={roomState.interviewStarted ? "Interview live" : "Rules pending"}
            className="hidden sm:inline-flex"
          />
        </div>
      </header>

      <section className="relative px-3 pb-32 sm:px-4 md:px-6">
        {connectionError && <Banner tone="amber">{connectionError}</Banner>}
        {serverError && <Banner tone="red">{serverError}</Banner>}
        {screenShareError && <Banner tone="red">{screenShareError}</Banner>}
        {error && <Banner tone="red">{error}</Banner>}

        <div className="mx-auto grid max-w-7xl gap-4 xl:grid-cols-[minmax(0,1fr)_328px]">
          <section className="relative min-h-[calc(100vh-180px)] overflow-hidden rounded-[28px] bg-[#161718] p-3 sm:p-4">
            <div className={`grid h-full gap-3 ${gridClassName}`}>
              {participants.length === 0 ? (
                <div className="flex min-h-[420px] items-center justify-center rounded-[24px] bg-[#2b2c2f] text-center text-white/68">
                  <div>
                    <p className="text-lg">{roomState.interviewStarted ? "Waiting for media" : "Interview is gated"}</p>
                    <p className="mt-2 text-sm text-white/50">{statusCopy}</p>
                  </div>
                </div>
              ) : (
                participants.map((participant) => {
                  const participantState = mediaState[participant.peerId];
                  return (
                    <VideoTile
                      key={participant.peerId}
                      label={participantState ? buildTileLabel(participantState) : "Participant"}
                      stream={participant.stream}
                      isMuted={participantState?.muted}
                      isCameraOff={participantState?.cameraOff}
                      priority={participants.length === 1}
                    />
                  );
                })
              )}
            </div>

            <div className="absolute left-5 top-5 hidden rounded-full bg-black/20 px-3 py-1.5 text-xs text-white/75 backdrop-blur md:inline-flex">
              Interview stage
            </div>

            {authMissing && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0f1011]/90 p-4 backdrop-blur-sm">
                <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-[#1d1f20] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8">
                  <h2 className="text-2xl font-semibold text-white">Authentication required</h2>
                  <p className="mt-3 text-sm leading-7 text-white/70 sm:text-base">
                    Your session is missing or expired. Sign in again to continue to the interview room.
                  </p>
                  <button
                    onClick={() => {
                      clearSession();
                      router.push("/login");
                    }}
                    className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-[#8ab4f8] px-6 text-sm font-semibold text-[#0b1220]"
                  >
                    Go to login
                  </button>
                </div>
              </div>
            )}

            {candidateLocked && !authMissing && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0f1011]/88 p-4 backdrop-blur-sm">
                <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-[#1d1f20] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ea4335]/15 text-[#ff8a80]">
                    <MonitorUp className="h-7 w-7" />
                  </div>
                  <h2 className="mt-5 text-2xl font-semibold text-white">Entire screen sharing is mandatory</h2>
                  <p className="mt-3 text-sm leading-7 text-white/70 sm:text-base">
                    Candidates can start the interview only after sharing the full screen. Window or browser-tab sharing will be rejected by the backend.
                  </p>
                  <button
                    onClick={() => void startCandidateSession()}
                    disabled={isScreenSharePending}
                    className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-[#8ab4f8] px-6 text-sm font-semibold text-[#0b1220] transition hover:bg-[#9bc0fa] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isScreenSharePending ? "Starting screen share..." : "Share entire screen"}
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
                  <h2 className="text-lg font-medium">{displayName || "Loading..."}</h2>
                  <p className="mt-1 text-xs text-white/45">{selectedRole ? roleLabel(selectedRole) : "Auth pending"}</p>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-medium ${roomState.interviewStarted ? "bg-emerald-500/15 text-emerald-300" : "bg-[#ea4335]/15 text-[#ff8a80]"}`}>
                  {roomState.interviewStarted ? "Live" : "Waiting"}
                </div>
              </div>
              <VideoTile
                label={selectedRole === "candidate" ? (isScreenSharing ? "Your shared screen" : "Full screen required") : "Your camera"}
                stream={localStream ?? undefined}
                isMuted={isMuted}
                isCameraOff={selectedRole === "candidate" ? !isScreenSharing : false}
                mirrored={selectedRole === "interviewer"}
                compact
                className="min-h-[240px] sm:min-h-[300px]"
              />
            </div>

            <div className="rounded-[28px] bg-[#161718] p-4 text-sm text-white/72">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-base font-medium text-white">Interview details</div>
                <button onClick={copyRoomLink} className="inline-flex items-center gap-2 rounded-full bg-[#303134] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#3c4043]">
                  {copied ? <><Check className="h-4 w-4" />Copied</> : <><Copy className="h-4 w-4" />Copy link</>}
                </button>
              </div>
              <div className="rounded-2xl bg-[#2b2c2f] px-4 py-3 text-xs leading-6 text-white/68">{currentRoomLink}</div>
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#2b2c2f] px-4 py-3">
                <MessageSquareText className="h-4 w-4 text-white/60" />
                <span>{statusCopy}</span>
              </div>
              <div className="mt-3 rounded-2xl bg-[#2b2c2f] px-4 py-3 text-xs leading-6 text-white/68">
                Candidate full-screen sharing is the only allowed screen share in the room.
              </div>
            </div>
          </aside>
        </div>
      </section>

      <ControlBar
        isMuted={isMuted}
        isScreenSharing={isScreenSharing}
        isScreenSharePending={isScreenSharePending}
        showScreenShareControl={selectedRole === "candidate"}
        controlsLocked={selectedRole === "candidate" ? candidateLocked : false}
        onToggleMute={toggleMute}
        onToggleScreenShare={() => void toggleScreenShare()}
        onCopyLink={copyRoomLink}
        onLeave={leaveRoom}
      />
    </main>
  );
}

function Banner({ tone, children }: { tone: "red" | "amber"; children: React.ReactNode }) {
  const toneClass =
    tone === "red"
      ? "border-red-500/30 bg-red-500/10 text-red-100"
      : "border-amber-500/30 bg-amber-500/10 text-amber-100";

  return <div className={`mx-auto mb-4 max-w-7xl rounded-2xl px-4 py-3 text-sm ${toneClass}`}>{children}</div>;
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
    <div className={`inline-flex h-10 items-center gap-2 rounded-full bg-white/6 px-3 text-sm text-white/80 ${className ?? ""}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}
