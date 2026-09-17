import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { after } from "node:test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false },
});

after(async () => vite.close());

test("signs browser identity and rejects tampering or expiry", async () => {
  const { createVisitorToken, verifyVisitorToken } = await vite.ssrLoadModule("/lib/vote-security.ts");
  const secret = "a-secure-test-secret-that-is-long-enough";
  const issued = 1_800_000_000_000;
  const token = await createVisitorToken(secret, issued);

  assert.ok(await verifyVisitorToken(secret, token, issued + 1_000));
  assert.equal(await verifyVisitorToken(secret, `${token.slice(0, -1)}x`, issued + 1_000), null);
  assert.equal(await verifyVisitorToken(secret, token, issued + 366 * 24 * 60 * 60 * 1000), null);
});

test("binds one-time actions to a visitor, matchup, and dimension", async () => {
  const { createVoteActionToken, verifyVoteActionToken } = await vite.ssrLoadModule("/lib/vote-security.ts");
  const secret = "a-secure-test-secret-that-is-long-enough";
  const expected = { visitorHash: "visitor", comparison: "a-vs-b", dimensionType: "use_case", dimensionKey: "travel" };
  const token = await createVoteActionToken(secret, expected, 1_800_000_000_000);

  assert.ok(await verifyVoteActionToken(secret, token, expected, 1_800_000_001_000));
  assert.equal(await verifyVoteActionToken(secret, token, { ...expected, dimensionKey: "value" }, 1_800_000_001_000), null);
});

test("allows only configured voting dimensions", async () => {
  const { normalizeVoteDimension } = await vite.ssrLoadModule("/lib/vote-contract.ts");

  assert.deepEqual(normalizeVoteDimension("overall", "ignored", "headphones"), { type: "overall", key: "overall" });
  assert.deepEqual(normalizeVoteDimension("use_case", "travel", "headphones"), { type: "use_case", key: "travel" });
  assert.deepEqual(normalizeVoteDimension("attribute", "battery_life_hours", "headphones"), { type: "attribute", key: "battery_life_hours" });
  assert.equal(normalizeVoteDimension("attribute", "made_up", "headphones"), null);
  assert.equal(normalizeVoteDimension("use_case", "travel", null), null);
});

test("migration preserves editable votes per dimension and consumes replay nonces", async () => {
  const migration = await readFile(new URL("../drizzle/0005_majestic_hulk.sql", import.meta.url), "utf8");
  const route = await readFile(new URL("../app/api/votes/[comparison]/route.ts", import.meta.url), "utf8");

  assert.match(migration, /UNIQUE INDEX `idx_vote_attempts_nonce` ON `vote_attempts` \(`nonce_hash`\)/);
  assert.match(migration, /UNIQUE INDEX `idx_votes_comparison_visitor_dimension` ON `votes` \(`comparison_slug`,`visitor_id`,`dimension_type`,`dimension_key`\)/);
  assert.match(route, /onConflictDoUpdate/);
  assert.match(route, /datetime\('now', '-1 minute'\)/);
});
