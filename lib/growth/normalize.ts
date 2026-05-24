import type { IntegrationProvider } from "@prisma/client";

export type NormalizedRestaurantSnapshot = {
  restaurantId: string;
  integrations: { provider: IntegrationProvider; metadataSummary: string }[];
};

export function summarizeMetadata(metadata: unknown): string {
  if (metadata && typeof metadata === "object") {
    const keys = Object.keys(metadata as object);
    return keys.length ? keys.slice(0, 5).join(", ") : "empty";
  }
  return "empty";
}
