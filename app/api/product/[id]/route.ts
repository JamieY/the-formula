import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // If it looks like an OBF barcode (numeric), fetch from Open Beauty Facts
  if (/^\d+$/.test(id)) {
    try {
      const res = await fetch(
        `https://world.openbeautyfacts.org/api/v0/product/${id}.json`
      );
      const data = await res.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        return NextResponse.json({
          id,
          name: p.product_name || "Unknown Product",
          brand: p.brands || "Unknown Brand",
          ingredients: p.ingredients_text || null,
          image: p.image_url || null,
          source: "Open Beauty Facts",
          url: `https://world.openbeautyfacts.org/product/${id}`,
        });
      }
    } catch {
      // fall through
    }
  }

  // INCIDecoder slug
  if (id.startsWith("incidecoder-")) {
    const slug = id.replace("incidecoder-", "");
    const name = slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    return NextResponse.json({
      id,
      name,
      brand: "Unknown Brand",
      ingredients: null,
      image: null,
      source: "INCIDecoder",
      url: `https://incidecoder.com/products/${slug}`,
    });
  }

  return NextResponse.json({ error: "Product not found" }, { status: 404 });
}
