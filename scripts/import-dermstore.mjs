/**
 * Import skincare product data from the Dermstore Kaggle dataset.
 * ~7,500 products with ingredients, categories, ratings, and skin type info.
 *
 * Dataset: https://www.kaggle.com/datasets/crawlfeeds/dermstore-skincare-products-and-ingredients-dataset
 * Download the CSV and save to: ~/Downloads/dermstore-products.csv
 *
 * Run with: node scripts/import-dermstore.mjs
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf-8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const JSON_PATH = `${process.env.HOME}/Downloads/dermstore_data.json`;

// Skip non-skincare categories
const SKIP_CATEGORIES = [
  "makeup", "foundation", "lipstick", "mascara", "eyeliner", "eyeshadow",
  "blush", "bronzer", "nail", "perfume", "cologne", "hair color", "hair dye",
  "fragrance", "brush", "tool", "supplement",
];

function isSkippable(category) {
  if (!category) return false;
  const lower = category.toLowerCase();
  return SKIP_CATEGORIES.some((kw) => lower.includes(kw));
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function main() {
  console.log("\n🛍️  Importing Dermstore dataset...\n");

  const rows = JSON.parse(readFileSync(JSON_PATH, "utf-8"));
  console.log(`  Parsed ${rows.length} rows\n`);

  const valid = rows.filter((r) => {
    if (!r.title || !r.brand) return false;
    if (isSkippable(r.category)) return false;
    const ing = r.ingredients || "";
    return ing.length > 20 && ing.includes(",");
  });

  console.log(`  ${valid.length} rows after filtering (skincare with ingredients)\n`);

  let inserted = 0;
  let failed = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    const batch = valid.slice(i, i + BATCH_SIZE).map((r) => {
      const handle = slugify(`${r.brand}-${r.title}`);
      // Pick the best image from the pipe-separated images column
      const image = r.images ? r.images.split("|")[0].trim() || null : null;
      return {
        name:        r.title,
        brand:       r.brand,
        ingredients: r.ingredients || null,
        image,
        source_name: "Dermstore",
        source_url:  r.url || null,
        external_id: `dermstore-${r.uniq_id || handle}`,
      };
    });

    const { error } = await supabase
      .from("products")
      .upsert(batch, { onConflict: "external_id" });

    if (error) {
      console.log(`  ✗ Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
      failed += batch.length;
    } else {
      inserted += batch.length;
    }

    if (i % 1000 === 0 && i > 0) {
      console.log(`  [${i}/${valid.length}] ${inserted} inserted so far...`);
    }
  }

  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .not("ingredients", "is", null);

  console.log("\n✅ Done!");
  console.log(`   ${inserted} products imported from Dermstore`);
  if (failed > 0) console.log(`   ${failed} failed`);
  console.log(`   ${count} total products in DB with ingredients`);
}

main().catch(console.error);
