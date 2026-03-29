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
  const jaccard = intersection / union;
  const overlap = intersection / Math.min(a.size, b.size);
  return Math.round(((jaccard + overlap) / 2) * 100);
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

// Category keyword mapping — broad enough to catch most product names
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  moisturizer: ["moisturizer", "moisturising", "moisturizing", "cream", "lotion", "hydrating", "hydration", "hydro", "gel cream", "daily face", "face oil", "facial oil", "balm", "butter"],
  cleanser: ["cleanser", "cleansing", "face wash", "foaming", "micellar", "makeup remover", "cleanse", "wash", "scrub"],
  serum: ["serum", "essence", "ampoule", "booster", "concentrate", "drops"],
  sunscreen: ["sunscreen", "spf", "sun protection", "sunblock", "broad spectrum"],
  toner: ["toner", "toning", "mist", "prep", "softener"],
  "eye cream": ["eye cream", "eye gel", "eye serum", "eye treatment", "eye"],
  treatment: ["treatment", "spot", "acne", "retinol", "retinoid", "exfoliant", "peel", "aha", "bha", "salicylic", "glycolic", "vitamin c", "niacinamide", "repair", "mask"],
};

// Exclusion keywords — if product contains these, exclude from a category
const CATEGORY_EXCLUDES: Record<string, string[]> = {
  moisturizer: ["cleanser", "wash", "scrub", "sunscreen", "spf", "serum", "toner", "eye", "mask", "peel"],
  cleanser: ["moisturizer", "lotion", "cream spf", "sunscreen", "serum", "toner"],
};

async function findCandidates(query: string, category?: string): Promise<any[]> {
  const words = normalize(query).split(" ").filter((w) => w.length > 2);
  if (words.length === 0) return [];

  const nameQuery = supabase
    .from("products")
    .select("id, name, brand, image, ingredients, external_id")
    .or(words.map((w) => `name.ilike.%${w}%`).join(","))
    .limit(60);

  const brandQuery = supabase
    .from("products")
    .select("id, name, brand, image, ingredients, external_id")
    .or(words.map((w) => `brand.ilike.%${w}%`).join(","))
    .limit(60);

  const [{ data: nameResults }, { data: brandResults }] = await Promise.all([nameQuery, brandQuery]);

  const seen = new Set<string>();
  const merged: any[] = [];
  for (const p of [...(nameResults || []), ...(brandResults || [])]) {
    if (!seen.has(p.id)) { seen.add(p.id); merged.push(p); }
  }

  const queryNorm = normalize(query);
  let candidates = merged
    .map((p) => {
      const combined = normalize(`${p.brand} ${p.name}`);
      const matchCount = words.filter((w) => combined.includes(w)).length;
      const exactBonus = combined.includes(queryNorm) ? 10 : 0;
      const hasIngredients = isRealIngredientList(p.ingredients) ? 5 : 0;
      return { ...p, _score: matchCount + exactBonus + hasIngredients };
    })
    .sort((a, b) => b._score - a._score);

  // If category provided, filter candidates — but fall back to all if too few match
  if (category && CATEGORY_KEYWORDS[category]) {
    const kws = CATEGORY_KEYWORDS[category];
    const excludes = CATEGORY_EXCLUDES[category] || [];
    const filtered = candidates.filter((p) => {
      const nameLower = p.name.toLowerCase();
      const hasExclusion = excludes.some((ex) => nameLower.includes(ex));
      const hasMatch = kws.some((kw) => nameLower.includes(kw));
      return hasMatch && !hasExclusion;
    });
    if (filtered.length >= 3) candidates = filtered;
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
      // Direct lookup by ID — only include id.eq. if it looks like a UUID (avoids type cast error)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);
      const filter = isUUID
        ? `id.eq.${productId},external_id.eq.${productId}`
        : `external_id.eq.${productId}`;
      const { data } = await supabase
        .from("products")
        .select("id, name, brand, image, ingredients, external_id")
        .or(filter)
        .maybeSingle();
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
          candidates: candidates.slice(0, 60).sort((a, b) => a.name.localeCompare(b.name)).map((p) => ({
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

    if (!target) {
      return NextResponse.json({ target: null, dupes: [], candidates: [] });
    }

    // If target has no ingredients, return it with empty dupes and a helpful flag
    if (!isRealIngredientList(target.ingredients)) {
      return NextResponse.json({
        target: {
          id: target.external_id || target.id,
          name: target.name,
          brand: target.brand,
          image: target.image || null,
          ingredients: null,
        },
        dupes: [],
        candidates: [],
        noIngredients: true,
      });
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

    const scored = pool
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
      .sort((a, b) => b.score - a.score);

    // Always return top 8 closest matches — never show "no dupes found" if we have candidates
    const dupes = scored.slice(0, 8);

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
