"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Peer from "simple-peer";
import { io, Socket } from "socket.io-client";
import { Copy, Users, ShieldCheck, Wifi } from "lucide-react";
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

const SIGNALING_SERVER_URL =
  process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL ?? "http://localhost:4000";

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

export function RoomClient({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [socketConnected, setSocketConnected] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [mediaState, setMediaState] = useState<MediaState>({});
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<PeerMap>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const displayName = useMemo(
    () => `Guest ${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    [],
  );
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

  useEffect(() => {
    let isMounted = true;
    let activeStream: MediaStream | null = null;

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

          return [
            ...current,
            { peerId: targetPeerId, stream: remoteStream, peer },
          ];
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

    const setup = async () => {
      try {
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

        if (!isMounted) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }

        activeStream = media;
        localStreamRef.current = media;
        setLocalStream(media);

        const socket = io(SIGNALING_SERVER_URL, {
          transports: ["websocket"],
        });

        socketRef.current = socket;

        socket.on("connect", () => {
          const socketId = socket.id;

          if (!socketId) {
            return;
          }

          setSocketConnected(true);
          setMediaState((current) => ({
            ...current,
            [socketId]: {
              muted: false,
              cameraOff: false,
              name: displayName,
            },
          }));
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
                const peer = createPeer(
                  user.peerId,
                  socketId,
                  media,
                  socket,
                  true,
                );
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
            const peer = createPeer(peerId, socketId, media, socket, false);
            peersRef.current[peerId] = peer;
          }
        });

        socket.on("offer", ({ from, signal }) => {
          const socketId = socket.id;

          if (socketId && !peersRef.current[from]) {
            const peer = createPeer(from, socketId, media, socket, false);
            peersRef.current[from] = peer;
          }

          peersRef.current[from].signal(signal);
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
      } catch {
        setError(
          "Unable to access camera or microphone. Check browser permissions and try again.",
        );
      }
    };

    setup();

    return () => {
      isMounted = false;
      Object.values(peersRef.current).forEach((peer) => peer.destroy());
      peersRef.current = {};
      socketRef.current?.disconnect();
      localStreamRef.current = null;
      activeStream?.getTracks().forEach((track) => track.stop());
    };
  }, [displayName, roomId]);

  const updateMediaState = (nextMuted: boolean, nextCameraOff: boolean) => {
    const socket = socketRef.current;

    if (!socket?.id) {
      return;
    }

    const socketId = socket.id;

    setMediaState((current) => ({
      ...current,
      [socketId]: {
        ...(current[socketId] ?? { name: displayName }),
        muted: nextMuted,
        cameraOff: nextCameraOff,
      },
    }));

    socket.emit("media-state", {
      roomId,
      peerId: socketId,
      muted: nextMuted,
      cameraOff: nextCameraOff,
    });
  };

  const toggleMute = () => {
    if (!localStream) {
      return;
    }

    const nextMuted = !isMuted;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
    updateMediaState(nextMuted, isCameraOff);
  };

  const toggleCamera = () => {
    if (!localStream) {
      return;
    }

    const nextCameraOff = !isCameraOff;
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = !nextCameraOff;
    });
    setIsCameraOff(nextCameraOff);
    updateMediaState(isMuted, nextCameraOff);
  };

  const copyRoomLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
  };

  const leaveRoom = () => {
    const socketId = socketRef.current?.id;

    Object.values(peersRef.current).forEach((peer) => peer.destroy());
    peersRef.current = {};
    localStream?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    if (socketId) {
      socketRef.current?.emit("leave-room", {
        roomId,
        peerId: socketId,
      });
    }

    socketRef.current?.disconnect();
    router.push("/");
  };

  return (
    <main className="min-h-screen px-4 pb-28 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 rounded-[1.75rem] border border-line glass-panel px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted">Meeting room</p>
            <h1 className="text-2xl font-semibold tracking-tight">{roomId}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <Pill icon={<Users className="h-4 w-4" />}>
              {participants.length + 1} participants
            </Pill>
            <Pill icon={<Wifi className="h-4 w-4" />}>
              {socketConnected ? "Connected" : "Reconnecting"}
            </Pill>
            <Pill icon={<ShieldCheck className="h-4 w-4" />}>
              STUN/TURN Ready
            </Pill>
            <button
              onClick={copyRoomLink}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-4 py-2 text-text transition hover:border-accent/40"
            >
              <Copy className="h-4 w-4" />
              Copy Link
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-[1.75rem] border border-danger/40 bg-danger/10 px-6 py-5 text-danger">
            {error}
          </div>
        ) : (
          <div className="relative">
            <section className="glass-panel rounded-[2rem] border border-line p-4 sm:p-5">
              <div className={`grid gap-4 ${gridClassName}`}>
                {participants.length === 0 ? (
                  <div className="flex min-h-[380px] items-center justify-center rounded-[1.75rem] border border-dashed border-line bg-panel/60 text-center text-muted">
                    Waiting for others to join this room.
                  </div>
                ) : (
                  participants.map((participant) => (
                    <VideoTile
                      key={participant.peerId}
                      label={
                        mediaState[participant.peerId]?.name ?? "Participant"
                      }
                      stream={participant.stream}
                      isMuted={mediaState[participant.peerId]?.muted}
                      isCameraOff={mediaState[participant.peerId]?.cameraOff}
                      priority={participants.length === 1}
                    />
                  ))
                )}
              </div>
            </section>

            <aside className="pointer-events-none fixed bottom-24 right-4 z-30 w-[220px] sm:right-6 sm:w-[260px] lg:bottom-28">
              <div className="glass-panel pointer-events-auto rounded-[2rem] border border-line p-3 shadow-panel">
                <div className="mb-3 flex items-center justify-between px-2 pt-1">
                  <div>
                    <p className="text-sm text-muted">Self view</p>
                    <h2 className="text-lg font-semibold">{displayName}</h2>
                  </div>
                  <div className="rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">
                    Live
                  </div>
                </div>
                <VideoTile
                  label="You"
                  stream={localStream ?? undefined}
                  isMuted={isMuted}
                  isCameraOff={isCameraOff}
                  mirrored
                  className="min-h-[320px]"
                />
              </div>
            </aside>
          </div>
        )}
      </div>

      <ControlBar
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onCopyLink={copyRoomLink}
        onLeave={leaveRoom}
      />
    </main>
  );
}

function Pill({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-2">
      {icon}
      {children}
    </div>
  );
}
