-- Adds confidence metadata to product_tags and relabels the 441 gold set.
-- Run in the Supabase SQL editor before running bulk-tag-products.mjs.

-- 1. New confidence columns
ALTER TABLE product_tags ADD COLUMN IF NOT EXISTS tag_confidence  integer;
ALTER TABLE product_tags ADD COLUMN IF NOT EXISTS confidence_tier text;

-- 2. Promote the existing 441 gold-manual tags.
--    They were imported as 'gold_500'; relabel them as 'gold_manual' and give
--    them the highest possible confidence (they were human-reviewed).
UPDATE product_tags
SET
  tag_source      = 'gold_manual',
  tag_confidence  = 95,
  confidence_tier = 'high'
WHERE tag_source IN ('gold_500', 'gold_manual') OR tag_source IS NULL;

-- 3. Index for fast confidence-tier lookups (used in tiered serving logic)
CREATE INDEX IF NOT EXISTS product_tags_confidence_tier_idx ON product_tags (confidence_tier);
