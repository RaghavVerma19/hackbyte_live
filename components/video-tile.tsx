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
  compact?: boolean;
  className?: string;
};

export function VideoTile({
  label,
  stream,
  isMuted,
  isCameraOff,
  mirrored,
  priority,
  compact,
  className,
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
        "relative overflow-hidden rounded-[20px] bg-[#3c4043] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]",
        priority ? "min-h-[320px] lg:min-h-[420px]" : "min-h-[220px]",
        compact && "min-h-[180px]",
        className,
      )}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={mirrored}
        className={cn(
          "h-full w-full object-cover",
          mirrored && "scale-x-[-1]",
          isCameraOff && "opacity-0",
        )}
      />

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(32,33,36,0.02),rgba(32,33,36,0.14)_58%,rgba(32,33,36,0.78))]" />

      {isCameraOff && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#2d2f31]">
          <div className="flex flex-col items-center gap-3 text-white/90">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
              <VideoOff className="h-6 w-6" />
            </div>
            <p className="text-sm text-white/80">Camera off</p>
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-3 sm:p-4">
        <div className="rounded-md bg-black/20 px-2.5 py-1 text-sm font-medium text-white backdrop-blur-sm">
          {label}
        </div>

        {isMuted && (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm">
            <MicOff className="h-4 w-4" />
          </span>
        )}
      </div>
    </div>
  );
}
