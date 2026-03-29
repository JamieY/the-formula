import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  if (!q || q.trim().length < 2) return NextResponse.json([]);

  const words = q.trim().split(/\s+/).filter((w) => w.length > 1);

  const [{ data: nameResults }, { data: brandResults }] = await Promise.all([
    supabase
      .from("products")
      .select("name, brand")
      .not("ingredients", "is", null)
      .or(words.map((w) => `name.ilike.%${w}%`).join(","))
      .limit(20),
    supabase
      .from("products")
      .select("name, brand")
      .not("ingredients", "is", null)
      .or(words.map((w) => `brand.ilike.%${w}%`).join(","))
      .limit(20),
  ]);

  const seen = new Set<string>();
  const merged: { name: string; brand: string }[] = [];
  for (const p of [...(nameResults || []), ...(brandResults || [])]) {
    const key = `${p.brand}|${p.name}`;
    if (!seen.has(key)) { seen.add(key); merged.push(p); }
  }

  // Score by how many query words match in brand+name — more matches = more relevant
  const qNorm = normalize(q);
  const scored = merged
    .map((p) => {
      const combined = normalize(`${p.brand} ${p.name}`);
      const matchCount = words.filter((w) => combined.includes(normalize(w))).length;
      const exactBonus = combined.includes(qNorm) ? 5 : 0;
      return { ...p, _score: matchCount + exactBonus };
    })
    .sort((a, b) => b._score - a._score);

  return NextResponse.json(scored.slice(0, 8).map(({ name, brand }) => ({ name, brand })));
}
