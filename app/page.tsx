import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Rocket, Cpu, Sparkles } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default async function LandingPage() {
  const { userId } = await auth();
  const isSignedIn = Boolean(userId);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(34,211,238,0.15),transparent)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <div>
          <span className="font-display text-xl font-bold tracking-[0.25em] text-cyan-400">
            {APP_NAME}
          </span>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {APP_TAGLINE}
          </p>
        </div>
        <nav className="flex items-center gap-3">
          {isSignedIn ? (
            <Link
              href="/dashboard"
              className={cn(buttonVariants({ variant: "default" }))}
            >
              Enter Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className={cn(buttonVariants({ variant: "ghost" }))}
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className={cn(buttonVariants({ variant: "default" }))}
              >
                Join Academy
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center md:px-12">
        <p className="mb-4 text-sm uppercase tracking-[0.3em] text-cyan-500/90">
          Ages 9–16 · Robotics LMS
        </p>
        <h1 className="font-display max-w-4xl text-4xl font-bold leading-tight tracking-wide text-foreground md:text-6xl">
          Launch your robotics mission from the{" "}
          <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
            command deck
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          A premium spaceship dashboard for young engineers. Ten locked missions,
          AI-powered code generation, and 3D printing — built for real hardware.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {isSignedIn ? (
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
              )}
            >
              Go to Command Center
            </Link>
          ) : (
            <>
              <Link
                href="/sign-up"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                )}
              >
                Start Your Mission
              </Link>
              <Link
                href="/sign-in"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                Cadet Sign In
              </Link>
            </>
          )}
        </div>

        <div className="mt-20 grid max-w-3xl gap-6 sm:grid-cols-3">
          <Feature
            icon={Rocket}
            title="10 Missions"
            text="Strict progression — unlock the next module only when the last is complete."
          />
          <Feature
            icon={Cpu}
            title="Real Hardware"
            text="ESP32-S3 + PCA9685 code with safe sequential servo motion."
          />
          <Feature
            icon={Sparkles}
            title="AI Tokens"
            text="Generate 3D models and code. Trainers refill when you need more fuel."
          />
        </div>
      </main>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-cyan-500/15 bg-card/30 p-5 text-left backdrop-blur-sm">
      <Icon className="size-6 text-cyan-400" aria-hidden />
      <h3 className="font-display mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
