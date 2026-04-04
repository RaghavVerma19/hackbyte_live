export function VerifAiLogo({
  compact = false,
  subtitle,
}: {
  compact?: boolean;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div>
        <div className={`font-semibold tracking-tight text-white ${compact ? "text-lg" : "text-xl"}`}>
          <span className="font-serif italic">V</span>erif
          <span className="text-red-600">AI</span>
        </div>
        {subtitle ? (
          <div className="text-[11px] uppercase tracking-[0.3em] text-white/35">
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}
