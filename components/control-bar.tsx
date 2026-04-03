"use client";

import {
  Camera,
  CameraOff,
  Copy,
  EllipsisVertical,
  Info,
  Mic,
  MicOff,
  PhoneOff,
  SmilePlus,
} from "lucide-react";
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
  onLeave,
}: ControlBarProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-4 sm:pb-6">
      <div className="pointer-events-auto flex w-full max-w-[920px] flex-col items-center gap-3 sm:w-auto">
        <div className="meet-dock flex w-full items-center justify-between gap-2 rounded-[28px] px-3 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.28)] sm:min-w-[760px] sm:px-4">
          <div className="hidden min-w-[140px] text-sm text-muted lg:block">
            Built for quick calls
          </div>

          <div className="flex flex-1 items-center justify-center gap-2 sm:gap-3">
            <RoundButton
              label={isMuted ? "Turn on microphone" : "Turn off microphone"}
              active={!isMuted}
              danger={isMuted}
              onClick={onToggleMute}
              icon={isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            />
            <RoundButton
              label={isCameraOff ? "Turn on camera" : "Turn off camera"}
              active={!isCameraOff}
              danger={isCameraOff}
              onClick={onToggleCamera}
              icon={isCameraOff ? <CameraOff className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
            />
            <RoundButton
              label="Meeting details"
              active
              onClick={onCopyLink}
              icon={<Info className="h-5 w-5" />}
              className="hidden sm:inline-flex"
            />
            <RoundButton
              label="Copy link"
              active
              onClick={onCopyLink}
              icon={<Copy className="h-5 w-5" />}
            />
            <RoundButton
              label="Reactions"
              active
              onClick={() => undefined}
              icon={<SmilePlus className="h-5 w-5" />}
              className="hidden md:inline-flex"
            />
            <RoundButton
              label="More options"
              active
              onClick={() => undefined}
              icon={<EllipsisVertical className="h-5 w-5" />}
              className="hidden md:inline-flex"
            />
            <button
              onClick={onLeave}
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#ea4335] px-5 text-sm font-medium text-white transition hover:bg-[#d93025] sm:h-14 sm:px-7"
            >
              <PhoneOff className="mr-2 h-5 w-5" />
              Leave
            </button>
          </div>

          <div className="hidden min-w-[140px] justify-end lg:flex">
            <ThemeToggle />
          </div>
        </div>

        <div className="lg:hidden">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

function RoundButton({
  label,
  icon,
  onClick,
  active,
  danger,
  className,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  className?: string;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`inline-flex h-12 w-12 items-center justify-center rounded-full border text-sm transition sm:h-14 sm:w-14 ${
        danger
          ? "border-[#ea4335] bg-[#ea4335] text-white hover:bg-[#d93025]"
          : active
            ? "border-white/10 bg-[#3c4043] text-white hover:bg-[#4a4d50] dark:border-white/10"
            : "border-white/10 bg-[#3c4043] text-white"
      } ${className ?? ""}`}
    >
      {icon}
    </button>
  );
}
