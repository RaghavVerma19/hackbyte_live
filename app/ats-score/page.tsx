"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSearch, LoaderCircle } from "lucide-react";
import { AppFrame } from "@/components/verifai-layout";
import { useMockAuth } from "@/components/mock-auth-provider";

export default function AtsScorePage() {
  const router = useRouter();
  const { isReady, isAuthenticated } = useMockAuth();
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace("/auth");
  }, [isAuthenticated, isReady, router]);

  if (!isReady || !isAuthenticated) return null;

  const score = 85;

  return (
    <AppFrame compactHeader>
      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="verifai-panel rounded-[34px] p-8">
            <div className="verifai-badge">ATS Score</div>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white">See how hiring systems read the resume.</h1>
            <label className="mt-8 block cursor-pointer rounded-[30px] border border-dashed border-white/12 bg-white/[0.03] p-10 text-center transition hover:border-cyan-300/35">
              <FileSearch className="mx-auto h-10 w-10 text-cyan-200" />
              <div className="mt-4 text-lg font-medium text-white">Upload resume PDF</div>
              <div className="mt-2 text-sm text-white/45">{fileName || "Drop your file here"}</div>
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
                window.setTimeout(() => setStatus("done"), 1700);
              }}
              className="verifai-primary-button mt-8"
            >
              {status === "loading" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              Find ATS Score
            </button>
          </div>

          <div className="verifai-panel rounded-[34px] p-8">
            <div className="text-sm uppercase tracking-[0.26em] text-white/42">Scan result</div>
            {status !== "done" ? (
              <div className="mt-10 text-base leading-8 text-white/55">
                Start the scan to see a circular score and resume feedback.
              </div>
            ) : (
              <div className="mt-8">
                <div className="mx-auto flex h-56 w-56 items-center justify-center rounded-full border-[16px] border-cyan-300/18 border-t-cyan-300 text-5xl font-semibold text-white shadow-[0_0_60px_rgba(34,211,238,0.12)]">
                  {score}%
                </div>
                <div className="mt-8 space-y-3">
                  {[
                    "Add more measurable impact metrics under projects and internships.",
                    "Move core technical skills closer to the top for stronger parser visibility.",
                    "Use clearer role-specific keywords to better match ATS filters.",
                  ].map((item) => (
                    <div key={item} className="rounded-[22px] bg-white/[0.04] px-5 py-4 text-sm leading-7 text-white/72">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </AppFrame>
  );
}
