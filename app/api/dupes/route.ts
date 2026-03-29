import { NextRequest, NextResponse } from "next/server";

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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

async function fetchOBF(query: string, pageSize = 30) {
  try {
    const res = await withTimeout(fetch(
      `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=${pageSize}&fields=product_name,brands,ingredients_text,image_url,code`
    ), 5000);
    const data = await res.json();
    return (data.products || []) as any[];
  } catch {
    return [];
  }
}

function extractCategory(query: string): string[] {
  const lower = query.toLowerCase();
  const cats: Record<string, string[]> = {
    "moisturizer": ["face moisturizer", "hydrating cream", "face cream"],
    "cleanser": ["face cleanser", "face wash", "gentle cleanser"],
    "serum": ["face serum", "vitamin c serum", "niacinamide serum"],
    "toner": ["face toner", "skin toner"],
    "sunscreen": ["face sunscreen", "spf moisturizer"],
    "retinol": ["retinol serum", "retinoid cream"],
    "eye cream": ["eye cream", "eye gel"],
  };
  for (const [key, searches] of Object.entries(cats)) {
    if (lower.includes(key)) return searches;
  }
  // Fall back to last meaningful word
  const words = lower.split(" ").filter((w) => w.length > 3);
  return [words[words.length - 1] || query];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  if (!query) return NextResponse.json({ error: "Query required" }, { status: 400 });

  try {
    // Step 1: find target — try full query first, then brand-only fallback
    let targetResults = (await fetchOBF(query, 10)).filter(
      (p: any) => p.product_name && p.ingredients_text && p.ingredients_text.length > 30
    );

    // Fallback: try first word(s) of query as brand search
    if (targetResults.length === 0) {
      const brandGuess = query.split(" ").slice(0, 2).join(" ");
      targetResults = (await fetchOBF(brandGuess, 10)).filter(
        (p: any) => p.product_name && p.ingredients_text && p.ingredients_text.length > 30
      );
    }

    if (targetResults.length === 0) {
      return NextResponse.json({ target: null, dupes: [] });
    }

    const target = targetResults[0];
    const targetIngredients = parseIngredients(target.ingredients_text);
    const targetBrand = (target.brands || "").toLowerCase();

    // Step 2: fetch a large comparison pool with multiple parallel searches
    const compSearches = extractCategory(query);
    const compArrays = await Promise.all(
      compSearches.map((term) => fetchOBF(term, 40))
    );

    // Flatten, deduplicate by code, filter to products with ingredients
    const seen = new Set<string>();
    const pool: any[] = [];
    for (const arr of compArrays) {
      for (const p of arr) {
        if (p.code && !seen.has(p.code) && p.ingredients_text && p.ingredients_text.length > 30) {
          seen.add(p.code);
          pool.push(p);
        }
      }
    }

    // Step 3: exclude same brand, score by ingredient overlap
    const dupes = pool
      .filter((p: any) => {
        const brand = (p.brands || "").toLowerCase();
        // Exclude if brand names share any significant word
        const targetWords = targetBrand.split(/[\s,]+/).filter((w: string) => w.length > 3);
        const compWords = brand.split(/[\s,]+/).filter((w: string) => w.length > 3);
        const overlap = targetWords.some((w: string) => compWords.includes(w));
        return !overlap && p.code !== target.code;
      })
      .map((p: any) => {
        const pIngredients = parseIngredients(p.ingredients_text);
        const score = similarityScore(targetIngredients, pIngredients);
        const brand = p.brands ? p.brands.split(",")[0].trim() : "Unknown Brand";
        return { id: p.code, name: p.product_name, brand, image: p.image_url || null, ingredients: p.ingredients_text, score };
      })
      .filter((p: any) => p.score > 5)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 6);

    return NextResponse.json({
      target: {
        id: target.code,
        name: target.product_name,
        brand: target.brands ? target.brands.split(",")[0].trim() : "Unknown Brand",
        image: target.image_url || null,
        ingredients: target.ingredients_text,
      },
      dupes,
      note: targetResults.length > 0 && targetResults[0].code !== (await fetchOBF(query, 1).then(r => r[0]?.code))
        ? "Showing closest match — exact product not found in database"
        : null,
    });
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
