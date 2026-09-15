import type { Metadata } from "next";
import { EmployeeHome } from "@/components/kob-home/employee-home";

export const metadata: Metadata = {
  title: { absolute: "KOB — the AI restaurant manager" },
  description:
    "You talk on the floor. KOB takes the job in Google, reviews, the site, and the kitchen. Nothing public until you say yes. getkob.com",
};

export default function MarketingHomePage() {
  return <EmployeeHome />;
}
