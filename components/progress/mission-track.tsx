"use client";

import { createElement, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Award,
  Check,
  Hourglass,
  Loader2,
  Lock,
} from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MissionModule, ModuleDisplayStatus } from "@/lib/db/types";
import {
  getModuleBadgeIcon,
  groupMissionsByLayer,
  MISSION_LAYERS,
} from "@/lib/progress/stats";
import { cn } from "@/lib/utils";

type MissionTrackProps = {
  missions: MissionModule[];
};

const STATUS_LABELS: Record<ModuleDisplayStatus, string> = {
  locked: "Locked",
  available: "Ready",
  ready: "Ready",
  in_progress: "In Progress",
  pending_review: "Pending Review",
  completed: "Complete",
};

function nodeStyles(status: ModuleDisplayStatus) {
  switch (status) {
    case "locked":
      return {
        ring: "border-zinc-700/60 bg-zinc-900/80",
        glow: "",
        pulse: false,
        rotating: false,
        clickable: false,
      };
    case "available":
    case "ready":
      return {
        ring: "border-cyan-400/70 bg-cyan-500/15",
        glow: "shadow-[0_0_24px_-4px] shadow-cyan-400/60",
        pulse: true,
        rotating: true,
        clickable: true,
      };
    case "in_progress":
      return {
        ring: "border-violet-400/70 bg-violet-500/15",
        glow: "shadow-[0_0_24px_-4px] shadow-violet-500/50",
        pulse: false,
        rotating: false,
        clickable: true,
      };
    case "pending_review":
      return {
        ring: "border-amber-400/60 bg-amber-500/10",
        glow: "shadow-[0_0_20px_-6px] shadow-amber-400/40",
        pulse: false,
        rotating: false,
        clickable: false,
      };
    case "completed":
      return {
        ring: "border-emerald-400/70 bg-emerald-500/20",
        glow: "shadow-[0_0_20px_-6px] shadow-emerald-400/40",
        pulse: true,
        rotating: false,
        clickable: true,
      };
  }
}

function NodeIcon({
  status,
  moduleId,
}: {
  status: ModuleDisplayStatus;
  moduleId: number;
}) {
  const BadgeIcon = useMemo(
    () => getModuleBadgeIcon(moduleId),
    [moduleId]
  );

  if (status === "locked") {
    return <Lock className="size-4 text-zinc-500" aria-hidden />;
  }
  if (status === "pending_review") {
    return <Hourglass className="size-4 text-amber-300" aria-hidden />;
  }
  if (status === "in_progress") {
    return (
      <Loader2 className="size-4 animate-spin text-violet-300" aria-hidden />
    );
  }
  if (status === "completed") {
    return (
      <div className="relative">
        {createElement(BadgeIcon, {
          className: "size-4 text-emerald-300",
          "aria-hidden": true,
        })}
        <Check
          className="absolute -bottom-1 -right-1 size-2.5 rounded-full bg-emerald-500 text-emerald-950"
          aria-hidden
        />
      </div>
    );
  }
  return createElement(BadgeIcon, {
    className: "size-4 text-cyan-300",
    "aria-hidden": true,
  });
}

