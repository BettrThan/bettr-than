export const approvedManufacturerDomains = [
  "apple.com", "bang-olufsen.com", "beatsbydre.com", "bose.com", "bowerswilkins.com", "cambridgeaudio.com",
  "asus.com", "bigscreenvr.com", "fitbit.com", "focal.com", "garmin.com", "google.com", "htc.com", "jbl.com", "lenovo.com", "marshall.com", "msi.com",
  "meta.com", "microsoft.com", "nintendo.com", "oneplus.com", "playstation.com",
  "ouraring.com", "pimax.com", "ringconn.com", "samsung.com", "sennheiser-hearing.com", "sony.com", "steamdeck.com", "steampowered.com", "ultimateears.com", "valvesoftware.com", "vive.com", "whoop.com", "xbox.com",
] as const;

export type NormalizedFact = {
  key: string; label: string; value: string; numericValue: number | null;
  unit: string | null; confidence: number; sourceUrl: string; retrievedAt: string;
};

export type ExtractedCandidate = {
  canonicalName: string; brand: string; description: string; imageUrl: string | null;
  facts: NormalizedFact[]; conflicts: string[];
};

export function assertApprovedSource(sourceUrl: string) {
  const parsed = new URL(sourceUrl);
  const allowed = approvedManufacturerDomains.some((domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`));
  if (parsed.protocol !== "https:" || !allowed) throw new Error("Use an HTTPS product page from an approved manufacturer.");
  if (parsed.username || parsed.password || parsed.port) throw new Error("Source URL contains unsupported credentials or a port.");
  return parsed;
}

function officialFallbackSource(source: URL) {
  const path = source.pathname.toLowerCase();
  if (source.hostname === "electronics.sony.com" && path.includes("wh1000xm6")) {
    return new URL("https://www.sony.com/electronics/support/wireless-headphones-bluetooth-headphones/wh-1000xm6/specifications");
  }
  if (source.hostname === "www.jbl.com" && path.includes("tour-one-m3-tx")) {
    return new URL("https://global.jbl.com/over-ear-headphones/TOUR-ONE-M3-TX.html");
  }
  if (source.hostname === "www.jbl.com" && path.includes("tour-one-m3")) {
    return new URL("https://global.jbl.com/over-ear-headphones/TOUR-ONE-M3.html");
  }
  return null;
}

export function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

const decodeHtml = (value: string) => value
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">");

const meta = (html: string, key: string) => {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["'][^>]*>`, "i"),
  ];
  return patterns.map((pattern) => html.match(pattern)?.[1]).find(Boolean);
};

function findProductNode(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) { const found = findProductNode(item); if (found) return found; }
    return null;
  }
  const record = value as Record<string, unknown>;
  const kind = record["@type"];
  if (kind === "Product" || (Array.isArray(kind) && kind.includes("Product"))) return record;
  for (const child of Object.values(record)) { const found = findProductNode(child); if (found) return found; }
  return null;
}

function textValue(value: unknown): string | null {
  if (typeof value === "string" || typeof value === "number") return String(value).trim() || null;
  if (value && typeof value === "object" && "name" in value) return textValue((value as { name: unknown }).name);
  return null;
}

function extractJsonLd(html: string) {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const script of scripts) {
    try { const product = findProductNode(JSON.parse(decodeHtml(script[1]))); if (product) return product; } catch { /* malformed vendor JSON-LD */ }
  }
  return null;
}

function normalizeFact(label: string, rawValue: string, sourceUrl: string, retrievedAt: string, confidence: number): NormalizedFact {
  const value = rawValue.replace(/\s+/g, " ").trim().slice(0, 220);
  const match = value.match(/-?\d+(?:\.\d+)?/);
  const unitMatch = value.match(/\b(hours?|hrs?|mah|gb|tb|hz|grams?|kg|lbs?|ounces?|oz|inches?|mm|cm|watts?|w)\b/i);
  return { key: slugify(label).replace(/-/g, "_") || "specification", label: label.replace(/\s+/g, " ").trim().slice(0, 80), value, numericValue: match ? Number.parseFloat(match[0]) : null, unit: unitMatch?.[1]?.toLowerCase() ?? null, confidence, sourceUrl, retrievedAt };
}

function collectAdditionalProperties(product: Record<string, unknown> | null, sourceUrl: string, retrievedAt: string) {
  const additional = product?.additionalProperty;
  if (!Array.isArray(additional)) return [];
  return additional.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const property = item as Record<string, unknown>;
    const label = textValue(property.name); const value = textValue(property.value);
    return label && value ? [normalizeFact(label, value, sourceUrl, retrievedAt, 0.95)] : [];
  });
}

