"use client";

import type { ReactNode } from "react";
import { ChangeEvent, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  FileSearch,
  Github,
  LoaderCircle,
  ShieldAlert,
  UploadCloud,
} from "lucide-react";
import { clearSession, getApiBaseUrl, readSession } from "@/lib/auth";

type ResumeReport = {
  candidate?: {
    name?: string | null;
    email?: string | null;
  };
  atsAnalysis?: {
    score?: number;
    verdict?: string;
    highlights?: string[];
    wordCount?: number;
  };
  githubAnalytics?: {
    error?: string | null;
    profile?: {
      login?: string;
      name?: string | null;
      followers?: number;
      publicRepos?: number;
      profileUrl?: string;
    } | null;
    matches?: Array<{
      project?: string;
      repo?: string;
      repoUrl?: string | null;
      matchScore?: number;
      deploymentChecked?: boolean;
      stars?: number;
      language?: string | null;
      lastPushedAt?: string | null;
      commits?: {
        totalRecentCommits?: number;
        commitMessageQuality?: string;
        burstPattern?: string;
        collaboratorCount?: number;
        builtAlone?: boolean;
      };
    }>;
  };
  skillDecay?: Array<{
    skill?: string;
    monthsAgo?: number | null;
    decayFlag?: string;
  }>;
  codingProfilesVerification?: {
    verified?: boolean;
    results?: Record<
      string,
      {
        verified?: boolean;
        error?: string;
        mismatches?: string[];
        actual?: Record<string, string | number | null>;
      }
    >;
  };
  internships?: Array<{
    company?: string;
    role?: string | null;
    duration?: string | null;
    highlights?: string[];
  }>;
  finalAutomatedReview?: {
    summary?: string;
    hireSignal?: "strong" | "mixed" | "risky";
    focusAreas?: string[];
  };
};

