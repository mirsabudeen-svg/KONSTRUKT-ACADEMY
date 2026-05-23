/** Hardcoded mission brief checklists — replace with CMS content later. */
export const MISSION_CHECKLISTS: Record<number, string[]> = {
  1: [
    "Read the safety oath aloud with your trainer",
    "Identify all PPE items in your kit",
    "Label the 4 DOF joints on the demo arm",
    "Complete the safety quiz with 100% score",
  ],
  2: [
    "Write one prompt using WHAT + STYLE + DETAILS",
    "Run the prompt in the AI Terminal",
    "Revise your prompt at least once based on feedback",
    "Save your best prompt text for submission",
  ],
  3: [
    "Generate a simple printable object in Meshy",
    "Export an STL file under 25 MB",
    "Verify wall thickness is ≥ 1.2 mm",
    "Upload your STL for trainer review",
  ],
  4: [
    "Identify ESP32-S3, PCA9685, and MG996R on the diagram",
    "Explain why sequential servo motion matters",
    "Sketch your wiring plan on paper",
    "Submit a photo or notes of your wiring prep",
  ],
  5: [
    "Design a robot part within the 180 mm boundary",
    "Include tree supports in your export settings",
    "Run the trainer approval checklist",
    "Upload manufacturable STL for review",
  ],
  6: [
    "Complete the pre-flight print checklist",
    "Inspect first-layer adhesion on a test print",
    "Log one failure mode you learned to diagnose",
    "Submit evidence of a successful test print",
  ],
  7: [
    "Assemble the base frame with correct symmetry",
    "Align servos to zero position before fastening",
    "Complete the mechanical quality checklist",
    "Submit build photos or assembly notes",
  ],
  8: [
    "Install upper arm and four-bar linkage",
    "Verify wrist J4 and gripper articulation",
    "Run the articulation test without binding",
    "Submit video demo or test notes",
  ],
  9: [
    "Generate Arduino code with sequential delay() motion",
    "Calibrate each MG996R joint one at a time",
    "Run a pick-and-place demo sequence",
    "Paste your final code for trainer review",
  ],
  10: [
    "Complete the showcase checklist",
    "Prepare your 60-second mission intro",
    "Run a full demo for your trainer",
    "Submit your showcase reflection notes",
  ],
};

export function getMissionChecklist(moduleId: number): string[] {
  return MISSION_CHECKLISTS[moduleId] ?? [
    "Review the mission brief",
    "Complete all activities with your trainer",
    "Submit your work for review",
  ];
}
