import type { NormalizedFact } from "@/lib/agents/product-ingestion";

export const HEADPHONE_SCORING_VERSION = "headphones-v2.0.0";
export const HEADPHONE_PUBLIC_COVERAGE_THRESHOLD = 70;
export const NOT_APPLICABLE = "not_applicable";

export type HeadphonePresetKey = "balanced" | "travel" | "office" | "value";

export const headphonePresetLabels: Record<HeadphonePresetKey, string> = {
  balanced: "Balanced",
  travel: "Travel",
  office: "Office",
  value: "Value",
};

export type HeadphoneSpecKey =
  | "price_usd"
  | "form_factor"
  | "battery_life_hours"
  | "battery_anc_hours"
  | "active_noise_cancellation"
  | "transparency_mode"
  | "weight_grams"
  | "bluetooth_version"
  | "multipoint"
  | "wired_audio"
  | "usb_c_audio"
  | "charge_time_hours"
  | "spatial_audio"
  | "water_resistance"
  | "foldable"
  | "carrying_case";

export type HeadphoneSpecs = Partial<Record<HeadphoneSpecKey, string>>;
export type HeadphoneComparisonRule = "higher" | "lower" | "boolean" | "categorical" | "none";

export type HeadphoneFieldDefinition = {
  key: HeadphoneSpecKey;
  label: string;
  kind: "number" | "boolean" | "text";
  canonicalUnit?: string;
  unit?: string;
  placeholder?: string;
  applicability: "all_headphones";
  comparisonRule: HeadphoneComparisonRule;
  core: boolean;
  scorable: boolean;
  presetWeights: Record<HeadphonePresetKey, number>;
  meaningfulDifference?: number;
  weight?: number;
  direction?: "higher" | "lower";
};

const weights = (balanced: number, travel: number, office: number, value: number): Record<HeadphonePresetKey, number> => ({ balanced, travel, office, value });

const field = (definition: Omit<HeadphoneFieldDefinition, "unit" | "weight" | "direction">): HeadphoneFieldDefinition => ({
  ...definition,
  unit: definition.canonicalUnit,
  weight: definition.presetWeights.balanced || undefined,
  direction: definition.comparisonRule === "higher" || definition.comparisonRule === "lower" ? definition.comparisonRule : undefined,
});