function SectionCard({
  eyebrow,
  title,
  children,
  tone = "default",
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  tone?: "default" | "gold" | "emerald";
}) {
  const toneClasses =
    tone === "gold"
      ? "border-amber-200/20 bg-[linear-gradient(180deg,rgba(255,215,120,0.18),rgba(255,255,255,0.05))]"
      : tone === "emerald"
        ? "border-emerald-200/20 bg-[linear-gradient(180deg,rgba(52,211,153,0.15),rgba(255,255,255,0.05))]"
        : "border-white/10 bg-white/[0.05]";

  return (
    <section className={`resume-glass rounded-[30px] border p-6 ${toneClasses}`}>
      <div className="text-[11px] uppercase tracking-[0.28em] text-white/45">{eyebrow}</div>
      <h2 className="mt-3 text-xl font-medium text-white">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function UploadDashboard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "analyzing" | "complete" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [report, setReport] = useState<ResumeReport | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [sessionEmail, setSessionEmail] = useState("");
  const [token, setToken] = useState("");

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

  if (!sessionLoaded) {
    return null;
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void submitResume(file);
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

  const logout = () => {
    clearSession();
    router.push("/login");
  };

  const hireTone =
    report?.finalAutomatedReview?.hireSignal === "strong"
      ? "emerald"
      : report?.finalAutomatedReview?.hireSignal === "mixed"
        ? "gold"
        : "default";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0d0d0f] text-white">
      <div className="resume-ambient" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1480px] flex-col px-5 py-6 sm:px-8">
        <header className="resume-glass flex items-center justify-between rounded-[28px] border border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="text-sm text-white/50">HackByte verifier</div>
              <div className="text-xl font-medium tracking-tight">Resume intelligence console</div>
            </div>
          </div>

          <button
            onClick={logout}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Logout
          </button>
        </header>

        <div className="mt-6 grid flex-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="resume-glass rounded-[34px] border border-white/10 p-6 sm:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-2xl">
                <div className="text-[11px] uppercase tracking-[0.32em] text-white/45">
                  Candidate intake
                </div>
                <h1 className="mt-4 text-4xl font-medium tracking-tight sm:text-5xl">
                  Parse resumes, verify proof, and surface interview risks.
                </h1>
                <p className="mt-4 max-w-xl text-base leading-7 text-white/62">
                  Upload a candidate PDF and get ATS coverage, GitHub proof, coding-profile verification,
                  and a concise hiring summary in one pass.
                </p>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="group flex min-h-[220px] w-full cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed border-white/20 bg-[radial-gradient(circle_at_top,rgba(255,210,110,0.18),rgba(255,255,255,0.04)_55%)] px-6 text-center transition hover:border-white/30 hover:bg-[radial-gradient(circle_at_top,rgba(255,210,110,0.24),rgba(255,255,255,0.06)_60%)] xl:max-w-[360px]"
              >
                <UploadCloud className="h-10 w-10 text-amber-200 transition group-hover:scale-105" />
                <div className="mt-5 text-lg font-medium">Drop the candidate resume here</div>
                <div className="mt-2 text-sm leading-6 text-white/55">
                  PDF only. The backend extracts structured data, then cross-checks public claims.
                </div>
                <div className="mt-5 rounded-full bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.26em] text-white/60">
                  Click to upload
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {status === "error" && (
              <div className="mt-6 flex items-start gap-3 rounded-[24px] border border-red-300/20 bg-red-400/10 px-5 py-4 text-sm text-red-100">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {status === "analyzing" && (
              <div className="mt-6 flex items-center gap-4 rounded-[24px] border border-white/10 bg-white/[0.06] px-5 py-4">
                <LoaderCircle className="h-5 w-5 animate-spin text-amber-200" />
                <div>
                  <div className="text-sm font-medium">Running verification protocol</div>
                  <div className="mt-1 text-sm text-white/55">
                    Parsing PDF, extracting structured data, and validating public proof.
                  </div>
                </div>
              </div>
            )}

            {status !== "complete" && (
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                  <FileSearch className="h-5 w-5 text-amber-200" />
                  <div className="mt-3 text-lg font-medium">Structured extraction</div>
                  <p className="mt-2 text-sm leading-6 text-white/55">
                    Pulls contact info, project claims, skills, and coding profiles from a raw PDF.
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                  <Github className="h-5 w-5 text-amber-200" />
                  <div className="mt-3 text-lg font-medium">GitHub proofing</div>
                  <p className="mt-2 text-sm leading-6 text-white/55">
                    Matches projects, checks commit patterns, and flags dormant claimed skills.
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                  <Brain className="h-5 w-5 text-amber-200" />
                  <div className="mt-3 text-lg font-medium">Interview guidance</div>
                  <p className="mt-2 text-sm leading-6 text-white/55">
                    Produces a concise hiring signal and focus areas you can use live in the room.
                  </p>
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <SectionCard eyebrow="Access" title="Session operator" tone="gold">
              <div className="text-2xl font-medium">{sessionEmail}</div>
              <div className="mt-2 text-sm text-white/55">Role: interviewer</div>
              <div className="mt-5 rounded-[22px] border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-white/58">
                Use this panel to pre-screen before the live interview. The call room and resume console can
                run independently.
              </div>
            </SectionCard>

            {report && (
              <SectionCard eyebrow="Decision" title="Automated review" tone={hireTone}>
                <div className="flex items-center justify-between gap-4">
                  <div className="text-3xl font-medium capitalize">
                    {report.finalAutomatedReview?.hireSignal || "mixed"}
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-emerald-200" />
                </div>
                <p className="mt-4 text-sm leading-7 text-white/70">
                  {report.finalAutomatedReview?.summary || "Waiting for analysis output."}
                </p>
                <div className="mt-4 space-y-2">
                  {(report.finalAutomatedReview?.focusAreas || []).map((item) => (
                    <div key={item} className="rounded-2xl bg-white/[0.05] px-4 py-3 text-sm text-white/68">
                      {item}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </aside>
        </div>

        {report && (
          <section className="mt-6 grid gap-6 xl:grid-cols-[1.08fr_0.92fr_0.9fr]">
            <SectionCard eyebrow="Candidate" title={report.candidate?.name || "Unknown candidate"} tone="gold">
              <div className="text-sm text-white/55">{report.candidate?.email || "Email unavailable"}</div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[22px] bg-white/[0.05] p-4">
                  <div className="text-[11px] uppercase tracking-[0.25em] text-white/40">ATS score</div>
                  <div className="mt-2 text-4xl font-medium">{report.atsAnalysis?.score ?? 0}</div>
                  <div className="mt-2 text-sm text-white/55">{report.atsAnalysis?.verdict}</div>
                </div>
                <div className="rounded-[22px] bg-white/[0.05] p-4">
                  <div className="text-[11px] uppercase tracking-[0.25em] text-white/40">Resume density</div>
                  <div className="mt-2 text-4xl font-medium">{report.atsAnalysis?.wordCount ?? 0}</div>
                  <div className="mt-2 text-sm text-white/55">Words parsed from the PDF</div>
                </div>
              </div>

              <div className="mt-5">
                <div className="text-[11px] uppercase tracking-[0.25em] text-white/40">ATS highlights</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(report.atsAnalysis?.highlights || []).map((item) => (
                    <span key={item} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-white/70">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {(report.internships || []).map((internship, index) => (
                  <div key={`${internship.company}-${index}`} className="rounded-[22px] bg-white/[0.04] p-4">
                    <div className="text-lg font-medium">{internship.company || "Internship"}</div>
                    <div className="mt-1 text-sm text-white/55">
                      {[internship.role, internship.duration].filter(Boolean).join(" • ")}
                    </div>
                    <div className="mt-3 space-y-2 text-sm leading-6 text-white/70">
                      {(internship.highlights || []).map((highlight) => (
                        <div key={highlight}>{highlight}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard eyebrow="GitHub" title="Public proof and activity">
              {report.githubAnalytics?.error ? (
                <div className="rounded-[22px] border border-amber-200/15 bg-amber-400/10 p-4 text-sm leading-6 text-amber-50">
                  {report.githubAnalytics.error}
                </div>
              ) : (
                <>
                  <div className="rounded-[22px] bg-white/[0.05] p-4">
                    <div className="text-lg font-medium">
                      {report.githubAnalytics?.profile?.name || report.githubAnalytics?.profile?.login || "GitHub profile"}
                    </div>
                    <div className="mt-2 text-sm text-white/55">
                      Followers: {report.githubAnalytics?.profile?.followers ?? 0} • Public repos:{" "}
                      {report.githubAnalytics?.profile?.publicRepos ?? 0}
                    </div>
                    {report.githubAnalytics?.profile?.profileUrl && (
                      <a
                        href={report.githubAnalytics.profile.profileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex text-sm text-amber-200 hover:text-amber-100"
                      >
                        Open profile
                      </a>
                    )}
                  </div>

                  <div className="mt-4 space-y-3">
                    {(report.githubAnalytics?.matches || []).map((match) => (
                      <div key={`${match.repo}-${match.project}`} className="rounded-[22px] bg-white/[0.04] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-base font-medium">{match.project}</div>
                            <div className="mt-1 text-sm text-white/55">
                              Repo: {match.repo} • Match {match.matchScore ?? 0}%
                            </div>
                          </div>
                          <div className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-white/65">
                            {match.language || "Unknown stack"}
                          </div>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-white/68">
                          <div>Recent commits: {match.commits?.totalRecentCommits ?? 0}</div>
                          <div>Commit quality: {match.commits?.commitMessageQuality || "unknown"}</div>
                          <div>Burst pattern: {match.commits?.burstPattern || "unknown"}</div>
                          <div>
                            Collaborators: {match.commits?.collaboratorCount ?? 0}
                            {match.commits?.builtAlone ? " • solo-built" : ""}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </SectionCard>

            <SectionCard eyebrow="Validation" title="Skills and coding profiles">
              <div className="space-y-3">
                {(report.skillDecay || []).map((entry) => (
                  <div key={entry.skill} className="rounded-[22px] bg-white/[0.04] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-base font-medium">{entry.skill}</div>
                      <div className="text-sm text-white/50">
                        {entry.monthsAgo === null ? "No evidence" : `${entry.monthsAgo} months ago`}
                      </div>
                    </div>
                    <div className="mt-2 text-sm leading-6 text-white/65">{entry.decayFlag}</div>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-3">
                {Object.entries(report.codingProfilesVerification?.results || {}).map(([platform, result]) => (
                  <div key={platform} className="rounded-[22px] bg-white/[0.04] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-base font-medium capitalize">{platform}</div>
                      <div className="text-sm text-white/50">{result.verified ? "Verified" : "Needs review"}</div>
                    </div>
                    {result.error ? (
                      <div className="mt-2 text-sm text-red-200">{result.error}</div>
                    ) : (
                      <div className="mt-3 space-y-2 text-sm leading-6 text-white/65">
                        {(result.mismatches || []).length === 0 ? (
                          <div>No mismatch found in the sampled public data.</div>
                        ) : (
                          (result.mismatches || []).map((mismatch) => <div key={mismatch}>{mismatch}</div>)
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          </section>
        )}
      </div>
    </main>
  );
}
