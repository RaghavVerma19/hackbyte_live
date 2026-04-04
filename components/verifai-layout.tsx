"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import { Sparkles, UserRound } from "lucide-react";
import { useMockAuth } from "@/components/mock-auth-provider";

export function VerifAiTopBar({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, signOut } = useMockAuth();

  const links: Array<{ href: Route; label: string }> = [
    { href: "/resume-verify", label: "Resume Verify" },
    { href: "/ats-score", label: "ATS Score" },
    {
      href: isAuthenticated
        ? user?.role === "candidate"
          ? "/interview"
          : "/interviewer-dashboard"
        : "/auth",
      label: "Interview",
    },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 py-4 sm:px-6">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between rounded-full border border-white/10 bg-[rgba(8,18,23,0.78)] px-5 py-3 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#22d3ee,#10b981)] text-slate-950 shadow-[0_0_35px_rgba(34,211,238,0.35)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-semibold tracking-tight text-white">VerifAI</div>
            {!compact && <div className="text-xs uppercase tracking-[0.22em] text-white/38">AI Hiring Intelligence</div>}
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  active ? "bg-white/10 text-white" : "text-white/65 hover:bg-white/5 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/70 sm:flex">
              <UserRound className="h-4 w-4" />
              {user?.name}
            </div>
            <button
              onClick={() => {
                signOut();
                router.push("/auth");
              }}
              className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm text-white/80 transition hover:bg-white/[0.1]"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <Link
            href="/auth"
            className="rounded-full bg-[linear-gradient(135deg,#14b8a6,#22d3ee)] px-5 py-2.5 text-sm font-medium text-slate-950 transition hover:scale-[1.02]"
          >
            Sign In / Sign Up
          </Link>
        )}
      </div>
    </header>
  );
}

export function AppFrame({
  children,
  compactHeader = false,
}: {
  children: React.ReactNode;
  compactHeader?: boolean;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#061017] text-white">
      <div className="verifai-bg" />
      <VerifAiTopBar compact={compactHeader} />
      <div className="relative z-10 pt-28">{children}</div>
    </main>
  );
}
