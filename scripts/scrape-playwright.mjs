/**
 * Playwright-based ingredient scraper for JS-rendered product pages.
 * Handles brands that load ingredients via JavaScript tabs/accordions.
 * Run with: node scripts/scrape-playwright.mjs
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

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

function extractIngredients(text) {
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
    let raw = text.substring(start, start + 3000).trim();

    const stopPatterns = [
      /\n\s*[A-Z][A-Z\s]{4,}:/,
      /how to use/i,
      /directions:/i,
      /warnings?:/i,
      /caution:/i,
      /manufactured by/i,
      /distributed by/i,
      /\*these statements/i,
      /free from/i,
      /dermatologist tested/i,
      /\bshop\b/i,
      /add to (bag|cart)/i,
    ];

    for (const stop of stopPatterns) {
      const m = raw.search(stop);
      if (m > 40) { raw = raw.substring(0, m); break; }
    }

    raw = raw.trim();
    if (raw.length > 30 && raw.includes(",")) return raw;
  }

  return null;
}

// Tab/button selectors to try clicking for ingredient content
const INGREDIENT_TAB_SELECTORS = [
  "button:has-text('Ingredients')",
  "button:has-text('Full Ingredients')",
  "button:has-text('Ingredient List')",
  "button:has-text('INGREDIENTS')",
  "a:has-text('Ingredients')",
  "[data-tab='ingredients']",
  "[data-target*='ingredient']",
  "[aria-controls*='ingredient']",
  ".accordion-trigger:has-text('Ingredient')",
  ".tab:has-text('Ingredient')",
  "li:has-text('Ingredients') button",
  "summary:has-text('Ingredients')",
  "summary:has-text('Ingredient')",
];

async function scrapeWithPlaywright(page, url) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1500);

    // Try clicking ingredient tabs/buttons
    for (const selector of INGREDIENT_TAB_SELECTORS) {
      try {
        const el = page.locator(selector).first();
        if (await el.isVisible({ timeout: 500 })) {
          await el.click();
          await page.waitForTimeout(800);
          break;
        }
      } catch {
        // selector not found, try next
      }
    }

    // Get the full page text after any JS has run
    const html = await page.content();
    const text = stripHtml(html);
    return extractIngredients(text);
  } catch {
    return null;
  }
}

async function main() {
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, brand, source_url")
    .is("ingredients", null)
    .not("source_url", "is", null);

  if (error) { console.error("DB error:", error.message); process.exit(1); }

  console.log(`\n🎭 Playwright scraping ingredients for ${products.length} products...\n`);

  const CONCURRENCY = 3;
  let found = 0;
  let notFound = 0;
  let failed = 0;

  const browser = await chromium.launch({ headless: true });

  // Process in parallel batches
  for (let i = 0; i < products.length; i += CONCURRENCY) {
    const batch = products.slice(i, i + CONCURRENCY);

    if (i % 30 === 0) {
      console.log(`  [${i}/${products.length}] ✓ ${found} found so far...`);
    }

    await Promise.all(batch.map(async (p) => {
      const context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
      });
      const page = await context.newPage();

      // Block images, fonts, media to speed up loading
      await page.route("**/*", (route) => {
        const type = route.request().resourceType();
        if (["image", "font", "media"].includes(type)) {
          route.abort();
        } else {
          route.continue();
        }
      });

      try {
        const ingredients = await scrapeWithPlaywright(page, p.source_url);
        if (ingredients) {
          const { error: updateError } = await supabase
            .from("products")
            .update({ ingredients })
            .eq("id", p.id);
          if (!updateError) found++;
          else notFound++;
        } else {
          notFound++;
        }
      } catch {
        failed++;
      } finally {
        await context.close();
      }
    }));

    // Small delay between batches
    await new Promise((r) => setTimeout(r, 300));
  }

  await browser.close();

  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .not("ingredients", "is", null);

  console.log(`\n✅ Done!`);
  console.log(`   ${found} new ingredients scraped`);
  console.log(`   ${notFound} pages had no ingredient data`);
  console.log(`   ${failed} pages failed`);
  console.log(`   ${count} total products in DB with ingredients`);
}

main().catch(console.error);
