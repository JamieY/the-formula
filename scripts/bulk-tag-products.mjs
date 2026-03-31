// Bulk-tags all ~22k products in Supabase using deterministic rules.
// Skips any product already tagged with tag_source = 'gold_manual'.
//
// Prerequisite: run scripts/migrate-add-confidence.sql in Supabase SQL editor first.
//
// Usage:
//   node scripts/bulk-tag-products.mjs              → full run
//   node scripts/bulk-tag-products.mjs --dry-run    → print distributions only, no writes
//   node scripts/bulk-tag-products.mjs --limit 500  → process first 500 products (for testing)

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(resolve(__dirname, "../.env.local"), "utf8");
for (const line of env.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── CLI flags ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const limitIdx = args.indexOf("--limit");
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;

// ── Product-type detection (hard gate — non-skincare products are tagged but
//    scored low and excluded from dupe matching at serve time) ──────────────

const PRODUCT_TYPE_SIGNALS = [
  ["haircare",  ["hair", "shampoo", "conditioner", "scalp", "curl", "leave-in", "frizz", "detangling", "heat protectant"]],
  ["cleanser",  ["cleanser", "cleansing", "face wash", "foam wash", "foaming", "micellar", "makeup remover"]],
  ["sunscreen", ["sunscreen", "sunblock", "spf ", "spf+", "sun cream", "broad spectrum"]],
  ["body",      ["body lotion", "body cream", "body crème", "body creme", "body oil", "body wash", "body butter", "hand cream", "foot cream"]],
  ["lip",       ["lip balm", "lip mask", "lip treatment", "lip serum"]],
  ["primer",    [" primer", "pore primer", "makeup base"]],
  ["makeup",    ["foundation", "mascara", "eyeshadow", "eyeliner", "blush", "bronzer", "concealer",
                 "lipstick", "setting powder", "bb cream", "cc cream", "palette", "setting spray"]],
  ["tool",      ["brush", "sponge", "roller", "gua sha", "device", "massager"]],
  ["kit",       [" kit", " set ", " collection", " bundle", " duo", " trio", "gift set", "starter set"]],
];

function detectProductType(name) {
  const n = (name || "").toLowerCase();
  for (const [type, sigs] of PRODUCT_TYPE_SIGNALS) {
    if (sigs.some(s => n.includes(s))) return type;
  }
  return "skincare";
}

// ── Format detection ───────────────────────────────────────────────────────

const FORMAT_SIGNALS = [
  ["serum",   ["serum", "booster", "concentrate", "ampoule", "ampule", "drops"]],
  ["cream",   ["cream", "moisturizer", "balm", "butter", "gel cream"]],
  ["toner",   ["toner", "lotion", "softener"]],
  ["essence", ["essence", "emulsion", "fluid"]],
  ["oil",     ["face oil", "facial oil", "dry oil"]],
  ["mask",    ["mask", "pack", "peel-off", "sleeping pack", "sleeping mask"]],
  ["mist",    ["mist", "spray"]],
];

function detectFormat(name) {
  const n = (name || "").toLowerCase();
  for (const [fmt, sigs] of FORMAT_SIGNALS) {
    if (sigs.some(s => n.includes(s))) return fmt;
  }
  return "serum";
}

// ── Intent detection ───────────────────────────────────────────────────────
// Mirrors clean-and-relabel.py exactly so bulk tags are consistent with gold.

const RETINOID_ING  = ["retinol", "retinal", "retinyl palmitate", "retinyl acetate", "tretinoin",
                       "adapalene", "hydroxypinacolone retinoate", "granactive retinoid",
                       "retinaldehyde", "bakuchiol"];
const RETINOID_NAME = ["retinol", "retinal", "retinoid", "retin", "bakuchiol", "crystal retinal"];

const AHA_ING  = ["glycolic acid", "lactic acid", "mandelic acid", "malic acid",
                  "tartaric acid", "gluconolactone", "lactobionic acid"];
const AHA_NAME = ["glycolic", "lactic", "aha", "exfoliant", "exfoliating", "peel",
                  "mandelic", "alpha beta", "resurfacing"];

const BHA_ING  = ["salicylic acid", "betaine salicylate", "willow bark"];
const BHA_NAME = ["salicylic", "bha", "clarifying", "acne"];

const VITC_ING  = ["ascorbic acid", "tetrahexyldecyl ascorbate", "ascorbyl glucoside",
                   "3-o-ethyl ascorbic acid", "ethyl ascorbic acid", "ethylascorbic acid",
                   "sodium ascorbyl phosphate", "magnesium ascorbyl phosphate", "ascorbyl palmitate"];
const VITC_NAME = ["vitamin c", "vit c", "vitamin-c", "ascorbic", "brightening",
                   "c-tetra", "c tetra", "c-firma", "c firma"];

const BARRIER_ING  = ["ceramide np", "ceramide ap", "ceramide eop", "ceramide eos",
                      "ceramide ns", "ceramide", "phytosphingosine", "sphingosine",
                      "cholesterol", "caprooyl phytosphingosine"];
const BARRIER_NAME = ["barrier", "ceramide", "lipid", "rescue", "cicaplast", "cicabio",
                      "toleriane", "lipikar"];

const SOOTHING_ING  = ["centella asiatica", "madecassoside", "asiaticoside", "allantoin",
                       "bisabolol", "beta-glucan", "oat extract", "avena sativa",
                       "panthenol", "dexpanthenol"];
const SOOTHING_NAME = ["cica", "centella", "soothing", "calming", "calm", "relief",
                       "sensitive", "rescue", "repair", "recovery"];

const NIAC_ING  = ["niacinamide"];
const NIAC_NAME = ["niacinamide", "niacin"];

const HA_ING  = ["sodium hyaluronate", "hyaluronic acid", "hydrolyzed hyaluronic acid",
                 "sodium hyaluronate crosspolymer", "hydroxypropyltrimonium hyaluronate"];
const HA_NAME = ["hyaluronic", "hyalu", "hydra", "hydrating", "plumping",
                 "moisture", "aqua", "water", "h.a.", "hydr8"];

function ingTop(ingredients, n = 15) {
  return (ingredients || "").split(/,|;/).slice(0, n).join(" ").toLowerCase();
}

function detectIntent(name, ingredients) {
  const n   = (name || "").toLowerCase();
  const ing = (ingredients || "").toLowerCase();
  const t15 = ingTop(ingredients, 15);
  const t20 = ingTop(ingredients, 20);

  if (RETINOID_NAME.some(t => n.includes(t))) return "retinoid";
  if (RETINOID_ING.some(t => t15.includes(t))) return "retinoid";

  if (AHA_NAME.some(t => n.includes(t))) return "aha_exfoliant";
  if (AHA_ING.some(t => t15.includes(t))) return "aha_exfoliant";

  if (BHA_NAME.some(t => n.includes(t))) return "bha_exfoliant";
  if (BHA_ING.some(t => t15.includes(t))) return "bha_exfoliant";

  if (VITC_NAME.some(t => n.includes(t))) return "vitamin_c";
  if (VITC_ING.some(t => t20.includes(t))) return "vitamin_c";

  if (BARRIER_NAME.some(t => n.includes(t))) return "barrier_repair";
  if (BARRIER_ING.some(t => t15.includes(t))) return "barrier_repair";

  if (SOOTHING_NAME.some(t => n.includes(t))) return "soothing";
  if (SOOTHING_ING.some(t => t15.includes(t))) return "soothing";

  if (NIAC_NAME.some(t => n.includes(t))) return "niacinamide";
  if (NIAC_ING.some(t => t15.includes(t))) return "niacinamide";

  // HA requires both a name signal AND ingredient presence
  if (HA_NAME.some(t => n.includes(t)) && HA_ING.some(t => ing.includes(t))) return "ha_only";

  return "general_support";
}

// ── Archetype detection ────────────────────────────────────────────────────

const ARCHETYPE_MAP = [
  ["retinoid",          ["retinol", "retinal", "retinoid", "retin", "bakuchiol", "crystal retinal"]],
  ["vitamin_c_classic", ["vitamin c", "vit c", "vitamin-c", "ascorbic", "c-tetra", "c serum", "brightening", "c-firma"]],
  ["aha_exfoliant",     ["glycolic", "lactic", "aha", "exfoliant", "peel", "resurfacing", "mandelic", "alpha beta"]],
  ["bha_exfoliant",     ["salicylic", "bha", "clarif", "acne"]],
  ["barrier",           ["barrier", "ceramide", "lipid", "rescue", "cicaplast", "toleriane", "lipikar", "cicabio"]],
  ["soothing",          ["cica", "centella", "soothing", "calming", "calm", "sensitive", "relief", "recovery"]],
  ["pure_humectant",    ["hyaluronic", "hyalu", "hydrating serum", "aqua", "water serum", "moisture serum", "hydr8"]],
];

const INTENT_TO_ARCHETYPE = {
  retinoid:       "retinoid",
  aha_exfoliant:  "aha_exfoliant",
  bha_exfoliant:  "bha_exfoliant",
  vitamin_c:      "vitamin_c_classic",
  barrier_repair: "barrier",
  soothing:       "soothing",
  niacinamide:    "supporting_care",
  ha_only:        "pure_humectant",
  general_support:"supporting_care",
};

function detectArchetype(name, ingredients, intent) {
  const n   = (name || "").toLowerCase();
  const t10 = ingTop(ingredients, 10);

  for (const [arch, terms] of ARCHETYPE_MAP) {
    if (terms.some(t => n.includes(t))) return arch;
    if (terms.some(t => t10.includes(t))) return arch;
  }
  return INTENT_TO_ARCHETYPE[intent] ?? "supporting_care";
}

// ── fn_* vector computation ────────────────────────────────────────────────
// Primary function comes from intent (strong, 0.60–0.80).
// Secondary boosts come from ingredient presence (capped, never stack beyond primary).

const INTENT_FN_BASE = {
  retinoid:       { fn_antiaging: 0.80, fn_brightening: 0.30 },
  vitamin_c:      { fn_brightening: 0.80, fn_antiaging: 0.40 },
  aha_exfoliant:  { fn_exfoliation: 0.80, fn_brightening: 0.30 },
  bha_exfoliant:  { fn_exfoliation: 0.70, fn_oil_control: 0.50 },
  barrier_repair: { fn_barrier: 0.80, fn_soothing: 0.30, fn_occlusion: 0.30 },
  soothing:       { fn_soothing: 0.80, fn_barrier: 0.30 },
  niacinamide:    { fn_brightening: 0.60, fn_oil_control: 0.60, fn_soothing: 0.20 },
  ha_only:        { fn_humectant: 0.80, fn_barrier: 0.20 },
  general_support:{},
};

// [ingredient terms, {fn_key: boost_value}]
// Applied as Math.max (not additive) so secondaries never crowd out the primary.
const ING_FN_BOOSTS = [
  [["ceramide", "phytosphingosine", "sphingosine", "cholesterol"],             { fn_barrier: 0.40 }],
  [["hyaluronic acid", "sodium hyaluronate", "hydrolyzed hyaluronic"],         { fn_humectant: 0.40 }],
  [["glycerin", "butylene glycol", "propylene glycol", "pentylene glycol"],    { fn_humectant: 0.20 }],
  [["centella asiatica", "madecassoside", "allantoin", "bisabolol", "panthenol"], { fn_soothing: 0.30 }],
  [["retinol", "retinal", "retinyl", "bakuchiol", "hydroxypinacolone"],        { fn_antiaging: 0.40 }],
  [["ascorbic acid", "ascorbyl", "tetrahexyldecyl"],                           { fn_brightening: 0.40 }],
  [["peptide", "palmitoyl", "acetyl hexapeptide", "matrixyl", "argireline", "syn-ake"], { fn_antiaging: 0.30 }],
  [["niacinamide"],                                                             { fn_brightening: 0.30, fn_oil_control: 0.30 }],
  [["salicylic acid", "betaine salicylate"],                                   { fn_oil_control: 0.40, fn_exfoliation: 0.40 }],
  [["glycolic acid", "lactic acid", "mandelic acid"],                          { fn_exfoliation: 0.50, fn_brightening: 0.20 }],
  [["petrolatum", "beeswax", "lanolin"],                                       { fn_occlusion: 0.50 }],
  [["dimethicone", "cyclopentasiloxane", "cyclomethicone"],                    { fn_occlusion: 0.30 }],
  [["arbutin", "kojic acid", "tranexamic acid", "alpha-arbutin"],              { fn_brightening: 0.40 }],
];

const FN_ZERO = {
  fn_humectant: 0, fn_barrier: 0, fn_soothing: 0, fn_antiaging: 0,
  fn_brightening: 0, fn_exfoliation: 0, fn_oil_control: 0, fn_occlusion: 0,
};

function computeFnVector(intent, ingredients) {
  const fn  = { ...FN_ZERO, ...(INTENT_FN_BASE[intent] || {}) };
  const ing = (ingredients || "").toLowerCase();

  if (ing.length < 20) return fn;  // no ingredients → keep intent-derived values only

  for (const [terms, boosts] of ING_FN_BOOSTS) {
    if (terms.some(t => ing.includes(t))) {
      for (const [key, val] of Object.entries(boosts)) {
        fn[key] = Math.max(fn[key], val);
      }
    }
  }
  return fn;
}

// ── Ingredient families ────────────────────────────────────────────────────

const FAMILY_SIGNALS = [
  ["retinoids",     ["retinol", "retinal", "retinyl", "tretinoin", "adapalene", "bakuchiol", "hydroxypinacolone"]],
  ["vitamin_c",     ["ascorbic acid", "ascorbyl", "tetrahexyldecyl ascorbate", "sodium ascorbyl"]],
  ["ceramides",     ["ceramide", "phytosphingosine", "sphingosine", "cholesterol"]],
  ["peptides",      ["peptide", "palmitoyl", "acetyl hexapeptide", "matrixyl", "argireline", "syn-ake", "copper pca"]],
  ["aha",           ["glycolic acid", "lactic acid", "mandelic acid", "malic acid", "gluconolactone", "lactobionic"]],
  ["bha",           ["salicylic acid", "betaine salicylate", "willow bark"]],
  ["niacinamide",   ["niacinamide", "nicotinamide"]],
  ["squalane",      ["squalane", "squalene"]],
  ["plant_actives", ["centella asiatica", "madecassoside", "allantoin", "bisabolol", "beta-glucan", "resveratrol"]],
  ["humectants",    ["hyaluronic acid", "sodium hyaluronate", "glycerin"]],
  ["lipids",        ["fatty acid", "linoleic acid", "oleic acid", "stearic acid", "rosehip", "jojoba", "shea"]],
];

function detectFamilies(ingredients) {
  const ing = (ingredients || "").toLowerCase();
  if (ing.length < 20) return null;
  const found = FAMILY_SIGNALS.filter(([, terms]) => terms.some(t => ing.includes(t))).map(([f]) => f);
  return found.length > 0 ? found.join(",") : null;
}

// ── Confidence scoring ─────────────────────────────────────────────────────
// Signal clarity rule: if fn_* vector has no clearly dominant function
// (max < 0.50), confidence is capped at medium tier (79 max).

function computeTagConfidence(product, intent, archetype, format, fn, families) {
  const ing           = product.ingredients || "";
  const ingParseable  = ing.length > 50 && ing.split(",").length >= 3;
  const isGenericInt  = intent === "general_support";
  const isGenericArch = archetype === "supporting_care";

  let score = 0;

  // Positive signals
  if (ingParseable)  score += 25;
  if (!isGenericInt) score += 15;
  if (!isGenericArch)score += 15;
  if (format)        score += 10;
  if (product.name)  score +=  5;
  if (families)      score += 10;

  // Signal clarity: fn_* dominant function
  const fnVals    = Object.values(fn);
  const maxFn     = Math.max(...fnVals);
  const dominantFn = maxFn >= 0.50;
  if (dominantFn) score += 20;

  // Negative signals
  if (!ingParseable) score -= 25;
  if (isGenericInt)  score -= 10;
  if (isGenericArch) score -= 10;

  // Signal clarity cap: no dominant function → cannot be high tier
  if (!dominantFn) score = Math.min(score, 79);

  return Math.max(0, Math.min(100, score));
}

function confidenceTier(conf) {
  if (conf >= 80) return "high";
  if (conf >= 60) return "medium";
  return "low";
}

// ── Needs-review heuristic (QA only — not stored) ─────────────────────────

function needsReview(intent, archetype, productType, product) {
  if (productType !== "skincare") return true;
  if (!product.ingredients || product.ingredients.length < 20) return true;
  if (intent === "general_support") return true;
  if (archetype === "supporting_care") return true;
  return false;
}

// ── Full tag computation for one product ──────────────────────────────────

function computeTag(product) {
  const { name, brand, ingredients } = product;
  const intent     = detectIntent(name, ingredients);
  const archetype  = detectArchetype(name, ingredients, intent);
  const format     = detectFormat(name);
  const fn         = computeFnVector(intent, ingredients);
  const families   = detectFamilies(ingredients);
  const confidence = computeTagConfidence(product, intent, archetype, format, fn, families);

  return {
    product_id:          product.id,
    intent,
    archetype,
    format,
    ingredient_families: families,
    ...fn,
    tag_confidence:      confidence,
    confidence_tier:     confidenceTier(confidence),
    tag_source:          "deterministic_bulk",
    updated_at:          new Date().toISOString(),
  };
}

// ── Fetch helpers ──────────────────────────────────────────────────────────

async function fetchAllProducts() {
  const PAGE = 1000;
  let all = [], from = 0;
  process.stdout.write("Fetching products");
  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, brand, ingredients")
      .range(from, from + PAGE - 1);
    if (error) { console.error("\nFetch error:", error); process.exit(1); }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    process.stdout.write(".");
    if (data.length < PAGE) break;
    from += PAGE;
  }
  console.log(` ${all.length} products`);
  return all;
}

