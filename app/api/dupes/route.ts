import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Common ingredient name synonyms — normalize to canonical form
const INGREDIENT_SYNONYMS: Record<string, string> = {
  "aqua": "water",
  "purified water": "water",
  "deionized water": "water",
  "demineralized water": "water",
  "eau": "water",
  "white petrolatum": "petrolatum",
  "yellow petrolatum": "petrolatum",
  "soft white paraffin": "petrolatum",
  "glycerol": "glycerin",
  "propylene glycol usp": "propylene glycol",
  "sd alcohol": "alcohol denat",
  "alcohol denat.": "alcohol denat",
  "tocopherol acetate": "tocopheryl acetate",
  "retinol palmitate": "retinyl palmitate",
};

// Ingredients so common (appear in 50%+ of products) that they dilute similarity scores
// when products share functional ingredients. Still used for pool building.
const UBIQUITOUS = new Set([
  "water", "glycerin", "aqua", "glycerol", "butylene glycol", "propylene glycol",
  "phenoxyethanol", "ethylhexylglycerin", "carbomer", "xanthan gum",
  "sodium hydroxide", "citric acid", "disodium edta", "tetrasodium edta",
  "caprylyl glycol", "1,2-hexanediol", "pentylene glycol", "propanediol",
  "sodium benzoate", "potassium sorbate", "chlorphenesin",
  "parfum", "fragrance", "limonene", "linalool", "citral",
]);

function parseIngredients(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/,|;/)
      .map((s) => {
        const clean = s.trim()
          .replace(/\*|\(.*?\)/g, "")  // strip parentheticals like (Water) or (Shea)
          .replace(/\s+/g, " ")         // collapse any double spaces left behind
          .trim();
        return INGREDIENT_SYNONYMS[clean] ?? clean;
      })
      .filter((s) => s.length > 2 && s.length < 80)
  );
}

function similarityScore(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  // Score on functional ingredients only (exclude ubiquitous fillers)
  const aFunc = new Set([...a].filter((x) => !UBIQUITOUS.has(x)));
  const bFunc = new Set([...b].filter((x) => !UBIQUITOUS.has(x)));
  // Fall back to full sets if functional sets are too small (e.g. very simple formulas)
  const aSet = aFunc.size >= 3 ? aFunc : a;
  const bSet = bFunc.size >= 3 ? bFunc : b;
  const intersection = [...aSet].filter((x) => bSet.has(x)).length;
  if (intersection === 0) return 0;
  const union = new Set([...aSet, ...bSet]).size;
  const jaccard = intersection / union;
  const overlap = intersection / Math.min(aSet.size, bSet.size);
  return Math.round(((jaccard + overlap) / 2) * 100);
}

function normalize(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function isRealIngredientList(text: string): boolean {
  if (!text || text.length < 20) return false;
  const parts = text.split(",");
  if (parts.length < 3) return false;
  // Reject marketing/label text: too many "%" signs or all-caps promotional phrases
  const percentCount = (text.match(/%/g) || []).length;
  if (percentCount > 3) return false;
  const realWords = parts.filter((p) => {
    const t = p.trim();
    return t.length > 3 && /[a-zA-Z]{3,}/.test(t) && !/^\d+$/.test(t);
  });
  return realWords.length >= 3;
}

// Category keyword mapping — broad enough to catch most product names
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  moisturizer: ["moisturizer", "moisturising", "moisturizing", "cream", "lotion", "hydrating", "hydration", "hydro", "gel cream", "daily face", "face oil", "facial oil", "balm", "butter"],
  cleanser: ["cleanser", "cleansing", "face wash", "foaming", "micellar", "makeup remover", "cleanse", "wash", "scrub"],
  serum: ["serum", "essence", "ampoule", "booster", "concentrate", "drops"],
  sunscreen: ["sunscreen", "spf", "sun protection", "sunblock", "broad spectrum"],
  toner: ["toner", "toning", "mist", "prep", "softener"],
  "eye cream": ["eye cream", "eye gel", "eye serum", "eye treatment", "eye"],
  treatment: ["treatment", "spot", "acne", "retinol", "retinoid", "exfoliant", "peel", "aha", "bha", "salicylic", "glycolic", "vitamin c", "niacinamide", "repair", "mask"],
};

