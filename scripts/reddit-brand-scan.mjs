/**
 * Scan Reddit skincare communities for brand mentions and identify gaps in our DB.
 * Outputs a frequency-sorted list of brands mentioned on Reddit that we don't have products for.
 *
 * Uses Reddit's public JSON API (no auth required for public subreddits).
 * Run with: node scripts/reddit-brand-scan.mjs
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

const SUBREDDITS = [
  "SkincareAddiction",
  "30PlusSkinCare",
  "beauty",
  "IndianSkincareAddicts",
  "SkincareAddicts",
];

// Comprehensive skincare brand list to scan for
const KNOWN_BRANDS = [
  // Pharmacy / drugstore
  "CeraVe", "La Roche-Posay", "Neutrogena", "Eucerin", "Aveeno", "Olay",
  "Nivea", "Cetaphil", "Vanicream", "Free & Clear", "Aquaphor",
  // French pharmacy
  "Avène", "Avene", "Bioderma", "Vichy", "Uriage", "Nuxe", "Embryolisse",
  "Caudalie", "SVR", "Ducray", "A-Derma", "Eau Thermale",
  // Prestige / department store
  "Clinique", "Estée Lauder", "Lancôme", "Shiseido", "SK-II", "Tatcha",
  "Sunday Riley", "Drunk Elephant", "Kiehl's", "Origins", "Fresh",
  "Peter Thomas Roth", "Dermalogica", "Murad", "Perricone MD",
  "Dr. Dennis Gross", "Tula", "Farmacy", "Glow Recipe", "Summer Fridays",
  "Laneige", "Sulwhasoo", "Innisfree", "Belif", "Banila Co",
  // Clean / indie
  "Versed", "Byoma", "e.l.f.", "Naturium", "Good Molecules", "The Inkey List",
  "INKEY List", "Paula's Choice", "Paulas Choice", "First Aid Beauty",
  "Youth to the People", "Herbivore", "Kopari", "Alpyn Beauty",
  "Cocokind", "Acure", "Burt's Bees",
  // K-beauty
  "COSRX", "Some By Mi", "Beauty of Joseon", "iUNIK", "Torriden",
  "Round Lab", "Isntree", "Axis-Y", "Abib", "Anua", "Purito",
  "Klairs", "Dear Klairs", "Skin1004", "TONYMOLY", "Missha",
  "Etude House", "Holika Holika", "Heimish", "Dr. Jart+", "Mediheal",
  "Pyunkang Yul", "Rovectin", "Neogen", "Benton", "Papa Recipe",
  "Ma:nyo", "Manyo", "Haruharu", "Haruharu Wonder", "I'm From",
  "Mixsoon", "Nacific", "Illiyoon", "Celimax", "Skin&Lab",
  // J-beauty
  "Hada Labo", "DHC", "Rohto", "Senka", "Kose", "Shiseido", "Albion",
  "Decorté", "Pola", "Fancl", "Minon", "Curel",
  // Active / clinical
  "The Ordinary", "Ordinary", "Niacinamide", "SkinCeuticals", "Obagi",
  "ZO Skin Health", "iS Clinical", "Revision Skincare", "EltaMD",
  "Colorescience", "Supergoop", "Isdin", "Altruist",
  // Prescription / Rx adjacent
  "Tretinoin", "Differin", "Finacea", "Epiduo", "Winlevi",
  // Niche / trending
  "Clearstem", "Topicals", "Dieux", "Starface", "Selfless by Hyram",
  "Byroe", "Beekman 1802", "Tower 28", "Kinship", "Peach & Lily",
  "Peach Slices", "Krave Beauty", "Stratia", "Makeup Artist's Choice",
  "MUAC", "Stridex", "AmLactin", "Gold Bond", "ClearStem",
  "Torriden", "Skin Proud", "Revolution Skincare", "The INKEY List",
  "Bondi Sands", "Tan-Luxe", "Isle of Paradise",
];

// Normalize for matching
function normBrand(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const BRAND_NORMS = KNOWN_BRANDS.map((b) => ({ raw: b, norm: normBrand(b) }));

async function fetchRedditPosts(subreddit, after = null, limit = 100) {
  const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}${after ? `&after=${after}` : ""}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "TheFormula/1.0 (brand-gap-scanner)" },
  });
  if (!res.ok) throw new Error(`Reddit ${subreddit}: HTTP ${res.status}`);
  const data = await res.json();
  return data?.data?.children?.map((c) => c.data) || [];
}

async function fetchSubredditPosts(subreddit) {
  const posts = [];
  let after = null;

  // Fetch up to 3 pages (300 posts) per subreddit
  for (let page = 0; page < 3; page++) {
    try {
      const batch = await fetchRedditPosts(subreddit, after, 100);
      if (!batch.length) break;
      posts.push(...batch);
      after = batch[batch.length - 1]?.name;
      await new Promise((r) => setTimeout(r, 1000)); // rate limit
    } catch (e) {
      console.log(`  ⚠️  ${subreddit} page ${page + 1}: ${e.message}`);
      break;
    }
  }
  return posts;
}

function extractMentions(text) {
  if (!text) return [];
  const found = [];
  const lower = normBrand(text);
  for (const { raw, norm } of BRAND_NORMS) {
    if (lower.includes(norm)) found.push(raw);
  }
  return found;
}

async function main() {
  console.log("\n🔍 Scanning Reddit skincare communities for brand mentions...\n");

  // Step 1: Collect posts from all subreddits
  const mentionCounts = new Map(); // brand → count
  const mentionSubs = new Map();   // brand → Set of subreddits

  for (const sub of SUBREDDITS) {
    process.stdout.write(`  Fetching r/${sub}...`);
    const posts = await fetchSubredditPosts(sub);
    console.log(` ${posts.length} posts`);

    for (const post of posts) {
      const text = `${post.title || ""} ${post.selftext || ""}`;
      const brands = extractMentions(text);
      for (const brand of brands) {
        mentionCounts.set(brand, (mentionCounts.get(brand) || 0) + 1);
        if (!mentionSubs.has(brand)) mentionSubs.set(brand, new Set());
        mentionSubs.get(brand).add(sub);
      }
    }
  }

  console.log(`\n  Found ${mentionCounts.size} brands mentioned across all communities\n`);

  // Step 2: Check which brands we already have in the DB
  const { data: dbBrands } = await supabase
    .from("products")
    .select("brand");

  const dbBrandNorms = new Set(
    (dbBrands || []).map((r) => normBrand(r.brand || ""))
  );

  // Step 3: Identify gaps
  const missing = [];
  const present = [];

  for (const [brand, count] of mentionCounts.entries()) {
    const norm = normBrand(brand);
    const inDB = [...dbBrandNorms].some((db) => db.includes(norm) || norm.includes(db));
    const entry = { brand, count, subs: [...mentionSubs.get(brand)].join(", ") };
    if (inDB) present.push(entry);
    else missing.push(entry);
  }

  missing.sort((a, b) => b.count - a.count);
  present.sort((a, b) => b.count - a.count);

  // Step 4: Report
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  BRANDS MISSING FROM DB (sorted by Reddit mention count)");
  console.log("═══════════════════════════════════════════════════════════\n");

  if (missing.length === 0) {
    console.log("  ✅ No gaps found — all scanned brands are in the DB!\n");
  } else {
    for (const { brand, count, subs } of missing) {
      console.log(`  ${brand.padEnd(35)} ${String(count).padStart(4)} mentions  [${subs}]`);
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  BRANDS ALREADY IN DB");
  console.log("═══════════════════════════════════════════════════════════\n");

  for (const { brand, count } of present) {
    console.log(`  ✓ ${brand.padEnd(33)} ${String(count).padStart(4)} mentions`);
  }

  console.log(`\n📊 Summary: ${missing.length} missing, ${present.length} already covered\n`);
}

main().catch(console.error);
