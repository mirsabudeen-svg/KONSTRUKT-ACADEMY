"use client";

import { motion } from "framer-motion";

type RobotArmSvgProps = {
  angles: Record<string, number>;
  activeServo?: string | null;
};

const SERVO_JOINT_MAP: Record<string, keyof typeof DEFAULT_ANGLES> = {
  servo1: "base",
  servo2: "shoulder",
  servo3: "elbow",
  servo4: "gripper",
  base: "base",
  shoulder: "shoulder",
  elbow: "elbow",
  gripper: "gripper",
};

const DEFAULT_ANGLES = {
  base: 90,
  shoulder: 45,
  elbow: 60,
  gripper: 30,
};

export function RobotArmSvg({ angles, activeServo }: RobotArmSvgProps) {
  const jointKey = activeServo
    ? (SERVO_JOINT_MAP[activeServo.toLowerCase()] ?? "base")
    : null;

  const base = angles.base ?? DEFAULT_ANGLES.base;
  const shoulder = angles.shoulder ?? DEFAULT_ANGLES.shoulder;
  const elbow = angles.elbow ?? DEFAULT_ANGLES.elbow;
  const gripper = angles.gripper ?? DEFAULT_ANGLES.gripper;

  return (
    <svg
      viewBox="0 0 320 280"
      className="h-full w-full"
      aria-label="Robot arm simulation"
    >
      <rect width="320" height="280" fill="#0a0f1a" rx="8" />

      {/* Base platform */}
      <rect x="100" y="230" width="120" height="20" rx="4" fill="#164e63" />
      <text x="160" y="245" textAnchor="middle" fill="#67e8f9" fontSize="10">
        BASE {Math.round(base)}°
      </text>

      {/* Base rotation */}
      <motion.g
        animate={{ rotate: base - 90 }}
        transition={{ type: "spring", stiffness: 80, damping: 15 }}
        style={{ originX: "160px", originY: "230px" }}
      >
        {/* Shoulder joint */}
        <motion.g
          animate={{ rotate: -(shoulder - 90) }}
          transition={{ type: "spring", stiffness: 80, damping: 15 }}
          style={{ originX: "160px", originY: "200px" }}
        >
          <line
            x1="160"
            y1="230"
            x2="160"
            y2="140"
            stroke={jointKey === "shoulder" ? "#22d3ee" : "#0891b2"}
            strokeWidth="8"
            strokeLinecap="round"
          />
          <circle
            cx="160"
            cy="200"
            r="10"
            fill={jointKey === "shoulder" ? "#22d3ee" : "#0e7490"}
          />
          <text x="175" y="175" fill="#67e8f9" fontSize="10">
            J2 {Math.round(shoulder)}°
          </text>

          {/* Elbow */}
          <motion.g
            animate={{ rotate: elbow - 90 }}
            transition={{ type: "spring", stiffness: 80, damping: 15 }}
            style={{ originX: "160px", originY: "140px" }}
          >
            <line
              x1="160"
              y1="140"
              x2="160"
              y2="80"
              stroke={jointKey === "elbow" ? "#22d3ee" : "#0891b2"}
              strokeWidth="6"
              strokeLinecap="round"
            />
            <circle
              cx="160"
              cy="140"
              r="8"
              fill={jointKey === "elbow" ? "#22d3ee" : "#0e7490"}
            />
            <text x="175" y="110" fill="#67e8f9" fontSize="10">
              J3 {Math.round(elbow)}°
            </text>

            {/* Gripper */}
            <motion.g
              animate={{ rotate: gripper - 45 }}
              transition={{ type: "spring", stiffness: 80, damping: 15 }}
              style={{ originX: "160px", originY: "80px" }}
            >
              <line x1="160" y1="80" x2="145" y2="55" stroke="#22d3ee" strokeWidth="3" />
              <line x1="160" y1="80" x2="175" y2="55" stroke="#22d3ee" strokeWidth="3" />
              <text x="130" y="50" fill="#67e8f9" fontSize="9">
                GRIP {Math.round(gripper)}°
              </text>
            </motion.g>
          </motion.g>
        </motion.g>
      </motion.g>

      <circle
        cx="160"
        cy="230"
        r="12"
        fill={jointKey === "base" ? "#22d3ee" : "#0e7490"}
      />
    </svg>
  );
}

export function anglesFromSimulationSteps(
  steps: Array<{ kind: string; servo: string; action: string }>
): Record<string, number> {
  const angles: Record<string, number> = {
    base: 90,
    shoulder: 45,
    elbow: 60,
    gripper: 30,
  };

  const servoMap: Record<string, keyof typeof angles> = {
    servo1: "base",
    servo2: "shoulder",
    servo3: "elbow",
    servo4: "gripper",
  };

  for (const step of steps) {
    if (step.kind !== "servo") continue;
    const joint = servoMap[step.servo.toLowerCase()];
    const match = step.action.match(/(\d+(?:\.\d+)?)/);
    if (joint && match) {
      angles[joint] = Number(match[1]);
    }
  }

  return angles;
}
