import { auth } from "@clerk/nextjs/server";

import {
  createChallenge,
  getChallengesForStudent,
  getTrainerCohortId,
} from "@/lib/gamification/challenges";
import { getUserRoleById, isTrainerOrAdminRole } from "@/lib/auth/trainer";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const challenges = await getChallengesForStudent(userId);
  return Response.json({ challenges });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getUserRoleById(userId);
  if (!isTrainerOrAdminRole(role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    title?: string;
    description?: string;
    module_id?: number;
    xp_reward?: number;
    deadline?: string;
    cohort_id?: string;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, description, module_id, xp_reward, deadline, cohort_id } =
    body;

  if (!title?.trim()) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }

  let cohortId = cohort_id;
  if (!cohortId) {
    cohortId = (await getTrainerCohortId(userId)) ?? undefined;
  }

  if (!cohortId) {
    return Response.json({ error: "No cohort assigned" }, { status: 400 });
  }

  const result = await createChallenge({
    title: title.trim(),
    description: description?.trim(),
    moduleId: module_id,
    xpReward: xp_reward ?? 50,
    deadline,
    cohortId,
    createdBy: userId,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 500 });
  }

  return Response.json({ challenge: result.challenge }, { status: 201 });
}
