"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, STATUS_LABELS, type ProductStatus, formatProductName } from "@/lib/supabase";
import { analyzeIngredients, type ProductAnalysis } from "@/lib/ingredients";
import NavBar from "@/app/components/NavBar";

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
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagNote, setFlagNote] = useState("");
  const [flagSubmitting, setFlagSubmitting] = useState(false);
  const [flagDone, setFlagDone] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<{ name: string; flags: import("@/lib/ingredients").IngredientFlag[] } | null>(null);
  const [ingredientInfo, setIngredientInfo] = useState<{ scientific_name: string | null; what_is_it: string | null; what_does_it_do: string | null; good_for: string | null; avoid_if: string | null } | null>(null);
  const [loadingIngredient, setLoadingIngredient] = useState(false);
  const [ingredientInfoNames, setIngredientInfoNames] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => { fetchProduct(); }, [id]);

  const fetchProduct = async () => {
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
      if (dbProduct.ingredients) {
        const a = analyzeIngredients(dbProduct.ingredients);
        setAnalysis(a);
        fetchIngredientInfoNames(a.ingredients.map((i) => i.name));
      }
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/product/${encodeURIComponent(id)}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data);
        if (data.ingredients) {
          const a = analyzeIngredients(data.ingredients);
          setAnalysis(a);
          fetchIngredientInfoNames(a.ingredients.map((i) => i.name));
        }
      }
    } catch { /* silent fail */ }
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

  const fetchIngredientInfoNames = async (names: string[]) => {
    if (names.length === 0) return;
    const { data } = await supabase
      .from("ingredient_info")
      .select("name")
      .in("name", names.map((n) => n.toLowerCase().trim()));
    if (data) setIngredientInfoNames(new Set(data.map((r) => r.name)));
  };

  const openIngredient = async (ing: { name: string; flags: import("@/lib/ingredients").IngredientFlag[] }) => {
    setSelectedIngredient(ing);
    setIngredientInfo(null);
    setLoadingIngredient(true);
    const { data } = await supabase
      .from("ingredient_info")
      .select("scientific_name, what_is_it, what_does_it_do, good_for, avoid_if")
      .ilike("name", ing.name.trim())
      .maybeSingle();
    setIngredientInfo(data);
    setLoadingIngredient(false);
  };

  const submitFlag = async () => {
    setFlagSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Save product to DB first if not already there
      const { data: saved } = await supabase
        .from("products")
        .upsert({
          name: product!.name,
          brand: product!.brand,
          ingredients: product!.ingredients,
          image: product!.image,
          source_name: product!.source || null,
          external_id: product!.id,
        }, { onConflict: "external_id" })
        .select("id")
        .single();

      await supabase.from("formula_flags").insert({
        product_id: saved?.id || null,
        user_id: user?.id || null,
        note: flagNote || null,
        status: "pending",
      });

      setFlagDone(true);
      setTimeout(() => { setShowFlagModal(false); setFlagDone(false); setFlagNote(""); }, 2000);
    } catch {
      alert("Could not submit report. Please try again.");
    } finally {
      setFlagSubmitting(false);
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
      <main className="min-h-screen" style={{ backgroundColor: "#F5F0EA" }}>
        <NavBar />
        <div className="flex flex-col items-center justify-center py-32">
          <p className="text-stone-500 mb-4">Product not found.</p>
          <Link href="/search" className="text-sm font-medium" style={{ color: "#8B4513" }}>← Back to Search</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#F5F0EA" }}>
      <NavBar />

      {/* Breadcrumb */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 pt-6">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">

        {/* Left column — image + action buttons */}
        <div>
          <div className="w-full aspect-square rounded-2xl bg-stone-100 mb-5 flex items-center justify-center overflow-hidden">
            {product.image ? (
              <img src={product.image} alt={product.name} className="w-full h-full object-contain p-4" />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <svg className="w-12 h-12 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                </svg>
                <span className="text-stone-400 text-xs">No image available</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {added ? (
              <div className="w-full py-3 rounded-full text-center text-sm font-medium bg-green-100 text-green-700">
                ✓ Added to your log
              </div>
            ) : (
              <button
                onClick={() => setShowStatusPicker(true)}
                disabled={!!addingStatus}
                className="w-full py-3 rounded-full text-white font-medium text-sm disabled:opacity-60"
                style={{ backgroundColor: "#8B4513" }}
              >
                {addingStatus ? "Adding..." : "+ Add to My Log"}
              </button>
            )}

            <Link
              href={`/dupes?id=${encodeURIComponent(product.id)}`}
              className="block w-full py-3 rounded-full border border-stone-300 text-stone-700 font-medium text-sm text-center hover:bg-stone-100"
            >
              🔄 Find a Dupe
            </Link>

            <a
              href={`https://www.amazon.com/s?k=${encodeURIComponent(`${product.brand} ${product.name}`)}&tag=theformula20-20`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 rounded-full border border-amber-200 text-amber-800 font-medium text-sm text-center hover:bg-amber-50"
            >
              Find on Amazon
            </a>
          </div>
        </div>

        {/* Right column — details + ingredients */}
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#8B4513" }}>{product.brand}</p>
          <h1 className="text-2xl md:text-3xl font-serif font-semibold mb-2" style={{ color: "#2C2C2C" }}>{formatProductName(product.name)}</h1>

          {product.price && (
            <p className="text-stone-500 text-sm mb-4">{product.price}</p>
          )}

          {/* Analysis summary */}
          {analysis && (
            <div className="bg-white rounded-2xl p-4 border border-stone-100 mb-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">Ingredient Analysis</p>
              <div className="flex flex-wrap gap-2">
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
                    ⚠ {analysis.comedogenicCount} Comedogenic
                  </span>
                )}
                {analysis.beneficialCount > 0 && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    ✓ {analysis.beneficialCount} Key Active{analysis.beneficialCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400 mt-3">
                {analysis.ingredients.length} ingredients analyzed · {analysis.ingredients.filter(i => i.flags.length > 0).length} flagged
              </p>
            </div>
          )}

          {/* Ingredient list */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-stone-800">Full Ingredient List</h2>
            {analysis && (
              <span className="text-xs text-stone-400">{analysis.ingredients.length} ingredients</span>
            )}
          </div>

          {analysis ? (
            <div className="flex flex-col gap-1.5 mb-6 max-h-80 overflow-y-auto pr-1">
              {analysis.ingredients.map((ing, i) => {
                const fa = ing.flags.find((f) => f.type === "fa_trigger");
                const comedogenic = ing.flags.find((f) => f.type === "comedogenic");
                const irritant = ing.flags.find((f) => f.type === "irritant");
                const beneficial = ing.flags.find((f) => f.type === "beneficial");
                const hasWarn = fa || comedogenic || irritant;

                const hasInfo = ingredientInfoNames.has(ing.name.toLowerCase().trim());
                const Tag = hasInfo ? "button" : "div";
                return (
                  <Tag
                    key={i}
                    {...(hasInfo ? { onClick: () => openIngredient(ing) } : {})}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm w-full text-left transition-opacity ${
                      hasWarn ? "bg-amber-50 border border-amber-200" :
                      beneficial ? "bg-green-50 border border-green-100" :
                      "bg-white border border-stone-100"
                    } ${hasInfo ? "hover:opacity-80 cursor-pointer" : "cursor-default"}`}
                  >
                    <span className={`${hasWarn ? "text-amber-800 font-medium" : beneficial ? "text-green-800" : "text-stone-700"} ${hasInfo ? "border-b border-dotted border-current" : ""}`}>
                      {ing.name}
                    </span>
                    <span className="text-xs ml-3 text-right flex-shrink-0">
                      {fa && <span className="text-red-500">FA trigger</span>}
                      {!fa && comedogenic && <span className="text-amber-600">Comedogenic</span>}
                      {!fa && !comedogenic && irritant && <span className="text-amber-600">{irritant.reason}</span>}
                      {!hasWarn && beneficial && <span className="text-green-600">{beneficial.reason}</span>}
                    </span>
                  </Tag>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 border border-stone-100 text-center mb-6">
              <p className="text-stone-400 text-sm">Ingredient list not yet available for this product.</p>
            </div>
          )}

          {/* Flag formula change */}
          <button
            onClick={() => setShowFlagModal(true)}
            className="flex items-center gap-2 text-xs text-stone-400 hover:text-amber-600 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
            Report formula change
          </button>
        </div>
      </div>

      {/* Status picker modal */}
      {showStatusPicker && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6" onClick={() => setShowStatusPicker(false)}>
          <div className="bg-white rounded-3xl p-8 shadow-xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-serif font-semibold text-xl mb-1" style={{ color: "#2C2C2C" }}>Add to Log</h2>
            <p className="text-stone-500 text-sm mb-6 truncate">{formatProductName(product.name)}</p>
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

      {/* Ingredient detail modal */}
      {selectedIngredient && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 px-0 sm:px-6" onClick={() => setSelectedIngredient(null)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-7 shadow-xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 pr-4">
                <h2 className="font-serif font-semibold text-xl leading-tight" style={{ color: "#2C2C2C" }}>
                  {selectedIngredient.name}
                </h2>
                {ingredientInfo?.scientific_name && (
                  <p className="text-xs text-stone-400 mt-0.5 italic">{ingredientInfo.scientific_name}</p>
                )}
              </div>
              <button onClick={() => setSelectedIngredient(null)} className="text-stone-400 hover:text-stone-600 flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Flags from local analysis */}
            {selectedIngredient.flags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {selectedIngredient.flags.map((f, i) => (
                  <span key={i} className={`px-3 py-1 rounded-full text-xs font-medium ${
                    f.type === "fa_trigger" ? "bg-red-100 text-red-600" :
                    f.type === "comedogenic" ? "bg-amber-100 text-amber-700" :
                    f.type === "irritant" ? "bg-amber-100 text-amber-700" :
                    "bg-green-100 text-green-700"
                  }`}>
                    {f.reason}
                  </span>
                ))}
              </div>
            )}

            {loadingIngredient ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-stone-200 border-t-stone-500 rounded-full animate-spin" />
              </div>
            ) : ingredientInfo ? (
              <div className="flex flex-col gap-4">
                {ingredientInfo.what_is_it && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">What it is</p>
                    <p className="text-sm text-stone-700 leading-relaxed">{ingredientInfo.what_is_it}</p>
                  </div>
                )}
                {ingredientInfo.what_does_it_do && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">What it does</p>
                    <p className="text-sm text-stone-700 leading-relaxed">{ingredientInfo.what_does_it_do}</p>
                  </div>
                )}
                {ingredientInfo.good_for && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">Good for</p>
                    <p className="text-sm text-stone-700 leading-relaxed">{ingredientInfo.good_for}</p>
                  </div>
                )}
                {ingredientInfo.avoid_if && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">Avoid if</p>
                    <p className="text-sm text-stone-700 leading-relaxed">{ingredientInfo.avoid_if}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-stone-400 text-center py-6">No additional information available for this ingredient.</p>
            )}
          </div>
        </div>
      )}

      {/* Flag formula modal */}
      {showFlagModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6" onClick={() => setShowFlagModal(false)}>
          <div className="bg-white rounded-3xl p-8 shadow-xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            {flagDone ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-semibold text-stone-800">Thanks for the report!</p>
                <p className="text-stone-500 text-sm mt-1">We'll review and update the formula.</p>
              </div>
            ) : (
              <>
                <h2 className="font-serif font-semibold text-xl mb-1" style={{ color: "#2C2C2C" }}>Report Formula Change</h2>
                <p className="text-stone-500 text-sm mb-5">
                  Has the formula for <span className="font-medium text-stone-700">{formatProductName(product.name)}</span> changed? Let us know and we'll refresh the ingredient data.
                </p>
                <textarea
                  value={flagNote}
                  onChange={(e) => setFlagNote(e.target.value)}
                  placeholder="Optional: what changed? (e.g. removed fragrance, added niacinamide...)"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm text-stone-700 placeholder-stone-300 outline-none focus:border-stone-400 resize-none mb-4 bg-stone-50"
                />
                <button
                  onClick={submitFlag}
                  disabled={flagSubmitting}
                  className="w-full py-3 rounded-full text-white font-medium text-sm disabled:opacity-60"
                  style={{ backgroundColor: "#8B4513" }}
                >
                  {flagSubmitting ? "Submitting..." : "Submit Report"}
                </button>
                <button onClick={() => setShowFlagModal(false)} className="w-full mt-3 text-sm text-stone-400 hover:text-stone-600">
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