function TrackNode({
  mission,
  index,
  lineCompleted,
}: {
  mission: MissionModule;
  index: number;
  lineCompleted: boolean;
}) {
  const status = mission.displayStatus;
  const styles = nodeStyles(status);
  const interactive = styles.clickable && mission.unlocked;
  const href = `/missions/${mission.id}`;

  const nodeBody = (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1, duration: 0.4, ease: "backOut" }}
      className="relative flex flex-col items-center"
    >
      {styles.rotating && (
        <motion.span
          className="pointer-events-none absolute inset-0 rounded-full border border-cyan-400/40"
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          aria-hidden
        />
      )}
      {styles.pulse && status === "completed" && (
        <motion.span
          className="pointer-events-none absolute inset-0 rounded-full bg-emerald-400/20"
          animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          aria-hidden
        />
      )}
      {styles.pulse && (status === "ready" || status === "available") && (
        <motion.span
          className="pointer-events-none absolute inset-0 rounded-full bg-cyan-400/25"
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          aria-hidden
        />
      )}
      <div
        className={cn(
          "relative flex size-11 items-center justify-center rounded-full border-2 transition-transform",
          styles.ring,
          styles.glow,
          interactive && "group-hover:scale-110"
        )}
      >
        <NodeIcon status={status} moduleId={mission.id} />
      </div>
      <span className="mt-2 max-w-[72px] truncate text-center font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
        M{mission.id}
      </span>
    </motion.div>
  );

  const wrapped = interactive ? (
    <Link
      href={href}
      title={`${mission.title} — ${STATUS_LABELS[status]}`}
      className="group relative flex flex-col items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
    >
      {nodeBody}
    </Link>
  ) : (
    <div
      title={`${mission.title} — ${STATUS_LABELS[status]}`}
      className="relative flex flex-col items-center"
    >
      {nodeBody}
    </div>
  );

  return (
    <div className="flex min-w-0 flex-1 items-start">
      {index > 0 && (
        <ConnectingLine completed={lineCompleted} index={index} />
      )}
      <Tooltip>
        <TooltipTrigger>{wrapped}</TooltipTrigger>
        <TooltipContent
          side="top"
          className="border-cyan-500/20 bg-zinc-900 text-foreground"
        >
          <p className="font-semibold">{mission.title}</p>
          <p className="text-muted-foreground">{STATUS_LABELS[status]}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function ConnectingLine({
  completed,
  index,
}: {
  completed: boolean;
  index: number;
}) {
  return (
    <div className="relative mx-1 mt-5 hidden h-0.5 min-w-[12px] flex-1 sm:block">
      <div
        className={cn(
          "absolute inset-0 top-1/2 -translate-y-1/2",
          completed
            ? "h-0.5 bg-emerald-500/30"
            : "border-t-2 border-dashed border-zinc-700/80"
        )}
      />
      {completed && (
        <motion.div
          className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-gradient-to-r from-emerald-500/80 to-emerald-400/40 shadow-[0_0_8px] shadow-emerald-500/40"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{
            delay: index * 0.1 + 0.2,
            duration: 0.6,
            ease: "easeOut",
          }}
        />
      )}
    </div>
  );
}

function LayerSection({
  layer,
  missions,
  allMissions,
}: {
  layer: string;
  missions: MissionModule[];
  allMissions: MissionModule[];
}) {
  if (missions.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-400/80">
          {layer}
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-cyan-500/30 to-transparent" />
      </div>
      <div className="flex flex-wrap items-start gap-y-4">
        {missions.map((mission) => {
          const globalIndex = allMissions.findIndex((m) => m.id === mission.id);
          const prevMission =
            globalIndex > 0 ? allMissions[globalIndex - 1] : null;
          return (
            <TrackNode
              key={mission.id}
              mission={mission}
              index={globalIndex}
              lineCompleted={prevMission?.displayStatus === "completed"}
            />
          );
        })}
      </div>
    </section>
  );
}

export function MissionTrack({ missions }: MissionTrackProps) {
  const grouped = groupMissionsByLayer(missions);

  return (
    <TooltipProvider delay={200}>
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-zinc-950/80 via-card/40 to-violet-950/20 p-6 backdrop-blur-sm">
        <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 size-48 rounded-full bg-violet-500/5 blur-3xl" />

        <div className="mb-6 flex items-center gap-2">
          <Award className="size-5 text-cyan-400" aria-hidden />
          <h2 className="font-display text-lg font-semibold text-cyan-200">
            Mission Track
          </h2>
        </div>

        <div className="hidden xl:block">
          <div className="flex items-start">
            {missions.map((mission, index) => (
              <TrackNode
                key={mission.id}
                mission={mission}
                index={index}
                lineCompleted={
                  index > 0 &&
                  missions[index - 1]?.displayStatus === "completed"
                }
              />
            ))}
          </div>
          <div className="mt-4 flex">
            {MISSION_LAYERS.map((layer) => {
              const layerMissions = grouped[layer];
              if (!layerMissions.length) return null;
              return (
                <span
                  key={layer}
                  className="text-center font-mono text-[9px] uppercase tracking-[0.2em] text-violet-400/70"
                  style={{ flex: layerMissions.length }}
                >
                  {layer}
                </span>
              );
            })}
          </div>
        </div>

        <div className="space-y-8 xl:hidden">
          {MISSION_LAYERS.map((layer) => (
            <LayerSection
              key={layer}
              layer={layer}
              missions={grouped[layer]}
              allMissions={missions}
            />
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
