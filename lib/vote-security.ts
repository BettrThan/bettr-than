const encoder = new TextEncoder();
const decoder = new TextDecoder();

type VisitorToken = {
  version: 1;
  visitorId: string;
  issuedAt: number;
  expiresAt: number;
};

type ActionToken = {
  version: 1;
  visitorHash: string;
  comparison: string;
  dimensionType: string;
  dimensionKey: string;
  nonce: string;
  expiresAt: number;
};

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signingKey(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function signPayload(secret: string, payload: string) {
  const signature = await crypto.subtle.sign("HMAC", await signingKey(secret), encoder.encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

async function encodeSigned<T>(secret: string, value: T) {
  const payload = toBase64Url(encoder.encode(JSON.stringify(value)));
  return `${payload}.${await signPayload(secret, payload)}`;
}

async function decodeSigned<T>(secret: string, token: string): Promise<T | null> {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  try {
    if (!/^[A-Za-z0-9_-]+$/.test(payload) || !/^[A-Za-z0-9_-]+$/.test(signature)) return null;
    if (toBase64Url(fromBase64Url(signature)) !== signature || toBase64Url(fromBase64Url(payload)) !== payload) return null;
    const valid = await crypto.subtle.verify("HMAC", await signingKey(secret), fromBase64Url(signature), encoder.encode(payload));
    if (!valid) return null;
    return JSON.parse(decoder.decode(fromBase64Url(payload))) as T;
  } catch {
    return null;
  }
}

export async function hashVoteIdentifier(secret: string, value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", encoder.encode(`${secret}:${value}`));
  return toBase64Url(new Uint8Array(bytes));
}

export async function createVisitorToken(secret: string, now = Date.now()) {
  return encodeSigned<VisitorToken>(secret, {
    version: 1,
    visitorId: crypto.randomUUID(),
    issuedAt: now,
    expiresAt: now + 365 * 24 * 60 * 60 * 1000,
  });
}

export async function verifyVisitorToken(secret: string, token: string, now = Date.now()) {
  const value = await decodeSigned<VisitorToken>(secret, token);
  if (!value || value.version !== 1 || !value.visitorId || value.expiresAt <= now || value.issuedAt > now + 60_000) return null;
  return value;
}

export async function createVoteActionToken(secret: string, input: Omit<ActionToken, "version" | "nonce" | "expiresAt">, now = Date.now()) {
  return encodeSigned<ActionToken>(secret, {
    version: 1,
    ...input,
    nonce: crypto.randomUUID(),
    expiresAt: now + 10 * 60 * 1000,
  });
}

export async function verifyVoteActionToken(secret: string, token: string, expected: Omit<ActionToken, "version" | "nonce" | "expiresAt">, now = Date.now()) {
  const value = await decodeSigned<ActionToken>(secret, token);
  if (!value || value.version !== 1 || value.expiresAt <= now) return null;
  if (value.visitorHash !== expected.visitorHash || value.comparison !== expected.comparison || value.dimensionType !== expected.dimensionType || value.dimensionKey !== expected.dimensionKey) return null;
  return value;
}
