import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const category = searchParams.get("category") || "";

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://www.sephora.com/api/catalog/categories/search?q=${encodeURIComponent(query)}&currentPage=0&pageSize=12&content=true`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://www.sephora.com",
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ products: [], source: "sephora" });
    }

    const data = await response.json();
    const items = data?.products || data?.data?.products || [];

    const products = items
      .filter((p: any) => p.displayName || p.productName)
      .map((p: any) => ({
        id: `sephora-${p.productId || p.skuId || Math.random()}`,
        name: p.displayName || p.productName,
        brand: p.brandName || "Unknown Brand",
        ingredients: p.ingredientDesc || null,
        image: p.heroImage || p.imageUrl || null,
        price: p.currentSku?.listPrice || p.listPrice || null,
        source: "Sephora",
        url: p.targetUrl ? `https://www.sephora.com${p.targetUrl}` : null,
        category: p.parentCategory?.displayName || null,
      }));

    // Filter by category if provided
    const filtered = category
      ? products.filter((p: any) =>
          p.category?.toLowerCase().includes(category.toLowerCase()) ||
          p.name?.toLowerCase().includes(category.toLowerCase())
        )
      : products;

    return NextResponse.json({ products: filtered, source: "sephora" });
  } catch (error) {
    return NextResponse.json({ products: [], source: "sephora", error: "Failed to fetch from Sephora" });
  }
}