// Exclusion keywords — if product contains these, exclude from a category
const CATEGORY_EXCLUDES: Record<string, string[]> = {
  moisturizer: ["cleanser", "wash", "scrub", "sunscreen", "spf", "serum", "toner", "eye", "mask", "peel", "retinol", "retinoid", "retinaldehyde", "retinal", "retinoic", "tretinoin", "exfoliant", "aha", "bha", "salicylic", "glycolic"],
  cleanser: ["moisturizer", "lotion", "cream spf", "sunscreen", "serum", "toner"],
  mask: ["hair", "shampoo", "conditioner", "body wash", "hand"],
};

// Words that appear in many product names and pollute search results when used as OR terms.
// These are used to split a query into "specific" (distinctive) vs "generic" (category-level) words.
const GENERIC_QUERY_WORDS = new Set([
  "moisturizer", "moisturizing", "moisturising", "moisture", "moisturize",
  "cream", "lotion", "hydrating", "hydration", "hydro",
  "cleanser", "cleansing", "wash", "foaming", "scrub",
  "serum", "essence", "ampoule", "booster", "concentrate",
  "sunscreen", "sunblock", "protection",
  "toner", "toning", "mist", "softener",
  "treatment", "repair", "mask",
  "face", "skin", "skincare", "care", "daily", "gentle",
]);

async function findCandidates(query: string, category?: string): Promise<any[]> {
  const words = normalize(query).split(" ").filter((w) => w.length > 2);
  if (words.length === 0) return [];

  // Specific (distinctive) words — not common category terms
  const specificWords = words.filter((w) => !GENERIC_QUERY_WORDS.has(w));

  // Run a high-precision query with only distinctive words first.
  // This ensures brand-specific products (e.g. "Clearstem Hydraberry") always appear
  // in the result set even when the query also contains generic words like "moisture" or "mask".
  const precisePromises: Promise<{ data: any[] | null }>[] = [];
  if (specificWords.length >= 1) {
    precisePromises.push(
      supabase
        .from("products")
        .select("id, name, brand, image, ingredients, external_id")
        .or(specificWords.map((w) => `name.ilike.%${w}%`).join(","))
        .limit(100) as any,
      supabase
        .from("products")
        .select("id, name, brand, image, ingredients, external_id")
        .or(specificWords.map((w) => `brand.ilike.%${w}%`).join(","))
        .limit(100) as any,
    );
  }

  // Broad fallback with all words (catches products whose only matching terms are generic)
  const broadPromises = [
    supabase
      .from("products")
      .select("id, name, brand, image, ingredients, external_id")
      .or(words.map((w) => `name.ilike.%${w}%`).join(","))
      .limit(60) as any,
    supabase
      .from("products")
      .select("id, name, brand, image, ingredients, external_id")
      .or(words.map((w) => `brand.ilike.%${w}%`).join(","))
      .limit(60) as any,
  ];

  const allResults = await Promise.all([...precisePromises, ...broadPromises]);

  const seen = new Set<string>();
  const merged: any[] = [];
  for (const { data } of allResults) {
    for (const p of (data || [])) {
      if (!seen.has(p.id)) { seen.add(p.id); merged.push(p); }
    }
  }

  const queryNorm = normalize(query);
  let candidates = merged
    .map((p) => {
      const combined = normalize(`${p.brand} ${p.name}`);
      const matchCount = words.filter((w) => combined.includes(w)).length;
      const exactBonus = combined.includes(queryNorm) ? 10 : 0;
      const hasIngredients = isRealIngredientList(p.ingredients) ? 5 : 0;
      return { ...p, _score: matchCount + exactBonus + hasIngredients };
    })
    .sort((a, b) => b._score - a._score);

  // If category provided, filter candidates — but fall back to all if too few match
  if (category && CATEGORY_KEYWORDS[category]) {
    const kws = CATEGORY_KEYWORDS[category];
    const excludes = CATEGORY_EXCLUDES[category] || [];
    const filtered = candidates.filter((p) => {
      const nameLower = p.name.toLowerCase();
      const hasExclusion = excludes.some((ex) => nameLower.includes(ex));
      const hasMatch = kws.some((kw) => nameLower.includes(kw));
      return hasMatch && !hasExclusion;
    });
    if (filtered.length >= 3) candidates = filtered;
  }

  return candidates;
}

