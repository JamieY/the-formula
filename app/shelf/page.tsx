import React from "react";
import NavBar from "@/app/components/NavBar";

// ── Silhouette SVGs ────────────────────────────────────────────────────────

function TonerBottle({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 60 96" fill="none" className="w-full h-full">
      <rect x="18" y="22" width="24" height="64" rx="8" fill={color} />
      <rect x="22" y="12" width="16" height="14" rx="5" fill={color} opacity="0.7" />
      <rect x="22" y="36" width="16" height="22" rx="3" fill="white" opacity="0.2" />
    </svg>
  );
}

function SerumBottle({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 60 100" fill="none" className="w-full h-full">
      <ellipse cx="30" cy="13" rx="7" ry="9" fill={color} opacity="0.65" />
      <rect x="27" y="20" width="6" height="12" fill={color} opacity="0.65" />
      <rect x="19" y="30" width="22" height="58" rx="9" fill={color} />
      <rect x="23" y="44" width="14" height="20" rx="3" fill="white" opacity="0.2" />
    </svg>
  );
}

function EyeCreamTube({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 60 80" fill="none" className="w-full h-full">
      <rect x="14" y="16" width="32" height="48" rx="9" fill={color} />
      <rect x="23" y="7" width="14" height="13" rx="5" fill={color} opacity="0.7" />
      <rect x="18" y="29" width="24" height="18" rx="3" fill="white" opacity="0.2" />
      <rect x="14" y="57" width="32" height="7" rx="4" fill={color} opacity="0.55" />
    </svg>
  );
}

function MoisturizerJar({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 80 68" fill="none" className="w-full h-full">
      <rect x="6" y="24" width="68" height="38" rx="10" fill={color} />
      <rect x="4" y="13" width="72" height="16" rx="8" fill={color} opacity="0.7" />
      <rect x="14" y="33" width="52" height="20" rx="4" fill="white" opacity="0.2" />
    </svg>
  );
}

