import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  try {
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

    // Extract product results from INCIDecoder search page
    const products: any[] = [];

    // Match product entries - INCIDecoder uses specific HTML patterns
    const productRegex = /href="\/products\/([^"]+)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*product-name[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<span[^>]*class="[^"]*brand-name[^"]*"[^>]*>([\s\S]*?)<\/span>/g;

    let match;
    while ((match = productRegex.exec(html)) !== null && products.length < 10) {
      const slug = match[1];
      const name = match[2].replace(/<[^>]+>/g, "").trim();
      const brand = match[3].replace(/<[^>]+>/g, "").trim();

      if (name) {
        products.push({
          id: `incidecoder-${slug}`,
          name,
          brand: brand || "Unknown Brand",
          ingredients: "Loading ingredients...",
          image: null,
          source: "INCIDecoder",
          url: `https://incidecoder.com/products/${slug}`,
        });
      }
    }

    // Fallback: try a simpler regex if the above finds nothing
    if (products.length === 0) {
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
          ingredients: "View on INCIDecoder for full ingredients",
          image: null,
          source: "INCIDecoder",
          url: `https://incidecoder.com/products/${slug}`,
        });
      }
    }

    return NextResponse.json({ products, source: "incidecoder" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch from INCIDecoder" }, { status: 500 });
  }
}
