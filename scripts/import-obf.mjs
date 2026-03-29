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

    const name = row["product_name"] || row["product_name_en"] || "";
    const brands = row["brands"] || "";
    const ingredients = row["ingredients_text"] || row["ingredients_text_en"] || "";

    if (name && ingredients && ingredients.length > 30 && ingredients.includes(",")) {
      index.push({ name: normalize(name), brands: normalize(brands), ingredients });
    }

    if (lineCount % 50000 === 0) {
      process.stdout.write(`\r  Indexed ${lineCount.toLocaleString()} OBF rows, ${index.length.toLocaleString()} with ingredients...`);
    }
  }
  console.log(`\r  Indexed ${lineCount.toLocaleString()} OBF rows, ${index.length.toLocaleString()} with ingredients.`);
  return index;
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

  // Step 4: Load our products missing ingredients
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, brand")
    .is("ingredients", null);

  if (error) { console.error("DB error:", error.message); process.exit(1); }

  console.log(`\n🔍 Matching ${products.length} products against ${obfIndex.length.toLocaleString()} OBF entries...\n`);

  let matched = 0;
  let updated = 0;

  for (const p of products) {
    const normName = normalize(p.name);
    const normBrand = normalize(p.brand || "");

    // Find best OBF match: brand must match reasonably, name must be similar
    let bestScore = 0;
    let bestIngredients = null;

    for (const obf of obfIndex) {
      // Quick brand pre-filter
      if (normBrand && obf.brands) {
        const brandMatch = obf.brands.includes(normBrand) || normBrand.split(" ").some((w) => w.length > 3 && obf.brands.includes(w));
        if (!brandMatch) continue;
      }

      const score = nameSimilarity(normName, obf.name);
      if (score > bestScore) {
        bestScore = score;
        bestIngredients = obf.ingredients;
      }
    }

    // Threshold: 0.6 similarity = decent match
    if (bestScore >= 0.6 && bestIngredients) {
      matched++;
      const { error: updateError } = await supabase
        .from("products")
        .update({ ingredients: bestIngredients })
        .eq("id", p.id);
      if (!updateError) updated++;
    }
  }

  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .not("ingredients", "is", null);

  console.log(`\n✅ Done!`);
  console.log(`   ${matched} products matched in OBF`);
  console.log(`   ${updated} products updated in DB`);
  console.log(`   ${count} total products in DB with ingredients`);
}

main().catch(console.error);
