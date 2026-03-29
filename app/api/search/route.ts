import { NextRequest, NextResponse } from "next/server";

async function searchOpenBeautyFacts(query: string) {
  try {
    const response = await fetch(
      `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=8&fields=product_name,brands,ingredients_text,image_url,code`
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
  } catch {
    return [];
  }
}

async function searchSephora(query: string) {
  try {
    const response = await fetch(
      `https://www.sephora.com/api/catalog/categories/search?q=${encodeURIComponent(query)}&currentPage=0&pageSize=8&content=true`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "Referer": "https://www.sephora.com",
        },
      }
    );
    if (!response.ok) return [];
    const data = await response.json();
    const items = data?.products || data?.data?.products || [];
    return items
      .filter((p: any) => p.displayName || p.productName)
      .map((p: any) => ({
        id: `sephora-${p.productId || p.skuId}`,
        name: p.displayName || p.productName,
        brand: p.brandName || "Unknown Brand",
        ingredients: p.ingredientDesc || null,
        image: p.heroImage || p.imageUrl || null,
        price: p.currentSku?.listPrice || p.listPrice || null,
        source: "Sephora",
        url: p.targetUrl ? `https://www.sephora.com${p.targetUrl}` : null,
      }));
  } catch {
    return [];
  }
}

async function searchINCIDecoder(query: string) {
  try {
    const response = await fetch(
      `https://incidecoder.com/search?query=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html",
        },
      }
    );
    const html = await response.text();
    const products: any[] = [];
    const simpleRegex = /href="\/products\/([^"]+)"/g;
    const slugs = new Set<string>();
    let m;
    while ((m = simpleRegex.exec(html)) !== null) slugs.add(m[1]);
    for (const slug of Array.from(slugs).slice(0, 8)) {
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
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const category = searchParams.get("category") || "";

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  try {
    // Search all sources in parallel
    const [obfResults, sephoraResults, inciResults] = await Promise.all([
      searchOpenBeautyFacts(query),
      searchSephora(query),
      searchINCIDecoder(query),
    ]);

    // Merge — deduplicate by name similarity
    const seen = new Set<string>();
    const combined: any[] = [];

    // Sephora first (best product data for beauty)
    for (const p of sephoraResults) {
      const key = p.name.toLowerCase().slice(0, 20);
      if (!seen.has(key)) { seen.add(key); combined.push(p); }
    }

    // Then Open Beauty Facts
    for (const p of obfResults) {
      const key = p.name.toLowerCase().slice(0, 20);
      if (!seen.has(key)) { seen.add(key); combined.push(p); }
    }

    // Then INCIDecoder as final fallback
    for (const p of inciResults) {
      const key = p.name.toLowerCase().slice(0, 20);
      if (!seen.has(key)) { seen.add(key); combined.push(p); }
    }

    // Apply category filter if provided
    const filtered = category
      ? combined.filter((p) =>
          p.name?.toLowerCase().includes(category.toLowerCase()) ||
          p.brand?.toLowerCase().includes(category.toLowerCase())
        )
      : combined;

    return NextResponse.json({
      products: filtered.slice(0, 15),
      sources: {
        sephora: sephoraResults.length,
        openBeautyFacts: obfResults.length,
        inciDecoder: inciResults.length,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
