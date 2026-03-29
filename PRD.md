# The Formula — Product Requirements Document

## Vision
Help people stop wasting money on skincare products that don't work for them. The Formula makes ingredient analysis effortless — whether you're shopping in a store, browsing online, or trying to find an affordable alternative to a luxury product.

---

## Current Web App (Live at mybeautyformula.com)

### Features Shipped
- **Product search** — search by brand/name, powered by Open Beauty Facts + INCIDecoder
- **Ingredient analysis** — flags acne triggers, fragrance, irritants, drying alcohols, parabens
- **My Log** — personal product tracker with status (Currently Using, Worked, Didn't Work, Want to Try), clickable cards, delete
- **Dupe Detector** — find affordable alternatives with similar ingredient formulas (Jaccard similarity scoring)
- **Product detail page** — ingredient breakdown, analysis summary, "Find a Dupe" button, Amazon affiliate link, "Report Formula Change" flag
- **Auth** — Supabase email/password auth with email confirmation handling
- **Affiliate programs** — Amazon live (tag: theformula20-20), Sephora pending, Ulta in review

### Data Infrastructure
- Supabase PostgreSQL database
- 1,500+ products from 28 Shopify skincare brands
- Ingredient scraping pipeline: static fetch → Playwright headless browser → OBF bulk import
- Open Beauty Facts integration for search + bulk import

---

## Mobile App — v1

### Hero Feature: Front-of-Bottle Photo Scan

**The use case:** User is standing in Sephora, TJ Maxx, or a friend's bathroom. They point their phone at the front of a product. Instantly they see: ingredient flags, a match score, and cheaper alternatives.

**Why this is the right hero feature:**
- Zero friction — no searching, no barcode hunting, no typing
- Works anywhere, including products not in our database
- Shareable moment — "look what this found" drives organic word of mouth
- Solves the core job-to-be-done at the point of purchase decision

**How it works:**
1. User opens app, taps the camera button
2. Points at the **front** of any skincare product
3. AI (Claude vision API) reads brand + product name from the label
4. App looks up product in database (fast, free)
5. If found → instant ingredient analysis from DB
6. If not found → AI also extracts ingredient list from the same photo (or prompts "flip to ingredient panel")
7. Results: ingredient flags, score, dupe suggestions

**Fallback flow:**
- Barcode scan as secondary option (faster for known products)
- Manual search always available

### Other v1 Features
- Full ingredient analysis (same logic as web)
- My Log (synced with web account)
- Dupe Detector
- Push notifications: "A product in your log just changed its formula"
- Home screen widget: quick scan button

### Tech Stack
- React Native (Expo) — reuses all existing API logic
- Claude vision API for photo → text extraction
- Same Supabase backend as web app

### Launch Criteria (When to Build)
- 500+ monthly active users on web version, OR
- Users actively asking "is there an app?", OR
- Ingredient DB coverage reaches 500+ products (we're at ~180 today, growing)

---

## Backlog / Future Features (v3+)

### Batch Code / Product Freshness Decoder (v3-v4)
After scanning a product, prompt the user to enter the batch code (short alphanumeric string on the bottom/back of the bottle — separate from the barcode). Decode it using brand-specific logic to show manufacture date and estimated expiry.

- Batch codes are brand-specific and not standardized — requires building a decoding database (~200+ brands)
- Reference: CheckFresh.com and CheckCosmetic.net do this today
- Build on top of existing scan UX — barcode identifies product, batch code adds freshness layer
- Suggested by friend/user as a v3-v4 feature

---

### Ingredient Education (PRD item — not yet scoped)
Clicking any ingredient in the analysis shows:
- What it does (moisturizer, preservative, exfoliant, etc.)
- Who should avoid it and why
- Common aliases / other names it appears under
- Products in our DB that contain it

**Why:** Builds trust and keeps users on the app longer. Turns a flag from "bad" into "here's why, and here's what to use instead."

### Reddit Scraper
Scrape r/SkincareAddiction, r/AsianBeauty, r/tretinoin, etc. for brand/product mentions. Auto-pull those brands into our Shopify seeding pipeline. Keeps product catalog growing organically based on what people are actually talking about.

### Expanded Retailer Data
- Sephora product feed (affiliate approval pending)
- Ulta product feed (affiliate approval in review)
- Dermstore / SkinStore (CJ Affiliate / Rakuten — apply once site has more content)

### Formula Change Alerts
When a brand updates a product's ingredient list, notify users who have it in their log. Requires periodic re-scraping of product pages to detect changes.

### Data Freshness / Ingredient Accuracy (when user base grows)
Once real users are actively using the app:
- Run a monthly re-scrape of the most-viewed products to catch reformulations
- Show a "Last verified: [date]" badge on ingredient lists so users know how fresh the data is
- Let users upvote/confirm accuracy, or flag outdated ingredient lists

Current approach: "Report Formula Change" button on every product page handles this lightweight for now. Revisit when top 500 most-searched products need regular refresh.

---

## Affiliate Revenue Model
- **Amazon** — live (tag: theformula20-20)
- **Sephora** — application pending (SID4682184)
- **Ulta** — application in review (Impact.com)
- Future: Dermstore, SkinStore, Neiman Marcus, Saks (CJ Affiliate + Rakuten)
