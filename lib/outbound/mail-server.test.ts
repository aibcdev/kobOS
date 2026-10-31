import { describe, expect, it } from "vitest";
import { mailServerStatus, type MailDns } from "@/lib/outbound/mail-server";

const err = (code: string) => Object.assign(new Error(code), { code });
const dns = (mx: MailDns["resolveMx"], a: MailDns["resolve4"] = async () => []): MailDns => ({ resolveMx: mx, resolve4: a });

describe("mailServerStatus", () => {
  it("yes when the domain has MX records", async () => {
    expect(await mailServerStatus("hi@cafe.co.uk", dns(async () => [{ exchange: "mx.cafe.co.uk", priority: 10 }]))).toBe("yes");
  });

  it("no for a null MX", async () => {
    expect(await mailServerStatus("hi@cafe.co.uk", dns(async () => [{ exchange: ".", priority: 0 }]))).toBe("no");
  });

  it("falls back to an A record when there is no MX", async () => {
    expect(await mailServerStatus("hi@cafe.co.uk", dns(async () => { throw err("ENODATA"); }, async () => ["1.2.3.4"]))).toBe("yes");
  });

  it("no when the domain doesn't exist", async () => {
    const gone = async () => { throw err("ENOTFOUND"); };
    expect(await mailServerStatus("hi@closed-down.co.uk", dns(gone, gone))).toBe("no");
  });

  it("unknown on timeouts, so a DNS hiccup never drops a lead", async () => {
    expect(await mailServerStatus("hi@cafe.co.uk", dns(async () => { throw err("ETIMEOUT"); }))).toBe("unknown");
  });

  it("no for an address without a domain", async () => {
    expect(await mailServerStatus("not-an-email", dns(async () => []))).toBe("no");
  });
});
