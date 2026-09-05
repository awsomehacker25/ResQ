# ResQ

A QR code that gives first responders what they need to save your life, and gives
you control over what a stranger sees. See [the design spec](docs/superpowers/specs/2026-09-05-resq-design.md).

**This repo currently contains the backend only** — schema, API routes, and the
scan/notify/masked-call machinery. No UI.

## Setup

```bash
npm install
cp .env.example .env.local        # see SETUP.md for where each value comes from
supabase db reset                 # applies migrations + seeds two demo profiles
npm run dev
```

Only the three Supabase vars are required; Twilio is optional and its absence is
never fatal. Full walkthrough in [SETUP.md](SETUP.md).

## API

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/profile/[slug]` | GET | none | Public-tier payload, read-only |
| `/api/scan` | POST | none | The scan path: public payload + scan row + SMS fan-out |
| `/api/responder` | POST | responder code | Gated payload; stamps the scan log |
| `/api/qr/[slug]` | GET | none | QR PNG pointing at `/r/[slug]` |
| `/api/voice`, `/api/voice/bridge` | POST | Twilio | Masked-call IVR |
| `/api/profiles` | GET, POST | owner JWT | Profile switcher backing store |
| `/api/profiles/[id]` | PATCH, DELETE | owner JWT | Rename, delete |
| `/api/profiles/[id]/fields` | GET, POST | owner JWT | Field editor |
| `/api/fields/[id]` | PATCH, DELETE | owner JWT | Tier toggle, edit, remove |
| `/api/profiles/[id]/contacts` | GET, POST | owner JWT | Contacts; dial code auto-allocated |
| `/api/contacts/[id]` | PATCH, DELETE | owner JWT | Tier + notify toggles |
| `/api/profiles/[id]/scans` | GET | owner JWT | Scan log |

Owner routes take `Authorization: Bearer <supabase access token>`; RLS scopes
every row to the caller.

### Simulate a scan

Conference wifi fails, so the demo needs a path that does not depend on a phone
camera reaching the network:

```bash
curl -s localhost:3000/api/scan -H 'content-type: application/json' \
  -d '{"slug":"jk4m2xq9","lat":41.8819,"lng":-87.6659}' | jq
curl -s localhost:3000/api/responder -H 'content-type: application/json' \
  -d '{"slug":"jk4m2xq9","code":"CFD-4471"}' | jq
```

Seeded slugs: `jk4m2xq9` (rich public tier) and `p7v3n8ta` (locked down to
responders). Seeded responder codes: `CFD-4471`, `AMR-1180`.

## Tests

```bash
npm test        # scan path: tier filtering, slug resolution, notify fan-out
npm run typecheck
```

Tier filtering is server-side and asserted against the serialized payload — a
gated field must never reach the wire, so hiding it in CSS would not count.

## Not built yet

Every UI surface: `/r/[slug]`, `/r/[slug]/full`, `/dashboard`, and the PDF /
badge print layouts.
