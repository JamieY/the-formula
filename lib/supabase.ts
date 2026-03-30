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

// Normalizes product names from imported datasets.
// ALL-CAPS names (common in OBF) → title case; otherwise → ensure first letter is capitalized.
export function formatProductName(name: string): string {
  if (!name) return name;
  const t = name.trim();
  if (t === t.toUpperCase() && /[A-Z]/.test(t)) {
    return t.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export const STATUS_COLORS: Record<ProductStatus, string> = {
  love_it: "bg-green-100 text-green-700",
  abandoned: "bg-red-100 text-red-600",
  want_to_try: "bg-amber-100 text-amber-700",
  still_using: "bg-blue-100 text-blue-700",
};
