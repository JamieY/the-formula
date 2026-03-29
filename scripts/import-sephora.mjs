/**
 * Import Sephora product data from Kaggle dataset (archive-2/product_info.csv).
 * Run with: node scripts/import-sephora.mjs
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

const CSV_PATH = "/Users/yacherj/Downloads/archive-2/product_info.csv";

// Skip non-skincare/haircare categories
const SKIP_CATEGORIES = [
  "fragrance", "makeup", "foundation", "lipstick", "mascara",
  "eyeliner", "eyeshadow", "blush", "bronzer", "highlighter",
  "nail", "perfume", "cologne", "hair color", "hair dye",
];

function isSkippable(category) {
  if (!category) return false;
  const lower = category.toLowerCase();
  return SKIP_CATEGORIES.some((kw) => lower.includes(kw));
}

function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function cleanIngredients(raw) {
  if (!raw || raw.length < 10) return null;

  // The ingredients field is a Python list of strings like:
  // ['Section Header:', 'ingredient1, ingredient2', 'Another Section:', '...']
  // We need to extract just the ingredient text

  // Remove Python list brackets and quotes
  let cleaned = raw
    .replace(/^\[|\]$/g, "")           // remove outer [ ]
    .replace(/^'|'$/g, "")             // remove outer quotes
    .split(/', '/)                      // split on ', ' between list items
    .map((s) => s.replace(/^'|'$/g, "").trim())
    .filter((s) => {
      // Skip section headers (end with colon, short text)
      if (s.endsWith(":") && s.length < 60) return false;
      // Skip very short entries
      if (s.length < 10) return false;
      return true;
    })
    .join(", ");

  // Must have commas to be a real ingredient list
  if (!cleaned.includes(",")) return null;
  return cleaned.length > 20 ? cleaned : null;
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function main() {
  console.log("\n💄 Importing Sephora dataset...\n");

  const content = readFileSync(CSV_PATH, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());
  const headerFields = parseCSVLine(lines[0]);

  let skipped = 0;
  let noIngredients = 0;
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const row = Object.fromEntries(headerFields.map((h, idx) => [h, (fields[idx] || "").trim()]));

    const category = row["primary_category"] || "";
    if (isSkippable(category)) { skipped++; continue; }

    const ingredients = cleanIngredients(row["ingredients"]);
    if (!ingredients) { noIngredients++; continue; }

    const brand = row["brand_name"] || "";
    const name = row["product_name"] || "";
    if (!brand || !name) continue;

    const handle = slugify(`${brand}-${name}`);
    rows.push({
      name,
      brand,
      ingredients,
      source_name: "Sephora",
      external_id: `sephora-${handle}`,
    });
  }

  console.log(`  ${rows.length} products to import (${skipped} non-skincare skipped, ${noIngredients} had no ingredients)\n`);

  let inserted = 0;
  let failed = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("products")
      .upsert(batch, { onConflict: "external_id" });

    if (error) {
      console.log(`  ✗ Batch error:`, error.message);
      failed += batch.length;
    } else {
      inserted += batch.length;
    }

    if (i % 1000 === 0 && i > 0) {
      console.log(`  [${i}/${rows.length}] ${inserted} inserted so far...`);
    }
  }

  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .not("ingredients", "is", null);

  console.log(`\n✅ Done!`);
  console.log(`   ${inserted} Sephora products imported`);
  console.log(`   ${failed} failed`);
  console.log(`   ${count} total products in DB with ingredients`);
}

main().catch(console.error);
