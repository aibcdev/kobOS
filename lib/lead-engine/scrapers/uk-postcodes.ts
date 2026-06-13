import {
  ALL_LEAD_ENGINE_CITIES,
  leadEngineCityByName,
  type LeadEngineCity,
} from "@/lib/lead-engine/scrapers/uk-ie-cities";

export { ALL_LEAD_ENGINE_CITIES, leadEngineCityByName, type LeadEngineCity };

export function postcodesForCity(city: string): string[] {
  const row = leadEngineCityByName(city);
  if (row?.postcodes.length) return row.postcodes;
  const outward = city.slice(0, 2).toUpperCase();
  return [outward === city.toUpperCase() ? "SW1A" : `${outward}1`];
}

export function cityCenter(city: string): { lat: number; lng: number } {
  const row = leadEngineCityByName(city);
  if (row) return { lat: row.lat, lng: row.lng };
  return ALL_LEAD_ENGINE_CITIES[0]!;
}

export function citySlug(city: string): string {
  const row = leadEngineCityByName(city);
  if (row) return row.slug;
  return city.toLowerCase().replace(/\s+/g, "-");
}

/** Offset grid around city center for Deliveroo geohash queries. */
export function cityLatLngGrid(city: string): Array<{ lat: number; lng: number }> {
  const c = cityCenter(city);
  const offsets = [
    [0, 0],
    [0.02, 0],
    [-0.02, 0],
    [0, 0.03],
    [0, -0.03],
    [0.02, 0.03],
    [0.04, 0],
    [-0.04, 0],
  ];
  return offsets.map(([dlat, dlng]) => ({ lat: c.lat + dlat, lng: c.lng + dlng }));
}
