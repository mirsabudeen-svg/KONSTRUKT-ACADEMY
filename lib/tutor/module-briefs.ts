/** Learning objectives per mission module (10-day curriculum). */
export const MODULE_OBJECTIVES: Record<number, string[]> = {
  1: [
    "Understand workshop safety rules and PPE requirements",
    "Identify major parts of the KONSTRUKT robotic arm",
    "Complete a safety orientation checklist with your trainer",
  ],
  2: [
    "Apply the WHAT + STYLE + DETAILS prompt formula",
    "Iterate on AI prompts to improve outputs",
    "Explain how AI assists engineering design (not replaces it)",
  ],
  3: [
    "Describe the idea-to-object manufacturing pipeline",
    "Export a printable STL with correct scale and wall thickness",
    "Explain when to use Meshy vs hand-modelling",
  ],
  4: [
    "Name ESP32-S3, PCA9685, and MG996R roles in the arm",
    "Explain sequential vs simultaneous servo motion",
    "Plan safe wiring before powering the bench",
  ],
  5: [
    "Design within the 180 mm build volume constraint",
    "Apply manufacturability rules (wall thickness, overhangs)",
    "Iterate designs based on trainer feedback",
  ],
  6: [
    "Follow the print queue and pre-flight checklist",
    "Diagnose common FDM failures (adhesion, stringing)",
    "Inspect print quality before assembly use",
  ],
  7: [
    "Assemble base frame with symmetry and alignment",
    "Set servo zero positions before final tightening",
    "Complete mechanical quality checks before Phase 2",
  ],
  8: [
    "Build upper arm, linkage, wrist, and gripper sub-assemblies",
    "Test articulation through full range without binding",
    "Document mechanical issues for trainer review",
  ],
  9: [
    "Write sequential-motion Arduino code for MG996R servos",
    "Calibrate joints and debug motion errors",
    "Explain the brownout rule in your own words",
  ],
  10: [
    "Prepare a showcase demo script and mission brief",
    "Present your build to peers and trainers",
    "Reflect on skills earned across all 10 missions",
  ],
};

export function getModuleObjectives(moduleId: number): string[] {
  return (
    MODULE_OBJECTIVES[moduleId] ?? [
      "Understand the mission goals",
      "Complete hands-on activities with your trainer",
      "Submit evidence of learning",
    ]
  );
}
