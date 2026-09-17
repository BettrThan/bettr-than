import { z } from "zod";
export const extendedCategorySlugs = ["portable-speakers", "vr-headsets", "wearables", "game-consoles"] as const;
export type ExtendedCategorySlug = (typeof extendedCategorySlugs)[number];
export type ExtendedProduct = {
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
type Direction = "lower" | "higher";
export type ExtendedField = {
  key: string;
  label: string;
  unit?: string;
  direction?: Direction;
};
type Preset = {
  label: string;
  description: string;
  weights: Record<string, number>;
};
const portableSpeakerSchema = z.object({
  price_usd: z.number().min(1).max(10000).optional(), battery_hours: z.number().min(1).max(200).optional(), weight_grams: z.number().min(50).max(30000).optional(),
  ip_rating: z.string().max(20).optional(), durability_score: z.number().min(0).max(5).optional(), bluetooth_version: z.string().max(20).optional(),
  powerbank: z.boolean().optional(), usb_audio: z.boolean().optional(), auracast: z.boolean().optional(), floats: z.boolean().optional(), speakerphone: z.boolean().optional(),
}).strict();
const vrSchema = z.object({
  price_usd: z.number().min(1).max(10000).optional(), resolution_per_eye_mpx: z.number().min(.5).max(30).optional(), refresh_rate_hz: z.number().min(60).max(240).optional(),
  weight_grams: z.number().min(50).max(2000).optional(), storage_gb: z.number().min(0).max(4096).optional(), field_of_view_deg: z.number().min(70).max(220).optional(),
  standalone: z.boolean().optional(), eye_tracking: z.boolean().optional(), hand_tracking: z.boolean().optional(), color_passthrough: z.boolean().optional(), battery_hours: z.number().min(1).max(12).optional(), platform: z.string().max(100).optional(),
}).strict();
const wearableSchema = z.object({
  price_usd: z.number().min(1).max(5000).optional(), device_type: z.enum(["smartwatch", "smart-ring", "fitness-tracker"]).optional(), battery_days: z.number().min(.25).max(30).optional(),
  weight_grams: z.number().min(1).max(250).optional(), water_resistance_m: z.number().min(0).max(200).optional(), gps: z.boolean().optional(), heart_rate: z.boolean().optional(), ecg: z.boolean().optional(), spo2: z.boolean().optional(), temperature: z.boolean().optional(), sleep_tracking: z.boolean().optional(), display: z.boolean().optional(),
  ios: z.boolean().optional(), android: z.boolean().optional(), subscription_usd_monthly: z.number().min(0).max(100).optional(),
}).strict();
const consoleSchema = z.object({
  price_usd: z.number().min(1).max(5000).optional(), form_factor: z.enum(["home-console", "hybrid", "handheld-pc"]).optional(), storage_gb: z.number().min(32).max(8192).optional(),
  weight_grams: z.number().min(100).max(10000).optional(), max_output_resolution: z.enum(["1080p", "1440p", "4K", "8K"]).optional(), output_resolution_score: z.number().min(1).max(4).optional(), max_refresh_hz: z.number().min(30).max(240).optional(), disc_drive: z.boolean().optional(), expandable_storage: z.boolean().optional(),
  display_inches: z.number().min(5).max(12).optional(), display_refresh_hz: z.number().min(30).max(240).optional(), battery_hours_min: z.number().min(1).max(20).optional(), battery_hours_max: z.number().min(1).max(30).optional(), operating_system: z.string().max(80).optional(),
}).strict();
export const extendedCategoryModels: Record<ExtendedCategorySlug, {
  name: string;
  singular: string;
  scoringVersion: string;
  schema: z.ZodTypeAny;
  fields: ExtendedField[];
  presets: Record<string, Preset>;
  minimumShared: number;
  minimumCoverage: number;
  limitations: string;
}> = {
  "portable-speakers": {
    name: "Portable Speakers", singular: "speaker", scoringVersion: "portable-speakers-v2.0.0", schema: portableSpeakerSchema, minimumShared: 6, minimumCoverage: 60,
    limitations: "The score compares published hardware facts. It does not claim to measure sound quality, maximum loudness, tuning, or real-world battery life.",
    fields: [{
      key: "price_usd", label: "Reference price", unit: "USD", direction: "lower"
    }, {
      key: "battery_hours", label: "Advertised battery life", unit: "hours", direction: "higher"
    }, {
      key: "weight_grams", label: "Weight", unit: "g", direction: "lower"
    }, {
      key: "ip_rating", label: "Ingress protection"
    }, {
      key: "durability_score", label: "Durability tier", direction: "higher"
    }, {
      key: "bluetooth_version", label: "Bluetooth version"
    }, {
      key: "powerbank", label: "Can charge another device", direction: "higher"
    }, {
      key: "usb_audio", label: "USB audio input", direction: "higher"
    }, {
      key: "auracast", label: "Auracast or compatible broadcast pairing", direction: "higher"
    }, {
      key: "floats", label: "Floats in water", direction: "higher"
    }, {
      key: "speakerphone", label: "Speakerphone", direction: "higher"
    }],
    presets: {
      balanced: {
        label: "Balanced", description: "Value, battery, portability, durability, and useful connections.", weights: {
          price_usd: 20, battery_hours: 20, weight_grams: 15, durability_score: 20, powerbank: 10, usb_audio: 5, auracast: 5, floats: 5
        }
      }, travel: {
        label: "Travel", description: "Low weight, battery endurance, and weather resistance.", weights: {
          price_usd: 15, battery_hours: 25, weight_grams: 30, durability_score: 25, floats: 5
        }
      }, features: {
        label: "Features", description: "Connectivity and utility features receive more weight.", weights: {
          price_usd: 10, battery_hours: 15, weight_grams: 10, durability_score: 15, powerbank: 15, usb_audio: 15, auracast: 10, speakerphone: 10
        }
      }
    },
  },
  "vr-headsets": {
    name: "VR Headsets", singular: "headset", scoringVersion: "vr-headsets-v1.0.0", schema: vrSchema, minimumShared: 6, minimumCoverage: 55,
    limitations: "The score compares disclosed hardware. It does not rate lens clarity, comfort, tracking quality, software libraries, PC requirements, or image quality in use.",
    fields: [{
      key: "price_usd", label: "Reference price", unit: "USD", direction: "lower"
    }, {
      key: "resolution_per_eye_mpx", label: "Pixels per eye", unit: "MP", direction: "higher"
    }, {
      key: "refresh_rate_hz", label: "Maximum refresh rate", unit: "Hz", direction: "higher"
    }, {
      key: "weight_grams", label: "Headset weight", unit: "g", direction: "lower"
    }, {
      key: "storage_gb", label: "Storage", unit: "GB", direction: "higher"
    }, {
      key: "field_of_view_deg", label: "Stated field of view", unit: "°", direction: "higher"
    }, {
      key: "standalone", label: "Standalone operation", direction: "higher"
    }, {
      key: "eye_tracking", label: "Eye tracking", direction: "higher"
    }, {
      key: "hand_tracking", label: "Hand tracking", direction: "higher"
    }, {
      key: "color_passthrough", label: "Color passthrough", direction: "higher"
    }, {
      key: "battery_hours", label: "Advertised battery life", unit: "hours", direction: "higher"
    }, {
      key: "platform", label: "Primary platform"
    }],
    presets: {
      balanced: {
        label: "Balanced", description: "Price, display density, refresh, weight, and core tracking features.", weights: {
          price_usd: 25, resolution_per_eye_mpx: 20, refresh_rate_hz: 10, weight_grams: 15, standalone: 10, eye_tracking: 5, hand_tracking: 5, color_passthrough: 5, battery_hours: 5
        }
      }, standalone: {
        label: "Standalone", description: "Mobility, onboard operation, passthrough, and battery receive more weight.", weights: {
          price_usd: 20, resolution_per_eye_mpx: 15, weight_grams: 15, standalone: 20, hand_tracking: 10, color_passthrough: 10, battery_hours: 10
        }
      }, simulation: {
        label: "PC & simulation", description: "Resolution, refresh, field of view, and eye tracking lead.", weights: {
          price_usd: 15, resolution_per_eye_mpx: 30, refresh_rate_hz: 20, weight_grams: 10, field_of_view_deg: 15, eye_tracking: 10
        }
      }, value: {
        label: "Value", description: "Price leads without ignoring display and tracking hardware.", weights: {
          price_usd: 50, resolution_per_eye_mpx: 20, refresh_rate_hz: 10, weight_grams: 10, eye_tracking: 5, hand_tracking: 5
        }
      }
    },
  },
  wearables: {
    name: "Wearables", singular: "wearable", scoringVersion: "wearables-v1.0.0", schema: wearableSchema, minimumShared: 7, minimumCoverage: 55,
    limitations: "Device type, phone compatibility, fit, coaching quality, and medical availability are personal or regional. A missing or inapplicable feature is excluded rather than treated as a loss.",
    fields: [{
      key: "price_usd", label: "Reference price", unit: "USD", direction: "lower"
    }, {
      key: "device_type", label: "Device type"
    }, {
      key: "battery_days", label: "Advertised battery life", unit: "days", direction: "higher"
    }, {
      key: "weight_grams", label: "Device weight", unit: "g", direction: "lower"
    }, {
      key: "water_resistance_m", label: "Water resistance", unit: "m", direction: "higher"
    }, {
      key: "gps", label: "Built-in GPS", direction: "higher"
    }, {
      key: "heart_rate", label: "Continuous heart rate", direction: "higher"
    }, {
      key: "ecg", label: "ECG capability", direction: "higher"
    }, {
      key: "spo2", label: "Blood oxygen sensing", direction: "higher"
    }, {
      key: "temperature", label: "Temperature sensing", direction: "higher"
    }, {
      key: "sleep_tracking", label: "Sleep tracking", direction: "higher"
    }, {
      key: "display", label: "On-device display", direction: "higher"
    }, {
      key: "ios", label: "iPhone support"
    }, {
      key: "android", label: "Android support"
    }, {
      key: "subscription_usd_monthly", label: "Required subscription", unit: "USD/month", direction: "lower"
    }],
    presets: {
      balanced: {
        label: "Balanced", description: "Value, endurance, comfort, durability, and broadly useful health sensors.", weights: {
          price_usd: 20, battery_days: 20, weight_grams: 15, water_resistance_m: 10, gps: 8, heart_rate: 5, ecg: 7, spo2: 5, temperature: 5, sleep_tracking: 5
        }
      }, health: {
        label: "Health", description: "ECG, heart rate, oxygen, temperature, and sleep sensing lead.", weights: {
          price_usd: 10, battery_days: 10, weight_grams: 10, water_resistance_m: 5, heart_rate: 10, ecg: 20, spo2: 15, temperature: 10, sleep_tracking: 10
        }
      }, endurance: {
        label: "Endurance", description: "Battery life, weight, and durability receive most of the score.", weights: {
          price_usd: 15, battery_days: 40, weight_grams: 20, water_resistance_m: 15, gps: 10
        }
      }, no_subscription: {
        label: "No subscription", description: "Ownership cost and required monthly fees lead.", weights: {
          price_usd: 40, subscription_usd_monthly: 35, battery_days: 15, weight_grams: 10
        }
      }
    },
  },
  "game-consoles": {
    name: "Game Consoles & Handhelds", singular: "system", scoringVersion: "game-consoles-v1.0.0", schema: consoleSchema, minimumShared: 5, minimumCoverage: 55,
    limitations: "Raw compute figures are intentionally excluded across different architectures. The score does not rate exclusive games, compatibility, storefronts, ergonomics, or actual frame rates.",
    fields: [{
      key: "price_usd", label: "Reference price", unit: "USD", direction: "lower"
    }, {
      key: "form_factor", label: "Form factor"
    }, {
      key: "storage_gb", label: "Included storage", unit: "GB", direction: "higher"
    }, {
      key: "weight_grams", label: "System weight", unit: "g", direction: "lower"
    }, {
      key: "max_output_resolution", label: "Maximum stated output"
    }, {
      key: "output_resolution_score", label: "Output resolution tier", direction: "higher"
    }, {
      key: "max_refresh_hz", label: "Maximum output refresh", unit: "Hz", direction: "higher"
    }, {
      key: "disc_drive", label: "Optical drive included", direction: "higher"
    }, {
      key: "expandable_storage", label: "Expandable storage", direction: "higher"
    }, {
      key: "display_inches", label: "Built-in display", unit: "in"
    }, {
      key: "display_refresh_hz", label: "Built-in display refresh", unit: "Hz", direction: "higher"
    }, {
      key: "battery_hours_min", label: "Advertised battery range minimum", unit: "hours", direction: "higher"
    }, {
      key: "battery_hours_max", label: "Advertised battery range maximum", unit: "hours", direction: "higher"
    }, {
      key: "operating_system", label: "Operating system"
    }],
    presets: {
      balanced: {
        label: "Balanced", description: "Price, storage, portability, output capability, and expansion.", weights: {
          price_usd: 25, storage_gb: 20, weight_grams: 15, output_resolution_score: 15, max_refresh_hz: 10, expandable_storage: 10, disc_drive: 5
        }
      }, living_room: {
        label: "Living room", description: "Output, storage, disc support, and price for TV play.", weights: {
          price_usd: 25, storage_gb: 20, output_resolution_score: 25, max_refresh_hz: 15, disc_drive: 10, expandable_storage: 5
        }
      }, portable: {
        label: "Portable", description: "Weight, display, battery range, storage, and price.", weights: {
          price_usd: 20, storage_gb: 10, weight_grams: 25, display_refresh_hz: 15, battery_hours_min: 15, battery_hours_max: 10, expandable_storage: 5
        }
      }, value: {
        label: "Value", description: "Price dominates while storage and output still count.", weights: {
          price_usd: 55, storage_gb: 20, output_resolution_score: 10, max_refresh_hz: 5, expandable_storage: 10
        }
      }
    },
  },
};
export function isExtendedCategory(value: string): value is ExtendedCategorySlug { return extendedCategorySlugs.includes(value as ExtendedCategorySlug); }
export function validateExtendedSpecs(category: ExtendedCategorySlug, input: unknown) { return extendedCategoryModels[category].schema.parse(input) as Record<string, string | number | boolean>; }
export function parseExtendedSpecs(category: ExtendedCategorySlug, json: string) {
  try {
    return validateExtendedSpecs(category, JSON.parse(json));
  }
  catch {
    return {};
  }
}
export function verifiedExtendedSpecs(category: ExtendedCategorySlug, product: Pick<ExtendedProduct, "specsJson" | "specProvenanceJson">) {
  const specs = parseExtendedSpecs(category, product.specsJson);
  let provenance: Record<string, {
    value?: unknown;
    status?: string;
    sourceUrl?: string;
    retrievedAt?: string;
  }>;
  try {
    const parsed = JSON.parse(product.specProvenanceJson ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {};
    provenance = parsed;
  }
  catch {
    return {};
  }
  return Object.fromEntries(Object.entries(specs).filter(([key, value]) => {
    const source = provenance[key];
    if (source?.status !== "verified" || source.value === undefined || source.value === null || String(source.value) !== String(value))
      return false;
    if (typeof source.sourceUrl !== "string" || typeof source.retrievedAt !== "string")
      return false;
    const checkedAt = Date.parse(source.retrievedAt);
    if (!Number.isFinite(checkedAt) || checkedAt > Date.now() + 60000)
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
export function formatExtendedSpec(category: ExtendedCategorySlug, key: string, value: unknown) {
  if (value === undefined || value === null)
    return "Not stated / not applicable";
  if (typeof value === "boolean")
    return value ? "Yes" : "No";
  if (key === "price_usd")
    return `$${Number(value).toLocaleString("en-US", {
      minimumFractionDigits: 0, maximumFractionDigits: 2
    })}`;
  if (key === "subscription_usd_monthly")
    return Number(value) === 0 ? "None" : `$${value} / month`;
  const unit = extendedCategoryModels[category].fields.find((f) => f.key === key)?.unit;
  return `${value}${unit ? ` ${unit}` : ""}`;
}
export function scoreExtendedComparison(category: ExtendedCategorySlug, left: ExtendedProduct, right: ExtendedProduct, preset = "balanced") {
  const model = extendedCategoryModels[category], chosen = model.presets[Object.hasOwn(model.presets, preset) ? preset : "balanced"], a = verifiedExtendedSpecs(category, left), b = verifiedExtendedSpecs(category, right);
  let availableWeight = 0, leftPoints = 0;
  const factors = model.fields.filter((f) => chosen.weights[f.key] > 0).map((field) => {
    const weight = chosen.weights[field.key], av = a[field.key], bv = b[field.key], available = av !== undefined && bv !== undefined; let share = .5; if (available) {
      if (typeof av === "boolean")
        share = av === bv ? .5 : av ? 1 : 0;
      else {
        const an = Number(av), bn = Number(bv);
        if (an + bn > 0)
          share = field.direction === "lower" ? bn / (an + bn) : an / (an + bn);
      }
      availableWeight += weight;
      leftPoints += share * weight;
    } return {
      ...field, weight, available, leftValue: av, rightValue: bv, winner: !available ? "unknown" : av === bv ? "tie" : share > .5 ? "left" : "right"
    };
  });
  const sharedFields = model.fields.filter((f) => a[f.key] !== undefined && b[f.key] !== undefined).length, scoreLeft = availableWeight ? Math.round(leftPoints / availableWeight * 1000) / 10 : null;
  let unavailableReason: string | null = null;
  if (category === "game-consoles" && preset === "portable") {
    const portable = (specs: typeof a) => ["hybrid", "handheld-pc"].includes(String(specs.form_factor)) && typeof specs.display_refresh_hz === "number" && typeof specs.battery_hours_min === "number" && typeof specs.battery_hours_max === "number";
    if (!portable(a) || !portable(b))
      unavailableReason = "Portable scoring requires two portable systems with sourced display and battery specifications. Try Balanced or Living room for this pair.";
  }
  if (category === "vr-headsets" && preset === "standalone" && (a.standalone !== true || b.standalone !== true || a.battery_hours === undefined || b.battery_hours === undefined))
    unavailableReason = "Standalone scoring requires two headsets with verified standalone operation and battery specifications. Try Balanced for this pair.";
  if (!unavailableReason && (sharedFields < model.minimumShared || availableWeight < model.minimumCoverage))
    unavailableReason = "This preset does not have enough shared sourced evidence.";
  const eligible = unavailableReason === null;
  return {
    factors, coveragePercent: availableWeight, sharedFields, eligible, unavailableReason, scoreLeft: eligible ? scoreLeft : null, scoreRight: eligible && scoreLeft !== null ? Math.round((100 - scoreLeft) * 10) / 10 : null
  };
}
export function extendedDataVersion(category: ExtendedCategorySlug, left: ExtendedProduct, right: ExtendedProduct) { return JSON.stringify([extendedCategoryModels[category].scoringVersion, ...[left, right].sort((a, b) => a.id.localeCompare(b.id)).map((p) => [p.id, p.specsJson, p.specProvenanceJson, p.updatedAt ?? null])]); }
export function draftExtendedVerdict(category: ExtendedCategorySlug, left: ExtendedProduct, right: ExtendedProduct, preset = "balanced") {
  const model = extendedCategoryModels[category];
  const presetKey = Object.hasOwn(model.presets, preset) ? preset : "balanced";
  const label = model.presets[presetKey].label.toLowerCase();
  const score = scoreExtendedComparison(category, left, right, presetKey);
  if (!score.eligible)
    return {
      headline: "No supported recommendation for this preset",
      summary: score.unavailableReason!, buyLeft: "", buyRight: "", evidence: [],
    };
  const win = score.scoreLeft === score.scoreRight ? null : (score.scoreLeft ?? 0) > (score.scoreRight ?? 0) ? left : right;
  const strengths = (side: "left" | "right") => score.factors.filter((f) => f.available && f.winner === side).slice(0, 4).map((f) => `${f.label.toLowerCase()} (${formatExtendedSpec(category, f.key, side === "left" ? f.leftValue : f.rightValue)})`);
  const l = strengths("left"), r = strengths("right");
  return {
    headline: win ? `${win.canonicalName} leads on the ${label} ${model.name.toLowerCase()} model` : "The measured trade-offs are tied",
    summary: `Based on ${score.sharedFields} shared sourced fields and ${score.coveragePercent}% ${label} scoring coverage. ${model.limitations}`,
    buyLeft: l.length ? `Consider ${left.canonicalName} for ${l.join(", ")}.` : `Choose ${left.canonicalName} when its form factor, platform, or ecosystem fits you better.`,
    buyRight: r.length ? `Consider ${right.canonicalName} for ${r.join(", ")}.` : `Choose ${right.canonicalName} when its form factor, platform, or ecosystem fits you better.`,
    evidence: score.factors.filter((f) => f.available).map((f) => ({
      key: f.key, left: f.leftValue, right: f.rightValue, winner: f.winner
    })),
  };
}
