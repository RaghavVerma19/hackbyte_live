"use client";

import {
  Copy,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
} from "lucide-react";

type ControlBarProps = {
  isMuted: boolean;
  isScreenSharing: boolean;
  isScreenSharePending: boolean;
  showScreenShareControl?: boolean;
  controlsLocked?: boolean;
  onToggleMute: () => void;
  onToggleScreenShare: () => void;
  onCopyLink: () => void;
  onLeave: () => void;
};

export function ControlBar({
  isMuted,
  isScreenSharing,
  isScreenSharePending,
  showScreenShareControl,
  controlsLocked,
  onToggleMute,
  onToggleScreenShare,
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
              disabled={controlsLocked}
              icon={isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            />
            {showScreenShareControl && (
              <RoundButton
                label={
                  isScreenSharing
                    ? "Stop sharing screen"
                    : isScreenSharePending
                      ? "Starting screen share"
                      : "Share screen to start"
                }
                active={isScreenSharing}
                danger={!isScreenSharing && !isScreenSharePending}
                onClick={onToggleScreenShare}
                disabled={isScreenSharePending}
                icon={<MonitorUp className="h-5 w-5" />}
              />
            )}
            <RoundButton
              label="Copy link"
              active
              onClick={onCopyLink}
              icon={<Copy className="h-5 w-5" />}
            />
            <button
              onClick={onLeave}
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#ea4335] px-5 text-sm font-medium text-white transition hover:bg-[#d93025] sm:h-14 sm:px-7"
            >
              <PhoneOff className="mr-2 h-5 w-5" />
              Leave
            </button>
          </div>
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
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-12 w-12 items-center justify-center rounded-full border text-sm transition sm:h-14 sm:w-14 ${
        danger
          ? "border-[#ea4335] bg-[#ea4335] text-white hover:bg-[#d93025]"
          : active
            ? "border-white/10 bg-[#3c4043] text-white hover:bg-[#4a4d50] dark:border-white/10"
            : "border-white/10 bg-[#3c4043] text-white"
      } ${disabled ? "cursor-not-allowed opacity-55 hover:bg-inherit" : ""} ${className ?? ""}`}
    >
      {icon}
    </button>
  );
}
