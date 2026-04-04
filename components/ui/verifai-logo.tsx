import { Sparkles } from "lucide-react";

export function VerifAiLogo({
  compact = false,
  subtitle,
}: {
  compact?: boolean;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-teal-400/20 bg-gradient-to-br from-teal-400/20 via-cyan-400/12 to-emerald-400/20 text-teal-300 shadow-[0_0_30px_rgba(45,212,191,0.18)]">
        <Sparkles className="h-5 w-5" />
      </div>
      <div>
        <div className={`font-semibold tracking-tight text-white ${compact ? "text-lg" : "text-xl"}`}>
          VerifAI
        </div>
        {subtitle ? (
          <div className="text-xs uppercase tracking-[0.28em] text-white/40">
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}
