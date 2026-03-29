"use client";

import { useState } from "react";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  brand: string;
  ingredients: string;
  image: string | null;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.products || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

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
        <div className="flex gap-3 mb-10">
          <div className="flex-1 flex items-center gap-3 bg-white rounded-full px-6 py-4 shadow-sm border border-stone-200">
            <svg className="w-5 h-5 text-stone-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Search a product by name..."
              className="flex-1 bg-transparent outline-none text-stone-700 placeholder-stone-400"
            />
          </div>
          <button
            onClick={search}
            className="px-6 py-3 rounded-full text-white font-medium text-sm flex-shrink-0"
            style={{ backgroundColor: "#8B4513" }}
          >
            Search
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin mb-3" />
            <p className="text-stone-500 text-sm">Searching Open Beauty Facts...</p>
          </div>
        )}

        {/* Results */}
        {!loading && searched && results.length === 0 && (
          <div className="text-center py-12">
            <p className="text-stone-500">No products found. Try a different search term.</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-stone-500">{results.length} products found</p>
            {results.map((product) => (
              <div key={product.id} className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
                <div className="flex items-start gap-4">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-stone-100 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold tracking-widest uppercase text-stone-400 mb-0.5">{product.brand}</p>
                    <p className="font-semibold text-stone-800 mb-2">{product.name}</p>
                    <p className="text-xs text-stone-400 line-clamp-2">{product.ingredients}</p>
                  </div>
                  <button
                    className="px-4 py-2 rounded-full text-xs font-medium text-white flex-shrink-0"
                    style={{ backgroundColor: "#8B4513" }}
                  >
                    + Add to Log
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
