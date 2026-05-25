import "server-only";

import { auth } from "@clerk/nextjs/server";

import { getUserRoleById } from "@/lib/auth/trainer";
import type { UserRole } from "@/lib/db/types";

export type AdminContext = {
  userId: string;
  role: "admin";
};

export function isAdminRole(
  role: UserRole | null | undefined
): role is "admin" {
  return role === "admin";
}

export async function requireAdminContext(): Promise<
  AdminContext | { error: string; status: number }
> {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized", status: 401 };

  const role = await getUserRoleById(userId);
  if (!isAdminRole(role)) {
    return { error: "Forbidden — admin role required", status: 403 };
  }

  return { userId, role };
}
