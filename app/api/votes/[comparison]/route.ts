import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { catalogProducts, comparisons, voteAttempts, votes } from "@/db/schema";
import { getComparisonProducts } from "@/lib/products";
import { normalizeVoteDimension, type VoteDimension } from "@/lib/vote-contract";
import { createVisitorToken, createVoteActionToken, hashVoteIdentifier, verifyVisitorToken, verifyVoteActionToken } from "@/lib/vote-security";

type RouteContext = { params: Promise<{ comparison: string }> };
type VoteContext = { choices: string[]; categorySlug: string | null };
const visitorCookie = "bt_vote_session";

async function voteSecret() {
  const { env } = await import("cloudflare:workers");
  const secret = (env as unknown as { VOTE_SIGNING_SECRET?: string }).VOTE_SIGNING_SECRET?.trim();
  return secret && secret.length >= 32 ? secret : null;
}

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

function visitorCookieHeader(token: string) {
  return `${visitorCookie}=${encodeURIComponent(token)}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`;
}

function safeOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).hostname === new URL(request.url).hostname; } catch { return false; }
}

async function allowedVoteContext(comparison: string): Promise<VoteContext | null> {
  const db = getDb();
  const [record] = await db.select().from(comparisons).where(eq(comparisons.slug, comparison)).limit(1);
  // Catalog records own their voting rules, even when an older URL shares a slug.
  // Do not let a withdrawn catalog comparison fall back to the legacy record.
  if (!record) {
    const staticPair = getComparisonProducts(comparison);
    return staticPair ? { choices: staticPair.map((product) => product.slug), categorySlug: null } : null;
  }
  if (record.status !== "published") return null;
  const rows = await Promise.all([record.leftProductId, record.rightProductId].map(async (id) => (await db.select({ slug: catalogProducts.slug }).from(catalogProducts).where(and(eq(catalogProducts.id, id), eq(catalogProducts.status, "published"))).limit(1))[0]));
  return rows.every(Boolean) ? { choices: rows.map((row) => row.slug), categorySlug: record.categorySlug } : null;
}

function requestedDimension(request: Request, categorySlug: string | null) {
  const url = new URL(request.url);
  return normalizeVoteDimension(url.searchParams.get("dimensionType"), url.searchParams.get("dimensionKey"), categorySlug);
}

async function voteTotals(comparison: string, dimension: VoteDimension) {
  const db = getDb();
  const rows = await db.select({ choiceSlug: votes.choiceSlug, total: sql<number>`count(*)` }).from(votes).where(and(eq(votes.comparisonSlug, comparison), eq(votes.dimensionType, dimension.type), eq(votes.dimensionKey, dimension.key))).groupBy(votes.choiceSlug);
  return Object.fromEntries(rows.map((row) => [row.choiceSlug, Number(row.total)]));
}

function nextActionToken(secret: string, visitorHash: string, comparison: string, dimension: VoteDimension) {
  return createVoteActionToken(secret, { visitorHash, comparison, dimensionType: dimension.type, dimensionKey: dimension.key });
}

