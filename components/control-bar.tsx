"use client";

import { Camera, CameraOff, Copy, Mic, MicOff, PhoneOff } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

type ControlBarProps = {
  isMuted: boolean;
  isCameraOff: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onCopyLink: () => void;
  onLeave: () => void;
};

export function ControlBar({
  isMuted,
  isCameraOff,
  onToggleMute,
  onToggleCamera,
  onCopyLink,
  onLeave
}: ControlBarProps) {
  return (
    <div className="glass-panel fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-1.5rem)] max-w-3xl -translate-x-1/2 items-center justify-between rounded-full border border-line px-3 py-3 shadow-panel sm:w-auto sm:min-w-[640px]">
      <div className="flex items-center gap-2">
        <ControlButton
          label={isMuted ? "Unmute" : "Mute"}
          variant={isMuted ? "danger" : "neutral"}
          onClick={onToggleMute}
          icon={isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        />
        <ControlButton
          label={isCameraOff ? "Start Cam" : "Stop Cam"}
          variant={isCameraOff ? "danger" : "neutral"}
          onClick={onToggleCamera}
          icon={isCameraOff ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
        />
      </div>

      <div className="hidden items-center gap-2 sm:flex">
        <ControlButton label="Copy Link" variant="neutral" onClick={onCopyLink} icon={<Copy className="h-4 w-4" />} />
        <ThemeToggle />
      </div>

      <ControlButton label="Leave" variant="danger" onClick={onLeave} icon={<PhoneOff className="h-4 w-4" />} />
    </div>
  );
}

function ControlButton({
  label,
  icon,
  onClick,
  variant
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant: "neutral" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex h-12 items-center gap-2 rounded-full px-4 text-sm font-medium transition ${
        variant === "danger"
          ? "bg-danger text-white hover:brightness-110"
          : "border border-line bg-panel text-text hover:border-accent/40"
      }`}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}
