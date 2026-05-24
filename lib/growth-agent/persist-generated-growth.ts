import type { ContentType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export async function persistGrowthGeneration(args: {
  restaurantId: string;
  type: ContentType;
  prompt: string;
  payload: unknown;
}): Promise<void> {
  await prisma.generatedContent.create({
    data: {
      restaurantId: args.restaurantId,
      type: args.type,
      prompt: args.prompt.slice(0, 32_000),
      output: JSON.stringify(args.payload),
      status: "READY",
    },
  });
}
