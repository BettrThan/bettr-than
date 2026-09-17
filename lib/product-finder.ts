import { approvedHeadphoneSpecs, headphonePresetLabels, scoreHeadphoneComparison, HEADPHONE_PUBLIC_COVERAGE_THRESHOLD, type HeadphonePresetKey } from "@/lib/headphone-specs";
import { smartphonePresets, verifiedSmartphoneSpecs, scoreSmartphoneComparison, type SmartphonePreset } from "@/lib/smartphone-specs";
import { extendedCategoryModels, verifiedExtendedSpecs, scoreExtendedComparison, type ExtendedProduct } from "@/lib/extended-category-specs";
import { isCurrentPublicComparison } from "@/lib/comparison-discovery";
import { comparisonPairKey } from "@/lib/comparison-pair";
export const finderCategories = {
  headphones: "Headphones", smartphones: "Smartphones", "portable-speakers": "Portable Speakers", "vr-headsets": "VR Headsets", wearables: "Wearables", "game-consoles": "Game Consoles"
} as const;
export type FinderCategory = keyof typeof finderCategories;
export type FinderProduct = ExtendedProduct & {
  categorySlug: string;
};
export type FinderPair = {
  id: string;
  slug: string;
  leftProductId: string;
  rightProductId: string;
  status: string;
  verdictStatus: string;
  verdictScoringVersion: string | null;
  verdictDataVersion: string | null;
};
type Requirement = {
  key: string;
  label: string;
  field: string;
  value: string | boolean;
};
export const finderRequirements: Record<FinderCategory, Requirement[]> = {
  headphones: [{
    key: "anc", label: "Noise cancellation", field: "active_noise_cancellation", value: "yes"
  }, {
    key: "multipoint", label: "Two-device connection", field: "multipoint", value: "yes"
  }, {
    key: "usb", label: "USB-C audio", field: "usb_c_audio", value: "yes"
  }],
  smartphones: [{
    key: "ios", label: "iOS", field: "operating_system", value: "iOS"
  }, {
    key: "android", label: "Android", field: "operating_system", value: "Android"
  }, {
    key: "wireless", label: "Wireless charging", field: "wireless_charging", value: true
  }],
  "portable-speakers": [{
    key: "powerbank", label: "Charges my phone", field: "powerbank", value: true
  }, {
    key: "floats", label: "Floats in water", field: "floats", value: true
  }, {
    key: "usb", label: "USB audio", field: "usb_audio", value: true
  }],
  "vr-headsets": [{
    key: "standalone", label: "Works without a PC", field: "standalone", value: true
  }, {
    key: "eye", label: "Eye tracking", field: "eye_tracking", value: true
  }, {
    key: "passthrough", label: "Color passthrough", field: "color_passthrough", value: true
  }],
  wearables: [{
    key: "ios", label: "Works with iPhone", field: "ios", value: true
  }, {
    key: "android", label: "Works with Android", field: "android", value: true
  }, {
    key: "gps", label: "Built-in GPS", field: "gps", value: true
  }, {
    key: "ring", label: "Smart ring", field: "device_type", value: "smart-ring"
  }],
  "game-consoles": [{
    key: "disc", label: "Disc drive included", field: "disc_drive", value: true
  }, {
    key: "expandable", label: "Expandable storage", field: "expandable_storage", value: true
  }, {
    key: "hybrid", label: "Hybrid console", field: "form_factor", value: "hybrid"
  }, {
    key: "pc", label: "Handheld PC", field: "form_factor", value: "handheld-pc"
  }],
};
export function isFinderCategory(value: string): value is FinderCategory { return Object.hasOwn(finderCategories, value); }
export function finderPresets(category: FinderCategory): Record<string, {
  label: string;
}> {
  if (category === "headphones")
    return Object.fromEntries(Object.entries(headphonePresetLabels).map(([key, label]) => [key, {
      label
    }]));
  if (category === "smartphones")
    return smartphonePresets;
  return extendedCategoryModels[category].presets;
}
export function finderSpecs(category: FinderCategory, product: FinderProduct): Record<string, string | number | boolean> {
  const facts = category === "headphones" ? approvedHeadphoneSpecs(product) : category === "smartphones" ? verifiedSmartphoneSpecs(product) : verifiedExtendedSpecs(category, product);
  try {
    const sources = JSON.parse(product.specProvenanceJson ?? "{}");
    return Object.fromEntries(Object.entries(facts).filter(([key, value]) => {
      const source = sources?.[key];
      const checked = Date.parse(source?.retrievedAt);
      if (source?.status !== "verified" || String(source.value) !== String(value) || !Number.isFinite(checked) || checked > Date.now() + 60000)
        return false;
      try {
        const url = new URL(source.sourceUrl);
        return url.protocol === "https:" && !url.username && !url.password;
      }
      catch {
        return false;
      }
    }));
  }
  catch {
    return {};
  }
}
type FinderPreferences = {
  preset: string;
  budget: number | null;
  requirements: string[];
};

