export function idempotencyKey(parts: {
  restaurantId: string;
  locationId?: string | null;
  actionType: string;
  target: string;
  desired: string;
  window: string;
}): string {
  return [
    parts.restaurantId,
    parts.locationId ?? "primary",
    parts.actionType,
    parts.target,
    parts.desired,
    parts.window,
  ].join("|");
}
