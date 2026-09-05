import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Contact, Field, Profile } from "./types";

const from = vi.fn();
vi.mock("./supabase", () => ({ serviceClient: () => ({ from }) }));

const { buildPayload, filterContacts, filterFields, generateSlug, loadBySlug } = await import(
  "./profile"
);

const profile: Profile = {
  id: "p1",
  user_id: "u1",
  slug: "jk4m2xq9",
  display_name: "Jacob Isaac",
  photo_url: null,
  created_at: "2026-01-01T00:00:00Z",
};

function field(over: Partial<Field>): Field {
  return {
    id: "f",
    profile_id: "p1",
    key: "k",
    label: "L",
    value: "V",
    tier: "gated",
    category: "medical",
    rank: 100,
    created_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

function contact(over: Partial<Contact>): Contact {
  return {
    id: "c",
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

describe("tier filtering", () => {
  const fields = [
    field({ id: "pub", key: "blood_type", value: "O negative", tier: "public", rank: 0 }),
    field({ id: "sec", key: "ssn", value: "SECRET-VALUE", tier: "gated" }),
  ];

  it("never puts a gated field in the public payload", () => {
    const payload = buildPayload(profile, fields, [], "public");
    expect(payload.fields.map((f) => f.key)).toEqual(["blood_type"]);
    expect(JSON.stringify(payload)).not.toContain("SECRET-VALUE");
  });

  it("includes gated fields for a verified responder", () => {
    const payload = buildPayload(profile, fields, [], "gated");
    expect(payload.fields.map((f) => f.key)).toEqual(["blood_type", "ssn"]);
  });

  it("flags hidden content so the empty-tier frame can render", () => {
    expect(buildPayload(profile, fields, [], "public").hasHiddenContent).toBe(true);
    expect(buildPayload(profile, fields, [], "gated").hasHiddenContent).toBe(false);
  });

  it("orders by app-assigned rank, not insertion order", () => {
    const ordered = filterFields(
      [
        field({ id: "a", key: "insurance", category: "admin", rank: 300, tier: "public" }),
        field({ id: "b", key: "allergy", category: "critical", rank: 0, tier: "public" }),
      ],
      "public",
    );
    expect(ordered.map((f) => f.key)).toEqual(["allergy", "insurance"]);
  });
});

describe("contact masking", () => {
  beforeEach(() => {
    process.env.TWILIO_MASK_NUMBER = "+13125559999";
  });

  it("hides the real number from public scanners", () => {
    const [c] = filterContacts([contact({})], "public");
    expect(c.phone).toBeUndefined();
    expect(c.tel).toBe("tel:+13125559999,,,4471#");
    expect(c.dialCode).toBe("4471"); // printed for the DTMF fallback
  });

  it("gives verified responders a direct line", () => {
    const [c] = filterContacts([contact({})], "gated");
    expect(c.tel).toBe("tel:+13125550101");
    expect(c.phone).toBe("+13125550101");
  });

  it("omits gated contacts from the public tier", () => {
    expect(filterContacts([contact({ tier: "gated" })], "public")).toEqual([]);
  });

  it("falls back to a direct tel link when no mask number is configured", () => {
    delete process.env.TWILIO_MASK_NUMBER;
    expect(filterContacts([contact({})], "public")[0].tel).toBe("tel:+13125550101");
  });
});

describe("slugs", () => {
  it("are 8 random lowercase alphanumerics", () => {
    const slugs = new Set(Array.from({ length: 200 }, generateSlug));
    expect(slugs.size).toBe(200);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]{8}$/);
  });

  it("resolves a known slug with its fields and contacts", async () => {
    from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profile }) }) }) };
      }
      return {
        select: () => ({
          eq: async () => ({ data: table === "fields" ? [field({})] : [contact({})] }),
        }),
      };
    });
    const record = await loadBySlug("jk4m2xq9");
    expect(record?.profile.slug).toBe("jk4m2xq9");
    expect(record?.fields).toHaveLength(1);
    expect(record?.contacts).toHaveLength(1);
  });

  it("returns null for an unknown slug", async () => {
    from.mockImplementation(() => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
    }));
    expect(await loadBySlug("zzzzzzzz")).toBeNull();
  });
});