// ── Multi-signal scoring (tagged products) ────────────────────────────────

const TAG_WEIGHTS = {
  function:  0.35,
  archetype: 0.20,
  families:  0.10,
  intent:    0.15,
  texture:   0.10,
  format:    0.10,
} as const;

const MIN_TAG_SCORE = 0.60;
const BRAND_PENALTY = 0.85;

const FN_KEYS = [
  "fn_humectant", "fn_barrier", "fn_soothing", "fn_antiaging",
  "fn_brightening", "fn_exfoliation", "fn_oil_control", "fn_occlusion",
] as const;

const PRODUCT_TYPE_SIGNALS: [string, string[]][] = [
  ["cleanser",  ["cleanser", "cleansing", "face wash", "foam wash", "foaming", "micellar", "makeup remover"]],
  ["sunscreen", ["sunscreen", "sunblock", "spf ", "spf+", "sun cream", "broad spectrum"]],
  ["haircare",  ["shampoo", "conditioner", "hair mask", "hair oil", "scalp", "leave-in"]],
  ["makeup",    ["mascara", "foundation", "concealer", "blush", "bronzer", "highlighter", "eyeshadow", "eyeliner", "lipstick", "lip gloss", "lip liner", "setting powder", "setting spray", "bb cream", "cc cream", "tinted moisturizer", "color correcting"]],
  ["primer",    [" primer", "pore primer", "makeup base"]],
  ["lip",       ["lip balm", "lip mask", "lip treatment", "lip serum"]],
  ["body",      ["body lotion", "body cream", "body crème", "body creme", "body oil", "body wash", "body butter", "hand cream", "foot cream"]],
];

const TAG_FORMAT_SIGNALS: [string, string[]][] = [
  ["serum",   ["serum", "booster", "concentrate", "ampoule", "ampule", "drops"]],
  ["cream",   ["cream", "moisturizer", "balm", "butter", "gel cream"]],
  ["toner",   ["toner", "lotion", "softener"]],
  ["essence", ["essence", "emulsion", "fluid"]],
  ["oil",     ["face oil", "facial oil", "dry oil"]],
  ["mask",    ["mask", "pack", "peel-off", "sleeping pack", "sleeping mask"]],
  ["mist",    ["mist", "spray"]],
];

