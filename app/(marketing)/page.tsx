import type { Metadata } from "next";
import { EmployeeHome } from "@/components/kob-home/employee-home";

export const metadata: Metadata = {
  title: { absolute: "KOB — The AI Restaurant Manager" },
  description:
    "KOB runs the work around your restaurant — Google, reviews, hours, costs, and prep. Nothing public until you say yes. £99/mo founding. 7-day trial, no card. trykob.com",
};

export default function MarketingHomePage() {
  return <EmployeeHome />;
}
