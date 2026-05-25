import { notFound } from "next/navigation";

import { ParentPortalView } from "@/components/communications/parent-portal-view";
import { fetchParentPortalByToken } from "@/lib/communications/parent-portal";

export default async function ParentPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await fetchParentPortalByToken(token);

  if (!data) notFound();

  return <ParentPortalView data={data} />;
}
