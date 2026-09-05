import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({ serviceClient: () => ({ from: () => ({}) }) }));

const { validSignature } = await import("./voice");

const TOKEN = "test-auth-token";
const URL_ = "https://resq.app/api/voice";
const PARAMS = { Digits: "4471", CallSid: "CA1" };

function form(params: Record<string, string>): FormData {
  const body = new FormData();
  for (const [key, value] of Object.entries(params)) body.append(key, value);
  return body;
}

/** Twilio's documented scheme: URL + sorted key/value pairs, HMAC-SHA1, base64. */
function sign(params: Record<string, string>): string {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], URL_);
  return createHmac("sha1", TOKEN).update(data).digest("base64");
}

function request(signature: string | null): Request {
  const headers: Record<string, string> = { host: "resq.app", "x-forwarded-proto": "https" };
  if (signature) headers["x-twilio-signature"] = signature;
  return new Request(URL_, { method: "POST", headers });
}

beforeEach(() => {
  process.env.TWILIO_AUTH_TOKEN = TOKEN;
});

describe("Twilio signature gate", () => {
  it("accepts a correctly signed webhook", () => {
    expect(validSignature(request(sign(PARAMS)), form(PARAMS))).toBe(true);
  });

  it("rejects an unsigned request, so the endpoint is not a dial-code oracle", () => {
    expect(validSignature(request(null), form(PARAMS))).toBe(false);
  });

  it("rejects a forged signature", () => {
    expect(validSignature(request("bogus"), form(PARAMS))).toBe(false);
  });

  it("rejects a signature computed over different digits", () => {
    expect(validSignature(request(sign({ ...PARAMS, Digits: "9999" })), form(PARAMS))).toBe(false);
  });

  it("fails closed when no auth token is configured", () => {
    delete process.env.TWILIO_AUTH_TOKEN;
    expect(validSignature(request(sign(PARAMS)), form(PARAMS))).toBe(false);
  });
});
