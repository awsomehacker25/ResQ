# Setup

What you need to put in `.env.local` to make the backend actually run, and where
each value comes from.

```bash
cp .env.example .env.local
```

`.env.local` is gitignored. Never commit real keys.

## Minimum to boot

Only the three Supabase vars are required. With Twilio unset the app runs fine:
alerts log a warning and skip, masked calling degrades to direct `tel:` links.

| Variable | Required | Without it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **yes** | Every route throws `Missing env var` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **yes** | Owner/dashboard routes throw |
| `SUPABASE_SERVICE_ROLE_KEY` | **yes** | Scan path and responder unlock throw |
| `TWILIO_ACCOUNT_SID` | no | No SMS alerts |
| `TWILIO_AUTH_TOKEN` | no | No SMS alerts |
| `TWILIO_SMS_FROM` | no | No SMS alerts |
| `TWILIO_MASK_NUMBER` | no | Public tier hands out real numbers |
| `NEXT_PUBLIC_BASE_URL` | no | Map links point at `localhost` |
| `RESQ_TZ` | no | Alert timestamps print in `America/Chicago` |
| `RESQ_ADMIN_EMAIL` | no | `/admin/responders` refuses everyone |

## 1. Supabase

Create a project at [supabase.com](https://supabase.com) (free tier is enough).

**Settings → API** gives you all three values:

- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

The service role key **bypasses RLS entirely**. It is only ever imported by
`src/lib/supabase.ts` on the server. Never expose it to a client, and never give
it a `NEXT_PUBLIC_` prefix; that prefix ships a value to the browser.

Then apply the schema. Either link the CLI:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

…or paste `supabase/migrations/0001_init.sql` followed by `supabase/seed.sql`
into the SQL editor in the dashboard. The seed creates the two demo profiles
(`jk4m2xq9`, `p7v3n8ta`) and the responder codes (`CFD-4471`, `AMR-1180`).

**Auth:** the owner routes expect a Supabase access token as
`Authorization: Bearer <token>`. Enable magic-link email under
**Authentication → Providers → Email**. Nothing else to configure; the seeded
demo user exists only to own the seeded profiles and cannot log in.

**Redirect URLs (matters once this is deployed, not just local):** two flows
send a magic-link email and rely on Supabase redirecting back to this app
afterward — owner login (`/dashboard`) and responder org email confirmation
(`/responders/apply/verify`). Under **Authentication → URL Configuration**,
set **Site URL** to your production domain and add
`https://<your-domain>/**` to **Redirect URLs**, or Supabase will bounce the
link back to whatever Site URL was set at project creation (usually
`localhost:3000`) instead of your deployed app.

## 2. Twilio (optional, but it is what makes the demo land)

Sign up at [twilio.com](https://twilio.com). **Console dashboard** shows:

- Account SID → `TWILIO_ACCOUNT_SID`
- Auth Token → `TWILIO_AUTH_TOKEN`

Buy one number under **Phone Numbers → Buy a number** (SMS + Voice capable). Put
it in **both** `TWILIO_SMS_FROM` and `TWILIO_MASK_NUMBER`; one number can do both
jobs. Use E.164 format: `+13125551234`.

**Trial accounts can only message verified numbers.** Add every phone you plan to
demo with under **Phone Numbers → Verified Caller IDs**, the night before. This is
the single most common demo failure.

### Wiring the masked-call IVR

The IVR only works once Twilio can reach your server over public HTTPS. On the
bought number's config page, set **A call comes in** → Webhook → HTTP POST →

```
https://<your-domain>/api/voice
```

Locally, tunnel first:

```bash
npx ngrok http 3000     # then use the https URL ngrok prints
```

The webhook routes reject any request without a valid `X-Twilio-Signature`,
which is computed from `TWILIO_AUTH_TOKEN`. This is not optional hardening: an
unsigned caller could otherwise walk all 10,000 dial codes and read each
contact's real number out of the TwiML response, which is the exact thing masked
calling exists to prevent. With no auth token set the endpoints refuse
everything, so the IVR simply will not work until Twilio is configured.

If you tunnel with ngrok, the webhook URL Twilio signs must match the URL it
dialed; set `NEXT_PUBLIC_BASE_URL` and the Twilio console to the same https
origin, or every call will 403.

Test it end to end from **one iPhone and one Android**; post-dial DTMF behaviour
differs between them, which is exactly why the spoken-prompt fallback exists.

## 3. Base URL

`NEXT_PUBLIC_BASE_URL` is what gets embedded in the QR code and in the map link
inside every alert SMS. Locally `http://localhost:3000` is fine, but **a QR
pointing at localhost cannot be scanned from a phone.** Set this to the real
Vercel URL before printing anything.

## 4. Vercel

Add every variable above under **Project → Settings → Environment Variables**.
`.env.local` is not read by Vercel.

Set `NEXT_PUBLIC_BASE_URL` to the production domain, not a preview URL; preview
URLs change on every deploy and would invalidate printed codes.

## Gotchas

**Scan location is blank locally.** IP-derived city comes from the
`x-vercel-ip-city` header, which only exists on Vercel. Locally every alert reads
"at an unavailable location" unless the client passes `lat`/`lng`. That is correct
behaviour, not a bug.

**Restart after editing `.env.local`.** Next reads it at boot.

**Changed the Supabase project?** The seeded slugs live in the database, not the
env, so re-run the seed or the demo curl commands will 404.

## Verify

```bash
npm run dev
curl -s localhost:3000/api/scan -H 'content-type: application/json' \
  -d '{"slug":"jk4m2xq9"}' | jq '.displayName, .fields'
```

Fields come back and, if Twilio is configured and the recipient verified, a
phone buzzes. A 404 means the seed did not run. `Missing env var` means step 1 is
incomplete.
