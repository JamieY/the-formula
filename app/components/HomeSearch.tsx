"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomeSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = () => {
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="w-full max-w-2xl mb-6">
      <div className="flex items-center gap-3 bg-white rounded-full px-6 py-4 shadow-sm border border-stone-200">
        <svg className="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search a product to add to your log..."
          className="flex-1 bg-transparent outline-none text-stone-700 placeholder-stone-400"
        />
        {query && (
          <button
            onClick={handleSearch}
            className="px-4 py-1.5 rounded-full text-xs font-medium text-white flex-shrink-0"
            style={{ backgroundColor: "#8B4513" }}
          >
            Search
          </button>
        )}
      </div>
    </div>
  );
}
