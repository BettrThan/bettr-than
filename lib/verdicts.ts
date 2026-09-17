import {
  HEADPHONE_SCORING_VERSION,
  headphonePresetLabels,
  parseProductSpecProvenance,
  scoreHeadphoneComparison,
  type CatalogHeadphone,
  type HeadphonePresetKey,
  type HeadphoneSpecKey,
} from "@/lib/headphone-specs";

export type VerdictStatus = "missing" | "draft" | "approved" | "rejected";

export type VerdictEvidenceReference = {
  key: HeadphoneSpecKey;
  label: string;
  productSlug: string;
  productName: string;
  value: string;
  sourceUrl: string;
  retrievedAt: string | null;
};

export type VerdictDraft = {
  headline: string;
  summary: string;
  buyLeft: string;
  buyRight: string;
  preset: HeadphonePresetKey;
  scoringVersion: string;
  dataVersion: string;
  evidence: VerdictEvidenceReference[];
};

type VersionedCatalogHeadphone = CatalogHeadphone & { updatedAt?: string | null };

const presets = new Set<HeadphonePresetKey>(["balanced", "travel", "office", "value"]);

export function isHeadphonePreset(value: unknown): value is HeadphonePresetKey {
  return typeof value === "string" && presets.has(value as HeadphonePresetKey);
}

export function comparisonDataVersion(left: VersionedCatalogHeadphone, right: VersionedCatalogHeadphone) {
  return [left.id, left.updatedAt ?? "legacy", right.id, right.updatedAt ?? "legacy"].join(":");
}

function evidenceFor(
  product: VersionedCatalogHeadphone,
  factor: ReturnType<typeof scoreHeadphoneComparison>["factors"][number],
): VerdictEvidenceReference {
  const provenance = parseProductSpecProvenance(product.specProvenanceJson);
  const source = provenance[factor.key];
  return {
    key: factor.key,
    label: factor.label,
    productSlug: product.slug,
    productName: product.canonicalName,
    value: "",
    sourceUrl: source?.sourceUrl ?? product.sourceUrl,
    retrievedAt: source?.retrievedAt || null,
  };
}

function withFactorValue(
  reference: VerdictEvidenceReference,
  factor: ReturnType<typeof scoreHeadphoneComparison>["factors"][number],
  side: "left" | "right",
) {
  return { ...reference, value: side === "left" ? factor.left : factor.right };
}

export function draftComparisonVerdict(
  left: VersionedCatalogHeadphone,
  right: VersionedCatalogHeadphone,
  preset: HeadphonePresetKey = "balanced",
  variation = 0,
): { draft: VerdictDraft | null; error: string | null } {
  const result = scoreHeadphoneComparison(left, right, preset);
  const leftWins = result.factors.filter((factor) => factor.state === "comparable" && factor.winner === left.slug).sort((a, b) => b.weight - a.weight);
  const rightWins = result.factors.filter((factor) => factor.state === "comparable" && factor.winner === right.slug).sort((a, b) => b.weight - a.weight);
  const comparable = result.factors.filter((factor) => factor.state === "comparable" || factor.state === "tie");
  if (comparable.length < 2 || (leftWins.length === 0 && rightWins.length === 0)) {
    return { draft: null, error: "There is not enough approved evidence to explain this comparison. Verify more shared facts before drafting a verdict." };
  }

  const leftTop = leftWins.slice(0, 2);
  const rightTop = rightWins.slice(0, 2);
  const winner = result.winner?.canonicalName;
  const headlines = winner
    ? [`${winner} takes this one—by the receipts.`, `The verified numbers lean ${winner}.`, `${winner} wins where ${headphonePresetLabels[preset]} counts.`]
    : ["Different strengths, honest tie.", "No runaway winner here.", "This matchup comes down to priorities."];
  const headline = headlines[Math.abs(variation) % headlines.length];
  const winnerIsLeft = result.winner?.id === left.id;
  const summary = winner
    ? `${winner} leads the ${headphonePresetLabels[preset]} result ${winnerIsLeft ? result.scoreLeft : result.scoreRight}–${winnerIsLeft ? result.scoreRight : result.scoreLeft}, driven by ${(winnerIsLeft ? leftTop : rightTop).map((factor) => factor.label.toLowerCase()).join(" and ")}.`
    : `The ${headphonePresetLabels[preset]} result is tied ${result.scoreLeft}–${result.scoreRight}; the products win in different verified areas.`;
  const recommendation = (product: VersionedCatalogHeadphone, wins: typeof leftTop, side: "left" | "right") => wins.length
    ? `Prioritize ${wins.map((factor) => `${factor.label.toLowerCase()} (${side === "left" ? factor.left : factor.right})`).join(" and ")}.`
    : `The verified model does not currently show a measured advantage for ${product.canonicalName}; choose it only for preferences outside the scored facts.`;
  const buyLeft = recommendation(left, leftTop, "left");
  const buyRight = recommendation(right, rightTop, "right");
  const evidence = [
    ...leftTop.map((factor) => withFactorValue(evidenceFor(left, factor), factor, "left")),
    ...rightTop.map((factor) => withFactorValue(evidenceFor(right, factor), factor, "right")),
  ];
  if (evidence.length < 2) {
    const tie = comparable.find((factor) => factor.state === "tie");
    if (tie) evidence.push(withFactorValue(evidenceFor(left, tie), tie, "left"), withFactorValue(evidenceFor(right, tie), tie, "right"));
  }

  return {
    draft: {
      headline,
      summary,
      buyLeft,
      buyRight,
      preset,
      scoringVersion: HEADPHONE_SCORING_VERSION,
      dataVersion: comparisonDataVersion(left, right),
      evidence,
    },
    error: null,
  };
}

function boundedText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function sanitizeVerdictCopy(input: unknown) {
  const record = input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
  return {
    headline: boundedText(record.headline, 140),
    summary: boundedText(record.summary, 600),
    buyLeft: boundedText(record.buyLeft, 400),
    buyRight: boundedText(record.buyRight, 400),
  };
}

export function parseVerdictEvidence(value: string | null | undefined): VerdictEvidenceReference[] {
  try {
    const parsed = JSON.parse(value ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((candidate): VerdictEvidenceReference[] => {
      if (!candidate || typeof candidate !== "object") return [];
      const item = candidate as Partial<VerdictEvidenceReference>;
      if (!item.key || !item.label || !item.productSlug || !item.productName || !item.value || !item.sourceUrl) return [];
      try {
        const url = new URL(item.sourceUrl);
        if (url.protocol !== "https:") return [];
      } catch { return []; }
      return [{
        key: item.key,
        label: String(item.label).slice(0, 120),
        productSlug: String(item.productSlug).slice(0, 160),
        productName: String(item.productName).slice(0, 180),
        value: String(item.value).slice(0, 120),
        sourceUrl: item.sourceUrl,
        retrievedAt: typeof item.retrievedAt === "string" ? item.retrievedAt.slice(0, 40) : null,
      }];
    });
  } catch { return []; }
}
