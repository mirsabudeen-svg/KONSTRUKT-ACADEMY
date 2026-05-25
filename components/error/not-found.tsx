import Link from "next/link";
import { Rocket } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NotFoundContent() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="relative">
        <div className="astronaut-float text-6xl" aria-hidden>
          🧑‍🚀
        </div>
        <Rocket
          className="absolute -right-8 -top-4 size-8 text-cyan-400 opacity-60"
          aria-hidden
        />
      </div>
      <h1 className="font-display mt-8 text-4xl font-bold text-cyan-200">
        Mission Not Found 🚀
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        This bay doesn&apos;t exist in our mission track. Check the URL or head
        back to Command Center.
      </p>
      <Link
        href="/dashboard"
        className={cn(
          buttonVariants(),
          "mt-8 bg-cyan-500 text-slate-950 hover:bg-cyan-400"
        )}
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
