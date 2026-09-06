import { bridgeTo, digitsFrom, twiml, validSignature, xml } from "@/lib/voice";

export async function POST(request: Request) {
  const form = await request.formData();
  if (!validSignature(request, form)) return forbidden();

  const digits = digitsFrom(form);
  if (digits) return bridgeTo(digits);

  const response = twiml();
  response.say("No code entered. Goodbye.");
  return xml(response.toString());
}

function forbidden(): Response {
  return new Response("Forbidden", { status: 403 });
}
