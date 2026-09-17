import { z } from "zod";
export const SMARTPHONE_SCORING_VERSION = "smartphones-v1.0.0";
export const smartphoneSpecSchema = z.object({
  price_usd: z.number().min(1).max(10000).optional(),
  display_inches: z.number().min(3).max(9).optional(),
  refresh_rate_hz: z.number().min(30).max(240).optional(),
  weight_grams: z.number().min(70).max(600).optional(),
  storage_gb: z.number().min(32).max(4096).optional(),
  ram_gb: z.number().min(2).max(64).optional(),
  battery_mah: z.number().min(1000).max(15000).optional(),
  wired_charging_w: z.number().min(1).max(300).optional(),
  wireless_charging: z.boolean().optional(),
  wireless_charging_w: z.number().min(1).max(100).optional(),
  chipset: z.string().min(1).max(120).optional(),
  operating_system: z.enum(["iOS", "Android"]).optional(),
  water_resistance: z.string().regex(/^IP[0-6X][0-9X]$/).optional(),
  main_camera_mp: z.number().min(1).max(500).optional(),
  telephoto_optical_x: z.number().min(1).max(20).optional(),
  security_support_years: z.number().min(1).max(15).optional(),
}).strict();
export type SmartphoneSpecs = z.infer<typeof smartphoneSpecSchema>;
export type SmartphoneSpecKey = keyof SmartphoneSpecs;
export const smartphoneFields: Array<{
  key: SmartphoneSpecKey;
  label: string;
  unit?: string;
  direction?: "lower" | "higher";
}> = [
    {
      key: "price_usd", label: "Reference price (USD)", direction: "lower"
    },
    {
      key: "weight_grams", label: "Weight", unit: "g", direction: "lower"
    },
    {
      key: "refresh_rate_hz", label: "Maximum refresh rate", unit: "Hz", direction: "higher"
    },
    {
      key: "storage_gb", label: "Storage in compared configuration", unit: "GB", direction: "higher"
    },
    {
      key: "wireless_charging", label: "Wireless charging", direction: "higher"
    },
    {
      key: "display_inches", label: "Display diagonal", unit: "in"
    },
    {
      key: "ram_gb", label: "RAM", unit: "GB"
    },
    {
      key: "battery_mah", label: "Typical battery capacity", unit: "mAh"
    },
    {
      key: "wired_charging_w", label: "Maximum wired charging power", unit: "W"
    },
    {
      key: "wireless_charging_w", label: "Maximum wireless charging power", unit: "W"
    },
    {
      key: "chipset", label: "Chipset"
    },
    {
      key: "operating_system", label: "Operating system family"
    },
    {
      key: "water_resistance", label: "Ingress protection rating"
    },
    {
      key: "main_camera_mp", label: "Main camera resolution", unit: "MP"
    },
    {
      key: "telephoto_optical_x", label: "Dedicated telephoto lens", unit: "×"
    },
    {
      key: "security_support_years", label: "Security support from launch", unit: "years"
    },
  ];
