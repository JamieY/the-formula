/**
 * Import skincare product data from the SkinSort Kaggle dataset.
 * Run with: node scripts/import-skinsort.mjs
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

const CSV_PATH = "/Users/yacherj/Downloads/datasheet.csv";

function parseCSV(content) {
  const lines = content.split("\n").filter((l) => l.trim());
  const headers = lines[0].split(",");
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const fields = [];
    let current = "";
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        if (inQuotes && line[j + 1] === '"') { current += '"'; j++; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    fields.push(current);

    const row = Object.fromEntries(headers.map((h, idx) => [h.trim(), (fields[idx] || "").trim()]));
    rows.push(row);
  }
  return rows;
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function main() {
  console.log("\n🌿 Importing SkinSort dataset...\n");

  const content = readFileSync(CSV_PATH, "utf-8");
  const rows = parseCSV(content);

  console.log(`  Parsed ${rows.length} rows`);

  // Filter rows with valid ingredients
  const valid = rows.filter((r) => {
    const ing = r["ingridients"] || r["ingredients"] || "";
    return r.brand && r.name && ing.length > 20 && ing.includes(",");
  });

  console.log(`  ${valid.length} rows with valid ingredients\n`);

  let inserted = 0;
  let failed = 0;

  // Upsert in batches of 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    const batch = valid.slice(i, i + BATCH_SIZE).map((r) => {
      const ingredients = r["ingridients"] || r["ingredients"] || null;
      const handle = slugify(`${r.brand}-${r.name}`);
      return {
        name: r.name,
        brand: r.brand,
        ingredients,
        source_name: "SkinSort",
        external_id: `skinsort-${handle}`,
      };
    });

    const { error } = await supabase
      .from("products")
      .upsert(batch, { onConflict: "external_id" });

    if (error) {
      console.log(`  ✗ Batch ${i / BATCH_SIZE + 1} error:`, error.message);
      failed += batch.length;
    } else {
      inserted += batch.length;
    }

    if (i % 2000 === 0) {
      console.log(`  [${i}/${valid.length}] ${inserted} inserted so far...`);
    }
  }

  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .not("ingredients", "is", null);

  console.log(`\n✅ Done!`);
  console.log(`   ${inserted} products imported from SkinSort`);
  console.log(`   ${failed} failed`);
  console.log(`   ${count} total products in DB with ingredients`);
}

main().catch(console.error);
