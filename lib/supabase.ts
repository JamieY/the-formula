import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. " +
    "Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type ProductStatus = "love_it" | "abandoned" | "want_to_try" | "still_using";

export const STATUS_LABELS: Record<ProductStatus, string> = {
  love_it: "Love It",
  abandoned: "Abandoned",
  want_to_try: "Want to Try",
  still_using: "Still Using",
};

// Normalizes a single ingredient name to title case (e.g. "CETEARYL ALCOHOL" → "Cetearyl Alcohol").
export function formatIngredientName(name: string): string {
  if (!name) return name;
  return name.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// Normalizes a full ingredients string — fixes spacing and title-cases each ingredient.
export function formatIngredients(ingredients: string): string {
  return ingredients
    .split(/,\s*/)
    .map((s) => formatIngredientName(s))
    .join(", ");
}

// Normalizes product names from imported datasets.
// Strips leading brand prefix if present, converts ALL-CAPS to title case,
// and ensures the first letter is capitalized.
export function formatProductName(name: string, brand?: string): string {
  if (!name) return name;
  let t = name.trim();
  if (brand) {
    const b = brand.trim().toLowerCase();
    if (t.toLowerCase().startsWith(b)) {
      t = t.slice(b.length).replace(/^[\s\-–—:,]+/, "").trim();
    }
  }
  if (!t) return name.trim();
  // Title-case every word (handles all-lowercase, ALL-CAPS, and mixed input)
  return t.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export const STATUS_COLORS: Record<ProductStatus, string> = {
  love_it: "bg-green-100 text-green-700",
  abandoned: "bg-red-100 text-red-600",
  want_to_try: "bg-amber-100 text-amber-700",
  still_using: "bg-blue-100 text-blue-700",
};
