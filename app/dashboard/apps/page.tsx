import { redirect } from "next/navigation";

/** Apps hub merged into Connections — keep old links working. */
export default async function AppsRedirect({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const sp = await searchParams;
  const q = sp.r ? `?r=${encodeURIComponent(sp.r)}` : "";
  redirect(`/dashboard/workspace${q}`);
}
