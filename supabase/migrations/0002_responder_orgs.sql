-- Self-serve responder org signup. Codes stop being hand-seeded strings and
-- become something an org applies for: email-verified, then reviewed by an
-- admin before a code is issued. Existing seeded codes keep working (org_id
-- stays null on them; verifyCode() only requires an approved org when one
-- is linked).

create type org_status as enum ('pending', 'approved', 'rejected');

create table responder_orgs (
  id                 uuid primary key default gen_random_uuid(),
  org_name           text not null,
  org_type           text not null,
  contact_name       text,
  contact_email      text not null unique,
  phone              text,
  status             org_status not null default 'pending',
  email_verified_at  timestamptz,
  created_at         timestamptz not null default now(),
  approved_at        timestamptz
);

alter table responders add column org_id uuid references responder_orgs(id) on delete cascade;

-- service role only, same as `responders`: no anon/authenticated policy at all.
alter table responder_orgs enable row level security;
