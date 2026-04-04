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
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <div className="resume-ambient" />
      <div className="relative">
        <header className="meet-shell flex items-center justify-between py-8">
          <VerifAiLogo subtitle="Create account" />
          <ThemeToggle />
        </header>

        <section className="meet-shell flex min-h-[calc(100vh-100px)] items-center justify-center py-10">
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="grid w-full max-w-6xl gap-8 xl:grid-cols-[1fr_0.98fr]"
          >
            <form
              onSubmit={handleSubmit}
              className="glass-panel mx-auto w-full max-w-2xl rounded-[34px] border border-white/[0.06] p-8 sm:p-10"
            >
              <div className="inline-flex rounded-full border border-white/[0.06] bg-white/[0.03] p-1">
                <Link
                  href="/login"
                  className="rounded-full px-5 py-2 text-sm text-white/50 transition hover:text-white"
                >
                  Sign In
                </Link>
                <span className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black">
                  Sign Up
                </span>
              </div>

              <div className="mt-8">
                <h1 className="text-3xl font-semibold tracking-tight">Create your VerifAI account</h1>
                <p className="mt-3 text-sm leading-7 text-white/40">
                  Choose a role, complete onboarding, and step into the same protected interview workflow.
                </p>
              </div>

              <div className="mt-8 grid gap-5">
                <label className="block">
                  <span className="mb-2 block text-sm text-white/45">Full name</span>
                  <div className="flex items-center gap-3 rounded-full border border-white/[0.08] bg-black/50 px-5 py-3.5">
                    <UserRound className="h-4 w-4 text-red-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Jessica Parker"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-white/20"
                      required
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-white/45">Email</span>
                  <div className="flex items-center gap-3 rounded-full border border-white/[0.08] bg-black/50 px-5 py-3.5">
                    <Mail className="h-4 w-4 text-red-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-white/20"
                      required
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-white/45">Password</span>
                  <div className="flex items-center gap-3 rounded-full border border-white/[0.08] bg-black/50 px-5 py-3.5">
                    <KeyRound className="h-4 w-4 text-red-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-white/20"
                      required
                    />
                  </div>
                </label>

                <div>
                  <span className="mb-2 block text-sm text-white/45">Role Selection</span>
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
                            ? "border-red-500/40 bg-red-500/10"
                            : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="text-base font-medium text-white">{option.title}</div>
                        <div className="mt-3 text-sm leading-7 text-white/45">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {error ? (
                <div className="mt-5 rounded-full border border-red-400/20 bg-red-400/10 px-5 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="btn-capsule btn-capsule-primary mt-7 w-full"
              >
                {submitting ? "Creating account..." : "Create Account"}
                <ArrowRight className="h-4 w-4" />
              </button>

              <p className="mt-6 text-center text-sm text-white/40">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-red-400 hover:text-red-300">
                  Sign in
                </Link>
              </p>
            </form>

            <div className="hidden rounded-[34px] border border-white/[0.06] bg-white/[0.02] p-10 xl:block">
              <div className="text-xs uppercase tracking-[0.34em] text-red-400">Role aware onboarding</div>
              <h2 className="mt-6 hero-serif text-4xl leading-tight text-white">
                One interface, two experiences, the same secure backend.
              </h2>
              <p className="mt-6 max-w-xl text-base leading-8 text-white/40">
                Candidates move into clean interview rooms while recruiters unlock resume verification,
                ATS reviews, and live AI signals on top of the existing room infrastructure.
              </p>
              <div className="mt-12 grid gap-4">
                {[
                  "Candidates see a focused join flow and room experience.",
                  "Interviewers unlock resume review and room creation controls.",
                  fullName ? `Welcome preview: ${fullName}` : "Your profile name is captured on this form without changing backend auth logic.",
                ].map((item) => (
                  <div key={item} className="rounded-[24px] border border-white/[0.06] bg-black/40 px-5 py-4 text-sm text-white/55">
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
