export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  moisturizer: ["moisturizer", "moisturising", "moisturizing", "cream", "lotion", "hydrating", "hydration", "hydro", "gel cream", "daily face", "face oil", "facial oil", "balm", "butter"],
  cleanser: ["cleanser", "cleansing", "face wash", "facial wash", "foaming wash", "gel wash", "micellar", "cleanse", "makeup remover", "scrub"],
  serum: ["serum", "essence", "ampoule", "booster", "concentrate", "drops"],
  toner: ["toner", "toning", "mist", "prep", "softener"],
  sunscreen: ["sunscreen", "spf", "sun protection", "sunblock", "broad spectrum"],
  eye: ["eye cream", "eye gel", "eye serum", "eye treatment", "eye"],
  mask: ["mask", "masque", "sheet mask", "clay mask", "peel off", "sleeping mask"],
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
  mask: "Mask",
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
