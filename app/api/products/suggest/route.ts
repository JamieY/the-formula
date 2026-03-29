import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  if (!q || q.trim().length < 2) return NextResponse.json([]);

  const words = q.trim().split(/\s+/).filter((w) => w.length > 1);

  const { data: nameResults } = await supabase
    .from("products")
    .select("name, brand")
    .not("ingredients", "is", null)
    .or(words.map((w) => `name.ilike.%${w}%`).join(","))
    .limit(5);

  const { data: brandResults } = await supabase
    .from("products")
    .select("name, brand")
    .not("ingredients", "is", null)
    .or(words.map((w) => `brand.ilike.%${w}%`).join(","))
    .limit(5);

  const seen = new Set<string>();
  const suggestions: { name: string; brand: string }[] = [];
  for (const p of [...(nameResults || []), ...(brandResults || [])]) {
    const key = `${p.brand}|${p.name}`;
    if (!seen.has(key)) { seen.add(key); suggestions.push(p); }
  }

  return NextResponse.json(suggestions.slice(0, 6));
}
