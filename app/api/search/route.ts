import { NextRequest, NextResponse } from "next/server";

// Maps filter buttons to keyword lists for matching product names
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  moisturizer: ["moisturizer", "moisturizing", "moisturising", "hydrating", "hydration", "cream", "lotion", "emollient", "barrier"],
  cleanser: ["cleanser", "cleansing", "face wash", "facial wash", "foaming", "gel wash", "micellar", "cleanse"],
  serum: ["serum", "concentrate", "ampoule", "essence", "booster"],
  toner: ["toner", "tonic", "mist", "essence toner"],
  sunscreen: ["sunscreen", "spf", "sun protection", "broad spectrum", "uv", "sunblock"],
  eye: ["eye cream", "eye gel", "eye serum", "eye", "under eye", "undereye"],
  mask: ["mask", "masque", "sheet mask", "clay mask", "peel"],
  retinol: ["retinol", "retinoid", "retinal", "tretinoin", "retin-a", "vitamin a"],
  prescription: ["prescription", "tretinoin", "clindamycin", "adapalene", "benzoyl", "tazarotene", "spironolactone"],
};

function matchesCategory(product: { name?: string; brand?: string; ingredients?: string | null }, category: string): boolean {
  if (!category) return true;
  const keywords = CATEGORY_KEYWORDS[category];
  if (!keywords) return true;
  const haystack = [product.name, product.brand, product.ingredients].filter(Boolean).join(" ").toLowerCase();
  return keywords.some((kw) => haystack.includes(kw));
}

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
        id: `sephora-${p.productId || p.skuId || p.displayName}`,
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

async function searchUlta(query: string) {
  try {
    const response = await fetch(
      `https://www.ulta.com/ulta/browse/catalog?Ntt=${encodeURIComponent(query)}&Nrpp=8&format=json`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json, text/html",
          "Referer": "https://www.ulta.com",
        },
      }
    );
    if (!response.ok) return [];
    const text = await response.text();

    // Try JSON parse first (if Ulta returns JSON)
    try {
      const data = JSON.parse(text);
      const items = data?.products || data?.contents?.[0]?.mainContent?.[0]?.contents?.[0]?.records || [];
      return items
        .filter((p: any) => p.productName || p.product?.productName)
        .map((p: any) => {
          const name = p.productName || p.product?.productName;
          const brand = p.brandName || p.product?.brandName || "Unknown Brand";
          const productId = p.productId || p.sku?.skuId || name;
          return {
            id: `ulta-${productId}`,
            name,
            brand,
            ingredients: null,
            image: p.primaryImage || p.product?.primaryImage || null,
            price: p.priceRange || p.regularPrice || null,
            source: "Ulta",
            url: p.productUrl ? `https://www.ulta.com${p.productUrl}` : null,
          };
        });
    } catch {
      // HTML scraping fallback
      const products: any[] = [];
      const nameRegex = /data-product-name="([^"]+)"/g;
      const brandRegex = /data-brand-name="([^"]+)"/g;
      const slugRegex = /href="(\/p\/[^"]+)"/g;
      const names: string[] = [];
      const brands: string[] = [];
      const slugs: string[] = [];
      let m;
      while ((m = nameRegex.exec(text)) !== null) names.push(m[1]);
      while ((m = brandRegex.exec(text)) !== null) brands.push(m[1]);
      while ((m = slugRegex.exec(text)) !== null) slugs.push(m[1]);
      for (let i = 0; i < Math.min(names.length, 8); i++) {
        products.push({
          id: `ulta-${i}-${names[i].slice(0, 10)}`,
          name: names[i],
          brand: brands[i] || "Unknown Brand",
          ingredients: null,
          image: null,
          source: "Ulta",
          url: slugs[i] ? `https://www.ulta.com${slugs[i]}` : null,
        });
      }
      return products;
    }
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
    const [obfResults, sephoraResults, ultaResults, inciResults] = await Promise.all([
      searchOpenBeautyFacts(query),
      searchSephora(query),
      searchUlta(query),
      searchINCIDecoder(query),
    ]);

    // Merge — deduplicate by name similarity
    const seen = new Set<string>();
    const combined: any[] = [];

    for (const p of sephoraResults) {
      const key = p.name.toLowerCase().slice(0, 20);
      if (!seen.has(key)) { seen.add(key); combined.push(p); }
    }
    for (const p of ultaResults) {
      const key = p.name.toLowerCase().slice(0, 20);
      if (!seen.has(key)) { seen.add(key); combined.push(p); }
    }
    for (const p of obfResults) {
      const key = p.name.toLowerCase().slice(0, 20);
      if (!seen.has(key)) { seen.add(key); combined.push(p); }
    }
    for (const p of inciResults) {
      const key = p.name.toLowerCase().slice(0, 20);
      if (!seen.has(key)) { seen.add(key); combined.push(p); }
    }

    // Apply category filter using keyword expansion
    const filtered = category
      ? combined.filter((p) => matchesCategory(p, category))
      : combined;

    return NextResponse.json({
      products: filtered.slice(0, 15),
      sources: {
        sephora: sephoraResults.length,
        ulta: ultaResults.length,
        openBeautyFacts: obfResults.length,
        inciDecoder: inciResults.length,
      },
    });
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