export async function GET(request: Request, { params }: RouteContext) {
  const { comparison } = await params;
  const context = await allowedVoteContext(comparison);
  if (!context) return Response.json({ error: "Comparison not found" }, { status: 404 });
  const dimension = requestedDimension(request, context.categorySlug);
  if (!dimension) return Response.json({ error: "This voting category is unavailable" }, { status: 400 });
  const secret = await voteSecret();
  if (!secret) return Response.json({ error: "Voting is temporarily unavailable" }, { status: 503 });

  let token = cookieValue(request, visitorCookie);
  let visitor = token ? await verifyVisitorToken(secret, token) : null;
  let setCookie: string | null = null;
  if (!visitor) {
    token = await createVisitorToken(secret);
    visitor = await verifyVisitorToken(secret, token);
    setCookie = visitorCookieHeader(token);
  }
  if (!visitor) return Response.json({ error: "Voting is temporarily unavailable" }, { status: 503 });

  try {
    const db = getDb();
    const visitorHash = await hashVoteIdentifier(secret, visitor.visitorId);
    const [existing] = await db.select({ choiceSlug: votes.choiceSlug }).from(votes).where(and(eq(votes.comparisonSlug, comparison), eq(votes.visitorId, visitorHash), eq(votes.dimensionType, dimension.type), eq(votes.dimensionKey, dimension.key))).limit(1);
    const response = Response.json({ choice: existing?.choiceSlug ?? null, hasVoted: Boolean(existing), totals: existing ? await voteTotals(comparison, dimension) : {}, actionToken: await nextActionToken(secret, visitorHash, comparison, dimension) });
    if (setCookie) response.headers.set("set-cookie", setCookie);
    return response;
  } catch {
    return Response.json({ error: "Voting is temporarily unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const { comparison } = await params;
  const context = await allowedVoteContext(comparison);
  if (!context) return Response.json({ error: "Comparison not found" }, { status: 404 });
  if (!safeOrigin(request) || !request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return Response.json({ error: "The vote could not be verified" }, { status: 403 });
  const secret = await voteSecret();
  if (!secret) return Response.json({ error: "Voting is temporarily unavailable" }, { status: 503 });
  const visitorToken = cookieValue(request, visitorCookie);
  const visitor = visitorToken ? await verifyVisitorToken(secret, visitorToken) : null;
  if (!visitor) return Response.json({ error: "Refresh the page before voting" }, { status: 401 });

  let payload: { choiceSlug?: string; dimensionType?: string; dimensionKey?: string; actionToken?: string; website?: string };
  try { payload = await request.json() as typeof payload; } catch { return Response.json({ error: "Invalid vote" }, { status: 400 }); }
  const choiceSlug = payload.choiceSlug?.trim();
  const dimension = normalizeVoteDimension(payload.dimensionType, payload.dimensionKey, context.categorySlug);
  if (!choiceSlug || !context.choices.includes(choiceSlug) || !dimension || payload.website) return Response.json({ error: "Invalid vote" }, { status: 400 });

  const visitorHash = await hashVoteIdentifier(secret, visitor.visitorId);
  const action = payload.actionToken ? await verifyVoteActionToken(secret, payload.actionToken, { visitorHash, comparison, dimensionType: dimension.type, dimensionKey: dimension.key }) : null;
  if (!action) return Response.json({ error: "This voting request expired. Refresh and try again." }, { status: 403 });
  const networkSignal = request.headers.get("cf-connecting-ip") ?? request.headers.get("user-agent") ?? "unknown";
  const networkHash = await hashVoteIdentifier(secret, networkSignal);
  const nonceHash = await hashVoteIdentifier(secret, action.nonce);

  try {
    const db = getDb();
    const [visitorRate, networkRate] = await Promise.all([
      db.select({ total: sql<number>`count(*)` }).from(voteAttempts).where(and(eq(voteAttempts.visitorHash, visitorHash), sql`${voteAttempts.createdAt} >= datetime('now', '-1 minute')`)),
      db.select({ total: sql<number>`count(*)` }).from(voteAttempts).where(and(eq(voteAttempts.networkHash, networkHash), sql`${voteAttempts.createdAt} >= datetime('now', '-1 minute')`)),
    ]);
    const rateLimited = Number(visitorRate[0]?.total ?? 0) >= 8 || Number(networkRate[0]?.total ?? 0) >= 30;
    await db.insert(voteAttempts).values({ comparisonSlug: comparison, visitorHash, networkHash, nonceHash, outcome: rateLimited ? "rate_limited" : "accepted" });
    if (rateLimited) return Response.json({ error: "Please wait a moment before voting again.", challengeRequired: true, actionToken: await nextActionToken(secret, visitorHash, comparison, dimension) }, { status: 429 });
    await db.insert(votes).values({ comparisonSlug: comparison, visitorId: visitorHash, dimensionType: dimension.type, dimensionKey: dimension.key, choiceSlug }).onConflictDoUpdate({ target: [votes.comparisonSlug, votes.visitorId, votes.dimensionType, votes.dimensionKey], set: { choiceSlug, updatedAt: sql`CURRENT_TIMESTAMP` } });
    return Response.json({ choice: choiceSlug, hasVoted: true, totals: await voteTotals(comparison, dimension), actionToken: await nextActionToken(secret, visitorHash, comparison, dimension) });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("unique") || message.includes("constraint")) return Response.json({ error: "That voting request was already used. Please try again.", actionToken: await nextActionToken(secret, visitorHash, comparison, dimension) }, { status: 409 });
    return Response.json({ error: "Voting is temporarily unavailable" }, { status: 503 });
  }
}
