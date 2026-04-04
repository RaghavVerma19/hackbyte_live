"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import Image from "next/image";
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
    accent: "from-red-500/20 via-red-400/10 to-red-600/20",
  },
  {
    title: "ATS Score",
    description: "Run a polished ATS scan view with guided feedback and a clean score presentation for recruiters.",
    href: "/upload?mode=ats",
    icon: Radar,
    accent: "from-red-400/20 via-rose-400/10 to-red-500/20",
  },
  {
    title: "AI Interview",
    description: "Live proctoring, speech intelligence, MediaPipe eye tracking, and room-aware interview controls.",
    href: "/room/demo",
    icon: BrainCircuit,
    accent: "from-rose-400/20 via-red-400/10 to-red-500/20",
  },
];

const recentJudgments = [
  { candidate: "Aarav Sharma", date: "Apr 5, 2026", role: "Backend Engineer", status: "Highly Confident: Hire", tone: "text-emerald-300 border-emerald-400/20 bg-emerald-400/10" },
  { candidate: "Meera Joshi", date: "Apr 4, 2026", role: "Product Analyst", status: "Requires Review", tone: "text-amber-200 border-amber-300/20 bg-amber-400/10" },
  { candidate: "Raghav Verma", date: "Apr 3, 2026", role: "Frontend Engineer", status: "Strong Technical Signal", tone: "text-red-200 border-red-300/20 bg-red-400/10" },
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
    <main className="min-h-screen overflow-x-hidden bg-black text-white">
      <div className="resume-ambient" />
      <div className="relative">
        <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-black/80 backdrop-blur-xl">
          <div className="meet-shell flex items-center justify-between py-5">
            <VerifAiLogo subtitle="Interview intelligence" />
            <div className="flex items-center gap-3">
              <span className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/55 md:inline-flex">
                {session.user.role}
              </span>
              <button
                onClick={logout}
                className="btn-capsule btn-capsule-outline !py-2 !px-4 !text-sm"
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
            className="verifai-mesh overflow-hidden rounded-[34px] border border-white/[0.06] bg-white/[0.02] p-8"
          >
            <div className="absolute inset-x-0 top-0 h-32 verifai-grid opacity-25" />
            <div className="relative grid gap-10 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-red-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  VerifAI command center
                </div>
                <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-6xl sm:leading-[1.02]">
                  {session.user.role === "interviewer"
                    ? "Let's hire good candidates."
                    : "All the best for your interview."}
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-white/50 sm:text-lg">
                  {session.user.role === "interviewer"
                    ? "Create new interviews, review resumes, and monitor live AI signals from the same premium workspace."
                    : "Join your interview room, keep your setup ready, and let VerifAI handle the live intelligence in the background."}
                </p>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  {session.user.role === "interviewer" ? (
                    <>
                      <button
                        onClick={createMeeting}
                        className="btn-capsule btn-capsule-primary"
                      >
                        + Create New Interview
                      </button>
                      <button
                        onClick={() => router.push("/upload?mode=resume")}
                        className="btn-capsule btn-capsule-outline"
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
                      className="btn-capsule btn-capsule-primary"
                    >
                      Join your interview
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[28px] border border-white/[0.06] bg-black/30 p-5 backdrop-blur-md">
                  <div className="text-xs uppercase tracking-[0.3em] text-white/30">
                    Interview access
                  </div>
                  <form
                    onSubmit={joinMeeting}
                    className="mt-5 rounded-[26px] border border-white/[0.06] bg-white/[0.03] p-3"
                  >
                    <div className="flex items-center gap-3 rounded-[20px] border border-white/[0.06] bg-black/50 px-4 py-3">
                      <Keyboard className="h-4 w-4 text-white/35" />
                      <input
                        value={meetingId}
                        onChange={(event) => setMeetingId(event.target.value)}
                        placeholder={session.user.role === "candidate" ? "Paste the interview link or code" : "Paste room link to monitor"}
                        className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25"
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn-capsule btn-capsule-primary mt-3 w-full"
                    >
                      Join Room
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </form>
                  <div className="mt-4 text-sm leading-6 text-white/30">{previewLink}</div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-5">
                    <div className="text-xs uppercase tracking-[0.28em] text-white/30">
                      Security
                    </div>
                    <div className="mt-4 flex items-center gap-3 text-sm text-white/70">
                      <ShieldCheck className="h-5 w-5 text-red-400" />
                      JWT auth, TURN relay, screen-share enforcement
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-5">
                    <div className="text-xs uppercase tracking-[0.28em] text-white/30">
                      Live intelligence
                    </div>
                    <div className="mt-4 flex items-center gap-3 text-sm text-white/70">
                      <BrainCircuit className="h-5 w-5 text-red-400" />
                      Transcript, AI score, and MediaPipe tracking
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
                  className="group rounded-[30px] border border-white/[0.06] bg-white/[0.02] p-6 text-left transition duration-300 hover:bg-white/[0.04]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-red-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-6 text-2xl font-semibold text-white">{card.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-white/45">{card.description}</p>
                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-red-400">
                    Open tool
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
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
              className="mt-8 rounded-[30px] border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-xl"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.28em] text-white/30">
                    Recruiter dashboard
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold text-white">Recent Interview Judgments</h2>
                </div>
                <div className="text-sm text-white/35">
                  Live room analytics continue inside active interview rooms.
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-[24px] border border-white/[0.06]">
                <div className="grid grid-cols-[1.1fr_0.8fr_0.9fr_1fr] bg-white/[0.03] px-5 py-4 text-xs uppercase tracking-[0.26em] text-white/35">
                  <span>Candidate</span>
                  <span>Date</span>
                  <span>Role</span>
                  <span>Status</span>
                </div>
                {recentJudgments.map((row) => (
                  <div
                    key={`${row.candidate}-${row.date}`}
                    className="grid grid-cols-[1.1fr_0.8fr_0.9fr_1fr] items-center gap-3 border-t border-white/[0.06] px-5 py-4 text-sm text-white/70"
                  >
                    <span className="text-white">{row.candidate}</span>
                    <span className="text-white/40">{row.date}</span>
                    <span className="text-white/55">{row.role}</span>
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

/* ─────────────────────────────────────────────────────
   LANDING VIEW — Minimalist, editorial, moody
   ───────────────────────────────────────────────────── */

function LandingView() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-white">
      {/* ═══ HERO ═══ */}
      <section className="relative flex min-h-screen flex-col">
        {/* Nav */}
        <header className="relative z-10">
          <div className="meet-shell flex items-center justify-between py-8">
            <VerifAiLogo />
            <nav className="hidden items-center gap-10 text-sm text-white/50 md:flex">
              <Link href="/login" className="transition hover:text-white">
                Resume Verify
              </Link>
              <Link href="/login" className="transition hover:text-white">
                ATS Score
              </Link>
              <Link href="/login" className="transition hover:text-white">
                Interview
              </Link>
              <Link
                href="/login"
                className="btn-capsule btn-capsule-outline !py-2.5 !px-6 !text-sm"
              >
                Sign In
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero Content */}
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          {/* Artistic Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl"
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-sm">
              <Image
                src="/images/hero-portrait.png"
                alt="AI-powered interview intelligence"
                fill
                className="object-cover"
                priority
              />
              {/* Subtle vignette overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />
            </div>
          </motion.div>

          {/* Hero Text */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="mt-16 text-center"
          >
            <h1 className="hero-serif text-4xl text-white sm:text-5xl md:text-6xl lg:text-7xl">
              Truth doesn&apos;t hide.
              <br />
              <span className="text-white/60">Neither do we.</span>
            </h1>
          </motion.div>

          {/* Subtext + Year */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-10 text-center"
          >
            <p className="text-sm tracking-wide text-white/35">
              AI-powered interview intelligence
            </p>
            <p className="mt-6 text-sm font-medium tracking-[0.2em] text-white/50">
              2026 — Future
            </p>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-12"
          >
            <Link href="/login" className="btn-capsule btn-capsule-outline">
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>

        {/* Decorative dots */}
        <div className="meet-shell flex items-center justify-between pb-8">
          <div className="dot-marker" />
          <div className="dot-marker" />
          <div className="dot-marker" />
        </div>
      </section>

      {/* ═══ PHILOSOPHY ═══ */}
      <section className="section-spacer-lg bg-black">
        <div className="meet-shell">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="mx-auto max-w-4xl text-center"
          >
            <p className="hero-serif text-2xl leading-relaxed text-white/70 sm:text-3xl md:text-4xl md:leading-[1.4]">
              Design shapes the hiring process —
              <br />
              not as decoration, but as a{" "}
              <span className="text-white">force that reveals truth.</span>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mx-auto mt-20 max-w-3xl text-center"
          >
            <p className="hero-serif text-xl text-white/50 sm:text-2xl md:text-3xl">
              It defines how your candidate is
              <br />
              perceived and how they perform.
            </p>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="hero-serif mt-20 text-center text-2xl text-white sm:text-3xl md:text-4xl"
          >
            See through it.
          </motion.p>
        </div>
      </section>

      {/* ═══ WHAT WE DO ═══ */}
      <section className="section-spacer" style={{ background: "#f5f5f0" }}>
        <div className="meet-shell">
          {/* Section Label */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="dot-marker-accent dot-marker" />
              <span className="text-sm font-medium tracking-wide text-black/70">
                Features
              </span>
            </div>
            <span className="text-sm text-black/40">What we offer</span>
          </div>

          {/* Feature Grid */}
          <div className="mt-24 grid gap-20 lg:grid-cols-3 lg:gap-12">
            {[
              {
                title: "Resume Verification",
                desc: "Cross-check resumes against public records, GitHub activity, and coding profiles. Highlight inconsistencies before the interview even begins.",
              },
              {
                title: "ATS Intelligence",
                desc: "Score candidate resumes with precision. Guided feedback and clean presentation, built for recruiters who value clarity.",
              },
              {
                title: "Live Interview AI",
                desc: "Speech analysis, real-time eye tracking, and AI-powered authenticity scoring. All running silently in the background.",
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
              >
                <div className="text-xs font-medium uppercase tracking-[0.25em] text-black/40">
                  0{i + 1}
                </div>
                <h3 className="mt-4 text-2xl font-semibold tracking-tight text-black">
                  {feature.title}
                </h3>
                <p className="mt-4 text-base leading-7 text-black/55">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="section-spacer-lg bg-black">
        <div className="meet-shell">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="mx-auto max-w-3xl text-center"
          >
            <h2 className="hero-serif text-3xl text-white sm:text-5xl md:text-6xl">
              Ready to hire smarter?
            </h2>
            <p className="mt-6 text-base text-white/40">
              AI intelligence for those who refuse to settle.
            </p>
            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/login" className="btn-capsule btn-capsule-primary">
                Sign In
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/register" className="btn-capsule btn-capsule-outline">
                Create Account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/[0.06] bg-black">
        <div className="meet-shell flex flex-col items-center justify-between gap-4 py-10 sm:flex-row">
          <VerifAiLogo compact />
          <p className="text-xs text-white/25">
            © 2026 VerifAI — Interview Intelligence Platform
          </p>
        </div>
      </footer>
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
