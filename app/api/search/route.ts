import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=10&fields=product_name,brands,ingredients_text,image_url,code`
    );

    const data = await response.json();

    const products = (data.products || [])
      .filter((p: any) => p.product_name)
      .map((p: any) => ({
        id: p.code,
        name: p.product_name,
        brand: p.brands || "Unknown Brand",
        ingredients: p.ingredients_text || "Ingredients not yet available",
        image: p.image_url || null,
      }));

    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
