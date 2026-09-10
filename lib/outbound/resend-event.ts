export function mapResendDeliveryEvent(type: string): {
  status: "DELIVERED" | "BOUNCED" | "COMPLAINED";
  suppressReason?: "bounce" | "complaint";
} | null {
  if (type === "email.delivered") return { status: "DELIVERED" };
  if (type === "email.bounced") return { status: "BOUNCED", suppressReason: "bounce" };
  if (type === "email.complained") return { status: "COMPLAINED", suppressReason: "complaint" };
  return null;
}
