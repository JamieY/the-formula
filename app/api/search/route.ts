import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Keep in sync with app/api/dupes/route.ts CATEGORY_KEYWORDS
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  moisturizer: ["moisturizer", "moisturising", "moisturizing", "cream", "lotion", "hydrating", "hydration", "hydro", "gel cream", "daily face", "face oil", "facial oil", "balm", "butter"],
  cleanser: ["cleanser", "cleansing", "face wash", "facial wash", "foaming wash", "gel wash", "micellar", "cleanse", "makeup remover", "scrub"],
  serum: ["serum", "essence", "ampoule", "booster", "concentrate", "drops"],
  toner: ["toner", "toning", "mist", "prep", "softener"],
  sunscreen: ["sunscreen", "spf", "sun protection", "sunblock", "broad spectrum"],
  eye: ["eye cream", "eye gel", "eye serum", "eye treatment", "eye"],
  mask: ["mask", "masque", "sheet mask", "clay mask", "peel off", "sleeping mask"],
  retinol: ["retinol", "retinoid", "retinal", "tretinoin", "retin-a"],
  prescription: ["prescription", "tretinoin", "clindamycin", "adapalene", "benzoyl", "tazarotene", "spironolactone"],
};

function matchesCategory(name: string, category: string): boolean {
  if (!category) return true;
  const keywords = CATEGORY_KEYWORDS[category];
  if (!keywords) return true;
  const lower = name.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const category = searchParams.get("category") || "";

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const words = query.trim().toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  if (words.length === 0) return NextResponse.json({ products: [] });

  try {
    // Search our DB by name and brand
    const [{ data: nameResults }, { data: brandResults }] = await Promise.all([
      supabase
        .from("products")
        .select("id, external_id, name, brand, ingredients, image")
        .or(words.map((w) => `name.ilike.%${w}%`).join(","))
        .limit(60),
      supabase
        .from("products")
        .select("id, external_id, name, brand, ingredients, image")
        .or(words.map((w) => `brand.ilike.%${w}%`).join(","))
        .limit(40),
    ]);

    // Merge and deduplicate
    const seen = new Set<string>();
    const merged: any[] = [];
    for (const p of [...(nameResults || []), ...(brandResults || [])]) {
      if (!seen.has(p.id)) { seen.add(p.id); merged.push(p); }
    }

    // Score by word match count
    const queryNorm = normalize(query);
    const scored = merged
      .map((p) => {
        const combined = normalize(`${p.brand} ${p.name}`);
        const matchCount = words.filter((w) => combined.includes(w)).length;
        const exactBonus = combined.includes(queryNorm) ? 5 : 0;
        const hasIngredients = p.ingredients && p.ingredients.length > 20 ? 2 : 0;
        return { ...p, _score: matchCount + exactBonus + hasIngredients };
      })
      .sort((a, b) => b._score - a._score);

    // Apply category filter
    const filtered = category
      ? scored.filter((p) => matchesCategory(p.name, category))
      : scored;

    const products = filtered.slice(0, 40).map((p) => ({
      id: p.external_id || p.id,
      name: p.name,
      brand: p.brand,
      ingredients: p.ingredients || null,
      image: p.image || null,
    }));

    return NextResponse.json({ products });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