export const headphoneFields: HeadphoneFieldDefinition[] = [
  field({ key: "price_usd", label: "Current price", kind: "number", canonicalUnit: "USD", placeholder: "349.99", applicability: "all_headphones", comparisonRule: "lower", core: true, scorable: true, presetWeights: weights(18, 12, 10, 35), meaningfulDifference: 5 }),
  field({ key: "form_factor", label: "Form factor", kind: "text", placeholder: "Over-ear, on-ear, or earbuds", applicability: "all_headphones", comparisonRule: "categorical", core: true, scorable: false, presetWeights: weights(0, 0, 0, 0) }),
  field({ key: "battery_life_hours", label: "Maximum battery life", kind: "number", canonicalUnit: "hours", placeholder: "30", applicability: "all_headphones", comparisonRule: "higher", core: true, scorable: true, presetWeights: weights(14, 18, 10, 10), meaningfulDifference: 1 }),
  field({ key: "battery_anc_hours", label: "Battery life with ANC", kind: "number", canonicalUnit: "hours", placeholder: "24", applicability: "all_headphones", comparisonRule: "higher", core: true, scorable: true, presetWeights: weights(10, 16, 10, 8), meaningfulDifference: 1 }),
  field({ key: "active_noise_cancellation", label: "Active noise cancellation", kind: "boolean", applicability: "all_headphones", comparisonRule: "boolean", core: true, scorable: true, presetWeights: weights(12, 16, 15, 8) }),
  field({ key: "transparency_mode", label: "Transparency / ambient mode", kind: "boolean", applicability: "all_headphones", comparisonRule: "boolean", core: true, scorable: true, presetWeights: weights(5, 5, 6, 3) }),
  field({ key: "weight_grams", label: "Weight", kind: "number", canonicalUnit: "grams", placeholder: "254", applicability: "all_headphones", comparisonRule: "lower", core: true, scorable: true, presetWeights: weights(8, 12, 8, 6), meaningfulDifference: 5 }),
  field({ key: "bluetooth_version", label: "Bluetooth version", kind: "number", placeholder: "5.3", applicability: "all_headphones", comparisonRule: "higher", core: true, scorable: true, presetWeights: weights(4, 4, 4, 4), meaningfulDifference: 0.1 }),
  field({ key: "multipoint", label: "Bluetooth multipoint", kind: "boolean", applicability: "all_headphones", comparisonRule: "boolean", core: true, scorable: true, presetWeights: weights(7, 5, 15, 5) }),
  field({ key: "wired_audio", label: "Wired audio", kind: "boolean", applicability: "all_headphones", comparisonRule: "boolean", core: true, scorable: true, presetWeights: weights(4, 2, 6, 4) }),
  field({ key: "usb_c_audio", label: "USB-C audio", kind: "boolean", applicability: "all_headphones", comparisonRule: "boolean", core: true, scorable: true, presetWeights: weights(4, 3, 5, 4) }),
  field({ key: "charge_time_hours", label: "Full charge time", kind: "number", canonicalUnit: "hours", placeholder: "3.5", applicability: "all_headphones", comparisonRule: "lower", core: false, scorable: true, presetWeights: weights(4, 5, 3, 4), meaningfulDifference: 0.25 }),
  field({ key: "spatial_audio", label: "Spatial audio", kind: "boolean", applicability: "all_headphones", comparisonRule: "boolean", core: false, scorable: true, presetWeights: weights(4, 3, 3, 3) }),
  field({ key: "water_resistance", label: "Water resistance", kind: "text", placeholder: "IPX4", applicability: "all_headphones", comparisonRule: "categorical", core: false, scorable: false, presetWeights: weights(0, 0, 0, 0) }),
  field({ key: "foldable", label: "Foldable", kind: "boolean", applicability: "all_headphones", comparisonRule: "boolean", core: false, scorable: true, presetWeights: weights(3, 8, 2, 2) }),
  field({ key: "carrying_case", label: "Carrying case included", kind: "boolean", applicability: "all_headphones", comparisonRule: "boolean", core: false, scorable: true, presetWeights: weights(3, 5, 2, 2) }),
];

const definitionByKey = new Map(headphoneFields.map((definition) => [definition.key, definition]));
const coreHeadphoneFields = headphoneFields.filter((definition) => definition.core);

export const totalHeadphoneScoreWeight = headphoneFields.reduce((total, definition) => total + definition.presetWeights.balanced, 0);

export function totalPresetWeight(preset: HeadphonePresetKey) {
  return headphoneFields.reduce((total, definition) => total + definition.presetWeights[preset], 0);
}

