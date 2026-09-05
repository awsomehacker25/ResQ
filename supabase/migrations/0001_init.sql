-- ResQ core schema.
-- Slugs are random and never sequential: sequential ids would let anyone
-- enumerate every medical profile in the database by counting.

create type tier as enum ('public', 'gated');

create table profiles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  slug         text not null unique check (slug ~ '^[a-z0-9]{8}$'),
  display_name text not null,
  photo_url    text,
  created_at   timestamptz not null default now()
);
-- not unique: one account owns many profiles (a parent and each child)
create index profiles_user_id_idx on profiles(user_id);

create table fields (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  key        text not null,
  label      text not null,
  value      text not null,
  tier       tier not null default 'gated',
  category   text not null,
  rank       int  not null,          -- derived from category by the app
  created_at timestamptz not null default now(),
  unique (profile_id, key)
);
create index fields_profile_idx on fields(profile_id, rank, created_at);

create table contacts (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  name         text not null,
  relationship text,
  phone        text not null,
  tier         tier not null default 'public',
  notify       boolean not null default true,
  rank         int not null default 0,
  dial_code    text not null check (dial_code ~ '^[0-9]{4}$'),
  created_at   timestamptz not null default now(),
  -- global, not per-profile: one shared IVR number routes by digits alone
  unique (dial_code)
);
create index contacts_profile_idx on contacts(profile_id, rank, created_at);

create table scans (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references profiles(id) on delete cascade,
  scanned_at     timestamptz not null default now(),
  tier           tier not null default 'public',
  ip_city        text,
  lat            double precision,
  lng            double precision,
  responder_code text,
  user_agent     text
);
create index scans_profile_idx on scans(profile_id, scanned_at desc);

create table responders (
  code     text primary key,
  org_name text not null,
  active   boolean not null default true
);

-- RLS: owners reach their own rows through the authenticated client.
-- Every public/responder read goes through the service role in route
-- handlers, so anon gets no policy at all and cannot enumerate anything.
alter table profiles   enable row level security;
alter table fields     enable row level security;
alter table contacts   enable row level security;
alter table scans      enable row level security;
alter table responders enable row level security;

create policy owner_profiles on profiles
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy owner_fields on fields
  for all to authenticated
  using (exists (select 1 from profiles p where p.id = profile_id and p.user_id = auth.uid()))
  with check (exists (select 1 from profiles p where p.id = profile_id and p.user_id = auth.uid()));

create policy owner_contacts on contacts
  for all to authenticated
  using (exists (select 1 from profiles p where p.id = profile_id and p.user_id = auth.uid()))
  with check (exists (select 1 from profiles p where p.id = profile_id and p.user_id = auth.uid()));

-- the scan log is read-only to its owner; only the server writes rows
create policy owner_scans on scans
  for select to authenticated
  using (exists (select 1 from profiles p where p.id = profile_id and p.user_id = auth.uid()));
