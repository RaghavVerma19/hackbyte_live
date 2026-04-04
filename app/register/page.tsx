"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, KeyRound, Mail, UserRound } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { VerifAiLogo } from "@/components/ui/verifai-logo";
import { fetchJson, readSession, saveSession, type AuthRole, type AuthSession } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AuthRole>("candidate");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (readSession()) {
      router.replace("/");
    }
  }, [router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetchJson<{ ok: boolean; token: string; user: AuthSession["user"] }>(
        "/api/auth/register",
        {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
            role,
          }),
        },
      );

      saveSession({ token: response.token, user: response.user });
      router.push("/");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="resume-ambient" />
      <div className="relative">
        <header className="meet-shell flex items-center justify-between py-6">
          <VerifAiLogo subtitle="Create account" />
          <ThemeToggle />
        </header>

        <section className="meet-shell flex min-h-[calc(100vh-92px)] items-center justify-center py-10">
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="grid w-full max-w-6xl gap-8 xl:grid-cols-[1fr_0.98fr]"
          >
            <form
              onSubmit={handleSubmit}
              className="glass-panel mx-auto w-full max-w-2xl rounded-[34px] border border-white/10 p-8 sm:p-10"
            >
              <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
                <Link
                  href="/login"
                  className="rounded-full px-5 py-2 text-sm text-white/65 transition hover:text-white"
                >
                  Sign In
                </Link>
                <span className="rounded-full bg-teal-500 px-5 py-2 text-sm font-medium text-slate-950">
                  Sign Up
                </span>
              </div>

              <div className="mt-8">
                <h1 className="text-3xl font-semibold tracking-tight">Create your VerifAI account</h1>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  Choose a role, complete onboarding, and step into the same protected interview workflow.
                </p>
              </div>

              <div className="mt-8 grid gap-5">
                <label className="block">
                  <span className="mb-2 block text-sm text-white/60">Full name</span>
                  <div className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-slate-950/70 px-4 py-3.5">
                    <UserRound className="h-4 w-4 text-emerald-300" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Jessica Parker"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-white/30"
                      required
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-white/60">Email</span>
                  <div className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-slate-950/70 px-4 py-3.5">
                    <Mail className="h-4 w-4 text-teal-300" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-white/30"
                      required
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-white/60">Password</span>
                  <div className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-slate-950/70 px-4 py-3.5">
                    <KeyRound className="h-4 w-4 text-cyan-300" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-white/30"
                      required
                    />
                  </div>
                </label>

                <div>
                  <span className="mb-2 block text-sm text-white/60">Role Selection</span>
                  <div className="grid gap-4 md:grid-cols-2">
                    {([
                      {
                        value: "candidate",
                        title: "I am a Candidate",
                        description: "Join interviews, share your screen, and keep the call experience distraction-free.",
                      },
                      {
                        value: "interviewer",
                        title: "I am an Interviewer",
                        description: "Create interviews, verify resumes, and monitor AI-backed hiring signals live.",
                      },
                    ] as const).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setRole(option.value)}
                        className={`rounded-[24px] border p-5 text-left transition ${
                          role === option.value
                            ? "border-teal-400/40 bg-teal-400/10 shadow-[0_0_30px_rgba(45,212,191,0.12)]"
                            : "border-white/10 bg-white/[0.04] hover:border-teal-400/25 hover:bg-white/[0.06]"
                        }`}
                      >
                        <div className="text-base font-medium text-white">{option.title}</div>
                        <div className="mt-3 text-sm leading-7 text-slate-300">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {error ? (
                <div className="mt-5 rounded-[22px] border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-teal-500 text-sm font-medium text-slate-950 transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Creating account..." : "Create Account"}
                <ArrowRight className="h-4 w-4" />
              </button>

              <p className="mt-6 text-center text-sm text-white/55">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-teal-300 hover:text-teal-200">
                  Sign in
                </Link>
              </p>
            </form>

            <div className="hidden rounded-[34px] border border-white/10 bg-white/[0.05] p-8 xl:block">
              <div className="text-xs uppercase tracking-[0.34em] text-teal-200">Role aware onboarding</div>
              <h2 className="mt-5 text-4xl font-semibold leading-tight">
                One interface, two experiences, the same secure backend.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-slate-300">
                Candidates move into clean interview rooms while recruiters unlock resume verification,
                ATS reviews, and live AI signals on top of the existing room infrastructure.
              </p>
              <div className="mt-10 grid gap-4">
                {[
                  "Candidates see a focused join flow and room experience.",
                  "Interviewers unlock resume review and room creation controls.",
                  fullName ? `Welcome preview: ${fullName}` : "Your profile name is captured on this form without changing backend auth logic.",
                ].map((item) => (
                  <div key={item} className="rounded-[24px] border border-white/10 bg-slate-950/60 px-5 py-4 text-sm text-slate-200">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
}
