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

export function digitsFrom(form: FormData): string | null {
  const digits = String(form.get("Digits") ?? "").replace(/\D/g, "");
  return /^\d{4}$/.test(digits) ? digits : null;
}
