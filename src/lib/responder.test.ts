import { describe, expect, it, vi } from "vitest";

const maybeSingle = vi.fn();
vi.mock("./supabase", () => ({
  serviceClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }) }),
}));

const { clientKey, rateLimited, verifyCode } = await import("./responder");

describe("responder codes", () => {
  it("returns the org for an active code", async () => {
    maybeSingle.mockResolvedValue({ data: { org_name: "Chicago FD EMS", active: true } });
    expect(await verifyCode(" cfd-4471 ")).toBe("Chicago FD EMS");
  });

  it("rejects a deactivated code", async () => {
    maybeSingle.mockResolvedValue({ data: { org_name: "Retired", active: false } });
    expect(await verifyCode("OLD-0000")).toBeNull();
  });

  it("rejects an unknown code", async () => {
    maybeSingle.mockResolvedValue({ data: null });
    expect(await verifyCode("NOPE")).toBeNull();
  });
});

describe("rate limiting", () => {
  it("blocks after five attempts in a window, then recovers", () => {
    const key = `ip-${Math.random()}`;
    const attempts = Array.from({ length: 6 }, () => rateLimited(key));
    expect(attempts).toEqual([false, false, false, false, false, true]);
    expect(rateLimited(key, Date.now() + 61_000)).toBe(false);
  });

  it("keys off the first forwarded address", () => {
    const request = new Request("https://resq.app", {
      headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" },
    });
    expect(clientKey(request)).toBe("203.0.113.9");
  });
});
