import twilio from "twilio";
import { serviceClient } from "./supabase";

const { VoiceResponse } = twilio.twiml;

export function twiml(): InstanceType<typeof VoiceResponse> {
  return new VoiceResponse();
}

export function xml(body: string): Response {
  return new Response(body, { headers: { "content-type": "text/xml" } });
}

/** Allocates a globally unique 4-digit dial code. */
export async function allocateDialCode(): Promise<string> {
  const db = serviceClient();
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 10_000).padStart(4, "0");
    const { data } = await db.from("contacts").select("id").eq("dial_code", code).maybeSingle();
    if (!data) return code;
  }
  throw new Error("Could not allocate a dial code");
}

/**
 * Looks the dial code up and bridges to the real number. The caller never
 * sees or hears it — that is the whole point of the masked path.
 */
export async function bridgeTo(digits: string): Promise<Response> {
  const response = twiml();
  const { data } = await serviceClient()
    .from("contacts")
    .select("phone")
    .eq("dial_code", digits)
    .maybeSingle<{ phone: string }>();

  if (!data) {
    response.say("That code was not recognized. Goodbye.");
    return xml(response.toString());
  }

  response.say("Connecting you now.");
  response.dial({ callerId: process.env.TWILIO_MASK_NUMBER }, data.phone);
  return xml(response.toString());
}

/**
 * Twilio webhooks are public URLs, so the signature is the only thing
 * standing between a stranger and a contact's real number: an unsigned
 * request could enumerate all 10,000 dial codes and read each bridged
 * number straight out of the TwiML. Fails closed — no token, no calls.
 */
export function validSignature(request: Request, form: FormData): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  const signature = request.headers.get("x-twilio-signature");
  if (!token || !signature) return false;

  const params: Record<string, string> = {};
  for (const [key, value] of form) params[key] = String(value);
  return twilio.validateRequest(token, signature, publicUrl(request), params);
}

/** Twilio signs the URL it dialed, which is the proxy's, not the lambda's. */
function publicUrl(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return host ? `${proto}://${host}${url.pathname}${url.search}` : url.toString();
}

export function digitsFrom(form: FormData): string | null {
  const digits = String(form.get("Digits") ?? "").replace(/\D/g, "");
  return /^\d{4}$/.test(digits) ? digits : null;
}
