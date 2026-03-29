/**
 * Scrape product images from Open Graph meta tags on product pages.
 * Targets all products missing images that have a source_url.
 * Run with: node scripts/scrape-images.mjs
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

function extractOgImage(html) {
  // Try og:image first
  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogMatch) return ogMatch[1];

  // Fallback: twitter:image
  const twitterMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
  if (twitterMatch) return twitterMatch[1];

  return null;
}

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    // Only read first 10KB — og:image is always in <head>
    const reader = res.body.getReader();
    let html = "";
    while (html.length < 10000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += new TextDecoder().decode(value);
    }
    reader.cancel();
    return html;
  } catch {
    return null;
  }
}

async function main() {
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, brand, source_url")
    .is("image", null)
    .not("source_url", "is", null);

  if (error) { console.error("DB error:", error.message); process.exit(1); }

  console.log(`\n🖼️  Scraping images for ${products.length} products...\n`);

  let found = 0;
  let notFound = 0;
  let failed = 0;

  const BATCH_SIZE = 5;
  const DELAY_MS = 300;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];

    if (i % 50 === 0) {
      console.log(`  [${i}/${products.length}] ✓ ${found} images found so far...`);
    }

    const html = await fetchPage(p.source_url);
    if (!html) { failed++; continue; }

    const image = extractOgImage(html);
    if (image) {
      const { error: updateError } = await supabase
        .from("products")
        .update({ image })
        .eq("id", p.id);
      if (!updateError) found++;
    } else {
      notFound++;
    }

    if (i % BATCH_SIZE === BATCH_SIZE - 1) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .not("image", "is", null);

  console.log(`\n✅ Done!`);
  console.log(`   ${found} images scraped and saved`);
  console.log(`   ${notFound} pages had no og:image`);
  console.log(`   ${failed} pages failed to load`);
  console.log(`   ${count} total products in DB with images`);
}

main().catch(console.error);
