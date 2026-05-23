import "server-only";

import { auth } from "@clerk/nextjs/server";

import type { MissionModule, SubmissionType } from "@/lib/db/types";
import { getMissionById } from "@/lib/progress/missions";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ensureStudentProfile } from "@/lib/user";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const STORAGE_BUCKET = "mission-submissions";

export type SubmitMissionInput = {
  moduleId: number;
  workDescription: string;
  file?: File | null;
};

export type SubmitMissionResult =
  | { ok: true; submissionId: string }
  | { ok: false; error: string; status: number };

function buildContentPayload(
  workDescription: string,
  fileUrl: string | null
): string {
  if (fileUrl && workDescription.trim()) {
    return JSON.stringify({ text: workDescription.trim(), fileUrl });
  }
  if (fileUrl) return fileUrl;
  return workDescription.trim();
}

async function uploadMissionFile(
  studentId: string,
  moduleId: number,
  file: File
): Promise<{ url: string } | { error: string }> {
  if (file.size > MAX_FILE_BYTES) {
    return { error: "File must be under 25 MB" };
  }

  try {
    const admin = createSupabaseAdmin();
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${studentId}/${moduleId}/${Date.now()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error("[uploadMissionFile]", uploadError.message);
      return { error: "File upload failed. Ask your trainer to enable storage." };
    }

    const { data } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return { url: data.publicUrl };
  } catch (err) {
    console.error("[uploadMissionFile]", err);
    return { error: "File upload unavailable" };
  }
}

export async function submitMissionWork(
  input: SubmitMissionInput
): Promise<SubmitMissionResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Unauthorized", status: 401 };
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase not configured", status: 503 };
  }

  await ensureStudentProfile(userId);

  const mission: MissionModule | null = await getMissionById(input.moduleId);
  if (!mission) {
    return { ok: false, error: "Mission not found", status: 404 };
  }

  if (!mission.unlocked) {
    return { ok: false, error: "Mission is locked", status: 403 };
  }

  if (mission.displayStatus === "completed") {
    return { ok: false, error: "Mission already completed", status: 409 };
  }

  if (mission.displayStatus === "pending_review") {
    return {
      ok: false,
      error: "Submission already pending trainer review",
      status: 409,
    };
  }

  const workDescription = input.workDescription.trim();
  const hasFile = Boolean(input.file && input.file.size > 0);

  if (!workDescription && !hasFile) {
    return {
      ok: false,
      error: "Add a description or upload a file",
      status: 400,
    };
  }

  let fileUrl: string | null = null;
  if (hasFile && input.file) {
    const uploaded = await uploadMissionFile(
      userId,
      input.moduleId,
      input.file
    );
    if ("error" in uploaded) {
      return { ok: false, error: uploaded.error, status: 400 };
    }
    fileUrl = uploaded.url;
  }

  const submissionType: SubmissionType = hasFile ? "stl" : "code";
  const contentUrl = buildContentPayload(workDescription, fileUrl);

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Database unavailable", status: 503 };
  }

  const { data: submission, error: insertError } = await supabase
    .from("submissions")
    .insert({
      student_id: userId,
      module_id: input.moduleId,
      submission_type: submissionType,
      content_url: contentUrl,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !submission) {
    console.error("[submitMissionWork] insert", insertError?.message);
    return {
      ok: false,
      error: insertError?.message ?? "Failed to save submission",
      status: 500,
    };
  }

  const { error: progressError } = await supabase
    .from("progress")
    .update({ status: "pending_review" })
    .eq("student_id", userId)
    .eq("module_id", input.moduleId);

  if (progressError) {
    console.error("[submitMissionWork] progress", progressError.message);
    return {
      ok: false,
      error: "Submission saved but progress update failed",
      status: 500,
    };
  }

  return { ok: true, submissionId: submission.id };
}
