"use client";
import React, { useState } from "react";
import NavBar from "@/app/components/NavBar";

// ── Palette ────────────────────────────────────────────────────────────────
const ACTIVE_COLOR   = "#7B9E87";  // sage — calm, "this is working"
const ARCHIVED_COLOR = "#C8C5BF";  // muted stone — past, receded

// ── Silhouettes ────────────────────────────────────────────────────────────

function TonerBottle({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 64" fill="none" className="w-full h-full">
      <rect x="12" y="14" width="16" height="44" rx="6" fill={color} />
      <rect x="15" y="8" width="10" height="10" rx="4" fill={color} opacity="0.6" />
      <rect x="14" y="24" width="12" height="16" rx="2" fill="white" opacity="0.18" />
    </svg>
  );
}

function SerumDropper({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 68" fill="none" className="w-full h-full">
      <ellipse cx="20" cy="9" rx="5" ry="7" fill={color} opacity="0.6" />
      <rect x="18" y="14" width="4" height="9" fill={color} opacity="0.6" />
      <rect x="12" y="21" width="16" height="40" rx="7" fill={color} />
      <rect x="15" y="31" width="10" height="14" rx="2" fill="white" opacity="0.18" />
    </svg>
  );
}

function EyeTube({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 58" fill="none" className="w-full h-full">
      <rect x="9" y="11" width="22" height="36" rx="7" fill={color} />
      <rect x="15" y="5" width="10" height="10" rx="4" fill={color} opacity="0.6" />
      <rect x="12" y="21" width="16" height="13" rx="2" fill="white" opacity="0.18" />
      <rect x="9" y="41" width="22" height="6" rx="3" fill={color} opacity="0.5" />
    </svg>
  );
}

function MoisturizerJar({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 56 46" fill="none" className="w-full h-full">
      <rect x="4" y="16" width="48" height="28" rx="8" fill={color} />
      <rect x="2" y="8" width="52" height="12" rx="6" fill={color} opacity="0.6" />
      <rect x="10" y="22" width="36" height="14" rx="3" fill="white" opacity="0.18" />
    </svg>
  );
}

function SpfTube({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 64" fill="none" className="w-full h-full">
      <rect x="11" y="16" width="18" height="44" rx="7" fill={color} />
      <rect x="17" y="7" width="6" height="13" rx="3" fill={color} opacity="0.6" />
      <ellipse cx="20" cy="7" rx="7" ry="5" fill={color} opacity="0.55" />
      <rect x="14" y="26" width="12" height="20" rx="2" fill="white" opacity="0.18" />
    </svg>
  );
}

function PumpBottle({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 72" fill="none" className="w-full h-full">
      <rect x="10" y="20" width="20" height="48" rx="7" fill={color} />
      <rect x="17" y="8" width="6" height="16" rx="3" fill={color} opacity="0.6" />
      <rect x="17" y="6" width="14" height="5" rx="2.5" fill={color} opacity="0.55" />
      <rect x="13" y="32" width="14" height="20" rx="2" fill="white" opacity="0.18" />
    </svg>
  );
}

function OilDropper({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 72" fill="none" className="w-full h-full">
      <ellipse cx="20" cy="8" rx="4" ry="6" fill={color} opacity="0.6" />
      <rect x="18.5" y="13" width="3" height="8" fill={color} opacity="0.55" />
      <rect x="13" y="19" width="14" height="46" rx="8" fill={color} />
      <rect x="16" y="30" width="8" height="16" rx="2" fill="white" opacity="0.18" />
    </svg>
  );
}

function MaskPot({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 56 42" fill="none" className="w-full h-full">
      <rect x="3" y="14" width="50" height="26" rx="9" fill={color} />
      <rect x="1" y="7" width="54" height="11" rx="5.5" fill={color} opacity="0.6" />
      <rect x="9" y="19" width="38" height="12" rx="3" fill="white" opacity="0.18" />
    </svg>
  );
}

// ── Column definitions ────────────────────────────────────────────────────

type Product = { brand: string; name: string; rank?: number | null };

type ColumnDef = {
  id: string;
  label: string;
  Silhouette: React.ComponentType<{ color: string }>;
  isWide?: boolean;
  optional?: boolean;
  active: Product[];
  archived: Product[];
};

