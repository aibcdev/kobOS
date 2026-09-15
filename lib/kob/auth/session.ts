import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Plan = "none" | "trial" | "founding";

export type Account = {
  email: string
  name: string
  restaurantName: string
  createdAt: string
  trialEndsAt: string | null
  plan: Plan
};

type AuthState = {
  account: Account | null
  signIn: (input: { email: string; name?: string; restaurantName?: string }) => Account
  signOut: () => void
  startTrial: () => void
  startPaid: () => void
};

function emailKey(email: string) {
  return email.trim().toLowerCase();
}

export function hasAccess(account: Account | null) {
  if (!account) return false;
  if (account.plan === "founding") return true;
  if (account.plan === "trial" && account.trialEndsAt) {
    return Date.parse(account.trialEndsAt) > Date.now();
  }
  return false;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      account: null,
      signIn: ({ email, name, restaurantName }) => {
        const existing = get().account;
        const next: Account = existing && emailKey(existing.email) === emailKey(email)
          ? {
              ...existing,
              name: name?.trim() || existing.name,
              restaurantName: restaurantName?.trim() || existing.restaurantName,
            }
          : {
              email: emailKey(email),
              name: name?.trim() || existing?.name || email.split("@")[0] || "there",
              restaurantName: restaurantName?.trim() || existing?.restaurantName || "",
              createdAt: existing?.createdAt || new Date().toISOString(),
              trialEndsAt: existing?.trialEndsAt ?? null,
              plan: existing?.plan || "none",
            };
        set({ account: next });
        return next;
      },
      signOut: () => set({ account: null }),
      startTrial: () => {
        const account = get().account;
        if (!account) return;
        const ends = new Date();
        ends.setDate(ends.getDate() + 14);
        set({
          account: {
            ...account,
            plan: "trial",
            trialEndsAt: ends.toISOString(),
          },
        });
      },
      startPaid: () => {
        const account = get().account;
        if (!account) return;
        set({
          account: {
            ...account,
            plan: "founding",
            trialEndsAt: null,
          },
        });
      },
    }),
    { name: "kob-auth" },
  ),
);
