import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function parseIngredients(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/,|;/)
      .map((s) => s.trim().replace(/\*|\(.*?\)/g, "").trim())
      .filter((s) => s.length > 2 && s.length < 60)
  );
}

function similarityScore(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return Math.round((intersection / union) * 100);
}

function normalize(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function isRealIngredientList(text: string): boolean {
  if (!text || text.length < 20) return false;
  const parts = text.split(",");
  if (parts.length < 3) return false;
  const realWords = parts.filter((p) => {
    const t = p.trim();
    return t.length > 3 && /[a-zA-Z]{3,}/.test(t) && !/^\d+$/.test(t);
  });
  return realWords.length >= 3;
}

// Category keyword mapping for filtering
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  moisturizer: ["moisturizer", "moisturising", "hydrating cream", "face cream", "daily cream", "lotion", "hydration"],
  cleanser: ["cleanser", "face wash", "foaming", "cleansing", "micellar", "makeup remover"],
  serum: ["serum", "essence", "ampoule", "booster"],
  sunscreen: ["sunscreen", "spf", "sun protection", "uv", "sunblock"],
  toner: ["toner", "toning", "balancing toner", "mist", "essence toner"],
  "eye cream": ["eye cream", "eye gel", "eye serum", "eye treatment"],
  treatment: ["treatment", "spot", "acne", "retinol", "exfoliant", "peel", "aha", "bha"],
};

async function findCandidates(query: string, category?: string): Promise<any[]> {
  const words = normalize(query).split(" ").filter((w) => w.length > 2);
  if (words.length === 0) return [];

  const nameQuery = supabase
    .from("products")
    .select("id, name, brand, image, ingredients, external_id")
    .not("ingredients", "is", null)
    .or(words.map((w) => `name.ilike.%${w}%`).join(","))
    .limit(40);

  const brandQuery = supabase
    .from("products")
    .select("id, name, brand, image, ingredients, external_id")
    .not("ingredients", "is", null)
    .or(words.map((w) => `brand.ilike.%${w}%`).join(","))
    .limit(40);

  const [{ data: nameResults }, { data: brandResults }] = await Promise.all([nameQuery, brandQuery]);

  const seen = new Set<string>();
  const merged: any[] = [];
  for (const p of [...(nameResults || []), ...(brandResults || [])]) {
    if (!seen.has(p.id)) { seen.add(p.id); merged.push(p); }
  }

  const queryNorm = normalize(query);
  let candidates = merged
    .filter((p) => isRealIngredientList(p.ingredients))
    .map((p) => {
      const combined = normalize(`${p.brand} ${p.name}`);
      const matchCount = words.filter((w) => combined.includes(w)).length;
      const exactBonus = combined.includes(queryNorm) ? 10 : 0;
      return { ...p, _score: matchCount + exactBonus };
    })
    .sort((a, b) => b._score - a._score);

  // Apply category filter if provided
  if (category && CATEGORY_KEYWORDS[category]) {
    const kws = CATEGORY_KEYWORDS[category];
    const filtered = candidates.filter((p) => {
      const nameLower = p.name.toLowerCase();
      return kws.some((kw) => nameLower.includes(kw));
    });
    if (filtered.length > 0) candidates = filtered;
  }

  return candidates;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const productId = searchParams.get("id");
  const category = searchParams.get("category") || undefined;

  if (!query && !productId) return NextResponse.json({ error: "Query required" }, { status: 400 });

  try {
    let target: any = null;

    if (productId) {
      // Direct lookup by ID
      const { data } = await supabase
        .from("products")
        .select("id, name, brand, image, ingredients, external_id")
        .or(`id.eq.${productId},external_id.eq.${productId}`)
        .single();
      target = data;
    } else {
      const candidates = await findCandidates(query!, category);
      if (candidates.length === 0) return NextResponse.json({ target: null, dupes: [], candidates: [] });

      // If multiple candidates and query looks like just a brand name (1-2 words),
      // return candidates list so user can pick
      const queryWords = query!.trim().split(/\s+/);
      const isBrandOnlySearch = queryWords.length <= 2 && candidates.length > 3;

      if (isBrandOnlySearch) {
        return NextResponse.json({
          target: null,
          dupes: [],
          candidates: candidates.slice(0, 10).map((p) => ({
            id: p.external_id || p.id,
            name: p.name,
            brand: p.brand,
            image: p.image || null,
            ingredients: p.ingredients,
          })),
        });
      }

      target = candidates[0];
    }

    if (!target || !isRealIngredientList(target.ingredients)) {
      return NextResponse.json({ target: null, dupes: [], candidates: [] });
    }

    const targetIngredients = parseIngredients(target.ingredients);
    const targetBrandNorm = normalize(target.brand || "");

    // Build comparison pool from ingredient overlap
    const topIngredients = [...targetIngredients].filter((ing) => ing.length > 4).slice(0, 6);

    let pool: any[] = [];
    if (topIngredients.length > 0) {
      const { data: ingredientPool } = await supabase
        .from("products")
        .select("id, name, brand, image, ingredients, external_id")
        .not("ingredients", "is", null)
        .neq("id", target.id)
        .or(topIngredients.map((ing) => `ingredients.ilike.%${ing}%`).join(","))
        .limit(300);
      pool = (ingredientPool || []).filter((p) => isRealIngredientList(p.ingredients));
    }

    // Fallback broad pool
    if (pool.length < 20) {
      const { data: broadPool } = await supabase
        .from("products")
        .select("id, name, brand, image, ingredients, external_id")
        .not("ingredients", "is", null)
        .neq("id", target.id)
        .not("brand", "ilike", `%${target.brand.split(" ")[0]}%`)
        .limit(500);
      const broad = (broadPool || []).filter((p) => isRealIngredientList(p.ingredients));
      const seen = new Set(pool.map((p) => p.id));
      for (const p of broad) {
        if (!seen.has(p.id)) { pool.push(p); seen.add(p.id); }
      }
    }

    // Apply category filter to pool if provided
    if (category && CATEGORY_KEYWORDS[category]) {
      const kws = CATEGORY_KEYWORDS[category];
      const filtered = pool.filter((p) => kws.some((kw) => p.name.toLowerCase().includes(kw)));
      if (filtered.length >= 10) pool = filtered;
    }

    const dupes = pool
      .filter((p) => {
        const pBrand = normalize(p.brand || "");
        const targetWords = targetBrandNorm.split(" ").filter((w) => w.length > 3);
        const pWords = pBrand.split(" ").filter((w) => w.length > 3);
        return !targetWords.some((w) => pWords.includes(w));
      })
      .map((p) => {
        const pIngredients = parseIngredients(p.ingredients);
        const score = similarityScore(targetIngredients, pIngredients);
        return { id: p.external_id || p.id, name: p.name, brand: p.brand, image: p.image || null, ingredients: p.ingredients, score };
      })
      .filter((p) => p.score > 5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    return NextResponse.json({
      target: {
        id: target.external_id || target.id,
        name: target.name,
        brand: target.brand,
        image: target.image || null,
        ingredients: target.ingredients,
      },
      dupes,
      candidates: [],
    });
  } catch (err) {
    console.error("Dupes error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
