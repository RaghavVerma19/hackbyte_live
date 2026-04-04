import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RoomClient } from "@/components/room-client";
import { VerifAiLogo } from "@/components/ui/verifai-logo";

export default async function RoomPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.12),transparent_22%),radial-gradient(circle_at_88%_12%,rgba(34,211,238,0.1),transparent_20%),linear-gradient(180deg,#020617_0%,#09090b_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-slate-950 via-slate-950/70 to-transparent" />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
        <div className="meet-shell flex items-center justify-between px-1 py-5">
          <div className="pointer-events-auto flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <VerifAiLogo subtitle="Live Interview" />
              <div className="mt-2 text-sm text-white/55">All the best for your interview!</div>
            </div>
          </div>

          <div className="pointer-events-auto hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 md:inline-flex">
            Room ID: {id}
          </div>
        </div>
      </div>

      <div className="relative z-0">
        <RoomClient roomId={id} />
      </div>
    </main>
  );
}