const ALL_COLUMNS: ColumnDef[] = [
  {
    id: "cleanser",
    label: "Cleanser",
    Silhouette: PumpBottle,
    active: [],
    archived: [],
  },
  {
    id: "toner",
    label: "Toner",
    Silhouette: TonerBottle,
    active: [
      { brand: "Hada Labo", name: "Gokujyun Premium", rank: null },
    ],
    archived: [
      { brand: "Pyunkang Yul", name: "Essence Toner" },
    ],
  },
  {
    id: "serum",
    label: "Serum",
    Silhouette: SerumDropper,
    active: [
      { brand: "Drunk Elephant", name: "C-Firma Serum", rank: 1 },
      { brand: "The Ordinary", name: "Niacinamide 10%", rank: 2 },
    ],
    archived: [
      { brand: "Paula's Choice", name: "2% BHA Exfoliant" },
      { brand: "Sunday Riley", name: "Good Genes" },
    ],
  },
  {
    id: "eye",
    label: "Eye Cream",
    Silhouette: EyeTube,
    optional: true,
    active: [
      { brand: "Kiehl's", name: "Creamy Eye Treatment", rank: null },
    ],
    archived: [],
  },
  {
    id: "oil",
    label: "Face Oil",
    Silhouette: OilDropper,
    optional: true,
    active: [],
    archived: [],
  },
  {
    id: "moisturizer",
    label: "Moisturizer",
    Silhouette: MoisturizerJar,
    isWide: true,
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
      { brand: "EltaMD", name: "UV Clear SPF 46", rank: null },
    ],
    archived: [],
  },
  {
    id: "mask",
    label: "Mask",
    Silhouette: MaskPot,
    isWide: true,
    optional: true,
    active: [],
    archived: [],
  },
  {
    id: "treatment",
    label: "Treatment",
    Silhouette: SerumDropper,
    optional: true,
    active: [],
    archived: [],
  },
];

// Default visible: non-optional columns only
const DEFAULT_VISIBLE = ALL_COLUMNS.filter((c) => !c.optional).map((c) => c.id);

// ── Product tile ───────────────────────────────────────────────────────────

function ProductTile({
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
    <div className={`relative flex flex-col items-center gap-2 px-2 py-3 rounded-xl transition-all
      ${archived ? "opacity-50" : "cursor-pointer hover:bg-white/50"}`}>
      {rank && (
        <span
          className="absolute top-2 right-2 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
          style={{ backgroundColor: "#8B4513" }}
        >
          {rank}
        </span>
      )}
      {/* Fixed-size container for ALL silhouette types — uniform tile height */}
      <div className="w-14 h-14 flex items-center justify-center">
        <Silhouette color={color} />
      </div>
      {/* Fixed-height text block */}
      <div className="text-center w-full h-[44px] flex flex-col justify-start">
        <p className="text-[10px] font-semibold uppercase tracking-wider leading-tight truncate text-stone-400">
          {brand}
        </p>
        <p className={`text-xs leading-tight line-clamp-2 mt-0.5
          ${archived ? "text-stone-400" : "text-stone-600"}`}>
          {name}
        </p>
      </div>
    </div>
  );
}

// ── Empty column ──────────────────────────────────────────────────────────

function EmptyColumn({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-2 py-6 rounded-xl border border-dashed border-stone-200 cursor-pointer hover:border-stone-300 hover:bg-stone-50/50 transition-all">
      <div className="w-8 h-12 rounded-lg border-2 border-dashed border-stone-200 flex items-center justify-center">
        <span className="text-stone-300 text-lg leading-none">+</span>
      </div>
      <p className="text-[10px] text-stone-400 text-center uppercase tracking-wider">
        Add {label}
      </p>
    </div>
  );
}

// ── Customize panel ────────────────────────────────────────────────────────

