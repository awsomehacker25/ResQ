import { bridgeTo, digitsFrom, twiml, xml } from "@/lib/voice";

/** Target of the IVR's spoken-prompt gather. */
export async function POST(request: Request) {
  const digits = digitsFrom(await request.formData());
  if (digits) return bridgeTo(digits);

  const response = twiml();
  response.say("No code entered. Goodbye.");
  return xml(response.toString());
}
