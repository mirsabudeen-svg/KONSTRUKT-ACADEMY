import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Orbitron, Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getClerkDomain } from "@/lib/clerk-config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "KONSTRUKT Robotics Academy",
  description:
    "Premium robotics LMS for cadets ages 9–16. Learn, build, and launch your missions.",
};

const clerkAppearance = {
  variables: {
    colorBackground: "#0b1220",
    colorInputBackground: "#111827",
    colorPrimary: "#22d3ee",
    colorText: "#f8fafc",
    colorTextSecondary: "#94a3b8",
    borderRadius: "0.75rem",
  },
  elements: {
    card: "bg-[#0b1220] border border-cyan-500/20 shadow-xl shadow-cyan-500/10",
    headerTitle: "font-display tracking-wide",
    formButtonPrimary:
      "bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={clerkAppearance} domain={getClerkDomain()}>
      <html
        lang="en"
        className={`dark ${geistSans.variable} ${geistMono.variable} ${orbitron.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col font-sans">
          <TooltipProvider>{children}</TooltipProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
