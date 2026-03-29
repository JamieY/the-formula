import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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

// Find best matching product in our DB by query string
async function findTarget(query: string) {
  const words = normalize(query).split(" ").filter((w) => w.length > 2);
  if (words.length === 0) return null;

  // Try full-text search across name + brand
  const { data } = await supabase
    .from("products")
    .select("id, name, brand, image, ingredients, external_id")
    .not("ingredients", "is", null)
    .or(words.map((w) => `name.ilike.%${w}%`).join(","))
    .limit(20);

  if (!data || data.length === 0) return null;

  // Score each result by how many query words appear in name+brand
  const queryNorm = normalize(query);
  const scored = data.map((p) => {
    const combined = normalize(`${p.brand} ${p.name}`);
    const matchCount = words.filter((w) => combined.includes(w)).length;
    const exactBonus = combined.includes(queryNorm) ? 10 : 0;
    return { ...p, _score: matchCount + exactBonus };
  });

  scored.sort((a, b) => b._score - a._score);
  return scored[0];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  if (!query) return NextResponse.json({ error: "Query required" }, { status: 400 });

  try {
    // Step 1: find target product in our DB
    const target = await findTarget(query);
    if (!target || !target.ingredients) {
      return NextResponse.json({ target: null, dupes: [] });
    }

    const targetIngredients = parseIngredients(target.ingredients);
    const targetBrandNorm = normalize(target.brand || "");

    // Step 2: pull a large comparison pool — products from other brands with ingredients
    // Use key ingredients from target to find similar products efficiently
    const topIngredients = [...targetIngredients].slice(0, 5); // first 5 ingredients are most significant

    const { data: pool } = await supabase
      .from("products")
      .select("id, name, brand, image, ingredients, external_id")
      .not("ingredients", "is", null)
      .neq("id", target.id)
      .or(topIngredients.map((ing) => `ingredients.ilike.%${ing}%`).join(","))
      .limit(300);

    if (!pool || pool.length === 0) {
      return NextResponse.json({
        target: { id: target.external_id || target.id, name: target.name, brand: target.brand, image: target.image, ingredients: target.ingredients },
        dupes: [],
      });
    }

    // Step 3: exclude same brand, score by Jaccard similarity
    const dupes = pool
      .filter((p) => {
        const pBrand = normalize(p.brand || "");
        // Exclude same brand using word overlap
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
    });
  } catch (err) {
    console.error("Dupes error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
