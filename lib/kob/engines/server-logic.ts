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

export async function parseInvoiceData(data: z.infer<typeof InvoiceInput>) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey || (!data.imageBase64 && !data.textHint)) {
    return {
      ok: true as const,
      demo: true,
      lines: fallbackLines(),
      note: "Demo invoice. Add XAI_API_KEY and a photo for a live read.",
    };
  }

  const content: unknown[] = [
    {
      type: "text",
      text: `Extract invoice line items as JSON array only: [{"item","qty","unit","unitPrice"}]. UK restaurant delivery note. Numbers only. No markdown.`,
    },
  ];
  if (data.textHint) {
    content.push({ type: "text", text: data.textHint });
  }
  if (data.imageBase64 && data.mime) {
    content.push({
      type: "image_url",
      image_url: {
        url: `data:${data.mime};base64,${data.imageBase64}`,
      },
    });
  }

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.5",
      max_tokens: 600,
      temperature: 0,
      messages: [{ role: "user", content }],
    }),
  });
  if (!res.ok) {
    return {
      ok: true as const,
      demo: true,
      lines: fallbackLines(),
      note: "Live read failed. Showing demo lines.",
    };
  }
  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = body.choices?.[0]?.message?.content ?? "";
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) {
    return {
      ok: true as const,
      demo: true,
      lines: fallbackLines(),
      note: "Could not parse. Showing demo lines.",
    };
  }
  try {
    const parsed = JSON.parse(match[0]) as {
      item: string;
      qty: number;
      unit: string;
      unitPrice: number;
    }[];
    const lines: InvoiceLine[] = parsed.map((row) => ({
      item: keyItem(String(row.item)),
      qty: Number(row.qty) || 0,
      unit: String(row.unit || "kg"),
      unitPrice: Number(row.unitPrice) || 0,
      grams: gramsFromUnit(Number(row.qty) || 0, String(row.unit || "kg")),
      currency: "GBP",
    }));
    return { ok: true as const, demo: false, lines, note: "Read from the photo." };
  } catch {
    return {
      ok: true as const,
      demo: true,
      lines: fallbackLines(),
      note: "Parse error. Showing demo lines.",
    };
  }
}

export async function weatherPrepData(data: { city?: string }) {
  const key = process.env.OPENWEATHER_API_KEY;
  const city = (data.city || "Cape Town").trim() || "Cape Town";
  let tempC = 18;
  let source = `demo forecast for ${city}`;
  if (key) {
    const q = encodeURIComponent(city);
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${q}&units=metric&appid=${key}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = (await res.json()) as {
        main?: { temp?: number };
        name?: string;
      };
      if (typeof json.main?.temp === "number") {
        tempC = json.main.temp;
        source = json.name ? `OpenWeather · ${json.name}` : "OpenWeatherMap";
      }
    }
  }
  const cold = tempC < SALES_MIX.coldC;
  const note = cold
    ? `Forecast ${Math.round(tempC)}°C (${source}). Cold day: salads usually drop ${Math.round(SALES_MIX.saladDrop * 100)}% and soup rises ${Math.round(SALES_MIX.soupRise * 100)}%. I can tell the kitchen: cut salad prep, prep more soup. Or dismiss.`
    : `Forecast ${Math.round(tempC)}°C (${source}). Mix looks like a normal day. No prep change unless you want one.`;
  return { ok: true as const, tempC, cold, note, demo: !key, city };
}

const TrendInput = z.object({
  query: z.string().max(80).default("restaurant Camberwell"),
});

export async function reviewVelocityData(data: z.infer<typeof TrendInput>) {
  const key =
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.PLACES_API_KEY;
  if (!key) {
    return {
      ok: true as const,
      demo: true,
      note:
        "A nearby burger room usually gets 2 reviews a week. They had 15 in 3 days. Recent notes mention a bottomless special. I can draft a competing offer — or leave it. Demo until a Places key is set.",
    };
  }
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "places.displayName,places.rating,places.userRatingCount",
    },
    body: JSON.stringify({ textQuery: data.query, pageSize: 3 }),
  });
  if (!res.ok) {
    return {
      ok: true as const,
      demo: true,
      note:
        "Places did not answer. Demo: a nearby room spiked on reviews. I can draft a competing offer — or leave it.",
    };
  }
  const json = (await res.json()) as {
    places?: { displayName?: { text?: string }; userRatingCount?: number }[];
  };
  const name = json.places?.[0]?.displayName?.text ?? "A nearby room";
  const count = json.places?.[0]?.userRatingCount ?? 0;
  return {
    ok: true as const,
    demo: false,
    note: `${name} shows ${count} Google reviews. I watch velocity, not vanity stars. If they spike, I will tell you why from the new notes — then wait for a yes.`,
  };
}

export { InvoiceInput, TrendInput };
