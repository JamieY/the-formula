/**
 * Seed the Supabase products table from Shopify brand stores.
 * Run with: node scripts/seed-shopify.mjs
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

// Load env vars from .env.local
const env = Object.fromEntries(
  readFileSync(".env.local", "utf-8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => l.split("=").map((s) => s.trim()))
);

// Use service role key to bypass RLS for this admin seeding script
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const BRANDS = [
  { name: "CLEARSTEM",        domain: "clearstem.com" },
  { name: "Krave Beauty",     domain: "kravebeauty.com" },
  { name: "Glossier",         domain: "glossier.com" },
  { name: "Herbivore",        domain: "herbivorebotanicals.com" },
  { name: "Sunday Riley",     domain: "sundayriley.com" },
  { name: "Alpyn Beauty",     domain: "alpynbeauty.com" },
  { name: "TULA",             domain: "tula.com" },
  { name: "Naturium",         domain: "naturium.com" },
  { name: "Murad",            domain: "murad.com" },
  { name: "BYOMA",            domain: "byoma.com" },
  { name: "Tatcha",           domain: "tatcha.com" },
  { name: "COSRX",            domain: "cosrx.com" },
  { name: "Anua",             domain: "anua.com" },
  { name: "Innisfree",        domain: "us.innisfree.com" },
  { name: "Josie Maran",      domain: "josiemaran.com" },
  { name: "Dermalogica",      domain: "dermalogica.com" },
  { name: "The INKEY List",   domain: "theinkeylist.com" },
  { name: "Geek & Gorgeous",  domain: "geekandgorgeous.com" },
  { name: "Cocokind",         domain: "cocokind.com" },
  { name: "Primally Pure",    domain: "primallypure.com" },
  { name: "Salt & Stone",     domain: "saltandstone.com" },
  { name: "Rhode Skin",       domain: "rhodeskin.com" },
  { name: "Skinfix",          domain: "skinfix.com" },
  { name: "Beauty of Joseon", domain: "beautyofjoseon.com" },
  { name: "AcneFree",         domain: "acnefree.com" },
  { name: "Tony Moly",        domain: "tonymoly.us" },
  { name: "Hello Bubble",     domain: "hellobubble.com" },
  { name: "Skintific",          domain: "skintific.com" },
  // Skincare — batch 2
  { name: "Farmacy Beauty",     domain: "farmacybeauty.com" },
  { name: "Youth to the People", domain: "youthtothepeople.com" },
  { name: "Glow Recipe",        domain: "glowrecipe.com" },
  { name: "Tower 28",           domain: "tower28beauty.com" },
  { name: "Versed",             domain: "versedskin.com" },
  { name: "Peach & Lily",       domain: "peachandlily.com" },
  { name: "First Aid Beauty",   domain: "firstaidbeauty.com" },
  { name: "Ole Henriksen",      domain: "olehenriksen.com" },
  { name: "Peter Thomas Roth",  domain: "peterthomasroth.com" },
  { name: "Pixi Beauty",        domain: "pixibeauty.com" },
  { name: "Nécessaire",         domain: "necessaire.com" },
  { name: "Skin1004",           domain: "skin1004.com" },
  { name: "Haruharu Wonder",    domain: "haruharuwonder.com" },
  // Haircare
  { name: "Mielle Organics",    domain: "mielleorganics.com" },
  { name: "Camille Rose",       domain: "camillerose.com" },
  { name: "Bondi Boost",        domain: "bondiboost.com" },
];

// Skip bundles, sets, mystery items — not useful for ingredient analysis
const SKIP_KEYWORDS = ["bundle", "set", "kit", "duo", "trio", "mystery", "sample", "travel size", "gift", "trial", "mini set", "collection"];

function isSkippable(title) {
  const lower = title.toLowerCase();
  return SKIP_KEYWORDS.some((kw) => lower.includes(kw));
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function extractIngredients(bodyHtml) {
  if (!bodyHtml) return null;
  const text = stripHtml(bodyHtml);
  const markers = [
    "ingredients:", "full ingredients:", "inci:", "full ingredient list:",
    "active ingredients:", "inactive ingredients:", "key ingredients:",
  ];
  const lower = text.toLowerCase();
  for (const marker of markers) {
    const idx = lower.indexOf(marker);
    if (idx !== -1) {
      // Take up to 1500 chars after the marker
      const raw = text.substring(idx + marker.length, idx + marker.length + 1500).trim();
      // Stop at the next section header (all caps word followed by colon or newline)
      const cut = raw.search(/\n[A-Z][A-Z\s]{3,}:/);
      return cut > 50 ? raw.substring(0, cut).trim() : raw.trim() || null;
    }
  }
  return null;
}

async function fetchBrandProducts(brand) {
  const url = `https://${brand.domain}/products.json?limit=250`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TheFormula/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.log(`  ✗ ${brand.name}: HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    return data.products || [];
  } catch (e) {
    console.log(`  ✗ ${brand.name}: ${e.message}`);
    return [];
  }
}

async function seedBrand(brand) {
  const products = await fetchBrandProducts(brand);
  if (!products.length) return { inserted: 0, skipped: 0 };

  let inserted = 0;
  let skipped = 0;

  const rows = [];
  for (const p of products) {
    if (isSkippable(p.title)) { skipped++; continue; }

    const image = p.images?.[0]?.src || null;
    const ingredients = extractIngredients(p.body_html);
    const price = p.variants?.[0]?.price ? `$${p.variants[0].price}` : null;
    const handle = p.handle;
    const externalId = `shopify-${brand.domain}-${handle}`;

    rows.push({
      name: p.title,
      brand: brand.name,
      ingredients: ingredients || null,
      image,
      source_name: brand.name,
      source_url: `https://${brand.domain}/products/${handle}`,
      external_id: externalId,
    });
  }

  if (rows.length === 0) return { inserted: 0, skipped };

  // Upsert in batches of 50
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error } = await supabase
      .from("products")
      .upsert(batch, { onConflict: "external_id" });
    if (error) {
      console.log(`  ✗ ${brand.name} DB error:`, error.message);
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, skipped };
}

async function main() {
  console.log(`\n🌱 Seeding ${BRANDS.length} Shopify brands into Supabase...\n`);

  let totalInserted = 0;
  let totalSkipped = 0;
  let withIngredients = 0;

  for (const brand of BRANDS) {
    process.stdout.write(`  ${brand.name}...`);
    const { inserted, skipped } = await seedBrand(brand);
    console.log(` ${inserted} products (${skipped} skipped)`);
    totalInserted += inserted;
    totalSkipped += skipped;

    // Small delay to be polite to servers
    await new Promise((r) => setTimeout(r, 300));
  }

  // Count how many have ingredients
  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .not("ingredients", "is", null);

  console.log(`\n✅ Done!`);
  console.log(`   ${totalInserted} products added/updated`);
  console.log(`   ${totalSkipped} bundles/sets skipped`);
  console.log(`   ${count} total products in DB with ingredients`);
}

main().catch(console.error);
