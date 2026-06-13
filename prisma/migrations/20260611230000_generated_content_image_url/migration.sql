-- Add imageUrl to GeneratedContent for DALL-E 3 generated images
ALTER TABLE "public"."GeneratedContent" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
