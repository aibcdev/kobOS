import { NextResponse } from "next/server";

/** Server-side Static Maps image for audit scanning when the JS Maps key is missing. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = Number.parseFloat(url.searchParams.get("lat") ?? "");
  const lng = Number.parseFloat(url.searchParams.get("lng") ?? "");
  const w = Math.min(640, Math.max(200, Number.parseInt(url.searchParams.get("w") ?? "640", 10) || 640));
  const h = Math.min(640, Math.max(200, Number.parseInt(url.searchParams.get("h") ?? "400", 10) || 400));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  const key =
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim();

  if (!key) {
    return NextResponse.json({ error: "maps_key_missing" }, { status: 503 });
  }

  const staticUrl = new URL("https://maps.googleapis.com/maps/api/staticmap");
  staticUrl.searchParams.set("center", `${lat},${lng}`);
  staticUrl.searchParams.set("zoom", "14");
  staticUrl.searchParams.set("size", `${w}x${h}`);
  staticUrl.searchParams.set("scale", "2");
  staticUrl.searchParams.set("maptype", "roadmap");
  staticUrl.searchParams.set("markers", `color:0x094413|${lat},${lng}`);
  staticUrl.searchParams.set("key", key);

  const res = await fetch(staticUrl.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) {
    return NextResponse.json({ error: "static_map_failed" }, { status: 502 });
  }

  const buf = await res.arrayBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
