"use client";

import { useState } from "react";
import Link from "next/link";

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
  { label: "Mask", value: "mask" },
  { label: "Retinol", value: "retinol" },
];

const SOURCE_COLORS: Record<string, string> = {
  "Sephora": "#8B4513",
  "Open Beauty Facts": "#6B7280",
  "INCIDecoder": "#5B7B5B",
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [sources, setSources] = useState<Record<string, number>>({});

  const search = async (cat?: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    setShowAll(false);
    const activeCat = cat !== undefined ? cat : category;
    try {
      const params = new URLSearchParams({ q: query });
      if (activeCat) params.set("category", activeCat);
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

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    if (searched) search(cat);
  };

  const visible = showAll ? results : results.slice(0, 6);

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#F5F0EA" }}>
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-stone-200">
        <Link href="/" className="text-2xl font-serif font-semibold" style={{ color: "#2C2C2C" }}>
          The Formula
        </Link>
        <div className="flex items-center gap-8">
          <Link href="/" className="text-sm font-medium text-stone-600 hover:text-stone-900">Home</Link>
          <Link href="/dupes" className="text-sm font-medium text-stone-600 hover:text-stone-900">Dupe Detector</Link>
          <Link href="/log" className="text-sm font-medium text-stone-600 hover:text-stone-900">My Log</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/signup" className="text-sm font-medium text-stone-600 hover:text-stone-900">Sign Up</Link>
          <Link href="/login" className="px-4 py-2 rounded-full text-sm font-medium text-white" style={{ backgroundColor: "#8B4513" }}>Log In</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-8 py-12">
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
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Search by brand or product name..."
              className="flex-1 bg-transparent outline-none text-stone-700 placeholder-stone-400"
            />
          </div>
          <button
            onClick={() => search()}
            className="px-6 py-3 rounded-full text-white font-medium text-sm flex-shrink-0"
            style={{ backgroundColor: "#8B4513" }}
          >
            Search
          </button>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-8">
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
            <p className="text-stone-500 text-sm">Searching Sephora, Open Beauty Facts, and more...</p>
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
            {/* Result meta */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-stone-500">{results.length} products found</p>
              <div className="flex items-center gap-3 text-xs text-stone-400">
                {sources.sephora > 0 && <span>{sources.sephora} from Sephora</span>}
                {sources.openBeautyFacts > 0 && <span>{sources.openBeautyFacts} from Open Beauty Facts</span>}
                {sources.inciDecoder > 0 && <span>{sources.inciDecoder} from INCIDecoder</span>}
              </div>
            </div>

            {visible.map((product) => (
              <div key={product.id} className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
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
                      {product.source && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: SOURCE_COLORS[product.source] || "#9CA3AF" }}
                        >
                          {product.source}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-stone-800 mb-1">{product.name}</p>
                    {product.price && (
                      <p className="text-xs text-stone-500 mb-1">{product.price}</p>
                    )}
                    {product.ingredients ? (
                      <p className="text-xs text-stone-400 line-clamp-2">{product.ingredients}</p>
                    ) : (
                      <p className="text-xs text-stone-300 italic">Ingredients not yet available</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      className="px-4 py-2 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: "#8B4513" }}
                    >
                      + Add to Log
                    </button>
                    {product.url && (
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-full text-xs font-medium text-stone-600 border border-stone-200 text-center hover:bg-stone-50"
                      >
                        View
                      </a>
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
    </main>
  );
}