type ProductAggregate = {
  total: number;
  count: number;
  advantages: Map<string, number>;
};

/** Adapt category-specific factor winners to product IDs for ranking. */
function scoreFinderPair(category: FinderCategory, left: FinderProduct, right: FinderProduct, preset: string) {
  if (category === "headphones") {
    const result = scoreHeadphoneComparison(left, right, preset as HeadphonePresetKey);
    return {
      scoreLeft: result.scoreLeft,
      scoreRight: result.scoreRight,
      eligible: result.availableWeight > 0 && result.coreCoveragePercent >= HEADPHONE_PUBLIC_COVERAGE_THRESHOLD,
      advantages: result.factors.map(factor => ({
        label: factor.label,
        weight: factor.weight,
        winner: factor.winner === left.slug ? left.id : factor.winner === right.slug ? right.id : null,
      })),
    };
  }

  const result = category === "smartphones"
    ? scoreSmartphoneComparison(left, right, preset as SmartphonePreset)
    : scoreExtendedComparison(category, left, right, preset);
  return {
    scoreLeft: result.scoreLeft,
    scoreRight: result.scoreRight,
    eligible: result.eligible,
    advantages: result.factors.map(factor => ({
      label: factor.label,
      weight: factor.weight,
      winner: factor.available
        ? (factor.winner === "left" ? left.id : factor.winner === "right" ? right.id : null)
        : null,
    })),
  };
}

export function rankFinderProducts(category: FinderCategory, products: FinderProduct[], pairs: FinderPair[], preferences: FinderPreferences) {
  const preset = Object.hasOwn(finderPresets(category), preferences.preset) ? preferences.preset : "balanced";
  const pool = products.filter(p => p.categorySlug === category && p.status === "published");
  const byId = new Map(pool.map(p => [p.id, p]));
  const aggregates = new Map<string, ProductAggregate>(pool.map(p => [p.id, {
    total: 0, count: 0, advantages: new Map()
  }]));
  const eligiblePairs: FinderPair[] = [];
  const seen = new Set<string>();
  for (const pair of pairs) {
    const left = byId.get(pair.leftProductId), right = byId.get(pair.rightProductId);
    const identity = comparisonPairKey(pair.leftProductId, pair.rightProductId);
    if (!left || !right || left.id === right.id || seen.has(identity) || !isCurrentPublicComparison(pair, left, right))
      continue;
    seen.add(identity);
    const { scoreLeft, scoreRight, eligible, advantages } = scoreFinderPair(category, left, right, preset);
    if (!eligible || scoreLeft === null || scoreRight === null)
      continue;
    eligiblePairs.push(pair);
    for (const [id, value] of [[left.id, scoreLeft], [right.id, scoreRight]] as const) {
      const entry = aggregates.get(id)!;
      entry.total += value;
      entry.count++;
      for (const fact of advantages)
        if (fact.winner === id)
          entry.advantages.set(fact.label, (entry.advantages.get(fact.label) ?? 0) + fact.weight);
    }
  }
  const required = preferences.requirements.map(key => finderRequirements[category].find(r => r.key === key));
  const validPreferences = required.every(Boolean) && (preferences.budget === null || Number.isFinite(preferences.budget) && preferences.budget > 0);
  const results = validPreferences ? pool.flatMap(product => {
    const facts = finderSpecs(category, product), entry = aggregates.get(product.id)!;
    const rawPrice = facts.price_usd, price = rawPrice === undefined ? null : Number(rawPrice);
    if (!entry.count || required.some(r => String(facts[r!.field]).toLowerCase() !== String(r!.value).toLowerCase()) || preferences.budget !== null && (price === null || !Number.isFinite(price) || price > preferences.budget))
      return [];
    const average = Math.round(entry.total / entry.count * 10) / 10;
    return [{
      product, referencePrice: price !== null && Number.isFinite(price) ? price : null, average, opponents: entry.count, advantages: [...entry.advantages].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([label]) => label)
    }];
  }).sort((a, b) => b.average - a.average || b.opponents - a.opponents || a.product.canonicalName.localeCompare(b.product.canonicalName)) : [];
  return {
    results, eligiblePairs, preset, poolSize: pool.length
  };
}
