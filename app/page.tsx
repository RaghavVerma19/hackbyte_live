"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Keyboard,
  MonitorUp,
  Plus,
  ShieldCheck,
  Video,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { ThemeToggle } from "@/components/theme-toggle";

export default function HomePage() {
  const router = useRouter();
  const [meetingId, setMeetingId] = useState("");

  const previewLink = useMemo(() => {
    if (!meetingId.trim()) {
      return "Paste a meeting code or full room URL";
    }

    const value = meetingId.trim();
    const normalized = value.includes("/room/")
      ? value.split("/room/")[1]
      : value.split("/").pop() ?? value;

    return `${typeof window !== "undefined" ? window.location.origin : ""}/room/${normalized}`;
  }, [meetingId]);

  const createMeeting = () => {
    router.push(`/room/${uuidv4()}`);
  };

  const joinMeeting = (event: FormEvent) => {
    event.preventDefault();
    const value = meetingId.trim();

    if (!value) {
      return;
    }

    const normalized = value.includes("/room/")
      ? value.split("/room/")[1]
      : value.split("/").pop() ?? value;

    router.push(`/room/${normalized}`);
  };

  return (
    <main className="min-h-screen bg-surface text-text">
      <header className="meet-shell flex items-center justify-between py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/12 text-accent">
            <Video className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[1.35rem] font-medium tracking-tight">
              HackByte Meet
            </span>
            <span className="hidden rounded-full border border-line px-3 py-1 text-xs text-muted sm:inline-flex">
              WebRTC + Socket.io
            </span>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <section className="meet-shell grid min-h-[calc(100vh-92px)] items-center gap-10 pb-10 pt-2 lg:grid-cols-[minmax(0,1.05fr)_minmax(460px,0.95fr)]">
        <div className="max-w-2xl">
          <h1 className="max-w-xl text-4xl font-normal tracking-tight sm:text-[3.25rem] sm:leading-[1.08]">
            Premium video meetings, now built for your own stack.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
            Create a meeting, send the link, and join a responsive Meet-style
            experience with live video, room codes, media controls, and
            low-latency peer connections.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={createMeeting}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-medium text-white transition hover:bg-accent/90"
            >
              <Plus className="h-4 w-4" />
              New meeting
            </button>

            <form
              onSubmit={joinMeeting}
              className="flex h-12 flex-1 items-center rounded-full border border-line bg-panel px-3 shadow-sm"
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

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <FeatureCard
              icon={<CalendarDays className="h-4 w-4" />}
              title="Instant rooms"
              description="UUID-based room creation and direct deep links."
            />
            <FeatureCard
              icon={<MonitorUp className="h-4 w-4" />}
              title="Responsive stage"
              description="Layouts adapt cleanly from mobile to wide screens."
            />
            <FeatureCard
              icon={<ShieldCheck className="h-4 w-4" />}
              title="RTC ready"
              description="STUN/TURN placeholders included for production hardening."
            />
          </div>
        </div>

        <div className="mx-auto w-full max-w-[620px]">
          <div className="rounded-[2rem] border border-line bg-panel p-4 shadow-[0_24px_72px_rgba(15,23,42,0.16)] dark:bg-[#202124]">
            <div className="rounded-[1.6rem] border border-black/5 bg-[#1f1f1f] p-4 text-white dark:border-white/5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#9aa0a6]">hackbyte sync</p>
                  <h2 className="mt-1 text-lg font-medium">Daily standup</h2>
                </div>
                <div className="rounded-full bg-[#2b2c2f] px-3 py-1 text-xs text-[#bdc1c6]">
                  4 people
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {["Aisha", "Rohit", "Sam", "You"].map((name, index) => (
                  <div
                    key={name}
                    className={`relative overflow-hidden rounded-[1.35rem] bg-[#2a2b2f] ${
                      index === 3 ? "col-span-2 h-28" : "h-44"
                    }`}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(138,180,248,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.12))]" />
                    <div className="absolute bottom-3 left-3 rounded-md bg-black/25 px-2.5 py-1 text-xs text-white">
                      {name}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-center gap-3">
                {[
                  { label: "Mic", color: "bg-[#303134]" },
                  { label: "Cam", color: "bg-[#303134]" },
                  { label: "Raise", color: "bg-[#303134]" },
                  { label: "Leave", color: "bg-[#ea4335]" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`${item.color} rounded-full px-4 py-2 text-xs font-medium text-white`}
                  >
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
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
