"use client";

import { MicOff, VideoOff } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type VideoTileProps = {
  label: string;
  stream?: MediaStream;
  isMuted?: boolean;
  isCameraOff?: boolean;
  mirrored?: boolean;
  priority?: boolean;
  className?: string;
};

export function VideoTile({
  label,
  stream,
  isMuted,
  isCameraOff,
  mirrored,
  priority,
  className
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      void videoRef.current.play().catch(() => {
        // Browsers can briefly block autoplay while tracks attach.
      });
    }
  }, [stream]);

  return (
    <div
      className={cn(
        "video-tile relative overflow-hidden rounded-[1.75rem] border border-line/70 bg-slate-950 shadow-panel",
        priority ? "min-h-[320px]" : "min-h-[240px]",
        className
      )}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={mirrored}
        className={cn("h-full w-full object-cover", mirrored && "scale-x-[-1]", isCameraOff && "opacity-0")}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(15,23,42,0.18)_55%,rgba(15,23,42,0.7))]" />
      {isCameraOff && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 text-slate-100">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <VideoOff className="h-6 w-6" />
            </div>
            <p className="text-sm text-slate-300">Camera is off</p>
          </div>
        </div>
      )}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
        <div className="rounded-full bg-black/40 px-4 py-2 text-sm font-medium backdrop-blur">{label}</div>
        <div className="flex items-center gap-2">
          {isMuted && (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-danger/85">
              <MicOff className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
