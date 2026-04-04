"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BrainCircuit,
  FileSearch,
  Keyboard,
  LogOut,
  Radar,
  ShieldCheck,
  Sparkles,
  Video,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { ThemeToggle } from "@/components/theme-toggle";
import { VerifAiLogo } from "@/components/ui/verifai-logo";
import { AuthSession, clearSession, readSession } from "@/lib/auth";

const featureCards = [
  {
    title: "Resume Verifier",
    description: "Cross-check resumes, validate public proof, and highlight inconsistencies before the first round.",
    href: "/upload?mode=resume",
    icon: FileSearch,
    accent: "from-teal-400/20 via-cyan-400/10 to-emerald-400/20",
  },
  {
    title: "ATS Score",
    description: "Run a polished ATS scan view with guided feedback and a clean score presentation for recruiters.",
    href: "/upload?mode=ats",
    icon: Radar,
    accent: "from-cyan-400/20 via-sky-400/10 to-teal-400/20",
  },
  {
    title: "AI Interview",
    description: "Live proctoring, speech intelligence, MediaPipe eye tracking, and room-aware interview controls.",
    href: "/room/demo",
    icon: BrainCircuit,
    accent: "from-emerald-400/20 via-teal-400/10 to-cyan-400/20",
  },
];

const recentJudgments = [
  { candidate: "Aarav Sharma", date: "Apr 5, 2026", role: "Backend Engineer", status: "Highly Confident: Hire", tone: "text-teal-300 border-teal-400/20 bg-teal-400/10" },
  { candidate: "Meera Joshi", date: "Apr 4, 2026", role: "Product Analyst", status: "Requires Review", tone: "text-amber-200 border-amber-300/20 bg-amber-400/10" },
  { candidate: "Raghav Verma", date: "Apr 3, 2026", role: "Frontend Engineer", status: "Strong Technical Signal", tone: "text-cyan-200 border-cyan-300/20 bg-cyan-400/10" },
];

