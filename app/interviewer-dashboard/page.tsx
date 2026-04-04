"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { AppFrame } from "@/components/verifai-layout";
import { useMockAuth } from "@/components/mock-auth-provider";

const MOCK_JUDGMENTS = [
  { name: "Aarav Mishra", date: "April 5, 2026", role: "Frontend Engineer", status: "Highly Confident: Hire", tone: "teal" },
  { name: "Sana Qureshi", date: "April 4, 2026", role: "Backend Engineer", status: "Requires Review", tone: "amber" },
  { name: "Vikram Rao", date: "April 3, 2026", role: "Data Analyst", status: "Promising: Follow Up", tone: "cyan" },
  { name: "Niharika Das", date: "April 2, 2026", role: "Full Stack Intern", status: "Highly Confident: Hire", tone: "teal" },
];

export default function InterviewerDashboardPage() {
  const router = useRouter();
  const { isReady, isAuthenticated, user } = useMockAuth();

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/auth");
      return;
    }
    if (user?.role !== "interviewer") {
      router.replace("/interview");
    }
  }, [isAuthenticated, isReady, router, user?.role]);

  if (!isReady || !isAuthenticated || user?.role !== "interviewer") return null;

  return (
    <AppFrame compactHeader>
      <section className="mx-auto w-full max-w-7xl px-6 pb-24">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="verifai-badge">Recruiter view</div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white">Let&apos;s hire good candidates!</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-white/58">
              Launch new interviews, review recent AI judgments, and keep the hiring loop moving with confidence.
            </p>
          </div>
          <button className="verifai-primary-button">
            <Plus className="h-4 w-4" />
            Create New Interview
          </button>
        </div>

        <div className="verifai-panel mt-10 rounded-[34px] p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm uppercase tracking-[0.26em] text-white/42">Recent Interview Judgments</div>
              <div className="mt-2 text-2xl font-medium text-white">Decision feed</div>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-[28px] border border-white/10">
            <div className="grid grid-cols-[1.15fr_0.9fr_1fr_1.15fr] bg-white/[0.05] px-5 py-4 text-sm text-white/46">
              <div>Candidate Name</div>
              <div>Date</div>
              <div>Role</div>
              <div>Status</div>
            </div>
            {MOCK_JUDGMENTS.map((row) => (
              <div
                key={`${row.name}-${row.date}`}
                className="grid grid-cols-[1.15fr_0.9fr_1fr_1.15fr] items-center border-t border-white/8 px-5 py-4 text-sm text-white/74"
              >
                <div>{row.name}</div>
                <div>{row.date}</div>
                <div>{row.role}</div>
                <div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1.5 text-xs font-medium ${
                      row.tone === "teal"
                        ? "bg-emerald-400/16 text-emerald-200"
                        : row.tone === "amber"
                          ? "bg-amber-400/18 text-amber-100"
                          : "bg-cyan-400/16 text-cyan-100"
                    }`}
                  >
                    {row.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppFrame>
  );
}
