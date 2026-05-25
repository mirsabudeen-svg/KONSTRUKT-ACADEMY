import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

export async function resolveClerkDisplayNames(
  userIds: string[]
): Promise<Map<string, { name: string; email: string | null; imageUrl: string | null }>> {
  const map = new Map<
    string,
    { name: string; email: string | null; imageUrl: string | null }
  >();
  if (userIds.length === 0) return map;

  const clerk = await clerkClient();

  await Promise.all(
    userIds.map(async (id) => {
      try {
        const user = await clerk.users.getUser(id);
        const name =
          [user.firstName, user.lastName].filter(Boolean).join(" ") ||
          user.username ||
          `User ${id.slice(-6)}`;
        const email = user.emailAddresses[0]?.emailAddress ?? null;
        map.set(id, { name, email, imageUrl: user.imageUrl ?? null });
      } catch {
        map.set(id, {
          name: `User ${id.slice(-6)}`,
          email: null,
          imageUrl: null,
        });
      }
    })
  );

  return map;
}