function AuthenticatedDashboard({
  session,
  meetingId,
  setMeetingId,
  previewLink,
  createMeeting,
  joinMeeting,
  logout,
}: {
  session: AuthSession;
  meetingId: string;
  setMeetingId: (value: string) => void;
  previewLink: string;
  createMeeting: () => void;
  joinMeeting: (event: FormEvent) => void;
  logout: () => void;
}) {
  const router = useRouter();

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      <div className="resume-ambient" />
      <div className="relative">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
          <div className="meet-shell flex items-center justify-between py-5">
            <VerifAiLogo subtitle="Interview intelligence" />
            <div className="flex items-center gap-3">
              <span className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/65 md:inline-flex">
                {session.user.role}
              </span>
              <button
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-teal-400/30 hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <section className="meet-shell py-8">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="verifai-mesh overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.14),transparent_34%),rgba(255,255,255,0.04)] p-8 shadow-[0_30px_120px_rgba(2,6,23,0.45)]"
          >
            <div className="absolute inset-x-0 top-0 h-32 verifai-grid opacity-25" />
            <div className="relative grid gap-10 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/20 bg-teal-400/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-teal-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  VerifAI command center
                </div>
                <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-6xl sm:leading-[1.02]">
                  {session.user.role === "interviewer"
                    ? "Let's hire good candidates."
                    : "All the best for your interview."}
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                  {session.user.role === "interviewer"
                    ? "Create new interviews, review resumes, and monitor live AI signals from the same premium workspace."
                    : "Join your interview room, keep your setup ready, and let VerifAI handle the live intelligence in the background."}
                </p>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  {session.user.role === "interviewer" ? (
                    <>
                      <button
                        onClick={createMeeting}
                        className="inline-flex h-12 items-center justify-center rounded-full bg-teal-500 px-6 text-sm font-medium text-slate-950 transition hover:bg-teal-400"
                      >
                        + Create New Interview
                      </button>
                      <button
                        onClick={() => router.push("/upload?mode=resume")}
                        className="inline-flex h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 text-sm font-medium text-white transition hover:border-teal-400/30 hover:bg-white/10"
                      >
                        Open Resume Console
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        const nextValue = meetingId.trim();
                        if (!nextValue) return;
                        router.push(`/room/${nextValue.split("/").pop()?.split("?")[0] ?? nextValue}`);
                      }}
                      className="inline-flex h-12 items-center justify-center rounded-full bg-teal-500 px-6 text-sm font-medium text-slate-950 transition hover:bg-teal-400"
                    >
                      Join your interview
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[28px] border border-white/10 bg-black/20 p-5 backdrop-blur-md">
                  <div className="text-xs uppercase tracking-[0.3em] text-white/40">
                    Interview access
                  </div>
                  <form
                    onSubmit={joinMeeting}
                    className="mt-5 rounded-[26px] border border-white/10 bg-white/5 p-3"
                  >
                    <div className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-slate-950/70 px-4 py-3">
                      <Keyboard className="h-4 w-4 text-white/45" />
                      <input
                        value={meetingId}
                        onChange={(event) => setMeetingId(event.target.value)}
                        placeholder={session.user.role === "candidate" ? "Paste the interview link or code" : "Paste room link to monitor"}
                        className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                      />
                    </div>
                    <button
                      type="submit"
                      className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-medium text-slate-950 transition hover:bg-teal-100"
                    >
                      Join Room
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </form>
                  <div className="mt-4 text-sm leading-6 text-white/45">{previewLink}</div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                    <div className="text-xs uppercase tracking-[0.28em] text-white/40">
                      Security
                    </div>
                    <div className="mt-4 flex items-center gap-3 text-white">
                      <ShieldCheck className="h-5 w-5 text-emerald-300" />
                      JWT auth, TURN relay, screen-share enforcement
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                    <div className="text-xs uppercase tracking-[0.28em] text-white/40">
                      Live intelligence
                    </div>
                    <div className="mt-4 flex items-center gap-3 text-white">
                      <BrainCircuit className="h-5 w-5 text-cyan-300" />
                      Transcript, AI score, and MediaPipe eye tracking
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {featureCards.map((card, index) => {
              const Icon = card.icon;
              const href =
                card.title === "AI Interview"
                  ? session.user.role === "candidate"
                    ? "#join"
                    : "/room/demo"
                  : card.href;

              return (
                <motion.button
                  key={card.title}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.06 * index }}
                  onClick={() => {
                    if (card.title === "AI Interview") {
                      document.getElementById("join-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
                      return;
                    }
                    router.push(href as Route);
                  }}
                  className={`group rounded-[30px] border border-white/10 bg-gradient-to-br ${card.accent} p-[1px] text-left`}
                >
                  <div className="h-full rounded-[29px] bg-slate-950/85 p-6 transition duration-300 group-hover:bg-slate-950/92">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-teal-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-6 text-2xl font-semibold text-white">{card.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-slate-300">{card.description}</p>
                    <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-teal-300">
                      Open tool
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {session.user.role === "interviewer" && (
            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16 }}
              className="mt-8 rounded-[30px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.28em] text-white/40">
                    Recruiter dashboard
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold text-white">Recent Interview Judgments</h2>
                </div>
                <div className="text-sm text-slate-400">
                  Live room analytics continue inside active interview rooms.
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-[24px] border border-white/10">
                <div className="grid grid-cols-[1.1fr_0.8fr_0.9fr_1fr] bg-white/5 px-5 py-4 text-xs uppercase tracking-[0.26em] text-white/45">
                  <span>Candidate</span>
                  <span>Date</span>
                  <span>Role</span>
                  <span>Status</span>
                </div>
                {recentJudgments.map((row) => (
                  <div
                    key={`${row.candidate}-${row.date}`}
                    className="grid grid-cols-[1.1fr_0.8fr_0.9fr_1fr] items-center gap-3 border-t border-white/10 px-5 py-4 text-sm text-slate-200"
                  >
                    <span>{row.candidate}</span>
                    <span className="text-slate-400">{row.date}</span>
                    <span className="text-slate-300">{row.role}</span>
                    <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium ${row.tone}`}>
                      {row.status}
                    </span>
                  </div>
                ))}
              </div>
            </motion.section>
          )}
        </section>
      </div>
    </main>
  );
}

function LandingView() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      <div className="resume-ambient" />
      <div className="relative">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
          <div className="meet-shell flex items-center justify-between py-5">
            <VerifAiLogo subtitle="AI-powered hiring" />
            <nav className="hidden items-center gap-8 text-sm text-white/65 md:flex">
              <Link href="/login" className="transition hover:text-white">Resume Verify</Link>
              <Link href="/login" className="transition hover:text-white">ATS Score</Link>
              <Link href="/login" className="transition hover:text-white">Interview</Link>
              <Link
                href="/login"
                className="rounded-full border border-teal-400/30 bg-teal-400/10 px-5 py-2.5 font-medium text-teal-200 transition hover:bg-teal-400/20"
              >
                Sign In / Sign Up
              </Link>
            </nav>
          </div>
        </header>

        <section className="meet-shell flex min-h-[calc(100vh-88px)] items-center py-16">
          <div className="grid w-full gap-12 xl:grid-cols-[1.05fr_0.95fr] xl:items-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-3xl"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/20 bg-teal-400/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-teal-200">
                <Sparkles className="h-3.5 w-3.5" />
                Premium interview intelligence
              </div>
              <h1 className="mt-6 text-5xl font-semibold tracking-tight text-white sm:text-7xl sm:leading-[0.98]">
                Hire Smarter with VerifAI
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-9 text-slate-300">
                AI-driven hiring intelligence for live interviews, resume verification, ATS scoring,
                and proctored candidate evaluation in one dark, premium workspace.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex h-[52px] items-center justify-center rounded-full bg-teal-500 px-7 text-base font-medium text-slate-950 transition hover:bg-teal-400"
                >
                  Get Started
                </Link>
                <Link
                  href="/register"
                  className="inline-flex h-[52px] items-center justify-center rounded-full border border-white/10 bg-white/5 px-7 text-base font-medium text-white transition hover:border-teal-400/30 hover:bg-white/10"
                >
                  Create recruiter account
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.08 }}
              className="grid gap-5"
            >
              <div className="verifai-mesh overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.05] p-6">
                <div className="absolute inset-x-0 top-0 h-24 verifai-grid opacity-25" />
                <div className="relative grid gap-5 sm:grid-cols-[1fr_0.86fr]">
                  <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-white/45">Live interview</div>
                        <div className="mt-1 text-lg font-medium">Recruiter console</div>
                      </div>
                      <Video className="h-5 w-5 text-teal-300" />
                    </div>
                    <div className="mt-6 aspect-[4/3] rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
                  </div>
                  <div className="space-y-5">
                    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                      <div className="text-sm text-white/45">AI summary</div>
                      <div className="mt-4 space-y-3">
                        <div className="rounded-2xl bg-white/[0.05] px-4 py-3 text-sm text-white/75">Authenticity signal: 85%</div>
                        <div className="rounded-2xl bg-white/[0.05] px-4 py-3 text-sm text-white/75">Eye movement risk: Low</div>
                      </div>
                    </div>
                    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                      <div className="text-sm text-white/45">Resume verification</div>
                      <div className="mt-4 text-base leading-7 text-white/70">
                        Cross-check GitHub activity, coding profiles, ATS strength, and candidate proof.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [meetingId, setMeetingId] = useState("");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    const currentSession = readSession();
    setSession(currentSession);
    setSessionChecked(true);
  }, []);

  const previewLink = useMemo(() => {
    if (!meetingId.trim()) {
      return "Paste a room code or full VerifAI interview URL";
    }

    const value = meetingId.trim();
    const normalized = value.includes("/room/")
      ? value.split("/room/")[1]
      : (value.split("/").pop() ?? value);

    return `${typeof window !== "undefined" ? window.location.origin : ""}/room/${normalized}`;
  }, [meetingId]);

  const buildRoomUrl = (roomId: string) => `/room/${roomId}` as Route;

  const createMeeting = () => {
    router.push(buildRoomUrl(uuidv4()));
  };

  const joinMeeting = (event: FormEvent) => {
    event.preventDefault();
    const value = meetingId.trim();
    if (!value) return;

    const normalized = value.includes("/room/")
      ? value.split("/room/")[1].split("?")[0]
      : (value.split("/").pop()?.split("?")[0] ?? value);

    router.push(buildRoomUrl(normalized));
  };

  const logout = () => {
    clearSession();
    setSession(null);
    router.push("/login");
  };

  if (!sessionChecked) {
    return null;
  }

  if (!session) {
    return <LandingView />;
  }

  return (
    <AuthenticatedDashboard
      session={session}
      meetingId={meetingId}
      setMeetingId={setMeetingId}
      previewLink={previewLink}
      createMeeting={createMeeting}
      joinMeeting={joinMeeting}
      logout={logout}
    />
  );
}
