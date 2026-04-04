"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileUp, LoaderCircle } from "lucide-react";
import { AppFrame } from "@/components/verifai-layout";
import { useMockAuth } from "@/components/mock-auth-provider";

const MOCK_SKILLS = ["React", "Node.js", "System Design", "TypeScript", "SQL", "AWS"];

export default function ResumeVerifyPage() {
  const router = useRouter();
  const { isReady, isAuthenticated } = useMockAuth();
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace("/auth");
  }, [isAuthenticated, isReady, router]);

  const extractedSkills = useMemo(() => MOCK_SKILLS.slice(0, 4 + (fileName.length % 2)), [fileName]);

  if (!isReady || !isAuthenticated) return null;

  return (
    <AppFrame compactHeader>
      <section className="mx-auto w-full max-w-5xl px-6 pb-24">
        <div className="verifai-panel rounded-[34px] p-8 sm:p-10">
          <div className="verifai-badge">Resume Verifier</div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white">Validate candidate profiles with confidence.</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-white/60">
            Upload a PDF resume and simulate a verification pass that extracts structured skills and authenticity signals.
          </p>

          <label className="mt-10 block cursor-pointer rounded-[30px] border border-dashed border-cyan-300/30 bg-[rgba(12,31,39,0.7)] p-10 text-center transition hover:border-cyan-300/45 hover:bg-[rgba(13,35,43,0.85)]">
            <FileUp className="mx-auto h-10 w-10 text-cyan-200" />
            <div className="mt-5 text-xl font-medium text-white">Drag & drop a PDF or click to browse</div>
            <div className="mt-2 text-sm text-white/50">{fileName || "No file selected yet"}</div>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(event) => setFileName(event.target.files?.[0]?.name || "")}
            />
          </label>

          <button
            onClick={() => {
              setStatus("loading");
              window.setTimeout(() => setStatus("success"), 1600);
            }}
            className="verifai-primary-button mt-8"
          >
            {status === "loading" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            Verify Resume
          </button>

          {status === "success" && (
            <div className="mt-8 rounded-[28px] border border-emerald-300/25 bg-emerald-400/10 p-6">
              <div className="flex items-center gap-3 text-emerald-200">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-lg font-medium">Verification complete</span>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {extractedSkills.map((skill) => (
                  <span key={skill} className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-white/78">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </AppFrame>
  );
}
