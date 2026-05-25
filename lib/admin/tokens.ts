import "server-only";

import { resolveClerkDisplayNames } from "@/lib/admin/clerk-names";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { TOKEN_REFILL_AMOUNT } from "@/lib/trainer/constants";

export type TokenAnalyticsData = {
  totalDistributedThisMonth: number;
  totalConsumedThisMonth: number;
  avgTokensPerStudent: number;
  mostTokenHungryModule: { moduleId: number; title: string; tokens: number } | null;
  usageByType: { type: string; count: number }[];
  dailyConsumption: { date: string; tokens: number }[];
  topUsers: { studentId: string; name: string; tokens: number }[];
  balanceDistribution: { range: string; count: number }[];
  refillHistory: {
    id: string;
    trainerName: string;
    studentName: string;
    amount: number;
    date: string;
  }[];
  lowTokenStudents: {
    id: string;
    name: string;
    email: string | null;
    tokensRemaining: number;
  }[];
};

const USAGE_LABELS: Record<string, string> = {
  ai_terminal: "AI Terminal",
  meshy_3d: "3D Generation",
  tutor: "Tutor",
  code_gen: "Code Gen",
  assembly_guide: "Assembly Guide",
  design_validation: "Design Validation",
};

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function fetchTokenAnalytics(): Promise<TokenAnalyticsData> {
  const empty: TokenAnalyticsData = {
    totalDistributedThisMonth: 0,
    totalConsumedThisMonth: 0,
    avgTokensPerStudent: 0,
    mostTokenHungryModule: null,
    usageByType: [],
    dailyConsumption: [],
    topUsers: [],
    balanceDistribution: [],
    refillHistory: [],
    lowTokenStudents: [],
  };

  if (!isSupabaseConfigured()) return empty;

  const admin = createSupabaseAdmin();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: students } = await admin
    .from("users")
    .select("id, tokens_remaining")
    .eq("role", "student");

  const studentCount = students?.length ?? 0;

  const { data: usageLogs } = await admin
    .from("token_usage_log")
    .select("student_id, usage_type, tokens_used, module_id, created_at")
    .gte("created_at", monthStart.toISOString());

  const { data: refills } = await admin
    .from("token_refill_log")
    .select("id, trainer_id, student_id, amount, created_at")
    .gte("created_at", monthStart.toISOString())
    .order("created_at", { ascending: false })
    .limit(50);

  const totalConsumedThisMonth = (usageLogs ?? []).reduce(
    (sum, row) => sum + (row.tokens_used ?? 0),
    0
  );

  const totalDistributedThisMonth = (refills ?? []).reduce(
    (sum, row) => sum + (row.amount ?? 0),
    0
  );

  const avgTokensPerStudent =
    studentCount > 0
      ? Math.round((totalConsumedThisMonth / studentCount) * 10) / 10
      : 0;

  const moduleTokens = new Map<number, number>();
  for (const log of usageLogs ?? []) {
    if (log.module_id != null) {
      moduleTokens.set(
        log.module_id,
        (moduleTokens.get(log.module_id) ?? 0) + (log.tokens_used ?? 0)
      );
    }
  }

  let mostTokenHungryModule: TokenAnalyticsData["mostTokenHungryModule"] = null;
  if (moduleTokens.size > 0) {
    const topModuleId = [...moduleTokens.entries()].sort(
      (a, b) => b[1] - a[1]
    )[0][0];
    const { data: mod } = await admin
      .from("modules")
      .select("id, title")
      .eq("id", topModuleId)
      .maybeSingle();
    mostTokenHungryModule = {
      moduleId: topModuleId,
      title: mod?.title ?? `Module ${topModuleId}`,
      tokens: moduleTokens.get(topModuleId) ?? 0,
    };
  }

  const typeCounts = new Map<string, number>();
  for (const log of usageLogs ?? []) {
    const label = USAGE_LABELS[log.usage_type] ?? log.usage_type;
    typeCounts.set(label, (typeCounts.get(label) ?? 0) + (log.tokens_used ?? 0));
  }

  const usageByType = [...typeCounts.entries()].map(([type, count]) => ({
    type,
    count,
  }));

  const dailyConsumption: { date: string; tokens: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = daysAgoIso(i);
    const tokens = (usageLogs ?? [])
      .filter((l) => l.created_at.slice(0, 10) === date)
      .reduce((sum, l) => sum + (l.tokens_used ?? 0), 0);
    dailyConsumption.push({ date, tokens });
  }

  const userTokens = new Map<string, number>();
  for (const log of usageLogs ?? []) {
    userTokens.set(
      log.student_id,
      (userTokens.get(log.student_id) ?? 0) + (log.tokens_used ?? 0)
    );
  }

  const topUserIds = [...userTokens.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id);

  const topNames = await resolveClerkDisplayNames(topUserIds);
  const topUsers = topUserIds.map((id) => ({
    studentId: id,
    name: topNames.get(id)?.name ?? `Student ${id.slice(-4)}`,
    tokens: userTokens.get(id) ?? 0,
  }));

  const buckets = [
    { range: "0-2", min: 0, max: 2, count: 0 },
    { range: "3-5", min: 3, max: 5, count: 0 },
    { range: "6-8", min: 6, max: 8, count: 0 },
    { range: "9-10", min: 9, max: 10, count: 0 },
  ];

  for (const student of students ?? []) {
    const t = student.tokens_remaining;
    const bucket = buckets.find((b) => t >= b.min && t <= b.max);
    if (bucket) bucket.count++;
  }

  const balanceDistribution = buckets.map(({ range, count }) => ({ range, count }));

  const refillIds = [
    ...new Set([
      ...(refills ?? []).map((r) => r.trainer_id).filter(Boolean) as string[],
      ...(refills ?? []).map((r) => r.student_id),
    ]),
  ];
  const refillNames = await resolveClerkDisplayNames(refillIds);

  const refillHistory = (refills ?? []).map((r) => ({
    id: r.id,
    trainerName:
      refillNames.get(r.trainer_id ?? "")?.name ??
      (r.trainer_id ? `Trainer ${r.trainer_id.slice(-4)}` : "System"),
    studentName:
      refillNames.get(r.student_id)?.name ?? `Student ${r.student_id.slice(-4)}`,
    amount: r.amount,
    date: r.created_at,
  }));

  const lowTokenIds = (students ?? [])
    .filter((s) => s.tokens_remaining <= 2)
    .map((s) => s.id);

  const lowNames = await resolveClerkDisplayNames(lowTokenIds);
  const lowTokenStudents = lowTokenIds.map((id) => {
    const student = students?.find((s) => s.id === id);
    const profile = lowNames.get(id);
    return {
      id,
      name: profile?.name ?? `Student ${id.slice(-4)}`,
      email: profile?.email ?? null,
      tokensRemaining: student?.tokens_remaining ?? 0,
    };
  });

  return {
    totalDistributedThisMonth,
    totalConsumedThisMonth,
    avgTokensPerStudent,
    mostTokenHungryModule,
    usageByType,
    dailyConsumption,
    topUsers,
    balanceDistribution,
    refillHistory,
    lowTokenStudents,
  };
}

export async function bulkRefillLowTokenStudents(
  adminUserId: string,
  threshold = 2,
  amount = TOKEN_REFILL_AMOUNT
): Promise<{ refilled: number }> {
  if (!isSupabaseConfigured()) return { refilled: 0 };

  const admin = createSupabaseAdmin();

  const { data: lowStudents } = await admin
    .from("users")
    .select("id, tokens_remaining")
    .eq("role", "student")
    .lte("tokens_remaining", threshold);

  let refilled = 0;
  for (const student of lowStudents ?? []) {
    const newBalance = student.tokens_remaining + amount;
    await admin
      .from("users")
      .update({ tokens_remaining: newBalance })
      .eq("id", student.id);

    await admin.from("token_refill_log").insert({
      trainer_id: adminUserId,
      student_id: student.id,
      amount,
    });
    refilled++;
  }

  return { refilled };
}
