import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { matchesCategory } from "@/lib/categories";

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";

  if (!query && !category) {
    return NextResponse.json({ error: "Query or category is required" }, { status: 400 });
  }

  // Category-only browse (no text query)
  if (!query && category) {
    const keywords = (await import("@/lib/categories")).CATEGORY_KEYWORDS[category] || [];
    if (keywords.length === 0) return NextResponse.json({ products: [] });
    try {
      const { data } = await supabase
        .from("products")
        .select("id, external_id, name, brand, ingredients, image")
        .or(keywords.map((kw) => `name.ilike.%${kw}%`).join(","))
        .limit(40);
      const products = (data || []).map((p) => ({
        id: p.external_id || p.id,
        name: p.name,
        brand: p.brand,
        ingredients: p.ingredients || null,
        image: p.image || null,
      }));
      return NextResponse.json({ products });
    } catch (err) {
      console.error("Category browse error:", err);
      return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }
  }

  const words = query.trim().toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  if (words.length === 0) return NextResponse.json({ products: [] });

  // Distinctive words (not common category terms) for a high-precision first pass
  const GENERIC_WORDS = new Set([
    "moisturizer", "moisturizing", "moisturising", "moisture", "moisturize",
    "cream", "lotion", "hydrating", "hydration", "hydro",
    "cleanser", "cleansing", "wash", "foaming", "scrub",
    "serum", "essence", "ampoule", "booster", "concentrate",
    "sunscreen", "sunblock", "protection",
    "toner", "toning", "mist", "softener",
    "treatment", "repair", "mask",
    "face", "skin", "skincare", "care", "daily", "gentle",
  ]);
  const specificWords = words.filter((w) => !GENERIC_WORDS.has(w));

  try {
    // High-precision query with distinctive words first (prevents generic terms from crowding out specific matches)
    const precisePromises = specificWords.length >= 1 ? [
      supabase
        .from("products")
        .select("id, external_id, name, brand, ingredients, image")
        .or(specificWords.map((w) => `name.ilike.%${w}%`).join(","))
        .limit(100) as any,
      supabase
        .from("products")
        .select("id, external_id, name, brand, ingredients, image")
        .or(specificWords.map((w) => `brand.ilike.%${w}%`).join(","))
        .limit(100) as any,
    ] : [];

    // Broad fallback with all words
    const broadPromises = [
      supabase
        .from("products")
        .select("id, external_id, name, brand, ingredients, image")
        .or(words.map((w) => `name.ilike.%${w}%`).join(","))
        .limit(60) as any,
      supabase
        .from("products")
        .select("id, external_id, name, brand, ingredients, image")
        .or(words.map((w) => `brand.ilike.%${w}%`).join(","))
        .limit(40) as any,
    ];

    const allResults = await Promise.all([...precisePromises, ...broadPromises]);

    // Merge and deduplicate
    const seen = new Set<string>();
    const merged: any[] = [];
    for (const { data } of allResults) {
      for (const p of (data || [])) {
        if (!seen.has(p.id)) { seen.add(p.id); merged.push(p); }
      }
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
