"use client";

import { motion } from "framer-motion";

type CircularProgressProps = {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
};

export function CircularProgress({
  value,
  size = 208,
  strokeWidth = 14,
  label = "ATS Match",
  sublabel = "Verified by VerifAI",
}: CircularProgressProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedValue / 100) * circumference;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="verifai-progress" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(45 212 191)" />
            <stop offset="50%" stopColor="rgb(34 211 238)" />
            <stop offset="100%" stopColor="rgb(74 222 128)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#verifai-progress)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          strokeDasharray={circumference}
          className="drop-shadow-[0_0_12px_rgba(45,212,191,0.6)]"
        />
      </svg>

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.2 }}
        className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full border border-white/10 bg-slate-950/70 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md"
      >
        <div className="text-[11px] uppercase tracking-[0.35em] text-white/45">
          {label}
        </div>
        <div className="mt-2 bg-gradient-to-r from-teal-300 via-cyan-300 to-emerald-300 bg-clip-text text-5xl font-semibold text-transparent">
          {clampedValue}%
        </div>
        <div className="mt-2 text-xs text-white/50">{sublabel}</div>
      </motion.div>
    </div>
  );
}

