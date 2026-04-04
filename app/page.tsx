"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, ShieldCheck, Radar, Video } from "lucide-react";
import { AppFrame } from "@/components/verifai-layout";

export default function LandingPage() {
  return (
    <AppFrame>
      <section className="mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-7xl flex-col items-center justify-center px-6 pb-16 text-center">
        <div className="verifai-badge">Trust faster. Screen smarter. Hire better.</div>
        <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-7xl sm:leading-[1.04]">
          Hire Smarter with <span className="text-cyan-300">VerifAI</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-white/65 sm:text-xl">
          AI-driven hiring intelligence for resume verification, ATS optimization, and live interview
          confidence signals in one elegant workflow.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/auth"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#14b8a6,#22d3ee)] px-7 py-4 text-base font-medium text-slate-950 shadow-[0_0_45px_rgba(34,211,238,0.25)] transition hover:scale-[1.02]"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/auth"
            className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-7 py-4 text-base text-white/78 transition hover:bg-white/[0.08]"
          >
            Explore the Platform
          </Link>
        </div>

        <div className="mt-16 grid w-full gap-5 md:grid-cols-3">
          <FeatureCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Resume Verify"
            description="Cross-check profile claims, public proofs, and structured resume evidence before you even schedule the call."
          />
          <FeatureCard
            icon={<Radar className="h-5 w-5" />}
            title="ATS Score"
            description="Simulate hiring system scans and surface practical resume improvements with instant, readable guidance."
          />
          <FeatureCard
            icon={<Video className="h-5 w-5" />}
            title="AI Interview"
            description="Run modern interview rooms with live intelligence, proctoring cues, and confidence signals built into the flow."
          />
        </div>
      </section>
    </AppFrame>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href="/auth"
      className="verifai-card group rounded-[28px] border border-white/10 p-6 text-left transition hover:-translate-y-1 hover:border-cyan-300/25"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(20,184,166,0.28),rgba(34,211,238,0.18))] text-cyan-200">
        {icon}
      </div>
      <div className="mt-5 text-xl font-medium text-white">{title}</div>
      <p className="mt-3 text-sm leading-7 text-white/58">{description}</p>
    </Link>
  );
}
