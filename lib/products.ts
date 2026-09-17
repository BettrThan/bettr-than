export type ProductSpec = {
  label: string;
  value: string;
  numeric?: number;
  unit?: string;
  rule?: "higher" | "lower" | "boolean" | "editorial";
  highlight?: boolean;
};

export type Product = {
  slug: string;
  brand: string;
  name: string;
  shortName: string;
  eyebrow: string;
  description: string;
  price: number;
  accent: "blue" | "orange" | "violet" | "green";
  initials: string;
  sourceUrl: string;
  sourceName: string;
  checkedAt: string;
  specs: Record<string, ProductSpec>;
};

export const products: Product[] = [
  {
    slug: "bose-soundlink-flex-2",
    brand: "Bose",
    name: "Bose SoundLink Flex Portable Speaker (2nd Gen)",
    shortName: "SoundLink Flex",
    eyebrow: "Best all-around",
    description:
      "A compact, rugged speaker with balanced sound, dependable battery life, and PositionIQ orientation sensing.",
    price: 129,
    accent: "blue",
    initials: "B",
    sourceUrl:
      "https://www.bose.com/p/speakers/bose-soundlink-flex-portable-speaker-2nd-gen/SLFLXII-SPEAKERWIRELESS.html",
    sourceName: "Bose",
    checkedAt: "September 3, 2026",
    specs: {
      battery: { label: "Battery", value: "Up to 12 hr", numeric: 12, unit: "hr", rule: "higher" },
      water: { label: "Water & dust", value: "IP67", numeric: 67, rule: "higher", highlight: true },
      weight: { label: "Weight", value: "1.3 lb", numeric: 1.3, unit: "lb", rule: "lower" },
      usb: { label: "USB-C", value: "Yes", numeric: 1, rule: "boolean" },
      multipoint: { label: "Multipoint", value: "Yes", numeric: 1, rule: "boolean", highlight: true },
      floats: { label: "Floats", value: "Yes", numeric: 1, rule: "boolean" },
    },
  },
  {
    slug: "jbl-flip-7",
    brand: "JBL",
    name: "JBL Flip 7",
    shortName: "Flip 7",
    eyebrow: "Best for durability",
    description:
      "A punchy portable speaker with an extra-rugged IP68 build and extended playtime through Playtime Boost.",
    price: 149.95,
    accent: "orange",
    initials: "J",
    sourceUrl: "https://www.jbl.com/bluetooth-speakers/FLIP-7.html",
    sourceName: "JBL",
    checkedAt: "September 3, 2026",
    specs: {
      battery: { label: "Battery", value: "14 hr / 16 boost", numeric: 14, unit: "hr", rule: "higher", highlight: true },
      water: { label: "Water & dust", value: "IP68", numeric: 68, rule: "higher", highlight: true },
      weight: { label: "Weight", value: "1.82 lb", numeric: 1.82, unit: "lb", rule: "lower" },
      usb: { label: "USB-C", value: "Yes", numeric: 1, rule: "boolean" },
      floats: { label: "Floats", value: "No", numeric: 0, rule: "boolean" },
    },
  },
  {
    slug: "sony-ult-field-1",
    brand: "Sony",
    name: "Sony ULT FIELD 1",
    shortName: "ULT FIELD 1",
    eyebrow: "Best bass boost",
    description:
      "A travel-ready speaker with a dedicated ULT bass mode, shockproof construction, and a carry strap.",
    price: 99.99,
    accent: "violet",
    initials: "S",
    sourceUrl: "https://electronics.sony.com/audio/speakers/portable-speakers/p/srsult10-b",
    sourceName: "Sony",
    checkedAt: "September 3, 2026",
    specs: {
      battery: { label: "Battery", value: "Up to 12 hr", numeric: 12, unit: "hr", rule: "higher" },
      water: { label: "Water & dust", value: "IP67", numeric: 67, rule: "higher" },
      weight: { label: "Weight", value: "1.43 lb", numeric: 1.43, unit: "lb", rule: "lower" },
      usb: { label: "USB-C", value: "Yes", numeric: 1, rule: "boolean" },
      floats: { label: "Floats", value: "No", numeric: 0, rule: "boolean" },
    },
  },
  {
    slug: "ue-wonderboom-4",
    brand: "Ultimate Ears",
    name: "Ultimate Ears WONDERBOOM 4",
    shortName: "WONDERBOOM 4",
    eyebrow: "Best value",
    description:
      "A small, buoyant outdoor speaker with 360-degree sound, simple controls, and a notably low weight.",
    price: 69.99,
    accent: "green",
    initials: "UE",
    sourceUrl: "https://www.ultimateears.com/en-us/shop/p/wonderboom-4",
    sourceName: "Ultimate Ears",
    checkedAt: "September 3, 2026",
    specs: {
      battery: { label: "Battery", value: "Up to 14 hr", numeric: 14, unit: "hr", rule: "higher", highlight: true },
      water: { label: "Water & dust", value: "IP67", numeric: 67, rule: "higher" },
      weight: { label: "Weight", value: "0.93 lb", numeric: 0.93, unit: "lb", rule: "lower", highlight: true },
      usb: { label: "USB-C", value: "Yes", numeric: 1, rule: "boolean" },
      floats: { label: "Floats", value: "Yes", numeric: 1, rule: "boolean", highlight: true },
    },
  },
];

export const getProduct = (slug: string) =>
  products.find((product) => product.slug === slug);

export const comparisonSlug = (a: Product, b: Product) =>
  [a.slug, b.slug].sort().join("-vs-");

export const getComparisonProducts = (slug: string) => {
  for (const left of products) {
    for (const right of products) {
      if (left.slug !== right.slug && comparisonSlug(left, right) === slug) {
        return [left, right] as const;
      }
    }
  }
  return null;
};

const weights: Record<string, number> = {
  battery: 24,
  water: 20,
  weight: 16,
  usb: 10,
  floats: 16,
};

export function scoreComparison(a: Product, b: Product) {
  let scoreA = 0;
  let scoreB = 0;
  const factors = Object.keys(weights).map((key) => {
    const left = a.specs[key];
    const right = b.specs[key];
    const weight = weights[key];
    const direction = left.rule === "lower" ? -1 : 1;
    const delta = ((left.numeric ?? 0) - (right.numeric ?? 0)) * direction;
    if (delta > 0) scoreA += weight;
    else if (delta < 0) scoreB += weight;
    else {
      scoreA += weight / 2;
      scoreB += weight / 2;
    }
    return {
      key,
      label: left.label,
      left: left.value,
      right: right.value,
      winner: delta === 0 ? null : delta > 0 ? a.slug : b.slug,
    };
  });

  const priceWeight = 20;
  if (a.price < b.price) scoreA += priceWeight;
  else if (b.price < a.price) scoreB += priceWeight;
  else {
    scoreA += priceWeight / 2;
    scoreB += priceWeight / 2;
  }
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0) + priceWeight;
  const normalizedA = Math.round((scoreA / total) * 100);
  const normalizedB = Math.round((scoreB / total) * 100);
  return {
    scoreA: normalizedA,
    scoreB: normalizedB,
    winner: normalizedA === normalizedB ? null : normalizedA > normalizedB ? a : b,
    factors,
  };
}
