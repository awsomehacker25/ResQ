-- Demo data. Two profiles, per the demo plan: one with a rich public tier,
-- one locked down to responders only.

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'demo@resq.app', '', now(), now())
on conflict (id) do nothing;

insert into responders (code, org_name, active) values
  ('CFD-4471', 'Chicago Fire Department EMS', true),
  ('AMR-1180', 'AMR Ambulance', true),
  ('OLD-0000', 'Retired Service', false)
on conflict (code) do nothing;

insert into profiles (id, user_id, slug, display_name) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'jk4m2xq9', 'Jacob Isaac'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', 'p7v3n8ta', 'Dana Reyes')
on conflict (id) do nothing;

-- rank mirrors CATEGORY_RANK in src/lib/fields.ts
insert into fields (profile_id, key, label, value, tier, category, rank) values
  ('00000000-0000-0000-0000-0000000000b1', 'allergy_penicillin', 'Severe allergy', 'Penicillin — anaphylaxis', 'public', 'critical', 0),
  ('00000000-0000-0000-0000-0000000000b1', 'blood_type', 'Blood type', 'O negative', 'public', 'critical', 0),
  ('00000000-0000-0000-0000-0000000000b1', 'blood_thinners', 'On blood thinners', 'Warfarin 5mg daily', 'public', 'critical', 0),
  ('00000000-0000-0000-0000-0000000000b1', 'age', 'Age', '34', 'public', 'identity', 200),
  ('00000000-0000-0000-0000-0000000000b1', 'language', 'Spoken language', 'English', 'public', 'identity', 200),
  ('00000000-0000-0000-0000-0000000000b1', 'dob', 'Date of birth', '1992-03-11', 'gated', 'identity', 200),
  ('00000000-0000-0000-0000-0000000000b1', 'address', 'Home address', '1400 W Monroe St, Chicago IL', 'gated', 'identity', 200),
  ('00000000-0000-0000-0000-0000000000b1', 'medications', 'Medications', 'Warfarin 5mg, Lisinopril 10mg', 'gated', 'medical', 100),
  ('00000000-0000-0000-0000-0000000000b1', 'insurance', 'Insurance', 'BCBS IL — 8841902', 'gated', 'admin', 300),
  ('00000000-0000-0000-0000-0000000000b1', 'physician', 'Physician', 'Dr. Amara Osei — (312) 555-0142', 'gated', 'admin', 300),
  ('00000000-0000-0000-0000-0000000000b1', 'organ_donor', 'Organ donor', 'Yes', 'gated', 'admin', 300),
  -- locked-down profile: nothing public at all
  ('00000000-0000-0000-0000-0000000000b2', 'conditions', 'Conditions', 'Type 1 diabetes', 'gated', 'critical', 0),
  ('00000000-0000-0000-0000-0000000000b2', 'dob', 'Date of birth', '1988-07-02', 'gated', 'identity', 200)
on conflict (profile_id, key) do nothing;

insert into contacts (profile_id, name, relationship, phone, tier, notify, rank, dial_code) values
  ('00000000-0000-0000-0000-0000000000b1', 'Sarah', 'wife', '+13125550101', 'public', true,  0, '4471'),
  ('00000000-0000-0000-0000-0000000000b1', 'Dad',   'father', '+13125550102', 'public', true, 1, '4472'),
  ('00000000-0000-0000-0000-0000000000b1', 'Dr. Osei', 'physician', '+13125550142', 'gated', false, 2, '4473'),
  ('00000000-0000-0000-0000-0000000000b2', 'Miguel', 'brother', '+13125550103', 'gated', true, 0, '8810')
on conflict (dial_code) do nothing;
