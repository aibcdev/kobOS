import { beforeEach, expect, it, vi } from "vitest";
import {
  decodeOAuthState,
  encodeOAuthState,
} from "@/lib/integrations/oauth-state";
beforeEach(() => {
  vi.stubEnv("INTEGRATION_ENC_KEY", "test-key");
});
it("signs the Talk return destination and nonce, rejecting tampering", () => {
  const state = encodeOAuthState({
    restaurantId: "venue",
    userId: "owner",
    provider: "GMAIL",
    returnTo: "talk",
    nonce: "nonce",
  });
  expect(decodeOAuthState(state)).toMatchObject({
    returnTo: "talk",
    nonce: "nonce",
    restaurantId: "venue",
  });
  const [body, sig] = state.split(".");
  const changed = JSON.parse(Buffer.from(body, "base64url").toString());
  changed.restaurantId = "other-venue";
  expect(
    decodeOAuthState(
      `${Buffer.from(JSON.stringify(changed)).toString("base64url")}.${sig}`,
    ),
  ).toBeNull();
});
it("rejects expired state", () => {
  expect(
    decodeOAuthState(
      encodeOAuthState({
        restaurantId: "venue",
        userId: "owner",
        provider: "GMAIL",
        ttlSec: -1,
      }),
    ),
  ).toBeNull();
});
