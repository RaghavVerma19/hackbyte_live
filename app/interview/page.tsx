"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, PhoneCall } from "lucide-react";
import { AppFrame } from "@/components/verifai-layout";
import { useMockAuth } from "@/components/mock-auth-provider";

export default function CandidateInterviewPage() {
  const router = useRouter();
  const { isReady, isAuthenticated, user } = useMockAuth();
  const [link, setLink] = useState("");
  const [joined, setJoined] = useState(false);
  const [fullscreenFeed, setFullscreenFeed] = useState<"interviewer" | "candidate">("interviewer");

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/auth");
      return;
    }
    if (user?.role !== "candidate") {
      router.replace("/interviewer-dashboard");
    }
  }, [isAuthenticated, isReady, router, user?.role]);

  if (!isReady || !isAuthenticated || user?.role !== "candidate") return null;

  const isInterviewerMain = fullscreenFeed === "interviewer";

  return (
    <AppFrame compactHeader>
      <section className="mx-auto w-full max-w-7xl px-6 pb-20">
        <div className="mb-8 flex flex-col gap-3">
          <div className="verifai-badge">Candidate view</div>
          <h1 className="text-4xl font-semibold tracking-tight text-white">All the best for your interview!</h1>
          <p className="max-w-2xl text-base leading-7 text-white/58">
            Join from the link shared by the interviewer and stay focused in a calm, modern call experience.
          </p>
        </div>

        {!joined ? (
          <div className="verifai-panel max-w-3xl rounded-[34px] p-8">
            <div className="text-sm uppercase tracking-[0.26em] text-white/42">Pre-join</div>
            <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <label className="block text-sm text-white/65">Paste Interview Link</label>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <div className="flex flex-1 items-center gap-3 rounded-full border border-white/10 bg-[#081821] px-4 py-3">
                  <Link2 className="h-4 w-4 text-cyan-200" />
                  <input
                    value={link}
                    onChange={(event) => setLink(event.target.value)}
                    placeholder="https://verifai.ai/interview/abc123"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/28"
                  />
                </div>
                <button className="verifai-primary-button" onClick={() => setJoined(true)}>
                  <PhoneCall className="h-4 w-4" />
                  Join Interview
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-[38px] border border-white/10 bg-[#07151b] p-4 shadow-[0_35px_120px_rgba(0,0,0,0.45)]">
            <div className="relative min-h-[72vh] overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(145deg,#10242d,#061017)] p-4">
              <VideoScene
                title={isInterviewerMain ? "Interviewer" : "You"}
                subtitle={isInterviewerMain ? "Primary feed" : "Self view expanded"}
                variant={isInterviewerMain ? "interviewer" : "candidate"}
                className="h-[68vh] rounded-[28px]"
              />

              <button
                onClick={() => setFullscreenFeed((current) => (current === "interviewer" ? "candidate" : "interviewer"))}
                className="absolute bottom-6 right-6 w-[230px] rounded-[24px] border border-white/12 bg-[rgba(4,12,16,0.82)] p-3 text-left shadow-[0_18px_48px_rgba(0,0,0,0.36)] backdrop-blur-xl transition hover:scale-[1.015]"
              >
                <VideoScene
                  title={isInterviewerMain ? "You" : "Interviewer"}
                  subtitle="Click to swap"
                  variant={isInterviewerMain ? "candidate" : "interviewer"}
                  className="h-[180px] rounded-[18px]"
                  compact
                />
              </button>
            </div>
          </div>
        )}
      </section>
    </AppFrame>
  );
}

function VideoScene({
  title,
  subtitle,
  variant,
  className,
  compact = false,
}: {
  title: string;
  subtitle: string;
  variant: "candidate" | "interviewer";
  className: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden border border-white/10 ${className} ${
        variant === "interviewer"
          ? "bg-[radial-gradient(circle_at_30%_30%,rgba(34,211,238,0.22),transparent_32%),linear-gradient(135deg,#17303a,#0a1418)]"
          : "bg-[radial-gradient(circle_at_70%_25%,rgba(16,185,129,0.22),transparent_28%),linear-gradient(135deg,#0c2226,#081418)]"
      }`}
    >
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2270%22 height=%2270%22 viewBox=%220%200%2070%2070%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22rgba(255,255,255,0.03)%22 fill-opacity=%221%22%3E%3Ccircle cx=%2235%22 cy=%2235%22 r=%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
      <div className="absolute left-6 top-6">
        <div className="text-lg font-medium text-white">{title}</div>
        <div className="mt-1 text-sm text-white/50">{subtitle}</div>
      </div>
      <div className={`absolute ${compact ? "bottom-5 left-5" : "bottom-8 left-8"} h-[72%] w-[46%] rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03))] blur-[0.4px]`} />
      <div className={`absolute ${compact ? "right-4 top-5" : "right-10 top-10"} h-[22%] w-[22%] rounded-full bg-white/8`} />
    </div>
  );
}
