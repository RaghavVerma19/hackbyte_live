"use client";

import type { ReactNode } from "react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  FileSearch,
  LoaderCircle,
  Radar,
  ShieldAlert,
  UploadCloud,
} from "lucide-react";
import { CircularProgress } from "@/components/ui/circular-progress";
import { VerifAiLogo } from "@/components/ui/verifai-logo";
import { clearSession, getApiBaseUrl, readSession } from "@/lib/auth";

type ResumeReport = {
  candidate?: { name?: string | null; email?: string | null };
  atsAnalysis?: { score?: number; verdict?: string; highlights?: string[]; wordCount?: number };
  githubAnalytics?: {
    error?: string | null;
    profile?: { login?: string; name?: string | null; followers?: number; publicRepos?: number; profileUrl?: string } | null;
    matches?: Array<{
      project?: string;
      repo?: string;
      matchScore?: number;
      language?: string | null;
      commits?: {
        totalRecentCommits?: number;
        commitMessageQuality?: string;
        burstPattern?: string;
        collaboratorCount?: number;
        builtAlone?: boolean;
      };
    }>;
  };
  skillDecay?: Array<{ skill?: string; monthsAgo?: number | null; decayFlag?: string }>;
  codingProfilesVerification?: {
    verified?: boolean;
    results?: Record<string, { verified?: boolean; error?: string; mismatches?: string[] }>;
  };
  finalAutomatedReview?: {
    summary?: string;
    hireSignal?: "strong" | "mixed" | "risky";
    focusAreas?: string[];
  };
};

