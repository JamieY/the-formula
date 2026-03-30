export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  moisturizer: [
    "moisturizer", "moisturising", "moisturizing", "cream", "lotion",
    "hydrating", "hydration", "hydro", "hydra",
    "gel cream", "daily face", "face oil", "facial oil", "balm", "butter",
    // Moisturizing masks worn like a moisturizer — belong in both categories
    "sleeping mask", "sleep mask", "overnight mask", "hydrating mask", "moisturizing mask",
  ],
  cleanser: ["cleanser", "cleansing", "face wash", "facial wash", "foaming wash", "gel wash", "micellar", "cleanse", "makeup remover", "scrub"],
  serum: ["serum", "essence", "ampoule", "booster", "concentrate", "drops"],
  toner: ["toner", "toning", "mist", "prep", "softener"],
  sunscreen: ["sunscreen", "spf", "sun protection", "sunblock", "broad spectrum"],
  eye: ["eye cream", "eye gel", "eye serum", "eye treatment", "eye"],
  mask: [
    // Treatment/rinse-off masks — not the same as a moisturizer
    "masque", "sheet mask", "clay mask", "peel off", "peel-off",
    "charcoal mask", "mud mask", "exfoliating mask", "purifying mask",
    // Leave-on masks that also count as moisturizer
    "sleeping mask", "sleep mask", "overnight mask", "hydrating mask", "moisturizing mask",
    // Bare "mask" catches everything else (database is skincare-only so no surgical masks)
    "mask",
  ],
  retinol: ["retinol", "retinoid", "retinal", "tretinoin", "retin-a"],
  prescription: ["prescription", "tretinoin", "clindamycin", "adapalene", "benzoyl", "tazarotene", "spironolactone"],
};

export const CATEGORY_LABELS: Record<string, string> = {
  moisturizer: "Moisturizer",
  cleanser: "Cleanser",
  serum: "Serum",
  toner: "Toner",
  sunscreen: "SPF / Sunscreen",
  eye: "Eye Cream",
  mask: "Face Mask",
  retinol: "Retinol",
  prescription: "Prescription",
};

export function getProductCategories(name: string): string[] {
  const lower = name.toLowerCase();
  return Object.entries(CATEGORY_KEYWORDS)
    .filter(([, keywords]) => keywords.some((kw) => lower.includes(kw)))
    .map(([key]) => key);
}

export function matchesCategory(name: string, category: string): boolean {
  if (!category) return true;
  const keywords = CATEGORY_KEYWORDS[category];
  if (!keywords) return true;
  return keywords.some((kw) => name.toLowerCase().includes(kw));
}