function CustomizePanel({
  visibleIds,
  onToggle,
  onClose,
}: {
  visibleIds: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute right-0 top-10 z-20 w-56 bg-white rounded-2xl shadow-lg border border-stone-100 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">
        Routine Steps
      </p>
      <div className="flex flex-col gap-2">
        {ALL_COLUMNS.map((col) => {
          const isOn = visibleIds.includes(col.id);
          return (
            <button
              key={col.id}
              onClick={() => onToggle(col.id)}
              className="flex items-center justify-between w-full text-left group"
            >
              <span className={`text-sm ${isOn ? "text-stone-700 font-medium" : "text-stone-400"}`}>
                {col.label}
                {col.optional && (
                  <span className="ml-1.5 text-[10px] text-stone-300 font-normal">optional</span>
                )}
              </span>
              <span
                className={`w-8 h-4 rounded-full flex items-center transition-colors ${isOn ? "justify-end" : "justify-start"}`}
                style={{ backgroundColor: isOn ? "#7B9E87" : "#E5E1DA" }}
              >
                <span className="w-3 h-3 rounded-full bg-white mx-0.5 shadow-sm" />
              </span>
            </button>
          );
        })}
      </div>
      <button
        onClick={onClose}
        className="mt-4 w-full text-center text-xs text-stone-400 hover:text-stone-600 transition-colors"
      >
        Done
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function ShelfMockup() {
  const [visibleIds, setVisibleIds] = useState<string[]>(DEFAULT_VISIBLE);
  const [showCustomize, setShowCustomize] = useState(false);

  function toggleColumn(id: string) {
    setVisibleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const visibleColumns = ALL_COLUMNS.filter((c) => visibleIds.includes(c.id));

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#F5F0EA" }}>
      <NavBar />

      <div className="px-8 py-10 max-w-screen-xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#7B9E87" }}>
              My Shelf
            </p>
            <h1 className="text-3xl font-serif font-semibold" style={{ color: "#2C2C2C" }}>
              Your routine, in order
            </h1>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <button className="px-5 py-2 rounded-full text-sm font-medium border border-stone-300 text-stone-500 hover:bg-white transition-colors">
              Analyze My Formula
            </button>
            <button
              className="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: "#8B4513" }}
            >
              <span className="text-base leading-none">+</span> Add
            </button>
          </div>
        </div>

        {/* Shelf */}
        <div className="overflow-x-auto pb-6">
          <div className="flex gap-8 min-w-max items-start">
            {visibleColumns.map((col) => (
              <div key={col.id} className="w-36 flex-shrink-0 bg-white/40 rounded-2xl px-1 pt-3 pb-4">

                {/* Column label */}
                <div className="flex items-center justify-between mb-3 px-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                    {col.label}
                  </p>
                  <button className="text-stone-300 hover:text-stone-500 text-base leading-none transition-colors">
                    +
                  </button>
                </div>

                {/* Empty column */}
                {col.active.length === 0 && col.archived.length === 0 && (
                  <div className="px-1">
                    <EmptyColumn label={col.label} />
                    <p className="text-[10px] text-amber-500 text-center mt-2 px-1 leading-snug">
                      Gap in your routine
                    </p>
                  </div>
                )}

                {/* Active products */}
                <div className="flex flex-col gap-1">
                  {col.active.map((p) => (
                    <ProductTile
                      key={p.name}
                      brand={p.brand}
                      name={p.name}
                      rank={p.rank}
                      Silhouette={col.Silhouette}
                    />
                  ))}

                  {/* Archived */}
                  {col.archived.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 my-2 px-2">
                        <div className="flex-1 h-px bg-stone-200" />
                        <p className="text-[10px] text-stone-300 uppercase tracking-wider">past</p>
                        <div className="flex-1 h-px bg-stone-200" />
                      </div>
                      {col.archived.map((p) => (
                        <ProductTile
                          key={p.name}
                          brand={p.brand}
                          name={p.name}
                          archived
                          Silhouette={col.Silhouette}
                        />
                      ))}
                    </>
                  )}
                </div>

              </div>
            ))}

            {/* Add column button */}
            <div className="flex-shrink-0 relative self-start mt-10">
              <button
                onClick={() => setShowCustomize((v) => !v)}
                className="flex flex-col items-center gap-2 w-16 py-4 rounded-xl border border-dashed border-stone-200 text-stone-300 hover:border-stone-300 hover:text-stone-400 transition-all"
              >
                <span className="text-xl leading-none">⊕</span>
                <span className="text-[9px] uppercase tracking-wider leading-tight text-center">
                  Edit<br />steps
                </span>
              </button>
              {showCustomize && (
                <CustomizePanel
                  visibleIds={visibleIds}
                  onToggle={toggleColumn}
                  onClose={() => setShowCustomize(false)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Thin divider */}
        <div className="border-t border-stone-200 mt-4 mb-8" />

        {/* Analyze CTA — quiet, not loud */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-stone-700 text-sm mb-0.5">Ready to analyze your formula?</p>
            <p className="text-xs text-stone-400">
              See what&apos;s redundant, what conflicts with your skin profile, and what&apos;s missing.
            </p>
          </div>
          <button
            className="flex-shrink-0 ml-8 px-5 py-2 rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: "#7B9E87" }}
          >
            Analyze →
          </button>
        </div>

      </div>
    </main>
  );
}
