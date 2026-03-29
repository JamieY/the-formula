import { NextRequest, NextResponse } from "next/server";

// Maps filter buttons to keyword lists for matching product names
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  moisturizer: ["moisturizer", "moisturizing", "moisturising", "hydrating lotion", "hydrating cream", "daily lotion", "facial lotion", "body lotion", "emollient", "barrier cream", "barrier repair"],
  cleanser: ["cleanser", "cleansing", "face wash", "facial wash", "foaming wash", "gel wash", "micellar", "cleanse", "makeup remover"],
  serum: ["serum", "concentrate", "ampoule", "booster"],
  toner: ["toner", "toning", "balancing mist", "facial mist"],
  sunscreen: ["sunscreen", "spf", "sun protection", "broad spectrum", "sunblock", "uv shield"],
  eye: ["eye cream", "eye gel", "eye serum", "eye contour", "under eye", "undereye"],
  mask: ["mask", "masque", "sheet mask", "clay mask", "peel off", "sleeping mask"],
  retinol: ["retinol", "retinoid", "retinal", "tretinoin", "retin-a"],
  prescription: ["prescription", "tretinoin", "clindamycin", "adapalene", "benzoyl", "tazarotene", "spironolactone"],
};

function matchesCategory(product: { name?: string; brand?: string; ingredients?: string | null }, category: string): boolean {
  if (!category) return true;
  const keywords = CATEGORY_KEYWORDS[category];
  if (!keywords) return true;
  // Only check product name — not brand or ingredients — to avoid false matches (e.g. "Vanicream" matching "cream")
  const haystack = (product.name || "").toLowerCase();
  return keywords.some((kw) => haystack.includes(kw));
}

const KNOWN_BRANDS = [
  "CeraVe", "La Roche-Posay", "Neutrogena", "Cetaphil", "Olay", "Aveeno",
  "Eucerin", "Vanicream", "Differin", "Aquaphor", "Bioderma", "Vichy",
  "The Ordinary", "Paula's Choice", "Drunk Elephant", "Tatcha", "Kiehl's",
  "Clinique", "Estée Lauder", "Lancome", "Shiseido", "SK-II", "Murad",
  "Peter Thomas Roth", "First Aid Beauty", "Belif", "Laneige", "Innisfree",
  "COSRX", "Some By Mi", "Glow Recipe", "Youth To The People", "Herbivore",
  "Sunday Riley", "Glossier", "Fenty Skin", "Krave Beauty", "Byoma",
  "Clearstem", "Alpyn Beauty", "Versed", "Good Molecules", "The INKEY List",
  "Ordinary", "Garnier", "L'Oreal", "Maybelline", "Revlon", "e.l.f.",
  "Nioxin", "OGX", "Pantene", "Head & Shoulders", "Nizoral",
];

function guessBrand(name: string): string | null {
  const lower = name.toLowerCase();
  for (const brand of KNOWN_BRANDS) {
    if (lower.startsWith(brand.toLowerCase())) return brand;
  }
  // Fall back to first word if it looks like a proper brand (capitalized, >3 chars)
  const firstWord = name.split(" ")[0];
  if (firstWord && firstWord.length > 3 && firstWord[0] === firstWord[0].toUpperCase()) {
    return firstWord;
  }
  return null;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

async function searchOpenBeautyFacts(query: string) {
  try {
    const response = await withTimeout(fetch(
      `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=8&fields=product_name,brands,ingredients_text,image_url,code`
    ), 4000);
    const data = await response.json();
    return (data.products || [])
      .filter((p: any) => p.product_name)
      .map((p: any) => {
        const brand = p.brands || guessBrand(p.product_name) || "Unknown Brand";
        return {
          id: p.code,
          name: p.product_name,
          brand,
          ingredients: p.ingredients_text || null,
          image: p.image_url || null,
          source: "Open Beauty Facts",
        };
      });
  } catch {
    return [];
  }
}

async function searchSephora(query: string) {
  try {
    const response = await withTimeout(fetch(
      `https://www.sephora.com/api/catalog/categories/search?q=${encodeURIComponent(query)}&currentPage=0&pageSize=8&content=true`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "Referer": "https://www.sephora.com",
        },
      }
    ), 3000);
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
    const response = await withTimeout(fetch(
      `https://www.ulta.com/ulta/browse/catalog?Ntt=${encodeURIComponent(query)}&Nrpp=8&format=json`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json, text/html",
          "Referer": "https://www.ulta.com",
        },
      }
    ), 3000);
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
    const response = await withTimeout(fetch(
      `https://incidecoder.com/search?query=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html",
        },
      }
    ), 3000);
    const html = await response.text();
    const products: any[] = [];
    const simpleRegex = /href="\/products\/([^"]+)"/g;
    const slugs = new Set<string>();
    let m;
    while ((m = simpleRegex.exec(html)) !== null) slugs.add(m[1]);
    for (const slug of Array.from(slugs).slice(0, 8)) {
      const name = slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      products.push({
        id: `incidecoder-${slug}`,
        name,
        brand: guessBrand(name) || "Unknown Brand",
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
    const [obfResults, inciResults] = await Promise.all([
      searchOpenBeautyFacts(query),
      searchINCIDecoder(query),
    ]);
    const sephoraResults: any[] = [];
    const ultaResults: any[] = [];

    // Merge — deduplicate by normalized name
    const normalize = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);

    const seen = new Set<string>();
    const combined: any[] = [];

    for (const p of [...sephoraResults, ...ultaResults, ...obfResults, ...inciResults]) {
      const key = normalize(p.name);
      if (key && !seen.has(key)) { seen.add(key); combined.push(p); }
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
