"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, type ProductStatus, STATUS_LABELS, formatProductName, formatIngredients } from "@/lib/supabase";
import { getProductCategories, CATEGORY_LABELS } from "@/lib/categories";
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

const CATEGORIES = [
  { label: "All", value: "" },
  { label: "Moisturizer", value: "moisturizer" },
  { label: "Cleanser", value: "cleanser" },
  { label: "Serum", value: "serum" },
  { label: "Toner", value: "toner" },
  { label: "SPF / Sunscreen", value: "sunscreen" },
  { label: "Eye Cream", value: "eye" },
  { label: "Face Mask", value: "mask" },
  { label: "Retinol / Retinoid", value: "retinol" },
  { label: "Prescription", value: "prescription" },
];


function SearchPageInner() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [sources, setSources] = useState<Record<string, number>>({});
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [statusPicker, setStatusPicker] = useState<{ product: Product } | null>(null);
  const router = useRouter();
  // Track the last query we triggered manually so the URL-sync effect doesn't double-fetch
  const lastSearchedRef = useRef("");

  const search = async (q: string, cat: string) => {
    if (!q.trim() && !cat) return;
    lastSearchedRef.current = q;

    // Sync URL so the browser back button restores results
    const params = new URLSearchParams({ q });
    if (cat) params.set("category", cat);
    router.replace(`/search?${params.toString()}`, { scroll: false });

    setLoading(true);
    setSearched(true);
    setShowAll(false);
    try {
      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      setResults(data.products || []);
      setSources(data.sources || {});
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Run search when URL has ?q= (page load, back navigation, or link from home)
  useEffect(() => {
    if (initialQuery && initialQuery !== lastSearchedRef.current) {
      search(initialQuery, "");
    }
  }, [initialQuery]);

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    search(query, cat);
  };

  const addToLog = async (product: Product, status: ProductStatus) => {
    setStatusPicker(null);
    setAddingId(product.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // Upsert product into products table
      const { data: savedProduct, error: productError } = await supabase
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

      if (productError || !savedProduct) throw productError;

      // Link to user
      await supabase.from("user_products").upsert({
        user_id: user.id,
        product_id: savedProduct.id,
        status,
      }, { onConflict: "user_id,product_id" });

      setAddedIds((prev) => new Set(prev).add(product.id));
    } catch {
      alert("Could not add to log. Please try again.");
    } finally {
      setAddingId(null);
    }
  };

  const visible = showAll ? results : results.slice(0, 6);

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#F5F0EA" }}>
      <NavBar />

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <h1 className="text-3xl font-serif font-semibold mb-2" style={{ color: "#2C2C2C" }}>
          Search Products
        </h1>
        <p className="text-stone-500 mb-8">Search any skincare product to see its ingredients and add it to your log.</p>

        {/* Search bar */}
        <div className="flex gap-3 mb-5">
          <div className="flex-1 flex items-center gap-3 bg-white rounded-full px-6 py-4 shadow-sm border border-stone-200">
            <svg className="w-5 h-5 text-stone-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search(query, category)}
              placeholder="Search by brand or product name..."
              className="flex-1 bg-transparent outline-none text-stone-700 placeholder-stone-400"
            />
          </div>
          <button
            onClick={() => search(query, category)}
            className="px-6 py-3 rounded-full text-white font-medium text-sm flex-shrink-0"
            style={{ backgroundColor: "#8B4513" }}
          >
            Search
          </button>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => handleCategoryChange(cat.value)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors border"
              style={
                category === cat.value
                  ? { backgroundColor: "#8B4513", color: "white", borderColor: "#8B4513" }
                  : { backgroundColor: "white", color: "#57534e", borderColor: "#e7e5e4" }
              }
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin mb-3" />
            <p className="text-stone-500 text-sm">Searching products...</p>
          </div>
        )}

        {/* No results */}
        {!loading && searched && results.length === 0 && (
          <div className="text-center py-12">
            <p className="text-stone-500">No products found. Try a different search term or remove the category filter.</p>
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-stone-500">{results.length} products found{results.length === 40 ? "+" : ""}</p>
            </div>

            {visible.map((product) => (
              <div key={product.id} className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 hover:border-stone-300 transition-colors cursor-pointer" onClick={() => router.push(`/product/${encodeURIComponent(product.id)}`)}>

                <div className="flex items-start gap-4">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-stone-100 flex-shrink-0 flex items-center justify-center">
                      <svg className="w-6 h-6 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-xs font-semibold tracking-widest uppercase text-stone-400">{product.brand}</p>
                    </div>
                    <p className="font-semibold text-stone-800 mb-1">{formatProductName(product.name, product.brand)}</p>
                    {(() => {
                      const cats = getProductCategories(product.name);
                      return cats.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {cats.map((c) => (
                            <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 font-medium">
                              {CATEGORY_LABELS[c]}
                            </span>
                          ))}
                        </div>
                      ) : null;
                    })()}
                    {product.price && (
                      <p className="text-xs text-stone-500 mb-1">{product.price}</p>
                    )}
                    {product.ingredients ? (
                      <p className="text-xs text-stone-400 line-clamp-2">{formatIngredients(product.ingredients)}</p>
                    ) : (
                      <p className="text-xs text-stone-300 italic">Ingredients not yet available</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {addedIds.has(product.id) ? (
                      <span className="px-4 py-2 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        ✓ Added
                      </span>
                    ) : (
                      <button
                        onClick={() => setStatusPicker({ product })}
                        disabled={addingId === product.id}
                        className="px-4 py-2 rounded-full text-xs font-medium text-white disabled:opacity-60"
                        style={{ backgroundColor: "#8B4513" }}
                      >
                        {addingId === product.id ? "Adding..." : "+ Add to Log"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {results.length > 6 && !showAll && (
              <button
                onClick={() => setShowAll(true)}
                className="w-full py-3 rounded-full text-sm font-medium text-stone-600 border border-stone-200 bg-white hover:bg-stone-50"
              >
                Show {results.length - 6} more results
              </button>
            )}
          </div>
        )}
      </div>

      {/* Status picker modal */}
      {statusPicker && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6"
          onClick={() => setStatusPicker(null)}>
          <div className="bg-white rounded-3xl p-8 shadow-xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-serif font-semibold text-xl mb-1" style={{ color: "#2C2C2C" }}>Add to Log</h2>
            <p className="text-stone-500 text-sm mb-6 truncate">{statusPicker.product.name}</p>
            <div className="flex flex-col gap-3">
              {(Object.keys(STATUS_LABELS) as ProductStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => addToLog(statusPicker.product, status)}
                  className="w-full py-3 rounded-full text-sm font-medium border border-stone-200 text-stone-700 hover:bg-stone-50 text-left px-5"
                >
                  {STATUS_LABELS[status]}
                </button>
              ))}
            </div>
            <button onClick={() => setStatusPicker(null)} className="w-full mt-4 text-sm text-stone-400 hover:text-stone-600">
              Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageInner />
    </Suspense>
  );
}
