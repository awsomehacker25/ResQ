import { bridgeTo, digitsFrom, twiml, validSignature, xml } from "@/lib/voice";

/**
 * Masked-call entry point. Public-tier scanners dial one shared number with
 * post-dial DTMF digits (tel:+1XXXXXXXXXX,,,4471#), which arrive here as
 * Digits. Post-dial DTMF is unreliable on some Android builds, so a missing
 * code falls back to a spoken prompt.
 */
export async function POST(request: Request) {
  const form = await request.formData();
  // Unsigned callers get the same generic refusal, never an oracle.
  if (!validSignature(request, form)) return forbidden();

  const digits = digitsFrom(form);
  if (digits) return bridgeTo(digits);

  const response = twiml();
  response
    .gather({ numDigits: 4, action: "/api/voice/bridge", timeout: 10 })
    .say("Welcome to Res Q. Enter the four digit code shown on the screen.");
  response.say("No code entered. Goodbye.");
  return xml(response.toString());
}

function forbidden(): Response {
  return new Response("Forbidden", { status: 403 });
}
