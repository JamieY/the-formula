/**
 * Import ingredient data from Open Beauty Facts bulk CSV dump.
 * Matches products in our DB by name+brand and fills in missing ingredients.
 * Run with: node scripts/import-obf.mjs
 *
 * OBF dump: https://world.openbeautyfacts.org/data/en.openbeautyfacts.org.products.csv.gz
 */

import { readFileSync, createWriteStream, existsSync } from "fs";
import { createGunzip } from "zlib";
import { pipeline } from "stream/promises";
import { createClient } from "@supabase/supabase-js";
import https from "https";
import path from "path";

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

const DUMP_URL = "https://world.openbeautyfacts.org/data/en.openbeautyfacts.org.products.csv.gz";
const DUMP_GZ = "/tmp/obf-products.csv.gz";
const DUMP_CSV = "/tmp/obf-products.csv";

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(str) {
  return new Set(normalize(str).split(" ").filter((w) => w.length > 2));
}

function nameSimilarity(a, b) {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  const intersection = [...ta].filter((w) => tb.has(w)).length;
  return intersection / Math.max(ta.size, tb.size);
}

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    https.get(url, { headers: { "User-Agent": "TheFormula/1.0" } }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const total = parseInt(res.headers["content-length"] || "0", 10);
      let downloaded = 0;
      res.on("data", (chunk) => {
        downloaded += chunk.length;
        if (total > 0) {
          const pct = Math.round((downloaded / total) * 100);
          process.stdout.write(`\r  Downloading OBF dump... ${pct}%`);
        }
      });
      res.pipe(file);
      file.on("finish", () => { file.close(); console.log(""); resolve(); });
    }).on("error", reject);
  });
}

async function decompressGz(src, dest) {
  const { createReadStream } = await import("fs");
  const gunzip = createGunzip();
  const input = createReadStream(src);
  const output = createWriteStream(dest);
  console.log("  Decompressing...");
  await pipeline(input, gunzip, output);
}

// Parse one CSV line respecting quoted fields
function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "\t" && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

async function buildOBFIndex() {
  const { createReadStream } = await import("fs");
  const readline = await import("readline");

  console.log("  Building OBF index...");
  const rl = readline.createInterface({ input: createReadStream(DUMP_CSV), crlfDelay: Infinity });

  let headers = null;
  const index = []; // { name, brands, ingredients_text }
  let lineCount = 0;

  for await (const line of rl) {
    lineCount++;
    if (lineCount === 1) {
      headers = line.split("\t");
      continue;
    }

    const fields = parseCSVLine(line);
    const row = Object.fromEntries(headers.map((h, i) => [h, fields[i] || ""]));

    const name = row["product_name_en"] || row["product_name"] || "";
    const brands = row["brands"] || "";
    // Prefer English ingredients; skip if only non-English is available
    const ingredients = row["ingredients_text_en"] || "";

    if (name && ingredients && ingredients.length > 30 && ingredients.includes(",")) {
      index.push({ name: normalize(name), brands: normalize(brands), rawBrands: brands, rawName: name, ingredients });
    }

    if (lineCount % 50000 === 0) {
      process.stdout.write(`\r  Indexed ${lineCount.toLocaleString()} OBF rows, ${index.length.toLocaleString()} with ingredients...`);
    }
  }
  console.log(`\r  Indexed ${lineCount.toLocaleString()} OBF rows, ${index.length.toLocaleString()} with ingredients.`);
  return index;
}

// Skincare brands to import from OBF — normalized (lowercase, no spaces)
const TARGET_BRANDS = new Set([
  "avene", "avène",
  "larochposay", "larocheposay",
  "bioderma",
  "vichy",
  "uriage",
  "nuxe",
  "embryolisse",
  "caudalie",
  "svr",
  "ducray",
  "roche posay",
  "cerave",
  "neutrogena",
  "eucerin",
  "nivea",
  "clinique",
  "origins",
  "kiehl",
  "kiehls",
  "paula's choice",
  "paulaschoice",
  "theordinary",
  "the ordinary",
  "inkey",
  "cosrx",
  "dermalogica",
  "murad",
  "peter thomas roth",
  "tatcha",
  "drunk elephant",
  "first aid beauty",
  "belif",
  "laneige",
  "innisfree",
  "some by mi",
  "beauty of joseon",
  "iunik",
  "torriden",
  "round lab",
  "isntree",
  "axis y",
  "abib",
  // Added from Reddit brand gap scan
  "cetaphil",
  "aderma", "a-derma",
  "aveeno",
  "manyo", "ma:nyo", "manyo factory",
  "purito",
  "illiyoon",
  "eltamd", "elta md",
  "supergoop",
  "good molecules",
  "tower 28", "tower28",
  "shiseido",
  "dr jart", "dr. jart",
  "klairs", "dear klairs",
  "elf", "e.l.f.",
  "mixsoon",
  "stridex",
  "olay",
  "aveeno",
  "aquaphor",
  "drunk elephant",
]);

