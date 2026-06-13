import { redirect } from "next/navigation";

/** Growth Agent merged into Today + Chief of Staff — keep old links working. */
export default async function GrowthAgentRedirect({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const sp = await searchParams;
  const q = sp.r ? `?r=${encodeURIComponent(sp.r)}` : "";
  redirect(`/dashboard${q}`);
}