function collectTextFacts(html: string, sourceUrl: string, retrievedAt: string) {
  const text = decodeHtml(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
  const patterns: Array<[string, RegExp]> = [
    ["Battery life", /battery life.{0,45}?(up to\s+)?(\d+(?:\.\d+)?\s*(?:hours?|hrs?))/i],
    ["Water resistance", /(?:water(?:proof| resistance)?|ip rating).{0,35}?(IP\d{2})/i],
    ["Weight", /(?:product )?weight.{0,25}?(\d+(?:\.\d+)?\s*(?:kg|g|grams?|lbs?|ounces?|oz))/i],
    ["Storage", /(?:storage|capacity).{0,30}?(\d+(?:\.\d+)?\s*(?:GB|TB))/i],
    ["Refresh rate", /(?:refresh rate).{0,25}?(\d+(?:\.\d+)?\s*Hz)/i],
    ["Bluetooth", /bluetooth(?:®)?\s+(?:version|v)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i],
  ];
  return patterns.flatMap(([label, pattern]) => { const match = text.match(pattern); return match ? [normalizeFact(label, match[2] ?? match[1], sourceUrl, retrievedAt, 0.72)] : []; });
}

function dedupeAndFlag(facts: NormalizedFact[]) {
  const byKey = new Map<string, NormalizedFact>(); const conflicts: string[] = [];
  for (const fact of facts) {
    const current = byKey.get(fact.key);
    if (!current) byKey.set(fact.key, fact);
    else if (current.value.toLowerCase() !== fact.value.toLowerCase()) {
      conflicts.push(`${fact.label}: “${current.value}” conflicts with “${fact.value}”`);
      if (fact.confidence > current.confidence) byKey.set(fact.key, fact);
    }
  }
  return { facts: [...byKey.values()].slice(0, 40), conflicts };
}

export function extractCandidate(html: string, sourceUrl: string): ExtractedCandidate {
  const retrievedAt = new Date().toISOString(); const product = extractJsonLd(html);
  const title = decodeHtml(meta(html, "og:title") ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").replace(/\s*[|–—]\s*.+$/, "").replace(/^(?:shop|buy|official)\s+/i, "").trim();
  const canonicalName = (textValue(product?.name) ?? title).replace(/^(?:shop|buy|official)\s+/i, "").replace(/\s+(?:specifications|specs|support)$/i, "").trim();
  const host = new URL(sourceUrl).hostname;
  const knownBrands: Array<[string, string]> = [["apple.com", "Apple"], ["beatsbydre.com", "Beats"], ["bose.com", "Bose"], ["garmin.com", "Garmin"], ["google.com", "Google"], ["jbl.com", "JBL"], ["lenovo.com", "Lenovo"], ["meta.com", "Meta"], ["microsoft.com", "Microsoft"], ["nintendo.com", "Nintendo"], ["oneplus.com", "OnePlus"], ["playstation.com", "PlayStation"], ["samsung.com", "Samsung"], ["sony.com", "Sony"], ["ultimateears.com", "Ultimate Ears"]];
  const brand = textValue(product?.brand) ?? knownBrands.find(([domain]) => host === domain || host.endsWith(`.${domain}`))?.[1] ?? canonicalName.split(/\s+/)[0] ?? "";
  const description = (textValue(product?.description) ?? meta(html, "og:description") ?? meta(html, "description") ?? "").slice(0, 600);
  const productImage = Array.isArray(product?.image) ? textValue(product?.image[0]) : textValue(product?.image);
  const imageUrl = productImage ?? meta(html, "og:image") ?? null;
  const checked = dedupeAndFlag([...collectAdditionalProperties(product, sourceUrl, retrievedAt), ...collectTextFacts(html, sourceUrl, retrievedAt)]);
  if (!canonicalName) checked.conflicts.push("Product name could not be extracted.");
  if (!brand) checked.conflicts.push("Brand could not be extracted.");
  if (!checked.facts.length) checked.conflicts.push("No structured specifications were detected; do not approve until facts are available.");
  return { canonicalName, brand, description, imageUrl, facts: checked.facts, conflicts: checked.conflicts };
}

export async function fetchApprovedHtml(initialUrl: string) {
  const maxExtractionBytes = 4_000_000;
  let current = assertApprovedSource(initialUrl);
  const attempted = new Set<string>();
  for (let redirects = 0; redirects < 4; redirects += 1) {
    attempted.add(current.toString());
    const response = await fetch(current, { redirect: "manual", headers: { "User-Agent": "BettrThanBot/1.0 (+https://www.bettrthan.com)", Accept: "text/html,application/xhtml+xml" } });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location"); if (!location) throw new Error("Manufacturer returned an invalid redirect.");
      current = assertApprovedSource(new URL(location, current).toString()); continue;
    }
    if (response.status === 403) {
      const fallback = officialFallbackSource(current);
      if (fallback && !attempted.has(fallback.toString())) { current = assertApprovedSource(fallback.toString()); continue; }
      throw new Error("This manufacturer blocks automated access. Try another official product or specifications page.");
    }
    if (!response.ok) throw new Error(`Manufacturer returned HTTP ${response.status}.`);
    if (!(response.headers.get("content-type") ?? "").includes("text/html")) throw new Error("The source did not return an HTML product page.");
    const reader = response.body?.getReader(); if (!reader) throw new Error("The source returned an empty response.");
    const chunks: Uint8Array[] = []; let length = 0; let truncated = false;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const remaining = maxExtractionBytes - length;
      if (remaining <= 0) { truncated = true; await reader.cancel(); break; }
      if (value.byteLength > remaining) {
        chunks.push(value.slice(0, remaining)); length += remaining; truncated = true;
        await reader.cancel(); break;
      }
      chunks.push(value); length += value.byteLength;
    }
    const body = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    return { html: new TextDecoder().decode(body), finalUrl: current.toString(), truncated };
  }
  throw new Error("Manufacturer redirected too many times.");
}
