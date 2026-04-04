"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileBadge2, Radar, Video } from "lucide-react";
import { AppFrame } from "@/components/verifai-layout";
import { useMockAuth } from "@/components/mock-auth-provider";

export default function DashboardPage() {
  const router = useRouter();
  const { isReady, isAuthenticated, user } = useMockAuth();

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/auth");
    }
  }, [isAuthenticated, isReady, router]);

  if (!isReady || !isAuthenticated) {
    return null;
  }

  const interviewHref = user?.role === "candidate" ? "/interview" : "/interviewer-dashboard";

  return (
    <AppFrame>
      <section className="mx-auto w-full max-w-7xl px-6 pb-24">
        <div className="max-w-2xl">
          <div className="verifai-badge">Dashboard</div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Welcome back, {user?.name}.
          </h1>
          <p className="mt-4 text-lg leading-8 text-white/62">
            Explore VerifAI’s core services below. Every section is fully clickable and routes you straight into the right workflow.
          </p>
        </div>

        <div className="mt-12 space-y-8">
          <DashboardSection
            icon={<FileBadge2 className="h-6 w-6" />}
            title="Resume Verifier"
            description="Verify resume authenticity, cross-check public claims, and extract structured proof before the interview starts."
            accent="from-cyan-400/25 to-emerald-400/10"
            onClick={() => router.push("/resume-verify")}
          />
          <DashboardSection
            icon={<Radar className="h-6 w-6" />}
            title="ATS Score"
            description="Evaluate how well a resume performs in hiring pipelines and highlight practical fixes with readable scoring."
            accent="from-emerald-400/20 to-sky-400/10"
            onClick={() => router.push("/ats-score")}
          />
          <DashboardSection
            icon={<Video className="h-6 w-6" />}
            title="AI Interview"
            description="Launch the live interview experience with proctoring, speech-to-text intelligence, and role-aware call views."
            accent="from-sky-400/20 to-cyan-300/10"
            onClick={() => router.push(interviewHref)}
          />
        </div>
      </section>
    </AppFrame>
  );
}

function DashboardSection({
  icon,
  title,
  description,
  accent,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group verifai-card flex w-full flex-col gap-6 rounded-[34px] border border-white/10 bg-gradient-to-br ${accent} p-8 text-left transition hover:-translate-y-1 hover:border-cyan-300/25 md:flex-row md:items-end md:justify-between`}
    >
      <div className="max-w-2xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-cyan-200">
          {icon}
        </div>
        <h2 className="mt-6 text-3xl font-medium text-white">{title}</h2>
        <p className="mt-4 text-base leading-8 text-white/60">{description}</p>
      </div>
      <div className="rounded-full border border-white/10 bg-white/[0.06] px-5 py-3 text-sm text-white/70 transition group-hover:bg-white/[0.1] group-hover:text-white">
        Open experience
      </div>
    </button>
  );
}
