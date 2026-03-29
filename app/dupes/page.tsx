"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import NavBar from "@/app/components/NavBar";

interface Product {
  id: string;
  name: string;
  brand: string;
  image: string | null;
  ingredients: string;
}

interface DupeProduct extends Product {
  score: number;
}

const CATEGORIES = [
  { key: "", label: "All" },
  { key: "moisturizer", label: "Moisturizer" },
  { key: "cleanser", label: "Cleanser" },
  { key: "serum", label: "Serum" },
  { key: "sunscreen", label: "Sunscreen" },
  { key: "toner", label: "Toner" },
  { key: "eye cream", label: "Eye Cream" },
  { key: "treatment", label: "Treatment" },
];

function DupeDetectorInner() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [target, setTarget] = useState<Product | null>(null);
  const [dupes, setDupes] = useState<DupeProduct[]>([]);
  const [candidates, setCandidates] = useState<Product[]>([]);
  const router = useRouter();

  useEffect(() => { if (initialQuery) search(); }, [initialQuery]);

  const search = async (overrideQuery?: string) => {
    const q = overrideQuery ?? query;
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    setCandidates([]);
    setTarget(null);
    setDupes([]);
    try {
      const params = new URLSearchParams({ q });
      if (category) params.set("category", category);
      const res = await fetch(`/api/dupes?${params}`);
      const data = await res.json();
      if (data.candidates?.length > 0) {
        setCandidates(data.candidates);
      } else {
        setTarget(data.target || null);
        setDupes(data.dupes || []);
      }
    } catch {
      setTarget(null);
      setDupes([]);
    } finally {
      setLoading(false);
    }
  };

  const selectCandidate = async (product: Product) => {
    setLoading(true);
    setCandidates([]);
    try {
      const params = new URLSearchParams({ id: product.id });
      if (category) params.set("category", category);
      const res = await fetch(`/api/dupes?${params}`);
      const data = await res.json();
      setTarget(data.target || null);
      setDupes(data.dupes || []);
    } catch {
      setTarget(null);
      setDupes([]);
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 70) return { bg: "#dcfce7", border: "#16a34a", text: "#15803d" };
    if (score >= 40) return { bg: "#fef9c3", border: "#ca8a04", text: "#92400e" };
    return { bg: "#fee2e2", border: "#dc2626", text: "#991b1b" };
  };

  const scoreLabel = (score: number) => {
    if (score >= 70) return "Strong match";
    if (score >= 40) return "Partial match";
    return "Low match";
  };

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#F5F0EA" }}>
      <NavBar />

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <h1 className="text-3xl font-serif font-semibold mb-2" style={{ color: "#2C2C2C" }}>
          Dupe Detector
        </h1>
        <p className="text-stone-500 mb-6">
          Search any product to find affordable alternatives with similar ingredient formulas.
        </p>

        {/* Search bar */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 flex items-center gap-3 bg-white rounded-full px-6 py-4 shadow-sm border border-stone-200">
            <svg className="w-5 h-5 text-stone-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="e.g. Neutrogena Hydro Boost..."
              className="flex-1 bg-transparent outline-none text-stone-700 placeholder-stone-400"
            />
          </div>
          <button
            onClick={() => search()}
            disabled={loading}
            className="px-6 py-3 rounded-full text-white font-medium text-sm flex-shrink-0 disabled:opacity-60"
            style={{ backgroundColor: "#8B4513" }}
          >
            {loading ? "Searching..." : "Find Dupes"}
          </button>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className="px-4 py-1.5 rounded-full text-sm border transition-colors"
              style={category === cat.key
                ? { backgroundColor: "#8B4513", color: "white", borderColor: "#8B4513" }
                : { backgroundColor: "white", color: "#78716c", borderColor: "#e7e5e4" }
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
            <p className="text-stone-500 text-sm">Analyzing ingredients...</p>
          </div>
        )}

        {/* Candidate picker */}
        {!loading && candidates.length > 0 && (
          <div>
            <p className="text-sm text-stone-500 mb-3">
              Found {candidates.length} <span className="font-medium text-stone-700">{query}</span> products — which one do you want dupes for?
            </p>
            <div className="flex flex-col gap-3">
              {candidates.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectCandidate(p)}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 flex items-center gap-4 hover:border-stone-400 transition-colors text-left w-full"
                >
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-stone-100 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold tracking-widest uppercase text-stone-400 mb-0.5">{p.brand}</p>
                    <p className="font-semibold text-stone-800 truncate">{p.name}</p>
                    <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{p.ingredients}</p>
                  </div>
                  <svg className="w-5 h-5 text-stone-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No results */}
        {!loading && searched && !target && candidates.length === 0 && (
          <div className="text-center py-12">
            <p className="text-stone-500">No results found. Try a more specific product name, e.g. &quot;CeraVe Moisturizing Cream&quot;.</p>
          </div>
        )}

        {/* No dupes found */}
        {!loading && target && dupes.length === 0 && (
          <div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-200 mb-6">
              <p className="text-xs font-semibold tracking-widest uppercase text-stone-400 mb-0.5">{target.brand}</p>
              <p className="font-semibold text-stone-800">{target.name}</p>
              <p className="text-xs text-stone-400 mt-1 line-clamp-2">{target.ingredients}</p>
            </div>
            <p className="text-center text-stone-500 py-8">
              No close dupes found in our database yet. Try a different category filter or a slightly different name.
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && target && dupes.length > 0 && (
          <div>
            <div className="mb-3">
              <p className="text-sm text-stone-500 mb-1">Finding dupes for</p>
              <div
                className="bg-white rounded-2xl p-5 shadow-sm border border-stone-200 flex items-center gap-4 cursor-pointer hover:border-stone-300"
                onClick={() => router.push(`/product/${encodeURIComponent(target.id)}`)}
              >
                {target.image ? (
                  <img src={target.image} alt={target.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-stone-100 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold tracking-widest uppercase text-stone-400 mb-0.5">{target.brand}</p>
                  <p className="font-semibold text-stone-800 truncate">{target.name}</p>
                  <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{target.ingredients}</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-stone-400 text-center mb-6">
              Match % = ingredient overlap (Jaccard similarity)
            </p>

            <div className="flex flex-col gap-4">
              {dupes.map((dupe) => {
                const colors = scoreColor(dupe.score);
                return (
                  <div
                    key={dupe.id}
                    className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 flex items-center gap-4 hover:border-stone-300 transition-colors cursor-pointer"
                    onClick={() => router.push(`/product/${encodeURIComponent(dupe.id)}`)}
                  >
                    {dupe.image ? (
                      <img src={dupe.image} alt={dupe.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-stone-100 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold tracking-widest uppercase text-stone-400 mb-0.5">{dupe.brand}</p>
                      <p className="font-semibold text-stone-800 truncate">{dupe.name}</p>
                      <p className="text-xs mt-1 font-medium" style={{ color: colors.text }}>{scoreLabel(dupe.score)}</p>
                    </div>
                    <div
                      className="w-16 h-16 rounded-full flex flex-col items-center justify-center flex-shrink-0 border-2"
                      style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                    >
                      <span className="text-lg font-bold leading-none" style={{ color: colors.text }}>{dupe.score}%</span>
                      <span className="text-xs mt-0.5" style={{ color: colors.text }}>match</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-center text-sm text-stone-400 mt-8">
              Click any product to see its full ingredient breakdown.
            </p>
          </div>
        )}

        {/* Empty state */}
        {!searched && (
          <div className="text-center py-8">
            <p className="text-stone-400 text-sm mb-4">Try searching for:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                "La Mer Moisturizing Cream",
                "CeraVe Moisturizing Cream",
                "Tatcha The Water Cream",
                "Neutrogena Hydro Boost",
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => { setQuery(example); }}
                  className="px-4 py-2 rounded-full text-sm bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function DupeDetector() {
  return (
    <Suspense>
      <DupeDetectorInner />
    </Suspense>
  );
}
