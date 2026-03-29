import { NextRequest, NextResponse } from "next/server";

async function searchOpenBeautyFacts(query: string) {
  const response = await fetch(
    `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=10&fields=product_name,brands,ingredients_text,image_url,code`
  );
  const data = await response.json();
  return (data.products || [])
    .filter((p: any) => p.product_name)
    .map((p: any) => ({
      id: p.code,
      name: p.product_name,
      brand: p.brands || "Unknown Brand",
      ingredients: p.ingredients_text || null,
      image: p.image_url || null,
      source: "Open Beauty Facts",
    }));
}

async function searchINCIDecoder(query: string) {
  const response = await fetch(
    `https://incidecoder.com/search?query=${encodeURIComponent(query)}`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    }
  );
  const html = await response.text();
  const products: any[] = [];
  const simpleRegex = /href="\/products\/([^"]+)"/g;
  const slugs = new Set<string>();
  let m;
  while ((m = simpleRegex.exec(html)) !== null) {
    slugs.add(m[1]);
  }
  for (const slug of Array.from(slugs).slice(0, 10)) {
    products.push({
      id: `incidecoder-${slug}`,
      name: slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      brand: "Unknown Brand",
      ingredients: null,
      image: null,
      source: "INCIDecoder",
      url: `https://incidecoder.com/products/${slug}`,
    });
  }
  return products;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  try {
    // Try Open Beauty Facts first
    const obfResults = await searchOpenBeautyFacts(query);

    // If we have good results with ingredients, return them
    const withIngredients = obfResults.filter((p: any) => p.ingredients);
    if (withIngredients.length >= 3) {
      return NextResponse.json({ products: obfResults, primarySource: "Open Beauty Facts" });
    }

    // Otherwise cascade to INCIDecoder
    const inciResults = await searchINCIDecoder(query);

    // Merge — OBF first, then INCI for anything not already found
    const combined = [...obfResults];
    for (const inciProduct of inciResults) {
      const alreadyFound = combined.some(
        (p) => p.name.toLowerCase().includes(inciProduct.name.toLowerCase().slice(0, 10))
      );
      if (!alreadyFound) combined.push(inciProduct);
    }

    return NextResponse.json({
      products: combined.slice(0, 15),
      primarySource: withIngredients.length > 0 ? "Open Beauty Facts + INCIDecoder" : "INCIDecoder",
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
