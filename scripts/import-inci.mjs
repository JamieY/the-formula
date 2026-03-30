/**
 * Import ingredient reference data from the amaboh INCI Kaggle dataset.
 * Populates the ingredient_info table — powers the "click an ingredient" detail feature.
 *
 * Dataset: https://www.kaggle.com/datasets/amaboh/skin-care-product-ingredients-inci-list
 * Download the CSV and save to: ~/Downloads/inci-ingredients.csv
 *
 * Run with: node scripts/import-inci.mjs
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

const CSV_PATH = `${process.env.HOME}/Downloads/inci-ingredients.csv.csv`;

function parseCSV(content) {
  // Parse character-by-character to correctly handle multi-line quoted fields
  const fields = [];
  const rows = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '"') {
      if (inQuotes && content[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else if ((ch === "\n" || (ch === "\r" && content[i + 1] === "\n")) && !inQuotes) {
      if (ch === "\r") i++; // skip \n after \r
      fields.push(current);
      current = "";
      if (fields.some((f) => f.trim())) rows.push([...fields]);
      fields.length = 0;
    } else {
      current += ch;
    }
  }
  if (current || fields.length) { fields.push(current); rows.push([...fields]); }

  const headers = rows[0].map((h) => h.trim().replace(/^"|"$/g, ""));
  return rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] || "").trim()])));
}

async function main() {
  console.log("\n🧪 Importing INCI ingredient reference data...\n");

  const content = readFileSync(CSV_PATH, "utf-8");
  const rows = parseCSV(content);
  console.log(`  Parsed ${rows.length} rows`);
  console.log(`  Columns: ${Object.keys(rows[0]).join(", ")}\n`);

  const valid = rows.filter((r) => r.name && r.name.length > 1);
  console.log(`  ${valid.length} rows with valid ingredient names\n`);

  // Deduplicate by name (keep first occurrence)
  const seen = new Set();
  const deduped = valid.filter((r) => {
    const key = r.name.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  console.log(`  ${deduped.length} unique ingredient names\n`);

  let inserted = 0;
  let failed = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
    const batch = deduped.slice(i, i + BATCH_SIZE).map((r) => ({
      name:            r.name.toLowerCase().trim(),
      scientific_name: r.scientific_name || null,
      what_is_it:      r.what_is_it || null,
      what_does_it_do: r.what_does_it_do || null,
      good_for:        r.who_is_it_good_for || null,
      avoid_if:        r.who_should_avoid || null,
    }));

    const { error } = await supabase
      .from("ingredient_info")
      .upsert(batch, { onConflict: "name" });

    if (error) {
      console.log(`  ✗ Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
      failed += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  const { count } = await supabase
    .from("ingredient_info")
    .select("*", { count: "exact", head: true });

  console.log("✅ Done!");
  console.log(`   ${inserted} ingredients imported`);
  if (failed > 0) console.log(`   ${failed} failed`);
  console.log(`   ${count} total ingredients in DB`);
}

main().catch(console.error);
