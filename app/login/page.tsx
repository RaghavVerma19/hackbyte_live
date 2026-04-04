"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, KeyRound, Mail } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { VerifAiLogo } from "@/components/ui/verifai-logo";
import { fetchJson, readSession, saveSession, type AuthSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        },
      );

      saveSession({ token: response.token, user: response.user });
      router.push("/");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="resume-ambient" />
      <div className="relative">
        <header className="meet-shell flex items-center justify-between py-6">
          <VerifAiLogo subtitle="Secure access" />
          <ThemeToggle />
        </header>

        <section className="meet-shell flex min-h-[calc(100vh-92px)] items-center justify-center py-10">
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="grid w-full max-w-6xl gap-8 xl:grid-cols-[0.95fr_1.05fr]"
          >
            <div className="hidden rounded-[34px] border border-white/10 bg-white/[0.05] p-8 xl:block">
              <div className="text-xs uppercase tracking-[0.34em] text-teal-200">VerifAI access layer</div>
              <h1 className="mt-5 text-4xl font-semibold leading-tight">
                Sign in to continue your interview intelligence workflow.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-slate-300">
                Resume verification, ATS scoring, live interview monitoring, and AI-backed room analytics stay
                behind a single secure access layer.
              </p>
              <div className="mt-10 grid gap-4">
                {[
                  "JWT-backed authentication and protected resume analysis",
                  "Role-aware routing for candidate and interviewer experiences",
                  "Live room intelligence without exposing backend secrets",
                ].map((item) => (
                  <div key={item} className="rounded-[24px] border border-white/10 bg-slate-950/60 px-5 py-4 text-sm text-slate-200">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="glass-panel mx-auto w-full max-w-xl rounded-[34px] border border-white/10 p-8 sm:p-10"
            >
              <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
                <span className="rounded-full bg-teal-500 px-5 py-2 text-sm font-medium text-slate-950">
                  Sign In
                </span>
                <Link
                  href="/register"
                  className="rounded-full px-5 py-2 text-sm text-white/65 transition hover:text-white"
                >
                  Sign Up
                </Link>
              </div>

              <div className="mt-8">
                <h2 className="text-3xl font-semibold tracking-tight">Welcome back</h2>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  Continue into your VerifAI dashboard and reconnect with your live interview workspace.
                </p>
              </div>

              <div className="mt-8 space-y-5">
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
                      placeholder="Enter your password"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-white/30"
                      required
                    />
                  </div>
                </label>
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
                {submitting ? "Signing in..." : "Enter VerifAI"}
                <ArrowRight className="h-4 w-4" />
              </button>

              <p className="mt-6 text-center text-sm text-white/55">
                Need an account?{" "}
                <Link href="/register" className="font-medium text-teal-300 hover:text-teal-200">
                  Create one
                </Link>
              </p>
            </form>
          </motion.div>
        </section>
      </div>
    </main>
  );
}
