# ResQ

QR code on your phone case. Stranger scans it, sees your emergency info
(allergies, contacts) without an app or login. Enter a responder code and
you get the full profile plus a masked-number call to a contact.

Next.js + Supabase (db/auth) + Twilio (SMS alerts + masked calling).

## Run it

```bash
npm install
# .env.local needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY. TWILIO_* optional, alerts just skip without it.
supabase db reset            # migrations + seeds jk4m2xq9 / p7v3n8ta
npm run dev
```

## Known issues

- No Twilio creds locally = alerts just log and skip, masked calls fall back to tel:
- Scan location is always "unavailable" locally, needs the vercel ip-city header
- Redirect URLs for magic-link login have to be added in Supabase manually
