# ResQ — Design Spec

**Date:** 2026-09-05
**Target:** Hackathon demo (weekend, solo/small team)
**One line:** A QR code that gives first responders what they need to save your life, and gives you control over what a stranger sees.

## Problem

In an emergency, the person who reaches you first knows nothing about you. Allergies, blood type, medications, conditions, who to call — all of it is locked in your head or your phone, and you are unconscious. Medical ID bracelets hold one line of text. Phone lock screens hold slightly more. Neither can be updated, neither can call your family, and neither can distinguish between a bystander and a paramedic.

ResQ is a QR code on your keychain, phone case, or wallet card. Scanning it opens a profile whose contents you configured in advance, tiered by who is looking.

## Core decisions

| Decision | Choice | Why |
|---|---|---|
| Access model | Tiered: public + responder-gated | The first person on scene is usually a bystander, not a paramedic. Life-saving info needs zero friction; identity-theft-grade info does not. |
| Tier assignment | Fully user-controlled, per field | Users have real reasons to lock down: domestic violence, public figures, stigmatized conditions. Defaults are suggestions, never enforcement. |
| QR payload | URL, not embedded data | Embedded data works offline but cannot notify anyone or log anything, and editing the profile would change the URL, invalidating every printed code. |
| Schema | Fixed core + custom fields | Fixed core makes the responder view predictable and fast to read. Custom rows catch the long tail (pacemaker, service dog, DNR, non-verbal, pregnancy). |
| Field ordering | App-enforced by category | A medic scanning a stranger needs blood type in the same place every time. Users control content and visibility; the app controls rank. |
| On scan | Notify contacts + log the scan | Notification turns a static page into a system. The log is the answer to "what stops someone scanning a stranger's bag?" |
| Responder identity | Seeded codes, not self-serve | Real responder verification is out of scope for a hackathon. |
| Emergency calls | Masked for public tier, direct for responders | A stranger who scans should be able to call without walking away with a permanent record of the contact's personal number. A verified responder gets the raw line, because the authenticated path should have zero failure modes. |
| Profiles per account | One account owns many profiles | Parents manage their children's profiles. Costs no schema change and unlocks the school distribution story. |

## Architecture

**Stack:** Next.js (App Router) + Supabase (Postgres, auth, RLS) + Twilio SMS, deployed on Vercel.

Vercel gives a public HTTPS URL, which is a hard requirement — a QR pointing at `localhost` cannot be scanned from a phone.

### Routes

| Route | Audience | Auth |
|---|---|---|
| `/dashboard` | Profile owner — field editor, contacts, scan log, QR download | Supabase magic link |
| `/r/[slug]` | Anyone scanning | None; public tier only |
| `/r/[slug]/full` | First responder | Responder code |
| `/api/scan` | Internal | Fires on `/r/[slug]` render |

### Data model

```
profiles      id, user_id, slug, display_name, photo_url, created_at
fields        id, profile_id, key, label, value, tier, category, rank
contacts      id, profile_id, name, relationship, phone, tier, notify, rank,
              dial_code
scans         id, profile_id, scanned_at, tier, ip_city, lat, lng,
              responder_code, user_agent
responders    code, org_name, active
```

`tier` is an enum: `public` | `gated`.

`contacts.dial_code` is a 4-digit code, unique within a profile, used to route masked calls (see below).

**One account owns many profiles.** `profiles.user_id` is not unique, so a parent creating a child's profile requires no schema change — only a profile switcher in the dashboard. Guardian *invites* (granting a second adult access to an existing profile) would require a join table and are out of scope.

**`fields` is row-per-fact, not a JSON blob.** Custom fields mean the schema cannot be columns. Rows carry `tier` and `category` per fact, which is what the responder view needs to group and rank.

**`rank` is derived from `category`, assigned by the app.** Not user-editable.

**Slugs are random, 8 characters (~2.8e12 combinations), never sequential.** Sequential IDs would let anyone enumerate every medical profile in the database by counting. This is the most important line in the schema.

### Scan flow

```
phone scans QR → GET /r/[slug]
  → server renders public tier (server-side filtered, no JS required)
  → insert scans row
  → for each contact where notify = true → Twilio SMS
  → responder taps "I'm a first responder"
     → POST code → validate against responders
     → render gated tier, update scans.tier
```

Notification fires on the **public** scan, not the gated one. A bystander scanning at a crash scene is exactly when family most needs to know; waiting for a verified paramedic defeats the purpose.

### Notification content

The SMS must be actionable on its own. A message saying only "someone scanned Jacob's code" tells a family member nothing they can act on.

```
ResQ alert: Jacob's emergency code was just scanned near
1400 W Monroe St, Chicago IL (3:14 PM).
Map: https://resq.app/s/9fk2m
```

Location comes from browser geolocation when granted, IP-derived city otherwise. When neither is available, the message says "location unavailable" rather than omitting the line — an absent line reads as an app bug.

### Masked calling

Public-tier scanners must be able to reach a contact without learning their number. Anyone can photograph a QR code on a bag; raw `tel:` links would hand out family phone numbers permanently, recorded in the scanner's call history.

- **Public tier:** the call button dials a single shared Twilio number with post-dial DTMF digits identifying the contact — `tel:+1XXXXXXXXXX,,,4471#`. Twilio answers, matches the code to `contacts.dial_code`, and bridges to the real number. The scanner never sees it.
- **Gated tier:** verified responders get direct `tel:` links. They have authenticated, they are accountable via the scan log, and the authenticated path should carry no extra failure modes.

Post-dial digits are unreliable on some Android builds, so the IVR falls back to a spoken prompt — "enter the four-digit code shown on the screen" — and the code is always printed next to the call button for exactly this case.

