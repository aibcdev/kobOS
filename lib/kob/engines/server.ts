import { z } from "zod";
import {
  DEMO_INVOICE_LINES,
  gramsFromUnit,
  keyItem,
  SALES_MIX,
  type InvoiceLine,
} from "@/lib/kob/engines/kitchen-data";

const InvoiceInput = z.object({
  imageBase64: z.string().max(2_500_000).optional(),
  mime: z.string().max(80).optional(),
  textHint: z.string().max(4000).optional(),
});

function fallbackLines(): InvoiceLine[] {
  return DEMO_INVOICE_LINES;
}

export async function parseInvoice(input: { data?: unknown } = {}) {
  const data = InvoiceInput.parse(input.data ?? {});
  void data;
  return {
    ok: true as const,
    demo: true,
    lines: fallbackLines(),
    note: "Demo invoice. Add a photo later for a live read.",
  };
}

export async function weatherPrep(input: { data?: { city?: string } } = {}) {
  const city = (input.data?.city || "London").trim() || "London";
  const tempC = 18;
  const source = `demo forecast for ${city}`;
  const cold = tempC < SALES_MIX.coldC;
  const note = cold
    ? `Forecast ${Math.round(tempC)}°C (${source}). Cold day: salads usually drop ${Math.round(SALES_MIX.saladDrop * 100)}% and soup rises ${Math.round(SALES_MIX.soupRise * 100)}%. I can tell the kitchen: cut salad prep, prep more soup. Or dismiss.`
    : `Forecast ${Math.round(tempC)}°C (${source}). Mix looks like a normal day. No prep change unless you want one.`;
  return { ok: true as const, tempC, cold, note, demo: true, city };
}

export async function reviewVelocity(input: { data?: { query?: string } } = {}) {
  void input;
  return {
    ok: true as const,
    demo: true,
    note: "A nearby burger room usually gets 2 reviews a week. They had 15 in 3 days. Recent notes mention a bottomless special. I can draft a competing offer — or leave it. Demo until a Places key is set.",
  };
}
