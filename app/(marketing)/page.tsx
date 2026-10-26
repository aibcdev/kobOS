import type { Metadata } from "next";
import { EmployeeHome } from "@/components/kob-home/employee-home";

export const metadata: Metadata = {
  title: { absolute: "KOB — The Restaurant Manager for Owners" },
  description:
    "KOB is the manager that looks after your reviews and Google listing, so more guests walk through the door. KOB drafts, you approve and post in one tap. 7-day trial, no card, no contract.",
};

export default function MarketingHomePage() {
  return <EmployeeHome />;
}
