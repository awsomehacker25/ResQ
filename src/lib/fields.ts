// Field order is app-enforced, never user-editable: a medic scanning a
// stranger needs blood type in the same place every time.
export const CATEGORY_RANK: Record<string, number> = {
  critical: 0,   // allergies, blood type, anything life-threatening
  medical: 100,  // medications, conditions, devices
  identity: 200, // name, age, DOB, address, spoken language
  admin: 300,    // insurance, physician, directives, organ donor
};

export const CATEGORIES = Object.keys(CATEGORY_RANK);
export const DEFAULT_CATEGORY = "medical";

export function rankFor(category: string): number {
  return CATEGORY_RANK[category] ?? CATEGORY_RANK[DEFAULT_CATEGORY];
}

export function isCategory(value: unknown): value is string {
  return typeof value === "string" && value in CATEGORY_RANK;
}
