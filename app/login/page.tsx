"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, Mail, Video } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { fetchJson, saveSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await fetchJson<{ token: string; user: any }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      saveSession(result);
      router.push("/");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface text-text">
      <header className="meet-shell flex items-center justify-between py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/12 text-accent">
            <Video className="h-5 w-5" />
          </div>
          <span className="text-[1.35rem] font-medium tracking-tight">HackByte Auth</span>
        </div>
        <ThemeToggle />
      </header>

      <section className="meet-shell flex min-h-[calc(100vh-92px)] items-center justify-center py-10">
        <div className="w-full max-w-md rounded-[2rem] border border-line bg-panel p-8 shadow-[0_24px_72px_rgba(15,23,42,0.12)]">
          <h1 className="text-3xl font-medium tracking-tight">Sign in</h1>
          <p className="mt-3 text-sm leading-7 text-muted">
            Use your HackByte account to continue into the interview platform.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <FieldShell icon={<Mail className="h-4 w-4 text-muted" />}>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="Email"
                className="h-full flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted"
              />
            </FieldShell>

            <FieldShell icon={<LockKeyhole className="h-4 w-4 text-muted" />}>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder="Password"
                className="h-full flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted"
              />
            </FieldShell>

            {error && (
              <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-sm font-medium text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Signing in..." : "Login"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="mt-6 text-sm text-muted">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-accent">
              Register
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function FieldShell({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-12 items-center rounded-full border border-line bg-surface px-4">
      {icon}
      {children}
    </div>
  );
}