export const smartphonePresets = {
  balanced: {
    label: "Balanced", weights: {
      price_usd: 30, weight_grams: 20, refresh_rate_hz: 20, storage_gb: 20, wireless_charging: 10
    }
  },
  portability: {
    label: "Portability", weights: {
      price_usd: 10, weight_grams: 60, refresh_rate_hz: 10, storage_gb: 10, wireless_charging: 10
    }
  },
  value: {
    label: "Value", weights: {
      price_usd: 60, weight_grams: 10, refresh_rate_hz: 10, storage_gb: 15, wireless_charging: 5
    }
  },
} as const;
export type SmartphonePreset = keyof typeof smartphonePresets;
export function isSmartphonePreset(value: string): value is SmartphonePreset { return Object.hasOwn(smartphonePresets, value); }
export function parseSmartphoneSpecs(json: string): SmartphoneSpecs {
  try {
    return smartphoneSpecSchema.parse(JSON.parse(json));
  }
  catch {
    return {};
  }
}
export function formatSmartphoneSpec(key: SmartphoneSpecKey, value: unknown) {
  if (value === undefined || value === null)
    return "Not stated / not verified";
  if (typeof value === "boolean")
    return value ? "Yes" : "No";
  if (key === "price_usd")
    return `$${Number(value).toFixed(2)}`;
  return `${value}${smartphoneFields.find((field) => field.key === key)?.unit ? ` ${smartphoneFields.find((field) => field.key === key)!.unit}` : ""}`;
}
export type SmartphoneProduct = {
  id: string;
  slug: string;
  canonicalName: string;
  brand: string;
  categorySlug?: string;
  specsJson: string;
  specProvenanceJson?: string | null;
  status?: string | null;
  updatedAt?: string | null;
  sourceUrl: string;
  imageUrl: string | null;
  description: string | null;
};
export function verifiedSmartphoneSpecs(product: SmartphoneProduct) {
  const specs = parseSmartphoneSpecs(product.specsJson);
  let provenance: Record<string, {
    status?: string;
    sourceUrl?: string;
    retrievedAt?: string;
  }> = {};
  try {
    provenance = JSON.parse(product.specProvenanceJson ?? "{}") ?? {};
  }
  catch {
    return {};
  }
  return Object.fromEntries(Object.entries(specs).filter(([key]) => {
    const source = provenance[key];
    return source?.status === "verified" && source.sourceUrl?.startsWith("https://") && Boolean(source.retrievedAt) && Number.isFinite(Date.parse(source.retrievedAt!));
  })) as SmartphoneSpecs;
}
export function scoreSmartphoneComparison(left: SmartphoneProduct, right: SmartphoneProduct, preset: SmartphonePreset = "balanced") {
  const a = verifiedSmartphoneSpecs(left);
  const b = verifiedSmartphoneSpecs(right);
  const weights = smartphonePresets[preset].weights;
  let availableWeight = 0;
  let leftPoints = 0;
  const factors = smartphoneFields.filter((field) => field.direction).map((field) => {
    const key = field.key as keyof typeof weights;
    const weight = weights[key];
    const available = a[key] !== undefined && b[key] !== undefined;
    let share = 0.5;
    if (available) {
      const av = Number(a[key]);
      const bv = Number(b[key]);
      if (typeof a[key] === "boolean")
        share = av === bv ? .5 : av > bv ? 1 : 0;
      else if (av + bv > 0)
        share = field.direction === "lower" ? bv / (av + bv) : av / (av + bv);
      availableWeight += weight;
      leftPoints += share * weight;
    }
    return {
      ...field, weight, available, leftValue: a[key], rightValue: b[key], winner: !available ? "unknown" : a[key] === b[key] ? "tie" : share > .5 ? "left" : "right"
    };
  });
  const scoreLeft = availableWeight ? Math.round(leftPoints / availableWeight * 1000) / 10 : null;
  const sharedFields = smartphoneFields.filter((field) => a[field.key] !== undefined && b[field.key] !== undefined).length;
  const eligible = sharedFields >= 8 && availableWeight >= 70 && (preset !== "value" || (a.price_usd !== undefined && b.price_usd !== undefined));
  return {
    factors, coveragePercent: availableWeight, sharedFields, eligible, scoreLeft, scoreRight: scoreLeft === null ? null : Math.round((100 - scoreLeft) * 10) / 10
  };
}
export function smartphoneDataVersion(left: SmartphoneProduct, right: SmartphoneProduct) {
  // Full canonical payload avoids hash collisions and invalidates verdicts when any evidence changes.
  return JSON.stringify([SMARTPHONE_SCORING_VERSION, ...[left, right].sort((a, b) => a.id.localeCompare(b.id)).map((p) => [p.id, p.specsJson, p.specProvenanceJson, p.updatedAt ?? null])]);
}
export function draftSmartphoneVerdict(left: SmartphoneProduct, right: SmartphoneProduct, preset: SmartphonePreset = "balanced") {
  const scored = scoreSmartphoneComparison(left, right, preset);
  const points = (side: "left" | "right") => scored.factors.filter((f) => f.available && f.winner === side).map((f) => `${f.label}: ${formatSmartphoneSpec(f.key, side === "left" ? f.leftValue : f.rightValue)}`);
  const l = points("left");
  const r = points("right");
  return {
    headline: !scored.eligible ? "Not enough shared evidence for this preset" : scored.scoreLeft === scored.scoreRight ? "The measured trade-offs are tied" : `${(scored.scoreLeft ?? 0) > (scored.scoreRight ?? 0) ? left.canonicalName : right.canonicalName} leads on the ${smartphonePresets[preset].label.toLowerCase()} specification model`,
    summary: `Based on ${scored.sharedFields} shared sourced fields and ${scored.coveragePercent}% scoring coverage. This model weighs price, portability, refresh rate, storage, and wireless charging. It does not rate camera quality, processing performance, or battery endurance.`,
    buyLeft: l.length ? `Consider ${left.canonicalName} for ${l.join("; ")}.` : `Choose ${left.canonicalName} if its operating system, size, and camera setup suit you; it has no unique advantage in the scored fields.`,
    buyRight: r.length ? `Consider ${right.canonicalName} for ${r.join("; ")}.` : `Choose ${right.canonicalName} if its operating system, size, and camera setup suit you; it has no unique advantage in the scored fields.`,
    evidence: scored.factors.filter((f) => f.available).map((f) => ({
      key: f.key, left: f.leftValue, right: f.rightValue, winner: f.winner
    })),
  };
}