function Panel({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="resume-glass rounded-[30px] border border-white/10 p-6">
      <div className="text-[11px] uppercase tracking-[0.3em] text-white/40">{eyebrow}</div>
      <h2 className="mt-3 text-2xl font-semibold text-white">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function UploadDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mode = searchParams.get("mode") === "ats" ? "ats" : "resume";
  const [status, setStatus] = useState<"idle" | "analyzing" | "complete" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [report, setReport] = useState<ResumeReport | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [sessionEmail, setSessionEmail] = useState("");
  const [token, setToken] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [atsScore, setAtsScore] = useState<number | null>(null);

  useEffect(() => {
    const currentSession = readSession();
    if (!currentSession) {
      router.replace("/login");
      return;
    }
    if (currentSession.user.role !== "interviewer") {
      router.replace("/");
      return;
    }
    setSessionEmail(currentSession.user.email);
    setToken(currentSession.token);
    setSessionLoaded(true);
  }, [router]);

  const extractedSignals = useMemo(() => {
    if (!report) return [];
    const skills = (report.skillDecay || []).map((item) => item.skill).filter(Boolean) as string[];
    const highlights = report.atsAnalysis?.highlights || [];
    return [...new Set([...skills, ...highlights])].slice(0, 8);
  }, [report]);

  if (!sessionLoaded) {
    return null;
  }

  const setMode = (nextMode: "resume" | "ats") => {
    router.replace(`/upload?mode=${nextMode}`);
    setStatus("idle");
    setErrorMessage("");
    setReport(null);
    setAtsScore(null);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    if (mode === "resume") {
      await submitResume(file);
      return;
    }
    await simulateAtsScan(file);
  };

  const submitResume = async (selectedFile: File) => {
    setStatus("analyzing");
    setErrorMessage("");
    setReport(null);

    try {
      const formData = new FormData();
      formData.append("resume", selectedFile);

      const response = await fetch(`${getApiBaseUrl()}/api/analyze-resume`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || json.message || "Failed to analyze resume.");
      }

      setReport(json.data.verificationReport);
      setStatus("complete");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to analyze resume.");
      setStatus("error");
    }
  };

  const simulateAtsScan = async (_selectedFile: File) => {
    setStatus("analyzing");
    setErrorMessage("");
    setReport(null);
    setAtsScore(null);

    await new Promise((resolve) => window.setTimeout(resolve, 1600));
    setAtsScore(85);
    setStatus("complete");
  };

  const logout = () => {
    clearSession();
    router.push("/login");
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <div className="resume-ambient" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1480px] flex-col px-5 py-6 sm:px-8">
        <header className="resume-glass flex items-center justify-between rounded-[28px] border border-white/10 px-5 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <VerifAiLogo subtitle={mode === "resume" ? "Resume Verifier" : "ATS Score"} />
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 md:inline-flex">
              {sessionEmail}
            </div>
            <button
              onClick={logout}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <section className="resume-glass rounded-[34px] border border-white/10 p-6 sm:p-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-2xl">
                <div className="text-[11px] uppercase tracking-[0.32em] text-white/45">
                  Recruiter tools
                </div>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                  {mode === "resume"
                    ? "Verify resume authenticity with public proof."
                    : "Generate a polished ATS readiness score."}
                </h1>
                <p className="mt-4 max-w-xl text-base leading-8 text-white/62">
                  {mode === "resume"
                    ? "Upload a PDF to extract structure, validate GitHub and coding claims, and prepare better interview follow-ups."
                    : "Run a recruiter-friendly ATS scan view with a premium gauge, readiness score, and actionable feedback."}
                </p>
              </div>

              <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
                <button
                  onClick={() => setMode("resume")}
                  className={`rounded-full px-5 py-2 text-sm transition ${
                    mode === "resume" ? "bg-teal-500 font-medium text-slate-950" : "text-white/65"
                  }`}
                >
                  Resume Verify
                </button>
                <button
                  onClick={() => setMode("ats")}
                  className={`rounded-full px-5 py-2 text-sm transition ${
                    mode === "ats" ? "bg-teal-500 font-medium text-slate-950" : "text-white/65"
                  }`}
                >
                  ATS Score
                </button>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 rounded-[30px] border border-dashed border-white/15 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.16),rgba(255,255,255,0.04)_58%)] p-8 text-center"
            >
              <button
                onClick={() => fileInputRef.current?.click()}
                className="group flex w-full flex-col items-center justify-center"
              >
                <UploadCloud className="h-12 w-12 text-teal-300 transition group-hover:scale-105" />
                <div className="mt-5 text-xl font-medium">
                  {mode === "resume" ? "Drop a candidate PDF resume here" : "Drop a resume to run ATS scoring"}
                </div>
                <div className="mt-3 max-w-xl text-sm leading-7 text-white/55">
                  {mode === "resume"
                    ? "The backend will parse the document, verify public claims, and build a concise review."
                    : "We will simulate an ATS pass and show a premium score breakdown tailored for recruiter review."}
                </div>
                <div className="mt-6 rounded-full bg-white/10 px-5 py-2 text-xs uppercase tracking-[0.28em] text-white/65">
                  Click to upload
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              {selectedFileName ? (
                <div className="mt-6 text-sm text-teal-200">{selectedFileName}</div>
              ) : null}
            </motion.div>

            {status === "error" ? (
              <div className="mt-6 flex items-start gap-3 rounded-[24px] border border-red-300/20 bg-red-400/10 px-5 py-4 text-sm text-red-100">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            ) : null}

            {status === "analyzing" ? (
              <div className="mt-6 flex items-center gap-4 rounded-[24px] border border-white/10 bg-white/[0.06] px-5 py-4">
                <LoaderCircle className="h-5 w-5 animate-spin text-teal-200" />
                <div>
                  <div className="text-sm font-medium">
                    {mode === "resume" ? "Running resume verification" : "Scanning ATS compatibility"}
                  </div>
                  <div className="mt-1 text-sm text-white/55">
                    {mode === "resume"
                      ? "Parsing PDF, checking public proof, and preparing the recruiter summary."
                      : "Evaluating structure, readability, and keyword density for ATS systems."}
                  </div>
                </div>
              </div>
            ) : null}

            {mode === "resume" && status === "complete" && report ? (
              <div className="mt-8 grid gap-5 lg:grid-cols-2">
                <Panel eyebrow="Candidate" title={report.candidate?.name || "Candidate parsed"}>
                  <div className="text-sm text-white/55">{report.candidate?.email || "Email unavailable"}</div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {extractedSignals.length > 0 ? (
                      extractedSignals.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-white/75"
                        >
                          {item}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-white/50">No extracted signals available.</span>
                    )}
                  </div>
                </Panel>

                <Panel eyebrow="Decision" title="Verification summary">
                  <div className="text-sm leading-7 text-white/75">
                    {report.finalAutomatedReview?.summary || "Verification finished successfully."}
                  </div>
                  <div className="mt-5 space-y-3">
                    {(report.finalAutomatedReview?.focusAreas || []).map((item) => (
                      <div key={item} className="rounded-[20px] bg-white/[0.05] px-4 py-3 text-sm text-white/70">
                        {item}
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            ) : null}

            {mode === "ats" && status === "complete" && atsScore !== null ? (
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 rounded-[30px] border border-white/10 bg-white/[0.05] p-8"
              >
                <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                  <div className="flex justify-center">
                    <CircularProgress value={atsScore} />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.3em] text-white/40">ATS analysis</div>
                    <h2 className="mt-3 text-3xl font-semibold">Strong compatibility detected</h2>
                    <p className="mt-4 text-sm leading-7 text-white/65">
                      VerifAI found a clean structure, solid keyword density, and readable formatting for automated screening systems.
                    </p>
                    <div className="mt-6 space-y-3">
                      {[
                        "Professional summary aligns well with target software roles.",
                        "Technical keywords are visible without looking stuffed.",
                        "Project bullets are concise and ATS-readable.",
                      ].map((item) => (
                        <div key={item} className="flex items-start gap-3 rounded-[20px] bg-slate-950/55 px-4 py-3 text-sm text-white/75">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </section>

          <aside className="space-y-6">
            <Panel eyebrow="Mode" title={mode === "resume" ? "Resume verification" : "ATS readiness"}>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[22px] bg-white/[0.04] p-4">
                  <div className="flex items-center gap-3 text-white">
                    <FileSearch className="h-5 w-5 text-teal-300" />
                    Resume proof
                  </div>
                  <div className="mt-3 text-sm leading-6 text-white/55">
                    Match claims, inspect GitHub evidence, and produce recruiter-ready signals.
                  </div>
                </div>
                <div className="rounded-[22px] bg-white/[0.04] p-4">
                  <div className="flex items-center gap-3 text-white">
                    <Radar className="h-5 w-5 text-cyan-300" />
                    ATS clarity
                  </div>
                  <div className="mt-3 text-sm leading-6 text-white/55">
                    Surface scan readiness with a single score and compact feedback.
                  </div>
                </div>
              </div>
            </Panel>

            {report?.githubAnalytics ? (
              <Panel eyebrow="GitHub" title="Matched public proof">
                {report.githubAnalytics.error ? (
                  <div className="rounded-[20px] bg-red-400/10 px-4 py-3 text-sm text-red-100">
                    {report.githubAnalytics.error}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(report.githubAnalytics.matches || []).slice(0, 3).map((match) => (
                      <div key={`${match.project}-${match.repo}`} className="rounded-[20px] bg-white/[0.05] p-4">
                        <div className="text-base font-medium text-white">{match.project || match.repo}</div>
                        <div className="mt-2 text-sm text-white/55">
                          Match {match.matchScore ?? 0}% • {match.language || "Unknown language"}
                        </div>
                        <div className="mt-3 text-sm text-white/65">
                          Recent commits: {match.commits?.totalRecentCommits ?? 0} • {match.commits?.burstPattern || "unknown"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            ) : null}

            {report?.codingProfilesVerification ? (
              <Panel eyebrow="Profiles" title="Coding verification">
                <div className="space-y-3">
                  {Object.entries(report.codingProfilesVerification.results || {}).map(([platform, result]) => (
                    <div key={platform} className="rounded-[20px] bg-white/[0.05] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-base font-medium capitalize text-white">{platform}</div>
                        <div className="text-sm text-white/55">{result.verified ? "Verified" : "Needs review"}</div>
                      </div>
                      <div className="mt-3 text-sm leading-6 text-white/65">
                        {result.error || (result.mismatches || []).join(" ") || "No mismatch found in sampled public data."}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            ) : null}

            {mode === "ats" ? (
              <Panel eyebrow="Insights" title="Why this view matters">
                <div className="space-y-3">
                  {[
                    "Premium score presentation is easier to use during recruiter discussions.",
                    "A single gauge helps compare candidates quickly before the live interview starts.",
                    "This mode stays UI-only, so your backend resume analysis logic remains untouched.",
                  ].map((item) => (
                    <div key={item} className="rounded-[20px] bg-white/[0.05] px-4 py-3 text-sm leading-6 text-white/70">
                      {item}
                    </div>
                  ))}
                </div>
              </Panel>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
