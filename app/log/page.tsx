"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, STATUS_LABELS, STATUS_COLORS, type ProductStatus, formatProductName } from "@/lib/supabase";
import NavBar from "@/app/components/NavBar";

interface LogEntry {
  id: string;
  status: ProductStatus;
  note: string | null;
  created_at: string;
  products: {
    id: string;
    external_id: string | null;
    name: string;
    brand: string;
    ingredients: string | null;
    image: string | null;
  };
}

const FILTERS = ["All", "Love It", "Still Using", "Want to Try", "Abandoned"];

interface SkinProfile {
  skin_type: string | null;
  conditions: string[];
  concerns: string[];
  sensitivities: string[];
}

const LABEL_MAP: Record<string, string> = {
  oily: "Oily", dry: "Dry", combination: "Combination", sensitive: "Sensitive", normal: "Normal",
  rosacea: "Rosacea", eczema: "Eczema", psoriasis: "Psoriasis", fungal_acne: "Fungal Acne", hormonal_acne: "Hormonal Acne",
  acne: "Acne", aging___fine_lines: "Aging", dryness: "Dryness", hyperpigmentation: "Hyperpigmentation",
  sensitivity: "Sensitivity", uneven_texture: "Uneven texture",
  fragrance: "Fragrance", alcohol: "Alcohol", essential_oils: "Essential Oils", sulfates: "Sulfates", silicones: "Silicones",
};

function label(key: string) { return LABEL_MAP[key] || key; }

export default function MyLog() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [user, setUser] = useState<any>(null);
  const [skinProfile, setSkinProfile] = useState<SkinProfile | null | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUser(data.user);
      fetchLog(data.user.id);
      fetchProfile(data.user.id);
    });
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("user_profiles")
      .select("skin_type, conditions, concerns, sensitivities")
      .eq("user_id", userId)
      .maybeSingle();
    setSkinProfile(data || null);
  };

  const fetchLog = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_products")
      .select(`id, status, note, created_at, products (id, external_id, name, brand, ingredients, image)`)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) setEntries(data as any);
    setLoading(false);
  };

  const filterStatusKey = (label: string): ProductStatus | null => {
    const map: Record<string, ProductStatus> = {
      "Love It": "love_it",
      "Abandoned": "abandoned",
      "Want to Try": "want_to_try",
      "Still Using": "still_using",
    };
    return map[label] || null;
  };

  const updateStatus = async (entryId: string, status: ProductStatus) => {
    setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, status } : e));
    await supabase.from("user_products").update({ status }).eq("id", entryId);
  };

  const deleteEntry = async (entryId: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
    await supabase.from("user_products").delete().eq("id", entryId);
  };

  const visible = entries.filter((e) => {
    if (filter !== "All") {
      const key = filterStatusKey(filter);
      if (key && e.status !== key) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (!e.products.name.toLowerCase().includes(q) && !e.products.brand.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#F5F0EA" }}>
      <NavBar />

      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-serif font-semibold" style={{ color: "#2C2C2C" }}>My Product Log</h1>
            <p className="text-stone-500 mt-1">Track everything you've tried, loved, or abandoned</p>
          </div>
          <Link
            href="/search"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: "#8B4513" }}
          >
            <span className="text-lg leading-none">+</span>
            Add Product
          </Link>
        </div>

        {/* Skin profile card */}
        {skinProfile !== undefined && (
          <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm mb-8 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-2">Your Skin Profile</p>
              {skinProfile ? (
                <div className="flex flex-wrap gap-1.5">
                  {skinProfile.skin_type && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-600">{label(skinProfile.skin_type)}</span>
                  )}
                  {(skinProfile.conditions || []).map((c) => (
                    <span key={c} className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">{label(c)}</span>
                  ))}
                  {(skinProfile.concerns || []).map((c) => (
                    <span key={c} className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{label(c)}</span>
                  ))}
                  {(skinProfile.sensitivities || []).map((s) => (
                    <span key={s} className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600">{label(s)} sensitive</span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-400">No profile yet — take the quiz to get personalized ingredient warnings.</p>
              )}
            </div>
            <Link
              href="/welcome"
              className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border border-stone-200 text-stone-600 hover:bg-stone-50 whitespace-nowrap"
            >
              {skinProfile ? "Edit" : "Take Quiz"}
            </Link>
          </div>
        )}

        {/* Search */}
        <div className="flex items-center gap-3 bg-white rounded-full px-5 py-3 shadow-sm border border-stone-200 mb-5 max-w-md">
          <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your products..."
            className="flex-1 bg-transparent outline-none text-stone-700 placeholder-stone-400 text-sm"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-3 mb-8 flex-wrap">
          {FILTERS.map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className="px-4 py-2 rounded-full text-sm font-medium border transition-colors"
              style={
                filter === tab
                  ? { backgroundColor: "#8B4513", color: "white", borderColor: "#8B4513" }
                  : { backgroundColor: "white", color: "#57534e", borderColor: "#e7e5e4" }
              }
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-block w-8 h-8 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
          </div>
        )}

        {/* Products */}
        {!loading && visible.length > 0 && (
          <div className="flex flex-col gap-4">
            {visible.map((entry) => (
              <div
                key={entry.id}
                className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 hover:border-stone-300 transition-colors flex items-center gap-6 cursor-pointer"
                onClick={() => router.push(`/product/${encodeURIComponent(entry.products.external_id || entry.products.id)}`)}
              >
                <div className="w-16 h-16 rounded-xl bg-stone-100 flex-shrink-0 overflow-hidden">
                  {entry.products.image ? (
                    <img src={entry.products.image} alt={entry.products.name} className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold tracking-widest uppercase text-stone-400 mb-0.5">{entry.products.brand}</p>
                  <p className="font-semibold text-stone-800 mb-1">{formatProductName(entry.products.name, entry.products.brand)}</p>
                  {entry.note && <p className="text-sm text-stone-500 truncate">{entry.note}</p>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={entry.status}
                    onChange={(e) => updateStatus(entry.id, e.target.value as ProductStatus)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${STATUS_COLORS[entry.status]}`}
                    style={{ appearance: "none", paddingRight: "1.5rem", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2378716c'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.5rem center" }}
                  >
                    {(Object.keys(STATUS_LABELS) as ProductStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="p-1.5 rounded-full text-stone-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                    title="Remove from log"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && visible.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-xl font-serif font-semibold mb-2" style={{ color: "#2C2C2C" }}>
              {filter !== "All" || search ? "No matching products" : "Your log is empty"}
            </h2>
            <p className="text-stone-500 mb-6 max-w-sm">
              {filter !== "All" || search ? "Try a different filter or search term." : "Start by searching for products you've tried."}
            </p>
            {filter === "All" && !search && (
              <Link
                href="/search"
                className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: "#8B4513" }}
              >
                <span className="text-lg leading-none">+</span>
                Add Your First Product
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
