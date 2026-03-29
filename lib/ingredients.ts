// Ingredient analysis database

export interface IngredientFlag {
  type: "fa_trigger" | "comedogenic" | "irritant" | "beneficial";
  reason: string;
}

// Fungal acne (Malassezia) triggers
const FA_TRIGGERS: string[] = [
  "lauric acid", "myristic acid", "palmitic acid", "stearic acid", "oleic acid",
  "linoleic acid", "laureth", "myreth", "polysorbate", "sodium lauryl sulfate",
  "sodium laureth sulfate", "sls", "sles", "cetearyl alcohol", "cetyl alcohol",
  "stearyl alcohol", "isopropyl myristate", "isopropyl palmitate", "glyceryl stearate",
  "sorbitan", "fatty acid", "fatty alcohol", "triglyceride", "caprylic",
  "capric triglyceride", "glycol stearate", "peg-", "butyrospermum parkii",
  "shea butter", "cocos nucifera", "coconut oil", "helianthus annuus", "sunflower oil",
  "argania spinosa", "argan oil", "simmondsia chinensis", "jojoba",
  "persea gratissima", "avocado oil", "olea europaea", "olive oil",
  "theobroma cacao", "cocoa butter", "mangifera indica", "mango butter",
];

// Comedogenic ingredients (commonly clog pores, rating 3-5)
const COMEDOGENIC: string[] = [
  "isopropyl myristate", "isopropyl palmitate", "isopropyl isostearate",
  "coconut oil", "cocos nucifera", "wheat germ oil", "flaxseed oil",
  "linseed oil", "acetylated lanolin", "lanolin alcohol", "myristyl myristate",
  "octyl stearate", "octyl palmitate", "isostearyl neopentanoate",
  "coal tar", "sodium lauryl sulfate", "laureth-4",
  "d & c red", "algae extract", "carrageenan",
];

// Common irritants / sensitizers
const IRRITANTS: string[] = [
  "fragrance", "parfum", "alcohol denat", "denatured alcohol", "sd alcohol",
  "benzyl alcohol", "cinnamal", "cinnamyl alcohol", "eugenol", "isoeugenol",
  "linalool", "limonene", "geraniol", "citronellol", "farnesol", "coumarin",
  "oak moss", "tree moss", "methylisothiazolinone", "mit", "methylchloroisothiazolinone",
  "formaldehyde", "quaternium-15", "dmdm hydantoin", "imidazolidinyl urea",
  "sodium lauryl sulfate", "menthol", "peppermint", "eucalyptus",
  "witch hazel", "camphor", "tea tree", "melaleuca",
];

// Beneficial ingredients
const BENEFICIAL: Record<string, string> = {
  "niacinamide": "Brightening, pore-minimizing",
  "hyaluronic acid": "Deep hydration",
  "sodium hyaluronate": "Deep hydration",
  "ceramide": "Barrier repair",
  "ceramide np": "Barrier repair",
  "ceramide ap": "Barrier repair",
  "ceramide eop": "Barrier repair",
  "retinol": "Anti-aging, cell turnover",
  "retinyl palmitate": "Mild vitamin A",
  "ascorbic acid": "Vitamin C — brightening",
  "vitamin c": "Brightening, antioxidant",
  "tocopherol": "Vitamin E — antioxidant",
  "vitamin e": "Antioxidant",
  "glycerin": "Humectant — draws moisture",
  "panthenol": "Soothing, moisturizing",
  "allantoin": "Soothing, skin-softening",
  "centella asiatica": "Calming, wound-healing",
  "madecassoside": "Calming, barrier support",
  "azelaic acid": "Anti-acne, brightening",
  "salicylic acid": "Exfoliating, anti-acne",
  "glycolic acid": "Chemical exfoliant",
  "lactic acid": "Gentle exfoliant, hydrating",
  "tranexamic acid": "Brightening, hyperpigmentation",
  "peptide": "Firming, anti-aging",
  "collagen": "Moisturizing",
  "adenosine": "Anti-aging, firming",
  "green tea": "Antioxidant, calming",
  "camellia sinensis": "Green tea — antioxidant",
  "resveratrol": "Antioxidant",
  "ferulic acid": "Antioxidant, stabilizes vitamin c",
  "zinc": "Anti-inflammatory, acne-fighting",
  "sulfur": "Anti-acne",
  "kojic acid": "Brightening",
  "arbutin": "Brightening",
  "alpha arbutin": "Brightening",
};

