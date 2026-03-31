"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function HomeSearch() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{ name: string; brand: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    if (val.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    suggestTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/suggest?q=${encodeURIComponent(val)}`);
        const data = await res.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch { setSuggestions([]); }
    }, 200);
  };

  const handleSearch = (q = query) => {
    if (!q.trim()) return;
    setShowSuggestions(false);
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const pickSuggestion = (s: { name: string; brand: string }) => {
    const q = `${s.brand} ${s.name}`;
    setQuery(q);
    setSuggestions([]);
    setShowSuggestions(false);
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="w-full max-w-2xl mb-6 relative">
      <div className="flex items-center gap-3 bg-white rounded-full px-6 py-4 shadow-sm border border-stone-200">
        <svg className="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
          placeholder="Search a product to add to your log..."
          className="flex-1 bg-transparent outline-none text-stone-700 placeholder-stone-400"
        />
        {query && (
          <button
            onClick={() => handleSearch()}
            className="px-4 py-1.5 rounded-full text-xs font-medium text-white flex-shrink-0"
            style={{ backgroundColor: "#8B4513" }}
          >
            Search
          </button>
        )}
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-stone-100 overflow-hidden z-20">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onMouseDown={() => pickSuggestion(s)}
              className="w-full text-left px-5 py-3 hover:bg-stone-50 transition-colors border-b border-stone-50 last:border-0"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 mr-2">{s.brand}</span>
              <span className="text-sm text-stone-700">{s.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
