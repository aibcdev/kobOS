import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

const demoRequestSchema = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  restaurantName: z.string().trim().min(1).max(200),
  addressLine1: z.string().trim().max(300).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  postalCode: z.string().trim().max(40).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().max(4000).optional().or(z.literal("")),
});

function emptyToUndefined(s: string | undefined) {
  const t = s?.trim();
  return t ? t : undefined;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = demoRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const d = parsed.data;
  try {
    await prisma.demoRequest.create({
      data: {
        firstName: d.firstName,
        lastName: d.lastName,
        email: d.email,
        restaurantName: d.restaurantName,
        addressLine1: emptyToUndefined(d.addressLine1),
        city: emptyToUndefined(d.city),
        postalCode: emptyToUndefined(d.postalCode),
        phone: emptyToUndefined(d.phone),
        message: emptyToUndefined(d.message),
      },
    });
  } catch (e) {
    console.error("[demo-request]", e);
    return NextResponse.json({ error: "Could not save request" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