function numericValue(raw: string) {
  const match = raw.replace(/[$,]/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeNumber(definition: HeadphoneFieldDefinition, raw: string) {
  const parsed = numericValue(raw);
  if (parsed == null || parsed < 0) return undefined;
  const unit = raw.toLowerCase();
  let normalized = parsed;
  if (definition.key === "weight_grams") {
    if (/\bkg\b/.test(unit)) normalized = parsed * 1000;
    else if (/\b(?:lb|lbs|pound|pounds)\b/.test(unit)) normalized = parsed * 453.59237;
    else if (/\b(?:oz|ounce|ounces)\b/.test(unit)) normalized = parsed * 28.349523125;
  } else if (definition.canonicalUnit === "hours" && /\b(?:min|mins|minute|minutes)\b/.test(unit)) {
    normalized = parsed / 60;
  }
  return String(Math.round(normalized * 1000) / 1000);
}

export function normalizeHeadphoneSpecValue(key: HeadphoneSpecKey, input: unknown): string | undefined {
  const definition = definitionByKey.get(key);
  if (!definition || !["string", "number", "boolean"].includes(typeof input)) return undefined;
  const raw = String(input).trim().slice(0, 120);
  if (!raw) return undefined;
  if (["n/a", "na", "not applicable", NOT_APPLICABLE].includes(raw.toLowerCase())) return NOT_APPLICABLE;
  if (definition.kind === "boolean") {
    if (["true", "yes", "1"].includes(raw.toLowerCase())) return "yes";
    if (["false", "no", "0"].includes(raw.toLowerCase())) return "no";
    return undefined;
  }
  if (definition.kind === "number") return normalizeNumber(definition, raw);
  if (key === "form_factor") {
    const formFactor = raw.toLowerCase().replace(/\s+/g, "-");
    const aliases: Record<string, string> = { overear: "over-ear", "over-ear": "over-ear", onear: "on-ear", "on-ear": "on-ear", earbuds: "earbuds", earbud: "earbuds", "in-ear": "earbuds", inear: "earbuds" };
    return aliases[formFactor.replace(/-/g, "")] ?? aliases[formFactor] ?? formFactor;
  }
  if (key === "water_resistance") return raw.toUpperCase();
  return raw;
}

export function parseHeadphoneSpecs(value: string | null | undefined): HeadphoneSpecs {
  try { return sanitizeHeadphoneSpecs(JSON.parse(value ?? "{}")); } catch { return {}; }
}

export function sanitizeHeadphoneSpecs(input: unknown): HeadphoneSpecs {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const record = input as Record<string, unknown>;
  const output: HeadphoneSpecs = {};
  for (const definition of headphoneFields) {
    const value = normalizeHeadphoneSpecValue(definition.key, record[definition.key]);
    if (value) output[definition.key] = value;
  }
  return output;
}

export type ProductSpecSourceType = "manufacturer" | "independent" | "retailer" | "owner";
export type ProductSpecVerificationStatus = "verified" | "needs_review" | "conflicted" | "rejected";

export type ProductSpecProvenanceEntry = {
  sourceUrl: string;
  sourceType: ProductSpecSourceType;
  retrievedAt: string;
  confidence: number;
  status: ProductSpecVerificationStatus;
  rawValue: string;
  normalizedValue: string;
  unit: string | null;
  notes: string | null;
};

export type ProductSpecProvenance = Partial<Record<HeadphoneSpecKey, ProductSpecProvenanceEntry>>;

export type ProductSpecConflict = {
  key: HeadphoneSpecKey;
  previousValue: string | null;
  proposedValue: string | null;
  detectedAt: string;
  sourceUrl: string | null;
  resolution: "pending" | "accepted" | "rejected";
};

const allowedSourceTypes = new Set<ProductSpecSourceType>(["manufacturer", "independent", "retailer", "owner"]);
const allowedVerificationStates = new Set<ProductSpecVerificationStatus>(["verified", "needs_review", "conflicted", "rejected"]);

function safeHttpsUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try { const parsed = new URL(value.trim()); return parsed.protocol === "https:" ? parsed.toString() : null; } catch { return null; }
}

export function parseProductSpecProvenance(value: string | null | undefined): ProductSpecProvenance {
  try {
    const parsed = JSON.parse(value ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const record = parsed as Record<string, unknown>;
    const output: ProductSpecProvenance = {};
    for (const definition of headphoneFields) {
      const candidate = record[definition.key];
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
      const item = candidate as Record<string, unknown>;
      const sourceUrl = safeHttpsUrl(item.sourceUrl);
      if (!sourceUrl) continue;
      const sourceType = allowedSourceTypes.has(item.sourceType as ProductSpecSourceType) ? item.sourceType as ProductSpecSourceType : "manufacturer";
      const status = allowedVerificationStates.has(item.status as ProductSpecVerificationStatus) ? item.status as ProductSpecVerificationStatus : "needs_review";
      output[definition.key] = {
        sourceUrl,
        sourceType,
        retrievedAt: typeof item.retrievedAt === "string" ? item.retrievedAt.slice(0, 40) : "",
        confidence: Number.isFinite(Number(item.confidence)) ? Math.min(1, Math.max(0, Number(item.confidence))) : 0,
        status,
        rawValue: typeof item.rawValue === "string" ? item.rawValue.slice(0, 120) : "",
        normalizedValue: typeof item.normalizedValue === "string" ? item.normalizedValue.slice(0, 120) : "",
        unit: typeof item.unit === "string" ? item.unit.slice(0, 40) : null,
        notes: typeof item.notes === "string" && item.notes.trim() ? item.notes.trim().slice(0, 300) : null,
      };
    }
    return output;
  } catch { return {}; }
}

export function sanitizeProductSpecProvenance(input: unknown, specs: HeadphoneSpecs, defaults: { sourceUrl: string; retrievedAt: string; sourceType?: ProductSpecSourceType }): ProductSpecProvenance {
  const record = input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
  const output: ProductSpecProvenance = {};
  for (const definition of headphoneFields) {
    const specValue = specs[definition.key];
    if (!specValue) continue;
    const candidate = record[definition.key] && typeof record[definition.key] === "object" ? record[definition.key] as Record<string, unknown> : {};
    const sourceUrl = safeHttpsUrl(candidate.sourceUrl) ?? safeHttpsUrl(defaults.sourceUrl);
    if (!sourceUrl) continue;
    const sourceType = allowedSourceTypes.has(candidate.sourceType as ProductSpecSourceType) ? candidate.sourceType as ProductSpecSourceType : defaults.sourceType ?? "manufacturer";
    const status = allowedVerificationStates.has(candidate.status as ProductSpecVerificationStatus) ? candidate.status as ProductSpecVerificationStatus : "verified";
    const confidenceValue = Number(candidate.confidence);
    const confidence = Number.isFinite(confidenceValue) ? Math.min(1, Math.max(0, confidenceValue)) : sourceType === "manufacturer" ? 0.98 : 0.9;
    output[definition.key] = {
      sourceUrl,
      sourceType,
      retrievedAt: typeof candidate.retrievedAt === "string" && candidate.retrievedAt ? candidate.retrievedAt.slice(0, 40) : defaults.retrievedAt,
      confidence,
      status,
      rawValue: typeof candidate.rawValue === "string" ? candidate.rawValue.slice(0, 120) : specValue,
      normalizedValue: specValue,
      unit: definition.canonicalUnit ?? null,
      notes: typeof candidate.notes === "string" && candidate.notes.trim() ? candidate.notes.trim().slice(0, 300) : null,
    };
  }
  return output;
}

export function provenanceValidationErrors(input: unknown, specs: HeadphoneSpecs, defaultSourceUrl: string) {
  const record = input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
  const errors: string[] = [];
  for (const definition of headphoneFields) {
    if (!specs[definition.key]) continue;
    const candidate = record[definition.key] && typeof record[definition.key] === "object" ? record[definition.key] as Record<string, unknown> : {};
    if (!safeHttpsUrl(candidate.sourceUrl) && !safeHttpsUrl(defaultSourceUrl)) errors.push(`${definition.label} needs an HTTPS source URL.`);
    if (candidate.sourceType === "retailer" && definition.key !== "price_usd") errors.push(`${definition.label} cannot use a retailer as its factual specification source.`);
  }
  return errors;
}

export function parseProductSpecConflicts(value: string | null | undefined): ProductSpecConflict[] {
  try {
    const parsed = JSON.parse(value ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((candidate): ProductSpecConflict[] => {
      if (!candidate || typeof candidate !== "object") return [];
      const item = candidate as Partial<ProductSpecConflict>;
      if (!item.key || !definitionByKey.has(item.key)) return [];
      return [{ key: item.key, previousValue: typeof item.previousValue === "string" ? item.previousValue : null, proposedValue: typeof item.proposedValue === "string" ? item.proposedValue : null, detectedAt: typeof item.detectedAt === "string" ? item.detectedAt : "", sourceUrl: safeHttpsUrl(item.sourceUrl), resolution: ["pending", "accepted", "rejected"].includes(item.resolution ?? "") ? item.resolution as ProductSpecConflict["resolution"] : "pending" }];
    });
  } catch { return []; }
}

export function detectProductSpecConflicts(
  previous: HeadphoneSpecs,
  proposed: HeadphoneSpecs,
  provenance: ProductSpecProvenance,
  detectedAt: string,
) {
  return headphoneFields.flatMap((definition): ProductSpecConflict[] => {
    const previousValue = previous[definition.key] ?? null;
    const proposedValue = proposed[definition.key] ?? null;
    if (previousValue === proposedValue) return [];
    return [{
      key: definition.key,
      previousValue,
      proposedValue,
      detectedAt,
      sourceUrl: provenance[definition.key]?.sourceUrl ?? null,
      resolution: "pending",
    }];
  });
}

export function resolveProductSpecConflicts(
  conflicts: ProductSpecConflict[],
  resolution: "accepted" | "rejected",
) {
  return conflicts.map((conflict) => ({ ...conflict, resolution }));
}

function weightInGrams(value: string, numeric: number | null, unit: string | null) {
  if (numeric == null) return null;
  const normalizedUnit = unit?.toLowerCase() ?? value.toLowerCase();
  if (/\bkg\b/.test(normalizedUnit)) return numeric * 1000;
  if (/\b(?:lb|lbs)\b/.test(normalizedUnit)) return numeric * 453.59237;
  if (/\b(?:oz|ounce|ounces)\b/.test(normalizedUnit)) return numeric * 28.349523125;
  return numeric;
}

export function inferHeadphoneSpecs(facts: NormalizedFact[]): HeadphoneSpecs {
  const output: HeadphoneSpecs = {};
  for (const fact of facts) {
    const label = `${fact.key} ${fact.label}`.toLowerCase();
    const value = fact.value.trim();
    if (/price|msrp/.test(label) && fact.numericValue != null) output.price_usd = String(fact.numericValue);
    else if (/battery/.test(label) && fact.numericValue != null) {
      const key = /anc|noise cancel/.test(label) ? "battery_anc_hours" : "battery_life_hours";
      output[key] = normalizeHeadphoneSpecValue(key, `${fact.numericValue} ${fact.unit ?? ""}`);
    } else if (/weight/.test(label)) {
      const grams = weightInGrams(value, fact.numericValue, fact.unit);
      if (grams != null) output.weight_grams = String(Math.round(grams * 10) / 10);
    } else if (/bluetooth/.test(label) && fact.numericValue != null) output.bluetooth_version = String(fact.numericValue);
    else if (/water|ip rating/.test(label)) output.water_resistance = value.toUpperCase();
  }
  return sanitizeHeadphoneSpecs(output);
}

export function formatHeadphoneSpec(key: HeadphoneSpecKey, value: string) {
  const definition = definitionByKey.get(key);
  if (!definition) return value;
  if (value === NOT_APPLICABLE) return "Not applicable";
  if (definition.kind === "boolean") return value === "yes" ? "Yes" : "No";
  if (key === "price_usd") return `$${Number(value).toFixed(2)}`;
  return definition.canonicalUnit ? `${value} ${definition.canonicalUnit}` : value;
}

const knownValue = (value: string | undefined) => Boolean(value && value !== NOT_APPLICABLE);

export function getHeadphoneReadiness(specsJson: string | null | undefined) {
  const specs = parseHeadphoneSpecs(specsJson);
  const verifiedFields = headphoneFields.filter((definition) => knownValue(specs[definition.key]));
  const verifiedCoreFields = coreHeadphoneFields.filter((definition) => knownValue(specs[definition.key]));
  const verifiedWeight = verifiedFields.reduce((total, definition) => total + definition.presetWeights.balanced, 0);
  return {
    verifiedFieldCount: verifiedFields.length,
    verifiedCoreFieldCount: verifiedCoreFields.length,
    scoreCoverage: totalHeadphoneScoreWeight ? Math.round((verifiedWeight / totalHeadphoneScoreWeight) * 100) : 0,
    coreCoveragePercent: coreHeadphoneFields.length ? Math.round((verifiedCoreFields.length / coreHeadphoneFields.length) * 100) : 0,
  };
}

export function getHeadphonePairCoverage(leftSpecsJson: string | null | undefined, rightSpecsJson: string | null | undefined, preset: HeadphonePresetKey = "balanced") {
  const leftSpecs = parseHeadphoneSpecs(leftSpecsJson);
  const rightSpecs = parseHeadphoneSpecs(rightSpecsJson);
  const sharedFields = headphoneFields.filter((definition) => knownValue(leftSpecs[definition.key]) && knownValue(rightSpecs[definition.key]));
  const sharedCoreFields = coreHeadphoneFields.filter((definition) => knownValue(leftSpecs[definition.key]) && knownValue(rightSpecs[definition.key]));
  const sharedWeight = sharedFields.reduce((total, definition) => total + definition.presetWeights[preset], 0);
  const totalWeight = totalPresetWeight(preset);
  const coreCoveragePercent = coreHeadphoneFields.length ? Math.round((sharedCoreFields.length / coreHeadphoneFields.length) * 100) : 0;
  return { sharedFieldCount: sharedFields.length, sharedCoreFieldCount: sharedCoreFields.length, coreFieldCount: coreHeadphoneFields.length, scoreCoverage: totalWeight ? Math.round((sharedWeight / totalWeight) * 100) : 0, coreCoveragePercent, eligible: coreCoveragePercent >= HEADPHONE_PUBLIC_COVERAGE_THRESHOLD };
}

export type CatalogHeadphone = {
  id: string;
  slug: string;
  canonicalName: string;
  brand: string;
  sourceUrl: string;
  imageUrl: string | null;
  description: string | null;
  specsJson: string;
  specProvenanceJson?: string | null;
  status?: string | null;
};

export function approvedHeadphoneSpecs(product: CatalogHeadphone) {
  if (product.status && !["approved", "published"].includes(product.status)) return {} as HeadphoneSpecs;
  const specs = parseHeadphoneSpecs(product.specsJson);
  const provenance = parseProductSpecProvenance(product.specProvenanceJson);
  return Object.fromEntries(Object.entries(specs).filter(([key]) => {
    const entry = provenance[key as HeadphoneSpecKey];
    return !entry || entry.status === "verified";
  })) as HeadphoneSpecs;
}

function readinessFromSpecs(specs: HeadphoneSpecs, preset: HeadphonePresetKey = "balanced") {
  const verifiedFields = headphoneFields.filter((definition) => knownValue(specs[definition.key]));
  const verifiedCoreFields = coreHeadphoneFields.filter((definition) => knownValue(specs[definition.key]));
  const verifiedWeight = verifiedFields.reduce((total, definition) => total + definition.presetWeights[preset], 0);
  return {
    verifiedFieldCount: verifiedFields.length,
    verifiedCoreFieldCount: verifiedCoreFields.length,
    scoreCoverage: totalPresetWeight(preset) ? Math.round((verifiedWeight / totalPresetWeight(preset)) * 100) : 0,
    coreCoveragePercent: coreHeadphoneFields.length ? Math.round((verifiedCoreFields.length / coreHeadphoneFields.length) * 100) : 0,
  };
}

export function getHeadphoneProductReadiness(product: CatalogHeadphone, preset: HeadphonePresetKey = "balanced") {
  return readinessFromSpecs(approvedHeadphoneSpecs(product), preset);
}

export function getHeadphonePairCoverageForProducts(left: CatalogHeadphone, right: CatalogHeadphone, preset: HeadphonePresetKey = "balanced") {
  const leftSpecs = approvedHeadphoneSpecs(left);
  const rightSpecs = approvedHeadphoneSpecs(right);
  const sharedFields = headphoneFields.filter((definition) => knownValue(leftSpecs[definition.key]) && knownValue(rightSpecs[definition.key]));
  const sharedCoreFields = coreHeadphoneFields.filter((definition) => knownValue(leftSpecs[definition.key]) && knownValue(rightSpecs[definition.key]));
  const sharedWeight = sharedFields.reduce((total, definition) => total + definition.presetWeights[preset], 0);
  const totalWeight = totalPresetWeight(preset);
  const coreCoveragePercent = coreHeadphoneFields.length ? Math.round((sharedCoreFields.length / coreHeadphoneFields.length) * 100) : 0;
  return { sharedFieldCount: sharedFields.length, sharedCoreFieldCount: sharedCoreFields.length, coreFieldCount: coreHeadphoneFields.length, scoreCoverage: totalWeight ? Math.round((sharedWeight / totalWeight) * 100) : 0, coreCoveragePercent, eligible: coreCoveragePercent >= HEADPHONE_PUBLIC_COVERAGE_THRESHOLD };
}

export type HeadphoneFactorResult = {
  key: HeadphoneSpecKey;
  label: string;
  left: string;
  right: string;
  winner: string | null;
  state: "comparable" | "tie" | "missing" | "not_applicable" | "not_scored";
  weight: number;
  explanation: string;
};

export function scoreHeadphoneComparison(left: CatalogHeadphone, right: CatalogHeadphone, preset: HeadphonePresetKey = "balanced") {
  const leftSpecs = approvedHeadphoneSpecs(left);
  const rightSpecs = approvedHeadphoneSpecs(right);
  let leftPoints = 0;
  let availableWeight = 0;
  const factors: HeadphoneFactorResult[] = headphoneFields.flatMap((definition): HeadphoneFactorResult[] => {
    const leftValue = leftSpecs[definition.key];
    const rightValue = rightSpecs[definition.key];
    const weight = definition.presetWeights[preset];
    const formattedLeft = leftValue ? formatHeadphoneSpec(definition.key, leftValue) : "Not verified";
    const formattedRight = rightValue ? formatHeadphoneSpec(definition.key, rightValue) : "Not verified";
    if (leftValue === NOT_APPLICABLE || rightValue === NOT_APPLICABLE) return [{ key: definition.key, label: definition.label, left: formattedLeft, right: formattedRight, winner: null, state: "not_applicable" as const, weight: 0, explanation: "This attribute is not applicable to one or both products." }];
    if (!leftValue || !rightValue) return [{ key: definition.key, label: definition.label, left: formattedLeft, right: formattedRight, winner: null, state: "missing" as const, weight: 0, explanation: "Both products need a verified value before this attribute can be scored." }];
    if (!definition.scorable || weight === 0 || definition.comparisonRule === "none" || definition.comparisonRule === "categorical") return [{ key: definition.key, label: definition.label, left: formattedLeft, right: formattedRight, winner: null, state: "not_scored" as const, weight: 0, explanation: "This factual attribute is shown for context and does not affect the score." }];
    const leftNumeric = definition.kind === "boolean" ? (leftValue === "yes" ? 1 : 0) : Number(leftValue);
    const rightNumeric = definition.kind === "boolean" ? (rightValue === "yes" ? 1 : 0) : Number(rightValue);
    if (!Number.isFinite(leftNumeric) || !Number.isFinite(rightNumeric)) return [{ key: definition.key, label: definition.label, left: formattedLeft, right: formattedRight, winner: null, state: "not_scored" as const, weight: 0, explanation: "The verified values cannot be compared numerically." }];
    availableWeight += weight;
    const signedDelta = (leftNumeric - rightNumeric) * (definition.comparisonRule === "lower" ? -1 : 1);
    const difference = Math.abs(leftNumeric - rightNumeric);
    const tied = signedDelta === 0 || (definition.meaningfulDifference != null && difference < definition.meaningfulDifference);
    if (tied) {
      leftPoints += weight / 2;
      return [{ key: definition.key, label: definition.label, left: formattedLeft, right: formattedRight, winner: null, state: "tie" as const, weight, explanation: signedDelta === 0 ? "The verified values are equal." : "The difference is too small to be meaningful." }];
    }
    const leftWins = signedDelta > 0;
    if (leftWins) leftPoints += weight;
    const winningName = leftWins ? left.canonicalName : right.canonicalName;
    const explanation = definition.kind === "boolean"
      ? `${winningName} includes this verified feature; the other product does not.`
      : `${winningName} leads by ${Math.round(difference * 1000) / 1000}${definition.canonicalUnit ? ` ${definition.canonicalUnit}` : ""}.`;
    return [{ key: definition.key, label: definition.label, left: formattedLeft, right: formattedRight, winner: leftWins ? left.slug : right.slug, state: "comparable" as const, weight, explanation }];
  });
  const scoreLeft = availableWeight ? Math.round((leftPoints / availableWeight) * 100) : 50;
  const scoreRight = 100 - scoreLeft;
  const pairCoverage = getHeadphonePairCoverageForProducts(left, right, preset);
  return {
    preset,
    presetLabel: headphonePresetLabels[preset],
    scoringVersion: HEADPHONE_SCORING_VERSION,
    scoreLeft,
    scoreRight,
    availableWeight,
    coveragePercent: totalPresetWeight(preset) ? Math.round((availableWeight / totalPresetWeight(preset)) * 100) : 0,
    coreCoveragePercent: pairCoverage.coreCoveragePercent,
    winner: scoreLeft === scoreRight ? null : scoreLeft > scoreRight ? left : right,
    factors,
    explanationInputs: factors.map(({ key, winner, state, weight, explanation }) => ({ key, winner, state, weight, explanation })),
  };
}
