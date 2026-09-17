import { approvedManufacturerDomains } from "@/lib/agents/product-ingestion";
import { headphoneFields, sanitizeHeadphoneSpecs, type HeadphoneSpecs } from "@/lib/headphone-specs";

export type CsvProductInput = {
  rowNumber: number;
  canonicalName: string;
  brand: string;
  sourceUrl: string;
  imageUrl: string;
  description: string;
  notes: string;
  specs: HeadphoneSpecs;
};

export type CsvProductPreview = CsvProductInput & {
  errors: string[];
  specCount: number;
};

const normalizeHeader = (value: string) => value
  .replace(/^\uFEFF/, "")
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const fieldAliases: Record<string, string[]> = {
  price_usd: ["price usd", "current price", "price"],
  form_factor: ["form factor"],
  battery_life_hours: ["maximum battery life hours", "maximum battery life", "battery life hours"],
  battery_anc_hours: ["battery life with anc hours", "battery life with anc", "battery anc hours"],
  active_noise_cancellation: ["active noise cancellation", "anc"],
  transparency_mode: ["transparency ambient mode", "transparency mode", "ambient mode"],
  weight_grams: ["weight grams", "weight"],
  bluetooth_version: ["bluetooth version"],
  multipoint: ["bluetooth multipoint", "multipoint"],
  wired_audio: ["wired audio"],
  usb_c_audio: ["usb c audio", "usbc audio"],
  charge_time_hours: ["full charge time hours", "full charge time", "charge time hours"],
  spatial_audio: ["spatial audio"],
  water_resistance: ["water resistance"],
  foldable: ["foldable"],
  carrying_case: ["carrying case included", "carrying case"],
};

export const csvTemplateHeaders = [
  "Canonical Product Name",
  "Brand",
  "Official Product URL",
  "Official Image URL",
  "Short Description",
  "Price USD",
  "Form Factor",
  "Maximum Battery Life Hours",
  "Battery Life with ANC Hours",
  "Active Noise Cancellation",
  "Transparency / Ambient Mode",
  "Weight Grams",
  "Bluetooth Version",
  "Bluetooth Multipoint",
  "Wired Audio",
  "USB-C Audio",
  "Full Charge Time Hours",
  "Spatial Audio",
  "Water Resistance",
  "Foldable",
  "Carrying Case Included",
  "Research Notes",
];

export function parseCsvGrid(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (character === "\n") {
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else if (character !== "\r") {
      cell += character;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  if (quoted) throw new Error("The CSV contains an unfinished quoted value.");
  return rows;
}

function approvedSource(value: string) {
  try {
    const source = new URL(value);
    return source.protocol === "https:" && approvedManufacturerDomains.some((domain) => source.hostname === domain || source.hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

function validImageUrl(value: string) {
  if (!value) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

export function parseProductCsv(text: string): CsvProductPreview[] {
  const grid = parseCsvGrid(text);
  if (grid.length < 2) throw new Error("The CSV needs a header row and at least one product row.");
  if (grid.length > 101) throw new Error("Import up to 100 products at a time.");

  const headers = grid[0].map(normalizeHeader);
  const indexes = new Map(headers.map((header, index) => [header, index]));
  const valueFor = (row: string[], aliases: string[]) => {
    for (const alias of aliases) {
      const index = indexes.get(normalizeHeader(alias));
      if (index !== undefined) return row[index]?.trim() ?? "";
    }
    return "";
  };

  const requiredHeaders = ["canonical product name", "brand", "official product url"];
  const missingHeaders = requiredHeaders.filter((header) => !indexes.has(header));
  if (missingHeaders.length) throw new Error(`Missing required column${missingHeaders.length === 1 ? "" : "s"}: ${missingHeaders.join(", ")}.`);

  const seenNames = new Set<string>();
  return grid.slice(1).map((row, rowIndex) => {
    const canonicalName = valueFor(row, ["Canonical Product Name", "Product Name", "canonicalName", "name"]);
    const brand = valueFor(row, ["Brand"]);
    const sourceUrl = valueFor(row, ["Official Product URL", "Source URL", "sourceUrl"]);
    const imageUrl = valueFor(row, ["Official Image URL", "Image URL", "imageUrl"]);
    const description = valueFor(row, ["Short Description", "Description"]);
    const notes = valueFor(row, ["Research Notes", "Notes"]);
    const rawSpecs = Object.fromEntries(headphoneFields.map((field) => [
      field.key,
      valueFor(row, [field.key, field.label, ...(fieldAliases[field.key] ?? [])]),
    ]));
    const specs = sanitizeHeadphoneSpecs(rawSpecs);
    const specCount = Object.keys(specs).length;
    const errors: string[] = [];
    const nameKey = canonicalName.toLowerCase();
    if (!canonicalName) errors.push("Product name is required.");
    else if (seenNames.has(nameKey)) errors.push("Duplicate product name in this CSV.");
    else seenNames.add(nameKey);
    if (!brand) errors.push("Brand is required.");
    if (!sourceUrl) errors.push("Official product URL is required.");
    else if (!approvedSource(sourceUrl)) errors.push("Use an HTTPS URL from an approved manufacturer.");
    if (!validImageUrl(imageUrl)) errors.push("Image URL must use HTTPS.");
    if (specCount < 3) errors.push(`Add at least three verified specifications (${specCount}/3 complete).`);

    return { rowNumber: rowIndex + 2, canonicalName, brand, sourceUrl, imageUrl, description, notes, specs, specCount, errors };
  });
}
