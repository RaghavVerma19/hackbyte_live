"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Keyboard,
  LogOut,
  MonitorUp,
  Plus,
  ShieldCheck,
  Video,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthSession, clearSession, readSession } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();
  const [meetingId, setMeetingId] = useState("");
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const currentSession = readSession();
    if (!currentSession) {
      router.replace("/login");
      return;
    }
    setSession(currentSession);
  }, [router]);

  const previewLink = useMemo(() => {
    if (!meetingId.trim()) {
      return "Paste a meeting code or full room URL";
    }

    const value = meetingId.trim();
    const normalized = value.includes("/room/")
      ? value.split("/room/")[1]
      : (value.split("/").pop() ?? value);

    return `${typeof window !== "undefined" ? window.location.origin : ""}/room/${normalized}`;
  }, [meetingId]);

  const buildRoomUrl = (roomId: string) => {
    return `/room/${roomId}` as Route;
  };

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
    router.push("/login");
  };

  if (!session) {
    return null;
  }

  return (
    <main className="min-h-screen bg-surface text-text">
      <header className="meet-shell flex items-center justify-between py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/12 text-accent">
            <Video className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[1.35rem] font-medium tracking-tight">
              HackByte Interview
            </span>
            <span className="hidden rounded-full border border-line px-3 py-1 text-xs text-muted sm:inline-flex">
              {session.user.role}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-muted transition hover:text-text"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
          <ThemeToggle />
        </div>
      </header>

      <section className="meet-shell flex min-h-[calc(100vh-92px)] items-center justify-center pb-10 pt-2">
        <div className="mx-auto w-full max-w-2xl text-center">
          <h1 className="mx-auto max-w-xl text-4xl font-normal tracking-tight sm:text-[3.25rem] sm:leading-[1.08]">
            Welcome back, {session.user.email}.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-muted">
            Your {session.user.role} account is authenticated with JWT and the
            interview backend will enforce the same role when you join a room.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={createMeeting}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-medium text-white transition hover:bg-accent/90"
            >
              <Plus className="h-4 w-4" />
              New interview
            </button>

            <form
              onSubmit={joinMeeting}
              className="flex h-12 flex-1 items-center rounded-full border border-line bg-panel px-3 shadow-sm sm:max-w-[420px]"
            >
              <Keyboard className="ml-2 h-4 w-4 text-muted" />
              <input
                value={meetingId}
                onChange={(event) => setMeetingId(event.target.value)}
                placeholder="Enter a code or link"
                className="h-full flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent/8"
              >
                Join
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>

          <div className="mt-4 text-sm text-muted">{previewLink}</div>

          <div className="mt-10 grid gap-3 text-left sm:grid-cols-3">
            <FeatureCard
              icon={<CalendarDays className="h-4 w-4" />}
              title="JWT auth"
              description="Your role and identity come from the backend-issued token."
            />
            <FeatureCard
              icon={<MonitorUp className="h-4 w-4" />}
              title="Candidate gating"
              description="Candidate interviews unlock only when the entire screen is shared."
            />
            <FeatureCard
              icon={<ShieldCheck className="h-4 w-4" />}
              title="Backend enforced"
              description="Room permissions and interview start rules are validated server-side."
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.4rem] border border-line bg-panel px-4 py-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent">
        {icon}
      </div>
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}