function normalizeBrandTag(brand: string): string {
  return (brand || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function detectProductType(name: string): string {
  const n = name.toLowerCase();
  for (const [type, signals] of PRODUCT_TYPE_SIGNALS) {
    if (signals.some((s) => n.includes(s))) return type;
  }
  return "skincare";
}

function detectTagFormat(name: string, stored: string | null): string {
  if (stored) return stored;
  const n = name.toLowerCase();
  for (const [fmt, signals] of TAG_FORMAT_SIGNALS) {
    if (signals.some((s) => n.includes(s))) return fmt;
  }
  return "serum";
}

function fnVector(tag: Record<string, any>): number[] {
  return FN_KEYS.map((k) => parseFloat(tag[k]) || 0);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; magA += a[i] * a[i]; magB += b[i] * b[i];
  }
  return magA === 0 || magB === 0 ? 0 : dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function familiesJaccard(a: string | null, b: string | null): number {
  const parse = (s: string | null) =>
    new Set((s || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean));
  const setA = parse(a), setB = parse(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  const inter = [...setA].filter((x) => setB.has(x)).length;
  return inter / new Set([...setA, ...setB]).size;
}

function textureSim(a: Record<string, any>, b: Record<string, any>): number {
  let s = 0;
  if (a.texture_viscosity && b.texture_viscosity) s += a.texture_viscosity === b.texture_viscosity ? 0.6 : 0;
  if (a.texture_finish    && b.texture_finish)    s += a.texture_finish    === b.texture_finish    ? 0.4 : 0;
  return s;
}

function scoreTagPair(
  tA: Record<string, any>, tB: Record<string, any>,
  nameA: string,          nameB: string,
): number {
  const fmtA = detectTagFormat(nameA, tA.format);
  const fmtB = detectTagFormat(nameB, tB.format);

  let score =
    cosine(fnVector(tA), fnVector(tB)) * TAG_WEIGHTS.function  +
    (tA.archetype === tB.archetype ? 1 : 0)                    * TAG_WEIGHTS.archetype +
    familiesJaccard(tA.ingredient_families, tB.ingredient_families) * TAG_WEIGHTS.families +
    (tA.intent    === tB.intent    ? 1 : 0)                    * TAG_WEIGHTS.intent    +
    textureSim(tA, tB)                                         * TAG_WEIGHTS.texture   +
    (!fmtA || !fmtB ? 0.5 : fmtA === fmtB ? 1 : 0.5)         * TAG_WEIGHTS.format;

  if (tA.archetype === "supporting_care" && tB.archetype === "supporting_care") score *= 0.8;
  return score;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const productId = searchParams.get("id");
  const category = searchParams.get("category") || undefined;

  if (!query && !productId) return NextResponse.json({ error: "Query required" }, { status: 400 });

  try {
    let target: any = null;

    if (productId) {
      // Direct lookup by ID — only include id.eq. if it looks like a UUID (avoids type cast error)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);
      const filter = isUUID
        ? `id.eq.${productId},external_id.eq.${productId}`
        : `external_id.eq.${productId}`;
      const { data } = await supabase
        .from("products")
        .select("id, name, brand, image, ingredients, external_id")
        .or(filter)
        .maybeSingle();
      target = data;
    } else {
      const candidates = await findCandidates(query!, category);
      if (candidates.length === 0) return NextResponse.json({ target: null, dupes: [], candidates: [] });

      // If multiple candidates and query looks like just a brand name (1-2 words),
      // return candidates list so user can pick
      const queryWords = query!.trim().split(/\s+/);
      const isBrandOnlySearch = queryWords.length <= 2 && candidates.length > 3;

      if (isBrandOnlySearch) {
        return NextResponse.json({
          target: null,
          dupes: [],
          candidates: candidates.slice(0, 60).sort((a, b) => a.name.localeCompare(b.name)).map((p) => ({
            id: p.external_id || p.id,
            name: p.name,
            brand: p.brand,
            image: p.image || null,
            ingredients: p.ingredients,
          })),
        });
      }

      // Require the top candidate to match at least 2 query words to avoid
      // false positives (e.g. "La Roche-Posay Cicaplast" matching a Skin1004
      // product only because both names contain "spf50")
      const top = candidates[0];
      const rawMatchCount = top._score - (isRealIngredientList(top.ingredients) ? 5 : 0);
      const minRequired = queryWords.length >= 3 ? 2 : 1;
      if (rawMatchCount < minRequired) {
        return NextResponse.json({ target: null, dupes: [], candidates: [] });
      }
      target = top;
    }

    if (!target) {
      return NextResponse.json({ target: null, dupes: [], candidates: [] });
    }

    // ── Multi-signal scoring (if target has product_tags) ─────────────────
    const { data: targetTag } = await supabase
      .from("product_tags")
      .select("intent, archetype, format, texture_viscosity, texture_finish, ingredient_families, fn_humectant, fn_barrier, fn_soothing, fn_antiaging, fn_brightening, fn_exfoliation, fn_oil_control, fn_occlusion, confidence_tier")
      .eq("product_id", target.id)
      .maybeSingle();

    // Low-confidence target tag → don't trust multi-signal; fall through to Jaccard
    // Auto-detect target's skincare category for like-for-like filtering
    const targetNameLowerMS = (target.name || "").toLowerCase();
    let targetCategory: string | null = null;
    for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
      if (kws.some((kw) => targetNameLowerMS.includes(kw))) { targetCategory = cat; break; }
    }
    // Treatment exclusion keywords — products containing these are treatments, not moisturizers/serums
    const TREATMENT_SIGNALS = ["retinol", "retinoid", "retinaldehyde", "retinal", "retinoic", "tretinoin", "aha", "bha", "salicylic", "glycolic", "lactic acid", "exfoliant", "exfoliating", "peel", "spot treatment"];
    const targetIsTreatment = TREATMENT_SIGNALS.some((s) => targetNameLowerMS.includes(s));

    if (targetTag && targetTag.confidence_tier !== "low") {
      const targetBrandNorm = normalizeBrandTag(target.brand || "");
      const targetType      = detectProductType(target.name || "");

      // Prefer high/medium-confidence candidates; expand to full pool only if too few
      const TAG_SELECT = "product_id, intent, archetype, format, texture_viscosity, texture_finish, ingredient_families, fn_humectant, fn_barrier, fn_soothing, fn_antiaging, fn_brightening, fn_exfoliation, fn_oil_control, fn_occlusion, products(id, name, brand, image, external_id)";
      let { data: allTagged } = await supabase
        .from("product_tags")
        .select(TAG_SELECT)
        .neq("product_id", target.id)
        .in("confidence_tier", ["high", "medium"]);

      // Fall back to full pool if the filtered set is too small to score well
      if (!allTagged || allTagged.length < 20) {
        const { data: expanded } = await supabase
          .from("product_tags")
          .select(TAG_SELECT)
          .neq("product_id", target.id);
        allTagged = expanded;
      }

      if (allTagged && allTagged.length > 0) {
        // Score + filter
        const scored = allTagged
          .filter((t) => {
            const p = t.products as any;
            if (!p) return false;
            if (normalizeBrandTag(p.brand) === targetBrandNorm) return false;
            if (detectProductType(p.name) !== targetType) return false;

            const candNameLower = (p.name || "").toLowerCase();
            const candIsTreatment = TREATMENT_SIGNALS.some((s) => candNameLower.includes(s));

            // Don't cross the treatment/non-treatment boundary
            if (targetIsTreatment !== candIsTreatment) return false;

            // If target has a detected category, exclude candidates from clearly incompatible categories
            if (targetCategory) {
              let candCategory: string | null = null;
              for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
                if (kws.some((kw) => candNameLower.includes(kw))) { candCategory = cat; break; }
              }
              // Exclude if candidate is in a clearly different primary category
              const INCOMPATIBLE: Record<string, string[]> = {
                moisturizer: ["cleanser", "toner", "sunscreen"],
                cleanser:    ["moisturizer", "toner", "sunscreen", "serum"],
                sunscreen:   ["cleanser", "toner"],
                toner:       ["cleanser", "moisturizer", "sunscreen"],
              };
              if (candCategory && INCOMPATIBLE[targetCategory]?.includes(candCategory)) return false;
            }

            return true;
          })
          .map((t) => {
            const p = t.products as any;
            return {
              id:    p.external_id || p.id,
              name:  p.name,
              brand: p.brand,
              image: p.image || null,
              ingredients: null as null,
              score: scoreTagPair(targetTag, t, target.name, p.name),
            };
          })
          .sort((a, b) => b.score - a.score);

        // Brand-diversity penalty then re-sort
        const brandSeen: Record<string, number> = {};
        const diversified = scored
          .map((d) => {
            const bn = normalizeBrandTag(d.brand);
            brandSeen[bn] = (brandSeen[bn] || 0) + 1;
            return { ...d, score: d.score * Math.pow(BRAND_PENALTY, brandSeen[bn] - 1) };
          })
          .sort((a, b) => b.score - a.score);

        const dupes = diversified
          .filter((d) => d.score >= MIN_TAG_SCORE)
          .slice(0, 8)
          .map((d) => ({ ...d, score: Math.round(d.score * 100) }));

        if (dupes.length >= 3) {
          return NextResponse.json({
            target: {
              id:          target.external_id || target.id,
              name:        target.name,
              brand:       target.brand,
              image:       target.image || null,
              ingredients: target.ingredients,
            },
            dupes,
            candidates: [],
          });
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────

    // If target has no ingredients, return it with empty dupes and a helpful flag
    if (!isRealIngredientList(target.ingredients)) {
      return NextResponse.json({
        target: {
          id: target.external_id || target.id,
          name: target.name,
          brand: target.brand,
          image: target.image || null,
          ingredients: null,
        },
        dupes: [],
        candidates: [],
        noIngredients: true,
      });
    }

    const targetIngredients = parseIngredients(target.ingredients);
    const targetBrandNorm = normalize(target.brand || "");

    // Auto-detect the target's category from its name so we match like-for-like
    const targetNameLower = target.name.toLowerCase();
    let detectedCategory: string | null = null;
    for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
      if (kws.some((kw) => targetNameLower.includes(kw))) {
        detectedCategory = cat;
        break;
      }
    }
    // Respect user-selected category over auto-detected
    const effectiveCategory = category || detectedCategory;

    // Build comparison pool using functional ingredients only (not ubiquitous fillers)
    const topIngredients = [...targetIngredients]
      .filter((ing) => ing.length > 5 && !UBIQUITOUS.has(ing))
      .slice(0, 10);
    // Fall back to all non-tiny ingredients if too few functional ones
    const poolIngredients = topIngredients.length >= 3
      ? topIngredients
      : [...targetIngredients].filter((ing) => ing.length > 4).slice(0, 8);

    let pool: any[] = [];
    if (poolIngredients.length > 0) {
      const { data: ingredientPool } = await supabase
        .from("products")
        .select("id, name, brand, image, ingredients, external_id")
        .not("ingredients", "is", null)
        .neq("id", target.id)
        .or(poolIngredients.map((ing) => `ingredients.ilike.%${ing}%`).join(","))
        .limit(400);
      pool = (ingredientPool || []).filter((p) => isRealIngredientList(p.ingredients));
    }

    // Fallback broad pool
    if (pool.length < 20) {
      const { data: broadPool } = await supabase
        .from("products")
        .select("id, name, brand, image, ingredients, external_id")
        .not("ingredients", "is", null)
        .neq("id", target.id)
        .not("brand", "ilike", `%${target.brand.split(" ")[0]}%`)
        .limit(500);
      const broad = (broadPool || []).filter((p) => isRealIngredientList(p.ingredients));
      const seen = new Set(pool.map((p) => p.id));
      for (const p of broad) {
        if (!seen.has(p.id)) { pool.push(p); seen.add(p.id); }
      }
    }

    // Filter pool by category (same-type products only) — fall back if too few
    if (effectiveCategory && CATEGORY_KEYWORDS[effectiveCategory]) {
      const catKws = CATEGORY_KEYWORDS[effectiveCategory];
      const catExcludes = CATEGORY_EXCLUDES[effectiveCategory] || [];
      const catFiltered = pool.filter((p) => {
        const nameLower = p.name.toLowerCase();
        return catKws.some((kw) => nameLower.includes(kw)) &&
               !catExcludes.some((ex) => nameLower.includes(ex));
      });
      if (catFiltered.length >= 5) pool = catFiltered;
    }

    const scored = pool
      .filter((p) => {
        const pBrand = normalize(p.brand || "");
        const targetWords = targetBrandNorm.split(" ").filter((w) => w.length > 3);
        const pWords = pBrand.split(" ").filter((w) => w.length > 3);
        return !targetWords.some((w) => pWords.includes(w));
      })
      .map((p) => {
        const pIngredients = parseIngredients(p.ingredients);
        const score = similarityScore(targetIngredients, pIngredients);
        return { id: p.external_id || p.id, name: p.name, brand: p.brand, image: p.image || null, ingredients: p.ingredients, score };
      })
      .sort((a, b) => b.score - a.score);

    // Always return top 8 closest matches — never show "no dupes found" if we have candidates
    const dupes = scored.slice(0, 8);

    return NextResponse.json({
      target: {
        id: target.external_id || target.id,
        name: target.name,
        brand: target.brand,
        image: target.image || null,
        ingredients: target.ingredients,
      },
      dupes,
      candidates: [],
    });
  } catch (err) {
    console.error("Dupes error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
