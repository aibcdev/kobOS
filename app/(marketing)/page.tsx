import type { Metadata } from "next";
import { EmployeeHome } from "@/components/kob-home/employee-home";

export const metadata: Metadata = {
  title: { absolute: "KOB — The AI Restaurant Manager" },
  description:
    "Every review answered. Every listing right. You just tap approve. £79/mo in the UK, $99/mo elsewhere. 7 days free, no card. trykob.com",
};

export default function MarketingHomePage() {
  return <EmployeeHome />;
}
