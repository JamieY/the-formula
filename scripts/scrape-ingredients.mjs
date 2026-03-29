/**
 * Scrape ingredient data from individual product pages for products
 * that are missing ingredients in the database.
 * Run with: node scripts/scrape-ingredients.mjs
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf-8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => l.split("=").map((s) => s.trim()))
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function stripHtml(html) {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gis, "")
    .replace(/<script[^>]*>.*?<\/script>/gis, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#[0-9]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractIngredients(html) {
  const text = stripHtml(html);

  const markers = [
    "full ingredients:", "ingredients:", "inci list:", "inci:", "composition:",
    "full ingredient list:", "active ingredients:", "inactive ingredients:",
    "ingrédients:", "ingr.:", "contains:", "formulated with:",
  ];

  const lower = text.toLowerCase();
  for (const marker of markers) {
    const idx = lower.indexOf(marker);
    if (idx === -1) continue;

    const start = idx + marker.length;
    let raw = text.substring(start, start + 2000).trim();

    // Stop at common section-ending patterns
    const stopPatterns = [
      /\n\s*[A-Z][A-Z\s]{4,}:/,   // ALL CAPS HEADING:
      /how to use/i,
      /directions:/i,
      /warnings?:/i,
      /caution:/i,
      /manufactured by/i,
      /distributed by/i,
      /\*these statements/i,
      /free from/i,
      /dermatologist tested/i,
    ];

    for (const stop of stopPatterns) {
      const m = raw.search(stop);
      if (m > 40) { raw = raw.substring(0, m); break; }
    }

    raw = raw.trim();
    // Must look like a real ingredient list (has commas, reasonable length)
    if (raw.length > 30 && raw.includes(",")) return raw;
  }

  return null;
}

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function main() {
  // Fetch all products missing ingredients
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, brand, source_url")
    .is("ingredients", null)
    .not("source_url", "is", null);

  if (error) { console.error("DB error:", error.message); process.exit(1); }

  console.log(`\n🔍 Scraping ingredients for ${products.length} products...\n`);

  let found = 0;
  let notFound = 0;
  let failed = 0;

  // Process in batches to avoid overwhelming servers
  const BATCH_SIZE = 5;
  const DELAY_MS = 400;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];

    // Progress indicator every 25 products
    if (i % 25 === 0) {
      console.log(`  [${i}/${products.length}] ✓ ${found} found so far...`);
    }

    const html = await fetchPage(p.source_url);
    if (!html) { failed++; continue; }

    const ingredients = extractIngredients(html);
    if (ingredients) {
      const { error: updateError } = await supabase
        .from("products")
        .update({ ingredients })
        .eq("id", p.id);

      if (!updateError) {
        found++;
      }
    } else {
      notFound++;
    }

    // Polite delay between requests
    if (i % BATCH_SIZE === BATCH_SIZE - 1) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  // Final count
  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .not("ingredients", "is", null);

  console.log(`\n✅ Done!`);
  console.log(`   ${found} ingredients scraped and saved`);
  console.log(`   ${notFound} pages had no ingredient data`);
  console.log(`   ${failed} pages failed to load`);
  console.log(`   ${count} total products in DB with ingredients`);
}

main().catch(console.error);
