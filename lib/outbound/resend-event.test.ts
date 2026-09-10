import { describe, expect, it } from "vitest";
import { mapResendDeliveryEvent } from "./resend-event";

describe("Resend delivery event mapping", () => {
  it("records delivery without suppression", () => {
    expect(mapResendDeliveryEvent("email.delivered")).toEqual({ status: "DELIVERED" });
  });

  it("suppresses permanent failures and complaints", () => {
    expect(mapResendDeliveryEvent("email.bounced")).toEqual({
      status: "BOUNCED",
      suppressReason: "bounce",
    });
    expect(mapResendDeliveryEvent("email.complained")).toEqual({
      status: "COMPLAINED",
      suppressReason: "complaint",
    });
  });

  it("ignores non-terminal events", () => {
    expect(mapResendDeliveryEvent("email.opened")).toBeNull();
  });
});
