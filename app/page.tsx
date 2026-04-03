"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Video, Plus, ArrowRight, Sparkles } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { ThemeToggle } from "@/components/theme-toggle";

export default function HomePage() {
  const router = useRouter();
  const [meetingId, setMeetingId] = useState("");

  const previewLink = useMemo(() => {
    if (!meetingId.trim()) {
      return "Paste a room link or ID";
    }

    return `${typeof window !== "undefined" ? window.location.origin : ""}/room/${meetingId.trim()}`;
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

    const normalized = value.includes("/room/") ? value.split("/room/")[1] : value.split("/").pop() ?? value;
    router.push(`/room/${normalized}`);
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 text-text sm:px-6 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/12 text-accent shadow-glow">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted">HackByte Live</p>
              <h1 className="text-lg font-semibold">Meet-style RTC Platform</h1>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <section className="glass-panel relative flex flex-1 flex-col overflow-hidden rounded-[2rem] border border-line/80 shadow-panel lg:flex-row">
          <div className="flex flex-1 flex-col justify-between p-8 sm:p-10 lg:max-w-[52%] lg:p-14">
            <div className="space-y-6">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-accent/20 bg-accent/8 px-4 py-2 text-sm text-accent">
                <Sparkles className="h-4 w-4" />
                Google AI Studio-inspired meeting UI
              </div>
              <div className="space-y-4">
                <h2 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
                  High-performance meetings with a polished AI Studio-style interface.
                </h2>
                <p className="max-w-xl text-base leading-7 text-muted sm:text-lg">
                  Create a room instantly, share the link, and connect with low-latency WebRTC video, adaptive layouts, and built-in media controls.
                </p>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <button
                onClick={createMeeting}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-text px-6 py-4 text-sm font-semibold text-surface transition hover:scale-[1.01]"
              >
                <Plus className="h-4 w-4" />
                Create Meeting
              </button>
              <form
                onSubmit={joinMeeting}
                className="flex flex-1 items-center gap-3 rounded-2xl border border-line bg-panel/80 p-2"
              >
                <input
                  value={meetingId}
                  onChange={(event) => setMeetingId(event.target.value)}
                  placeholder="Enter meeting link or code"
                  className="h-12 flex-1 rounded-xl bg-transparent px-4 outline-none placeholder:text-muted"
                />
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 font-medium text-white transition hover:brightness-110"
                >
                  Join
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>

            <div className="mt-5 rounded-2xl border border-line/80 bg-surface/50 px-4 py-3 text-sm text-muted">
              {previewLink}
            </div>
          </div>

          <div className="relative flex min-h-[360px] flex-1 items-center justify-center p-6 sm:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(45,212,191,0.14),transparent_22%)]" />
            <div className="relative w-full max-w-2xl rounded-[2rem] border border-white/10 bg-slate-950 p-4 shadow-2xl dark:bg-slate-900">
              <div className="rounded-[1.6rem] border border-white/10 bg-slate-900/80 p-4 text-white">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Studio Preview</p>
                    <h3 className="mt-1 text-xl font-semibold">Team Sync</h3>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                    04 Participants
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {["Design", "Engineering", "Product", "Self View"].map((label, index) => (
                    <div
                      key={label}
                      className={`relative overflow-hidden rounded-[1.3rem] border border-white/10 ${
                        index === 3 ? "col-span-2 h-28" : "h-40"
                      } bg-gradient-to-br from-slate-800 to-slate-950`}
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.22),transparent_34%)]" />
                      <div className="absolute bottom-3 left-3 rounded-full bg-black/40 px-3 py-1 text-xs text-slate-100">
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-center">
                  <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-3">
                    {["Mic", "Cam", "Share", "Leave"].map((item) => (
                      <div key={item} className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs text-slate-200">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
