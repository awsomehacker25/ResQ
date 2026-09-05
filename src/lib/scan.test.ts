import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Contact, Profile } from "./types";

const insert = vi.fn();
const from = vi.fn(() => ({ insert }));
vi.mock("./supabase", () => ({ serviceClient: () => ({ from }) }));

const create = vi.fn(async (_opts: { to: string; from: string; body: string }) => ({ sid: "SM1" }));
vi.mock("twilio", () => ({ default: () => ({ messages: { create } }) }));

const { recordScan } = await import("./scan");
const { buildAlert, sendAlerts } = await import("./notify");

const profile: Profile = {
  id: "p1",
  user_id: "u1",
  slug: "jk4m2xq9",
  display_name: "Jacob",
  photo_url: null,
  created_at: "2026-01-01T00:00:00Z",
};

function contact(over: Partial<Contact>): Contact {
  return {
    id: "c1",
    profile_id: "p1",
    name: "Sarah",
    relationship: "wife",
    phone: "+13125550101",
    tier: "public",
    notify: true,
    rank: 0,
    dial_code: "4471",
    created_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TWILIO_ACCOUNT_SID = "AC1";
  process.env.TWILIO_AUTH_TOKEN = "tok";
  process.env.TWILIO_SMS_FROM = "+13125559999";
  insert.mockReturnValue({ select: () => ({ single: async () => ({ data: { id: "s1" } }) }) });
});

const request = (headers: Record<string, string> = {}) =>
  new Request("https://resq.app/api/scan", { headers });

describe("recordScan", () => {
  it("inserts a public-tier scan row on render", async () => {
    const scan = await recordScan(
      { profile, fields: [], contacts: [] },
      request({ "user-agent": "iPhone", "x-vercel-ip-city": "Chicago" }),
      { lat: 41.88, lng: -87.66 },
    );
    expect(scan?.id).toBe("s1");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        profile_id: "p1",
        tier: "public",
        ip_city: "Chicago",
        lat: 41.88,
        user_agent: "iPhone",
      }),
    );
  });

  it("notifies only contacts with notify = true", async () => {
    await recordScan(
      {
        profile,
        fields: [],
        contacts: [
          contact({ id: "yes", notify: true }),
          contact({ id: "no", notify: false, phone: "+13125550102" }),
        ],
      },
      request(),
      { lat: null, lng: null },
    );
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0]).toMatchObject({ to: "+13125550101" });
  });

  it("still returns the scan when the insert fails, so the read is never blocked", async () => {
    insert.mockReturnValue({
      select: () => ({ single: async () => ({ data: null, error: { message: "boom" } }) }),
    });
    await expect(
      recordScan({ profile, fields: [], contacts: [] }, request(), { lat: null, lng: null }),
    ).resolves.toBeNull();
  });
});

describe("alerts", () => {
  it("names the person, the place, and a map link", () => {
    const body = buildAlert(
      "Jacob",
      { city: "Chicago, IL", lat: null, lng: null },
      "9fk2m",
      new Date("2026-09-05T20:14:00Z"),
    );
    expect(body).toContain("Jacob's emergency code was just scanned near Chicago, IL");
    expect(body).toContain("/s/9fk2m");
  });

  it("says location unavailable rather than dropping the line", () => {
    const body = buildAlert("Jacob", { city: null, lat: null, lng: null }, "9fk2m");
    expect(body).toContain("at an unavailable location");
  });

  it("survives a Twilio outage without throwing", async () => {
    create.mockRejectedValue(new Error("twilio down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(sendAlerts([contact({})], "body")).resolves.toBe(0);
    expect(create).toHaveBeenCalledTimes(2); // one retry
  });
});