export interface AnalyzedIngredient {
  name: string;
  flags: IngredientFlag[];
}

export interface ProductAnalysis {
  ingredients: AnalyzedIngredient[];
  isFASafe: boolean;
  isFragranceFree: boolean;
  isAlcoholFree: boolean;
  comedogenicCount: number;
  irritantCount: number;
  beneficialCount: number;
}

function containsAny(text: string, list: string[]): string | null {
  const lower = text.toLowerCase();
  for (const item of list) {
    if (lower.includes(item.toLowerCase())) return item;
  }
  return null;
}

function preprocessIngredients(text: string): string {
  // Find where the actual ingredient list starts — skip label claims and OCR artifacts
  const markers = [
    "ingredients:", "ingredients :", "inci:", "composition:", "ingrédients:",
    "ingr.:", "ingr:", "contains:", "active ingredients:", "inactive ingredients:",
  ];
  const lower = text.toLowerCase();
  for (const marker of markers) {
    const idx = lower.indexOf(marker);
    if (idx !== -1) {
      text = text.substring(idx + marker.length);
      break;
    }
  }

  // Strip common OCR / label noise before the list
  text = text
    .replace(/\d+(\.\d+)?%[^,]*/g, "") // "0% preservative" type claims
    .replace(/\b(conservateur|preservative|frogrance|fragrance\s*free|parfum\s*free)\s*0%/gi, "")
    .replace(/\b(sans|free\s*of|without)\b[^,]{0,30}/gi, "")
    .replace(/\*[^,]{0,60}/g, "") // asterisk footnotes
    .replace(/\([^)]{0,80}\)/g, "") // parenthetical notes
    .replace(/[\[\]]/g, "")
    .trim();

  return text;
}

export function analyzeIngredients(ingredientsText: string): ProductAnalysis {
  const cleaned = preprocessIngredients(ingredientsText);

  // Split by comma, clean up each ingredient
  const raw = cleaned
    .split(/,|;/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 80); // skip suspiciously long "ingredients" (OCR garbage)

  const analyzed: AnalyzedIngredient[] = raw.map((name) => {
    const flags: IngredientFlag[] = [];
    const lower = name.toLowerCase();

    // Check FA triggers
    for (const trigger of FA_TRIGGERS) {
      if (lower.includes(trigger.toLowerCase())) {
        flags.push({ type: "fa_trigger", reason: "Fungal acne trigger" });
        break;
      }
    }

    // Check comedogenic
    for (const c of COMEDOGENIC) {
      if (lower.includes(c.toLowerCase())) {
        flags.push({ type: "comedogenic", reason: "May clog pores" });
        break;
      }
    }

    // Check irritants
    for (const irritant of IRRITANTS) {
      if (lower.includes(irritant.toLowerCase())) {
        flags.push({ type: "irritant", reason: irritant === "fragrance" || irritant === "parfum" ? "Fragrance — common irritant" : "Potential irritant" });
        break;
      }
    }

    // Check beneficial
    for (const [key, benefit] of Object.entries(BENEFICIAL)) {
      if (lower.includes(key.toLowerCase())) {
        flags.push({ type: "beneficial", reason: benefit });
        break;
      }
    }

    return { name, flags };
  });

  const hasTrigger = analyzed.some((i) => i.flags.some((f) => f.type === "fa_trigger"));
  const hasFragrance = analyzed.some((i) =>
    i.name.toLowerCase().includes("fragrance") || i.name.toLowerCase().includes("parfum")
  );
  const hasAlcohol = analyzed.some((i) =>
    i.name.toLowerCase().includes("alcohol denat") ||
    i.name.toLowerCase().includes("denatured alcohol") ||
    i.name.toLowerCase().includes("sd alcohol")
  );

  return {
    ingredients: analyzed,
    isFASafe: !hasTrigger,
    isFragranceFree: !hasFragrance,
    isAlcoholFree: !hasAlcohol,
    comedogenicCount: analyzed.filter((i) => i.flags.some((f) => f.type === "comedogenic")).length,
    irritantCount: analyzed.filter((i) => i.flags.some((f) => f.type === "irritant")).length,
    beneficialCount: analyzed.filter((i) => i.flags.some((f) => f.type === "beneficial")).length,
  };
}