## Surfaces

### 1. Public scan page — `/r/[slug]`

Built for a stranger holding someone else's phone in a parking lot. Server-rendered, readable without JavaScript, legible at arm's length.

```
┌────────────────────────────────┐
│  [photo]  JACOB ISAAC          │
│           34 · O NEGATIVE      │
├────────────────────────────────┤
│ ⚠ SEVERE ALLERGY               │
│   Penicillin — anaphylaxis     │
│ ⚠ ON BLOOD THINNERS            │
│   Warfarin 5mg daily           │
├────────────────────────────────┤
│  📞 CALL SARAH (wife)          │
│  📞 CALL DAD                   │
├────────────────────────────────┤
│  [ I'm a first responder → ]   │
└────────────────────────────────┘
```

Rules:
- Red band marks life-threatening information.
- Contacts are `tel:` links, full width, thumb-sized. Never make someone copy a phone number.
- The responder unlock sits at the bottom so it never delays the critical read.
- **The responder unlock is always present, regardless of the user's tier settings.** It is the floor of the page.

### 2. Empty public tier

A user may set every field to gated. The page must not render blank — blank reads as a broken app, and the responder never finds the unlock.

```
┌────────────────────────────────┐
│         🛡  ResQ               │
│  This person has restricted    │
│  their information to verified │
│  first responders.             │
│                                │
│  [ I'm a first responder → ]   │
└────────────────────────────────┘
```

### 3. Responder view — `/r/[slug]/full`

Everything: DOB, address, full medication list, insurance, physician, DNR/advance directive, organ donor status. Header displays which department unlocked the record — visible accountability.

### 4. Owner dashboard — `/dashboard`

- **Profile switcher.** One account holds many profiles; a parent manages their own alongside each child's. New profiles start from the same editor.
- Field editor grouped by category; every row has a public/gated toggle.
- Contact list; each contact has its own tier toggle and a notify switch. A user may want the call button public while every medical detail stays gated.
- Live preview of the public page beside the editor, so the effect of each toggle is visible as it is flipped.
- QR download in three layouts: PNG for stickers, PDF for a wallet card, and a **student ID badge layout** sized to overprint on an existing school ID.

**Hide-everything warning.** When a user hides all life-critical fields, show an inline note: *"A bystander who scans this will see nothing. In most emergencies the first person on scene isn't a paramedic."* It warns; it does not block. Their data, their risk tolerance.

### 5. Scan log

A table inside the dashboard: timestamp, approximate location, tier reached, and department if unlocked. This is the trust surface and the answer to the privacy objection.

## Error handling

| Failure | Behavior |
|---|---|
| Twilio fails | Page still renders. Notification failure never blocks the read. Log it, retry once. |
| Unknown slug | "No profile found" plus a link to create one. Never leak whether a slug previously existed. |
| Empty profile | Render the frame with "No information provided." Never a blank page, never a crash. |
| Geolocation denied | Fall back to IP-derived city. Never block the render on a permission prompt. |
| Invalid responder code | Generic failure, rate-limited. No hint about which codes are valid. |

## Testing

The scan path is the only surface worth automated tests:

- Slug resolution, including the unknown-slug case.
- **Tier filtering: a gated field must never appear in the public HTML payload.** Filtering is server-side, never CSS-based. This is the highest-value test in the suite.
- Scan row insertion on render.
- Notify fan-out respects the per-contact `notify` flag.

Everything else is verified by hand.

## Build order

Each step is demoable on its own, so the build is never stranded mid-refactor.

1. Schema plus one hand-seeded profile.
2. `/r/[slug]` public page with tier filtering. *First demoable moment.*
3. QR generation and print view. Now scannable from a phone.
4. Owner auth, field editor, live preview.
5. Responder unlock and gated view.
6. Twilio notification on scan, including location in the message body.
7. Scan log.
8. Masked calling via Twilio IVR.
9. Profile switcher and ID badge print layout.

Steps 1–5 constitute a complete demo. Steps 6 and 7 are what make it land. Steps 8 and 9 are the privacy and distribution stories; cut them first if time runs short, and demo raw `tel:` links instead.

## Distribution

The adoption story is that ResQ requires no new hardware. Schools already print student ID badges; adding a QR square to an existing badge template is a design change, not a procurement cycle. A district can pilot ResQ by reprinting badges it was going to print anyway.

This makes guardian-managed profiles load-bearing rather than optional: the people configuring a student's medical data are their parents, not the student. The badge layout in the dashboard exists to serve this path.

## Out of scope

- Real first responder verification (seeded codes only)
- HIPAA compliance; encryption beyond Supabase defaults
- Offline scanning
- Guardian *invites* — sharing an existing profile with a second adult account
- Internationalization, though a spoken-language field is included because it matters at a real scene
- Native apps — web only; the phone's camera app handles scanning

## Demo plan

Preparation:
- Pre-verify Twilio recipient numbers the night before. Trial accounts reject unverified numbers.
- Build a "simulate scan" button. Conference wifi fails; the demo needs a path that does not depend on a phone camera reaching the network.
- Print the QR on paper and keep it on a second screen.
- Seed two profiles: one with a rich public tier, one locked down, to demo both states back to back.
- If masked calling ships, verify the Twilio IVR from at least one iPhone and one Android — post-dial DTMF behaviour differs between them.

The three-minute story: print a QR, stick it on a phone case, hand it to a judge. They scan it with their own camera. Allergies appear. The presenter's phone buzzes on stage. Then show the locked-down profile that reveals nothing, and the scan log listing the judge's own scan.
