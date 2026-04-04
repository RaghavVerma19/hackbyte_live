"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AppFrame } from "@/components/verifai-layout";
import { useMockAuth, type MockRole } from "@/components/mock-auth-provider";

export default function AuthPage() {
  const router = useRouter();
  const { signIn, signUp } = useMockAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<MockRole>("candidate");
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");

  const handleSignIn = (event: FormEvent) => {
    event.preventDefault();
    signIn({ email: signInEmail, password: signInPassword });
    router.push("/dashboard");
  };

  const handleSignUp = (event: FormEvent) => {
    event.preventDefault();
    signUp({
      name: signUpName,
      email: signUpEmail,
      password: signUpPassword,
      role,
    });
    router.push("/dashboard");
  };

  return (
    <AppFrame compactHeader>
      <section className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-6xl items-center justify-center px-6 pb-16">
        <div className="grid w-full items-stretch gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="verifai-card rounded-[34px] border border-white/10 p-8 lg:p-10">
            <div className="verifai-badge">VerifAI access</div>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white">
              Enter the hiring intelligence workspace.
            </h1>
            <p className="mt-4 max-w-md text-base leading-7 text-white/60">
              Switch between candidate and interviewer journeys with a clean mock auth flow built for
              product demos and fast validation.
            </p>

            <div className="mt-10 space-y-4">
              <InfoPill title="Candidate mode" description="Warm, distraction-free interview prep and call experience." />
              <InfoPill title="Interviewer mode" description="Resume checks, ATS scan, judgments, and confident decision support." />
            </div>
          </div>

          <div className="verifai-card rounded-[34px] border border-white/10 p-6 sm:p-8">
            <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
              <button
                onClick={() => setMode("signin")}
                className={`rounded-full px-5 py-2 text-sm transition ${mode === "signin" ? "bg-white text-slate-950" : "text-white/60"}`}
              >
                Sign In
              </button>
              <button
                onClick={() => setMode("signup")}
                className={`rounded-full px-5 py-2 text-sm transition ${mode === "signup" ? "bg-white text-slate-950" : "text-white/60"}`}
              >
                Sign Up
              </button>
            </div>

            {mode === "signin" ? (
              <form className="mt-8 space-y-4" onSubmit={handleSignIn}>
                <AuthField label="Email" value={signInEmail} onChange={setSignInEmail} placeholder="name@company.com" />
                <AuthField label="Password" type="password" value={signInPassword} onChange={setSignInPassword} placeholder="Enter your password" />
                <p className="text-sm text-white/45">
                  Demo note: emails containing <span className="text-cyan-300">candidate</span> sign in as candidates. Everything else signs in as interviewer.
                </p>
                <button className="verifai-primary-button w-full" type="submit">
                  Continue to Dashboard
                </button>
              </form>
            ) : (
              <form className="mt-8 space-y-4" onSubmit={handleSignUp}>
                <AuthField label="Full Name" value={signUpName} onChange={setSignUpName} placeholder="Jessica Parker" />
                <AuthField label="Email" value={signUpEmail} onChange={setSignUpEmail} placeholder="jessica@verifai.ai" />
                <AuthField label="Password" type="password" value={signUpPassword} onChange={setSignUpPassword} placeholder="Create your password" />

                <div>
                  <div className="mb-3 text-sm text-white/65">Select your role</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { value: "candidate", title: "I am a Candidate", description: "Join interviews and present your best self." },
                      { value: "interviewer", title: "I am an Interviewer", description: "Review candidates with AI-backed intelligence." },
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setRole(item.value as MockRole)}
                        className={`rounded-[24px] border p-4 text-left transition ${
                          role === item.value ? "border-cyan-300/45 bg-cyan-300/10" : "border-white/10 bg-white/[0.03]"
                        }`}
                      >
                        <div className="text-sm font-medium text-white">{item.title}</div>
                        <div className="mt-2 text-sm leading-6 text-white/52">{item.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <button className="verifai-primary-button w-full" type="submit">
                  Create Account
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </AppFrame>
  );
}

function AuthField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-white/65">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[22px] border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none transition placeholder:text-white/28 focus:border-cyan-300/35 focus:bg-white/[0.07]"
      />
    </label>
  );
}

function InfoPill({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
      <div className="text-lg font-medium text-white">{title}</div>
      <div className="mt-2 text-sm leading-6 text-white/55">{description}</div>
    </div>
  );
}