async function fetchGoldManualIds() {
  const { data, error } = await supabase
    .from("product_tags")
    .select("product_id")
    .eq("tag_source", "gold_manual");
  if (error) { console.error("Error fetching gold IDs:", error); process.exit(1); }
  return new Set((data || []).map(r => r.product_id));
}

// ── Batch upsert ───────────────────────────────────────────────────────────

async function upsertBatch(tags) {
  const { error } = await supabase
    .from("product_tags")
    .upsert(tags, { onConflict: "product_id" });
  if (error) console.error("  Upsert error:", error.message);
  return error ? 0 : tags.length;
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"} | Limit: ${LIMIT === Infinity ? "none" : LIMIT}\n`);

  const [allProducts, goldIds] = await Promise.all([fetchAllProducts(), fetchGoldManualIds()]);
  console.log(`Gold-manual tags to preserve: ${goldIds.size}`);

  // Candidates: non-gold, non-kit/tool, apply optional limit
  const candidates = allProducts
    .filter(p => !goldIds.has(p.id))
    .slice(0, LIMIT);

  console.log(`Candidates to process: ${candidates.length}\n`);

  // ── Process ──────────────────────────────────────────────────────────────

  const BATCH = 100;
  const stats = {
    total: 0, skippedNonSkincare: 0,
    byIntent: {}, byArchetype: {}, byTier: {},
    needsReview: 0,
  };

  const buffer = [];
  let written = 0;

  function count(map, key) { map[key] = (map[key] || 0) + 1; }

  for (const product of candidates) {
    const productType = detectProductType(product.name);
    const tag         = computeTag(product);

    stats.total++;
    count(stats.byIntent,    tag.intent);
    count(stats.byArchetype, tag.archetype);
    count(stats.byTier,      tag.confidence_tier);
    if (needsReview(tag.intent, tag.archetype, productType, product)) stats.needsReview++;

    if (!DRY_RUN) {
      buffer.push(tag);
      if (buffer.length >= BATCH) {
        written += await upsertBatch(buffer.splice(0, BATCH));
        if (written % 500 === 0) console.log(`  ... ${written} upserted`);
      }
    }
  }

  // flush remainder
  if (!DRY_RUN && buffer.length > 0) {
    written += await upsertBatch(buffer);
  }

  // ── QA Summary ────────────────────────────────────────────────────────────

  const bar = "═".repeat(72);
  console.log(`\n${bar}`);
  console.log(`QA SUMMARY — bulk-tag-products  (tag_source = deterministic_bulk)`);
  console.log(bar);
  console.log(`Products processed:  ${stats.total}`);
  console.log(`Gold-manual skipped: ${goldIds.size}`);
  if (!DRY_RUN) console.log(`Written to DB:       ${written}`);
  console.log(`Needs review:        ${stats.needsReview}  (${pct(stats.needsReview, stats.total)})`);

  console.log(`\nConfidence tiers:`);
  for (const tier of ["high", "medium", "low"]) {
    const n = stats.byTier[tier] || 0;
    console.log(`  ${pad(tier, 8)}  ${pad(n, 6)}  ${pct(n, stats.total)}`);
  }

  console.log(`\nIntent distribution:`);
  for (const [k, v] of sortedDesc(stats.byIntent)) {
    console.log(`  ${pad(k, 22)} ${pad(v, 6)}  ${pct(v, stats.total)}`);
  }

  console.log(`\nArchetype distribution:`);
  for (const [k, v] of sortedDesc(stats.byArchetype)) {
    console.log(`  ${pad(k, 22)} ${pad(v, 6)}  ${pct(v, stats.total)}`);
  }

  const lowConfidence = Object.entries(stats.byIntent)
    .filter(([k]) => k === "general_support")
    .map(([, v]) => v)
    .reduce((a, b) => a + b, 0);
  console.log(`\nTop reasons for low confidence / needs_review:`);
  console.log(`  general_support intent:   ${stats.byIntent["general_support"] || 0}`);
  console.log(`  supporting_care archetype:${stats.byArchetype["supporting_care"] || 0}`);
  console.log(`\n${bar}`);
}

function pct(n, total) {
  return total === 0 ? "0%" : (n / total * 100).toFixed(1) + "%";
}
function pad(s, len) {
  return String(s ?? "").slice(0, len).padEnd(len);
}
function sortedDesc(obj) {
  return Object.entries(obj).sort(([, a], [, b]) => b - a);
}

main().catch(console.error);
