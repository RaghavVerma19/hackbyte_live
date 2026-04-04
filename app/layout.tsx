import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { MockAuthProvider } from "@/components/mock-auth-provider";

export const metadata: Metadata = {
  title: "VerifAI",
  description: "AI-powered interview intelligence, ATS scoring, and resume verification.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <MockAuthProvider>{children}</MockAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
