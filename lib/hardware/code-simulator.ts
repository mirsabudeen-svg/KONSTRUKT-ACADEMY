import type {
  SimulationResult,
  SimulationStep,
  SimulationViolation,
} from "@/lib/hardware/types";

type ParsedEvent =
  | { kind: "servo"; servo: string; angle: number; line: number; col: number }
  | { kind: "delay"; ms: number; line: number; col: number };

const SERVO_WRITE_RE =
  /(\w+)\.write\s*\(\s*(\d+(?:\.\d+)?)\s*\)/gi;
const SET_JOINT_RE =
  /setJointAngle\s*\(\s*(\d+)\s*,\s*(\d+(?:\.\d+)?)\s*\)/gi;
const DELAY_RE = /delay\s*\(\s*(\d+(?:\.\d+)?)\s*\)/gi;

function stripComments(code: string): string {
  return code
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

function parseEvents(code: string): ParsedEvent[] {
  const cleaned = stripComments(code);
  const eventsWithLines: ParsedEvent[] = [];
  const lines = cleaned.split("\n");

  lines.forEach((lineText, idx) => {
    const line = idx + 1;

    SERVO_WRITE_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = SERVO_WRITE_RE.exec(lineText)) !== null) {
      eventsWithLines.push({
        kind: "servo",
        servo: match[1].toLowerCase(),
        angle: Number(match[2]),
        line,
        col: match.index,
      });
    }

    SET_JOINT_RE.lastIndex = 0;
    while ((match = SET_JOINT_RE.exec(lineText)) !== null) {
      eventsWithLines.push({
        kind: "servo",
        servo: `servo${match[1]}`,
        angle: Number(match[2]),
        line,
        col: match.index,
      });
    }

    DELAY_RE.lastIndex = 0;
    while ((match = DELAY_RE.exec(lineText)) !== null) {
      eventsWithLines.push({
        kind: "delay",
        ms: Number(match[1]),
        line,
        col: match.index,
      });
    }
  });

  return eventsWithLines.sort((a, b) =>
    a.line === b.line ? a.col - b.col : a.line - b.line
  );
}

function detectViolations(events: ParsedEvent[]): SimulationViolation[] {
  const violations: SimulationViolation[] = [];
  const seenServos = new Set<string>();

  for (const event of events) {
    if (event.kind !== "servo") continue;
    seenServos.add(event.servo);

    if (event.angle < 0 || event.angle > 180) {
      violations.push({
        type: "over_angle",
        line: event.line,
        description: `${event.servo}.write(${event.angle}) — angle must be 0–180°`,
        fix: `Use an angle between 0 and 180, e.g. ${event.servo}.write(90);`,
      });
    }
  }

  for (let i = 0; i < events.length; i++) {
    const current = events[i];
    if (current.kind !== "servo") continue;

    const next = events[i + 1];
    if (!next) continue;

    if (next.kind === "servo") {
      violations.push({
        type: "brownout",
        line: next.line,
        description: `Brownout risk: ${current.servo} and ${next.servo} moved with no delay() between them`,
        fix: "Add delay(500–1500) between each servo.write() call",
      });
      continue;
    }

    if (next.kind === "delay" && next.ms < 500) {
      const afterDelay = events[i + 2];
      if (afterDelay?.kind === "servo") {
        violations.push({
          type: "no_delay",
          line: next.line,
          description: `Delay of ${next.ms}ms is too short — MG996R servos need ≥500ms between moves`,
          fix: "Increase delay to at least 500ms, ideally 1000ms",
        });
      }
    }
  }

  return violations;
}

function buildSteps(events: ParsedEvent[]): SimulationStep[] {
  const steps: SimulationStep[] = [];
  let stepNum = 0;
  let totalMs = 0;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    if (event.kind === "delay") {
      stepNum++;
      totalMs += event.ms;
      steps.push({
        step: stepNum,
        servo: "—",
        action: `delay(${event.ms}ms)`,
        line: event.line,
        delay_after_ms: 0,
        safe: true,
        kind: "delay",
      });
      continue;
    }

    let delayAfter = 0;
    const next = events[i + 1];
    if (next?.kind === "delay") {
      delayAfter = next.ms;
    }

    const hasBrownout =
      next?.kind === "servo" ||
      (next?.kind === "delay" && next.ms < 500 && events[i + 2]?.kind === "servo");
    const overAngle = event.angle < 0 || event.angle > 180;

    stepNum++;
    totalMs += delayAfter;
    steps.push({
      step: stepNum,
      servo: event.servo,
      action: `move to ${event.angle}°`,
      line: event.line,
      delay_after_ms: delayAfter,
      safe: !hasBrownout && !overAngle,
      kind: "servo",
    });
  }

  return steps;
}

export function simulateCode(code: string): SimulationResult {
  const events = parseEvents(code);
  const violations = detectViolations(events);
  const steps = buildSteps(events);
  const servos = new Set(
    events.filter((e): e is Extract<ParsedEvent, { kind: "servo" }> => e.kind === "servo").map((e) => e.servo)
  );

  const total_duration_ms = events.reduce((sum, e) => {
    if (e.kind === "delay") return sum + e.ms;
    const next = events[events.indexOf(e) + 1];
    if (next?.kind === "delay") return sum + next.ms;
    return sum;
  }, 0);

  const hasCritical = violations.some(
    (v) => v.type === "brownout" || v.type === "over_angle"
  );

  return {
    steps,
    violations,
    total_duration_ms,
    safe: !hasCritical,
    servo_count: servos.size,
  };
}
