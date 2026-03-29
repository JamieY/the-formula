"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, STATUS_LABELS, type ProductStatus } from "@/lib/supabase";
import { analyzeIngredients, type ProductAnalysis } from "@/lib/ingredients";

interface Product {
  id: string;
  name: string;
  brand: string;
  ingredients: string | null;
  image: string | null;
  source?: string;
  url?: string | null;
  price?: string | null;
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [analysis, setAnalysis] = useState<ProductAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingStatus, setAddingStatus] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    // First check our own database
    const { data: dbProduct } = await supabase
      .from("products")
      .select("*")
      .eq("external_id", id)
      .single();

    if (dbProduct) {
      setProduct({
        id: dbProduct.external_id,
        name: dbProduct.name,
        brand: dbProduct.brand,
        ingredients: dbProduct.ingredients,
        image: dbProduct.image,
        source: dbProduct.source_name,
        url: dbProduct.source_url,
      });
      if (dbProduct.ingredients) setAnalysis(analyzeIngredients(dbProduct.ingredients));
      setLoading(false);
      return;
    }

    // Otherwise fetch from source API
    try {
      const res = await fetch(`/api/product/${encodeURIComponent(id)}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data);
        if (data.ingredients) setAnalysis(analyzeIngredients(data.ingredients));
      }
    } catch {
      // silent fail
    }
    setLoading(false);
  };

  const addToLog = async (status: ProductStatus) => {
    setShowStatusPicker(false);
    if (!product) return;
    setAddingStatus(status);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: saved, error } = await supabase
        .from("products")
        .upsert({
          name: product.name,
          brand: product.brand,
          ingredients: product.ingredients,
          image: product.image,
          source_name: product.source || null,
          external_id: product.id,
        }, { onConflict: "external_id" })
        .select("id")
        .single();

      if (error || !saved) throw error;

      await supabase.from("user_products").upsert({
        user_id: user.id,
        product_id: saved.id,
        status,
      }, { onConflict: "user_id,product_id" });

      setAdded(true);
    } catch {
      alert("Could not add to log. Please try again.");
    } finally {
      setAddingStatus(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F5F0EA" }}>
        <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F5F0EA" }}>
        <div className="text-center">
          <p className="text-stone-500 mb-4">Product not found.</p>
          <Link href="/search" className="text-sm font-medium" style={{ color: "#8B4513" }}>Back to Search</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#F5F0EA" }}>
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-stone-200">
        <Link href="/" className="text-2xl font-serif font-semibold" style={{ color: "#2C2C2C" }}>The Formula</Link>
        <div className="flex items-center gap-8">
          <Link href="/" className="text-sm font-medium text-stone-600 hover:text-stone-900">Home</Link>
          <Link href="/search" className="text-sm font-medium text-stone-600 hover:text-stone-900">Search</Link>
          <Link href="/log" className="text-sm font-medium text-stone-600 hover:text-stone-900">My Log</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/search" className="text-sm font-medium text-stone-600 hover:text-stone-900">← Back</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-8 py-10 grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Left column */}
        <div>
          <div className="w-full aspect-square rounded-2xl bg-stone-100 mb-6 flex items-center justify-center overflow-hidden">
            {product.image ? (
              <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
            ) : (
              <span className="text-stone-300 text-sm">No image available</span>
            )}
          </div>

          {product.url && (
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 rounded-full border border-stone-300 text-stone-700 font-medium text-sm text-center hover:bg-stone-100 mb-3"
            >
              View on {product.source || "Source"}
            </a>
          )}
        </div>

        {/* Right column */}
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#8B4513" }}>{product.brand}</p>
          <h1 className="text-3xl font-serif font-semibold mb-6" style={{ color: "#2C2C2C" }}>{product.name}</h1>

          {/* Quality badges */}
          {analysis && (
            <div className="flex flex-wrap gap-2 mb-6">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${analysis.isFASafe ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                {analysis.isFASafe ? "✓" : "⚠"} Fungal Acne Safe
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${analysis.isFragranceFree ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {analysis.isFragranceFree ? "✓ Fragrance Free" : "⚠ Contains Fragrance"}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${analysis.isAlcoholFree ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {analysis.isAlcoholFree ? "✓ Alcohol Free" : "⚠ Contains Alcohol"}
              </span>
              {analysis.comedogenicCount > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  ⚠ {analysis.comedogenicCount} Comedogenic Ingredient{analysis.comedogenicCount > 1 ? "s" : ""}
                </span>
              )}
              {analysis.beneficialCount > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  ✓ {analysis.beneficialCount} Key Active{analysis.beneficialCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}

          {/* Add to log */}
          {added ? (
            <div className="w-full py-3 rounded-full text-center text-sm font-medium bg-green-100 text-green-700 mb-6">
              ✓ Added to your log
            </div>
          ) : (
            <button
              onClick={() => setShowStatusPicker(true)}
              disabled={!!addingStatus}
              className="w-full py-3 rounded-full text-white font-medium text-sm mb-6 disabled:opacity-60"
              style={{ backgroundColor: "#8B4513" }}
            >
              {addingStatus ? "Adding..." : "+ Add to My Log"}
            </button>
          )}

          {/* Ingredient list */}
          <h2 className="font-semibold text-stone-800 mb-3">Ingredient List</h2>
          {analysis ? (
            <div className="flex flex-col gap-1.5 mb-8 max-h-96 overflow-y-auto pr-1">
              {analysis.ingredients.map((ing, i) => {
                const fa = ing.flags.find((f) => f.type === "fa_trigger");
                const comedogenic = ing.flags.find((f) => f.type === "comedogenic");
                const irritant = ing.flags.find((f) => f.type === "irritant");
                const beneficial = ing.flags.find((f) => f.type === "beneficial");
                const hasWarn = fa || comedogenic || irritant;

                return (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm ${
                      hasWarn ? "bg-amber-50 border border-amber-200" :
                      beneficial ? "bg-green-50 border border-green-100" :
                      "bg-white border border-stone-100"
                    }`}
                  >
                    <span className={hasWarn ? "text-amber-800 font-medium" : beneficial ? "text-green-800" : "text-stone-700"}>
                      {ing.name}
                    </span>
                    <span className="text-xs ml-3 text-right flex-shrink-0">
                      {fa && <span className="text-red-500">FA trigger</span>}
                      {!fa && comedogenic && <span className="text-amber-600">Comedogenic</span>}
                      {!fa && !comedogenic && irritant && <span className="text-amber-600">{irritant.reason}</span>}
                      {!hasWarn && beneficial && <span className="text-green-600">{beneficial.reason}</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 border border-stone-100 text-center mb-8">
              <p className="text-stone-400 text-sm">Ingredient list not available for this product.</p>
              {product.url && (
                <a href={product.url} target="_blank" rel="noopener noreferrer" className="text-sm mt-2 inline-block" style={{ color: "#8B4513" }}>
                  View on {product.source} →
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status picker modal */}
      {showStatusPicker && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6" onClick={() => setShowStatusPicker(false)}>
          <div className="bg-white rounded-3xl p-8 shadow-xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-serif font-semibold text-xl mb-1" style={{ color: "#2C2C2C" }}>Add to Log</h2>
            <p className="text-stone-500 text-sm mb-6 truncate">{product.name}</p>
            <div className="flex flex-col gap-3">
              {(Object.keys(STATUS_LABELS) as ProductStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => addToLog(status)}
                  className="w-full py-3 rounded-full text-sm font-medium border border-stone-200 text-stone-700 hover:bg-stone-50 text-left px-5"
                >
                  {STATUS_LABELS[status]}
                </button>
              ))}
            </div>
            <button onClick={() => setShowStatusPicker(false)} className="w-full mt-4 text-sm text-stone-400 hover:text-stone-600">
              Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