function matchesTargetBrand(brandsStr) {
  if (!brandsStr) return false;
  const lower = brandsStr.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const brand of TARGET_BRANDS) {
    const norm = brand.replace(/[^a-z0-9]/g, "");
    if (lower.includes(norm)) return true;
  }
  return false;
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function main() {
  // Step 1: Download the dump if not cached
  if (!existsSync(DUMP_GZ)) {
    console.log("\n📥 Downloading Open Beauty Facts dump...");
    await downloadFile(DUMP_URL, DUMP_GZ);
  } else {
    console.log("\n📦 Using cached OBF dump.");
  }

  // Step 2: Decompress
  if (!existsSync(DUMP_CSV)) {
    await decompressGz(DUMP_GZ, DUMP_CSV);
  }

  // Step 3: Build index
  const obfIndex = await buildOBFIndex();

  // Step 4: Insert new products from target brands
  console.log(`\n🏪 Filtering for target brands...\n`);

  const toInsert = obfIndex
    .filter((r) => matchesTargetBrand(r.brands))
    .map((r) => ({
      name: r.rawName,
      brand: r.rawBrands.split(",")[0].trim(),
      ingredients: r.ingredients,
      source_name: "Open Beauty Facts",
      external_id: `obf-${slugify(r.brands + "-" + r.name).slice(0, 80)}`,
    }))
    .filter((r) => r.name && r.brand && r.ingredients);

  // Deduplicate by external_id within this batch
  const seen = new Set();
  const deduped = toInsert.filter((r) => {
    if (seen.has(r.external_id)) return false;
    seen.add(r.external_id);
    return true;
  });

  console.log(`  ${deduped.length} target-brand products to upsert\n`);

  let inserted = 0;
  let failed = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
    const batch = deduped.slice(i, i + BATCH_SIZE);
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
      console.log(`  [${i}/${deduped.length}] ${inserted} inserted so far...`);
    }
  }

  // Step 5: Also fill in missing ingredients for existing products
  const { data: products } = await supabase
    .from("products")
    .select("id, name, brand")
    .is("ingredients", null);

  let matched = 0;
  let updated = 0;

  if (products?.length) {
    console.log(`\n🔍 Filling ingredients for ${products.length} existing products...\n`);
    for (const p of products) {
      const normName = normalize(p.name);
      const normBrand = normalize(p.brand || "");
      let bestScore = 0;
      let bestIngredients = null;

      for (const obf of obfIndex) {
        if (normBrand && obf.brands) {
          const brandMatch = obf.brands.includes(normBrand) || normBrand.split(" ").some((w) => w.length > 3 && obf.brands.includes(w));
          if (!brandMatch) continue;
        }
        const score = nameSimilarity(normName, obf.name);
        if (score > bestScore) { bestScore = score; bestIngredients = obf.ingredients; }
      }

      if (bestScore >= 0.6 && bestIngredients) {
        matched++;
        const { error: updateError } = await supabase
          .from("products")
          .update({ ingredients: bestIngredients })
          .eq("id", p.id);
        if (!updateError) updated++;
      }
    }
  }

  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .not("ingredients", "is", null);

  console.log(`\n✅ Done!`);
  console.log(`   ${inserted} new products inserted from target brands`);
  if (failed > 0) console.log(`   ${failed} failed`);
  console.log(`   ${updated} existing products filled with ingredients`);
  console.log(`   ${count} total products in DB with ingredients`);
}

main().catch(console.error);
