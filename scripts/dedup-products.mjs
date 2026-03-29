/**
 * Deduplication script: merges product records that refer to the same product
 * but came from different sources (e.g. Shopify has the image, SkinSort has ingredients).
 *
 * Strategy:
 *   1. Normalize product names (strip ™ ® © punctuation, lowercase, collapse spaces)
 *   2. Group records by (normalized_name, normalized_brand)
 *   3. For groups of 2+, merge into one record:
 *      - Keep the record with an image (prefer Shopify source)
 *      - Copy ingredients from whichever record has them
 *      - Re-point any user_products rows to the keeper
 *      - Delete the duplicates
 *
 * Run with: node scripts/dedup-products.mjs
 * Add --dry-run to preview without making changes.
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf-8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const DRY_RUN = process.argv.includes("--dry-run");

function normalizeName(s) {
  return s
    .toLowerCase()
    .replace(/[™®©]/g, "")          // strip trademark symbols
    .replace(/[^a-z0-9\s]/g, " ")   // replace punctuation with space
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeBrand(s) {
  const words = s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().split(/\s+/);
  const first = words[0];
  // Use first word unless it's too short/generic (e.g. "la", "the", "dr")
  if (first.length <= 3 || ["the", "les", "der"].includes(first)) {
    return words.join("").slice(0, 20);
  }
  return first.slice(0, 15);
}

async function main() {
  console.log(`\n🔍 Loading products...${DRY_RUN ? " (DRY RUN)" : ""}\n`);

  // Load all products in batches
  const allProducts = [];
  let offset = 0;
  const batchSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("id, external_id, name, brand, ingredients, image, source_name")
      .range(offset, offset + batchSize - 1);
    if (error) { console.error("DB error:", error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    allProducts.push(...data);
    if (data.length < batchSize) break;
    offset += batchSize;
  }

  console.log(`   Loaded ${allProducts.length} products\n`);

  // Group by normalized name + brand
  const groups = new Map();
  for (const p of allProducts) {
    const key = `${normalizeName(p.name)}||${normalizeBrand(p.brand)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }

  // Find groups with duplicates
  const dupeGroups = [...groups.values()].filter((g) => g.length > 1);
  console.log(`   Found ${dupeGroups.length} duplicate groups\n`);

  let merged = 0;
  let deleted = 0;
  let skipped = 0;

  for (const group of dupeGroups) {
    // Pick the "keeper": prefer record with image, then with ingredients, then oldest
    group.sort((a, b) => {
      const aScore = (a.image ? 2 : 0) + (a.ingredients ? 1 : 0);
      const bScore = (b.image ? 2 : 0) + (b.ingredients ? 1 : 0);
      return bScore - aScore;
    });

    const keeper = group[0];
    const dupes = group.slice(1);

    // Collect best image and ingredients across all records in the group
    const bestImage = group.find((p) => p.image)?.image || null;
    const ingredientSources = group.filter((p) => p.ingredients && p.ingredients.length > 20);
    const bestIngredients = ingredientSources[0]?.ingredients || null;

    // If multiple records have DIFFERENT ingredient lists, flag for review instead of overwriting
    const hasIngredientConflict = ingredientSources.length > 1 &&
      ingredientSources.some((p) => normalizeName(p.ingredients) !== normalizeName(ingredientSources[0].ingredients));

    if (hasIngredientConflict) {
      console.log(`⚠️  CONFLICT: "${keeper.brand}" — "${keeper.name}" has conflicting ingredient lists — skipping auto-merge, flagging for review`);
      if (!DRY_RUN) {
        await supabase.from("products").update({ formula_flagged: true }).eq("id", keeper.id);
      }
      skipped++;
      continue;
    }

    const needsUpdate =
      (bestImage && keeper.image !== bestImage) ||
      (bestIngredients && keeper.ingredients !== bestIngredients);

    if (DRY_RUN) {
      console.log(`MERGE: "${keeper.brand}" — "${keeper.name}"`);
      console.log(`  keeper: ${keeper.external_id || keeper.id} (image:${!!keeper.image} ing:${!!keeper.ingredients})`);
      for (const d of dupes) {
        console.log(`  delete: ${d.external_id || d.id} (image:${!!d.image} ing:${!!d.ingredients})`);
      }
      if (needsUpdate) console.log(`  → will update keeper with better image/ingredients`);
      console.log();
      merged++;
      deleted += dupes.length;
      continue;
    }

    // Update keeper with best available data
    if (needsUpdate) {
      const updates = {};
      if (bestImage && keeper.image !== bestImage) updates.image = bestImage;
      if (bestIngredients && keeper.ingredients !== bestIngredients) updates.ingredients = bestIngredients;
      const { error } = await supabase.from("products").update(updates).eq("id", keeper.id);
      if (error) { console.error(`  Update error for ${keeper.id}:`, error.message); skipped++; continue; }
    }

    // Re-point user_products from dupes to keeper
    for (const dupe of dupes) {
      const { error: relinkErr } = await supabase
        .from("user_products")
        .update({ product_id: keeper.id })
        .eq("product_id", dupe.id);
      if (relinkErr) console.warn(`  Warning re-linking user_products for ${dupe.id}:`, relinkErr.message);

      // Delete the duplicate
      const { error: delErr } = await supabase.from("products").delete().eq("id", dupe.id);
      if (delErr) {
        console.error(`  Delete error for ${dupe.id}:`, delErr.message);
        skipped++;
      } else {
        deleted++;
      }
    }
    merged++;

    if (merged % 50 === 0) console.log(`  [${merged} groups merged, ${deleted} records removed]`);
  }

  console.log(`\n✅ Done!`);
  console.log(`   ${merged} duplicate groups ${DRY_RUN ? "found" : "merged"}`);
  console.log(`   ${deleted} duplicate records ${DRY_RUN ? "would be" : ""} removed`);
  if (skipped) console.log(`   ${skipped} skipped due to errors`);

  // Final count
  const { count } = await supabase.from("products").select("*", { count: "exact", head: true });
  console.log(`   ${count} total products remaining\n`);
}

main().catch(console.error);
