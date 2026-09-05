export type Tier = "public" | "gated";

export type Profile = {
  id: string;
  user_id: string;
  slug: string;
  display_name: string;
  photo_url: string | null;
  created_at: string;
};

export type Field = {
  id: string;
  profile_id: string;
  key: string;
  label: string;
  value: string;
  tier: Tier;
  category: string;
  rank: number;
  created_at: string;
};

export type Contact = {
  id: string;
  profile_id: string;
  name: string;
  relationship: string | null;
  phone: string;
  tier: Tier;
  notify: boolean;
  rank: number;
  dial_code: string;
  created_at: string;
};

export type Scan = {
  id: string;
  profile_id: string;
  scanned_at: string;
  tier: Tier;
  ip_city: string | null;
  lat: number | null;
  lng: number | null;
  responder_code: string | null;
  user_agent: string | null;
};
