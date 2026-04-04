"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Mail, UserRound, Video } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { fetchJson, readSession, saveSession, type AuthRole, type AuthSession } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
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
      saveSession({
        token: response.token,
        user: response.user,
      });
      router.push("/");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface text-text">
      <header className="meet-shell flex items-center justify-between py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/12 text-accent">
            <Video className="h-5 w-5" />
          </div>
          <span className="text-[1.35rem] font-medium tracking-tight">HackByte Interview</span>
        </div>
        <ThemeToggle />
      </header>

      <section className="meet-shell flex min-h-[calc(100vh-92px)] items-center justify-center pb-10 pt-2">
        <form onSubmit={handleSubmit} className="glass-panel w-full max-w-lg rounded-[28px] border border-line p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
          <div className="text-center">
            <h1 className="text-3xl font-medium tracking-tight">Create account</h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              Choose your role and get into your interview workflow.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm text-muted">Email</span>
              <div className="flex items-center gap-3 rounded-2xl border border-line bg-panel px-4 py-3">
                <Mail className="h-4 w-4 text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
                  required
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-muted">Password</span>
              <div className="flex items-center gap-3 rounded-2xl border border-line bg-panel px-4 py-3">
                <KeyRound className="h-4 w-4 text-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
                  required
                />
              </div>
            </label>

            <div>
              <span className="mb-2 block text-sm text-muted">Role</span>
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  { value: "candidate", label: "Candidate", description: "Join interview rooms and share your screen." },
                  { value: "interviewer", label: "Interviewer", description: "Create rooms and review candidate signals." },
                ] as const).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRole(option.value)}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      role === option.value
                        ? "border-accent bg-accent/8"
                        : "border-line bg-panel hover:border-accent/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <UserRound className="h-4 w-4" />
                      {option.label}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-muted">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-accent text-sm font-medium text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Creating account..." : "Create account"}
          </button>

          <p className="mt-5 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-accent">
              Sign in
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