function SpfTube({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 60 96" fill="none" className="w-full h-full">
      <rect x="16" y="22" width="28" height="64" rx="9" fill={color} />
      <rect x="25" y="10" width="10" height="16" rx="4" fill={color} opacity="0.7" />
      <ellipse cx="30" cy="10" rx="9" ry="6" fill={color} opacity="0.6" />
      <rect x="20" y="36" width="20" height="28" rx="3" fill="white" opacity="0.2" />
    </svg>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────

const ACTIVE_COLOR   = "#C4956A";   // warm tan — active products
const ARCHIVED_COLOR = "#C5C3BE";   // stone grey — archived products

const COLUMNS = [
  {
    id: "toner",
    label: "Toner / Essence",
    Silhouette: TonerBottle,
    active: [
      { brand: "Hada Labo", name: "Gokujyun Premium Lotion", rank: null },
    ],
    archived: [
      { brand: "Pyunkang Yul", name: "Essence Toner" },
    ],
  },
  {
    id: "serum",
    label: "Serum",
    Silhouette: SerumBottle,
    active: [
      { brand: "Drunk Elephant", name: "C-Firma Fresh Day Serum", rank: 1 },
      { brand: "The Ordinary", name: "Niacinamide 10% + Zinc 1%", rank: 2 },
    ],
    archived: [
      { brand: "Paula's Choice", name: "2% BHA Liquid Exfoliant" },
      { brand: "Sunday Riley", name: "Good Genes Lactic Acid" },
    ],
  },
  {
    id: "eye",
    label: "Eye Cream",
    Silhouette: EyeCreamTube,
    active: [
      { brand: "Kiehl's", name: "Creamy Eye Treatment with Avocado", rank: null },
    ],
    archived: [],
  },
  {
    id: "moisturizer",
    label: "Moisturizer",
    Silhouette: MoisturizerJar,
    active: [
      { brand: "La Roche-Posay", name: "Toleriane Double Repair", rank: 1 },
    ],
    archived: [
      { brand: "CeraVe", name: "Moisturizing Cream" },
      { brand: "Tatcha", name: "The Dewy Skin Cream" },
    ],
  },
  {
    id: "spf",
    label: "SPF",
    Silhouette: SpfTube,
    active: [
      { brand: "EltaMD", name: "UV Clear Broad-Spectrum SPF 46", rank: null },
    ],
    archived: [],
  },
];

// ── Product card ──────────────────────────────────────────────────────────

function ProductCard({
  brand,
  name,
  rank,
  archived,
  Silhouette,
}: {
  brand: string;
  name: string;
  rank?: number | null;
  archived?: boolean;
  Silhouette: React.ComponentType<{ color: string }>;
}) {
  const color = archived ? ARCHIVED_COLOR : ACTIVE_COLOR;
  return (
    <div
      className={`relative rounded-2xl p-4 flex flex-col items-center gap-3 shadow-sm border transition-all ${
        archived
          ? "bg-stone-50 border-stone-100 opacity-60"
          : "bg-white border-stone-100 hover:border-stone-300 hover:shadow-md cursor-pointer"
      }`}
    >
      {rank && (
        <span
          className="absolute top-3 right-3 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center"
          style={{ backgroundColor: "#8B4513" }}
        >
          {rank}
        </span>
      )}
      <div className="w-14 h-16 flex items-center justify-center">
        <Silhouette color={color} />
      </div>
      <div className="text-center w-full">
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 truncate">{brand}</p>
        <p className={`text-xs mt-0.5 leading-snug line-clamp-2 ${archived ? "text-stone-400" : "text-stone-700 font-medium"}`}>
          {name}
        </p>
      </div>
    </div>
  );
}

// ── Empty column slot ────────────────────────────────────────────────────

function EmptySlot({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-stone-200 p-4 flex flex-col items-center justify-center gap-2 min-h-[130px] cursor-pointer hover:border-stone-400 hover:bg-stone-50 transition-all">
      <span className="text-2xl text-stone-300">+</span>
      <p className="text-xs text-stone-400 text-center">Add a {label.toLowerCase()}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function ShelfMockup() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "#F5F0EA" }}>
      <NavBar />

      <div className="px-6 py-10 max-w-screen-xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#8B4513" }}>
              My Shelf
            </p>
            <h1 className="text-3xl font-serif font-semibold" style={{ color: "#2C2C2C" }}>
              Your routine, in order
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="px-5 py-2.5 rounded-full text-sm font-medium border border-stone-300 text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Analyze My Formula
            </button>
            <button
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-medium text-white shadow-sm"
              style={{ backgroundColor: "#8B4513" }}
            >
              <span className="text-base leading-none">+</span>
              Add Product
            </button>
          </div>
        </div>

        {/* Shelf — horizontal scroll */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-5 min-w-max">
            {COLUMNS.map((col) => (
              <div key={col.id} className="w-44 flex-shrink-0">

                {/* Column header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                    {col.label}
                  </p>
                  <button className="text-stone-300 hover:text-stone-500 text-lg leading-none">+</button>
                </div>

                {/* Active products */}
                <div className="flex flex-col gap-3">
                  {col.active.length === 0 && col.archived.length === 0 && (
                    <EmptySlot label={col.label} />
                  )}
                  {col.active.map((p) => (
                    <ProductCard
                      key={p.name}
                      brand={p.brand}
                      name={p.name}
                      rank={p.rank}
                      Silhouette={col.Silhouette}
                    />
                  ))}

                  {/* Archived divider + products */}
                  {col.archived.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 px-1 pt-2">
                        <div className="flex-1 h-px bg-stone-200" />
                        <p className="text-xs text-stone-300 whitespace-nowrap">past</p>
                        <div className="flex-1 h-px bg-stone-200" />
                      </div>
                      {col.archived.map((p) => (
                        <ProductCard
                          key={p.name}
                          brand={p.brand}
                          name={p.name}
                          archived
                          Silhouette={col.Silhouette}
                        />
                      ))}
                    </>
                  )}

                  {/* Add slot at bottom if column has active products */}
                  {col.active.length > 0 && (
                    <EmptySlot label={col.label} />
                  )}
                </div>
              </div>
            ))}

            {/* Cleanser column — intentionally empty to show gap */}
            <div className="w-44 flex-shrink-0">
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Cleanser</p>
                <button className="text-stone-300 hover:text-stone-500 text-lg leading-none">+</button>
              </div>
              <EmptySlot label="cleanser" />
              <p className="text-xs text-amber-600 text-center mt-2 px-1 leading-snug">
                No cleanser in your routine
              </p>
            </div>

          </div>
        </div>

        {/* Analyze My Formula banner */}
        <div
          className="mt-10 rounded-2xl px-8 py-6 flex items-center justify-between"
          style={{ backgroundColor: "#EDE8E0" }}
        >
          <div>
            <p className="font-semibold text-stone-700 mb-1">Ready to analyze your formula?</p>
            <p className="text-sm text-stone-500">
              See what&apos;s redundant, what conflicts with your skin profile, and what your routine is missing.
            </p>
          </div>
          <button
            className="flex-shrink-0 ml-8 px-6 py-2.5 rounded-full text-sm font-medium text-white shadow-sm"
            style={{ backgroundColor: "#8B4513" }}
          >
            Analyze My Formula →
          </button>
        </div>

      </div>
    </main>
  );
}
