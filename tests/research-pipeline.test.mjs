import assert from "node:assert/strict";
import { readFile,readdir } from "node:fs/promises";
import test,{after} from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/d1";
const root=fileURLToPath(new URL("..",import.meta.url));
const sqlite=new DatabaseSync(":memory:");
// Exercise the production Drizzle/D1 query path against SQLite without network listeners.
const statement=(sql,args=[])=>({
  bind(...values){return statement(sql,values);},
  async all(){const q=sqlite.prepare(sql);const results=q.all(...args);return {success:true,results,meta:{changes:0,duration:0}};},
  async run(){const result=sqlite.prepare(sql).run(...args);return {success:true,results:[],meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid)}};},
  async raw(){const q=sqlite.prepare(sql);q.setReturnArrays(true);return q.all(...args);},
  async first(){return sqlite.prepare(sql).get(...args)??null;},
});
const d1={prepare:statement,async batch(statements){sqlite.exec("BEGIN");try{const result=[];for(const s of statements)result.push(await s.all());sqlite.exec("COMMIT");return result;}catch(error){sqlite.exec("ROLLBACK");throw error;}}};
for(const file of (await readdir(`${root}/drizzle`)).filter((f)=>f.endsWith(".sql") && !f.includes("approved_smartphone_launch")).sort()) {
  for(const statement of (await readFile(`${root}/drizzle/${file}`,"utf8")).split("--> statement-breakpoint").map((s)=>s.trim()).filter(Boolean)) await d1.prepare(statement).run();
}
const vite=await createServer({configFile:false,appType:"custom",root,resolve:{alias:[{find:/^@\/db$/,replacement:"virtual:research-test-db"},{find:"@",replacement:root}]},plugins:[{name:"research-test-db",resolveId(id){if(id==="virtual:research-test-db")return "\0research-test-db";},load(id){if(id==="\0research-test-db")return "export function getDb(){return globalThis.__researchTestDb;}";}}],server:{middlewareMode:true,hmr:false}});
const schema=await vite.ssrLoadModule("/db/schema.ts");globalThis.__researchTestDb=drizzle(d1,{schema});
after(async()=>{await vite.close();sqlite.close();delete globalThis.__researchTestDb;});
const contract=await vite.ssrLoadModule("/lib/research-contract.ts");const store=await vite.ssrLoadModule("/lib/research-store.ts");const phone=await vite.ssrLoadModule("/lib/smartphone-specs.ts");const discovery=await vite.ssrLoadModule("/lib/comparison-discovery.ts");
const batch=contract.validateResearchBatch(JSON.parse(await readFile(`${root}/data/research/smartphones-2026-09-09.json`,"utf8")));
const products=batch.products.map((p)=>contract.researchCatalogProduct(p,batch.category,batch.researchedAt));
const count=async(table)=>(await d1.prepare(`SELECT count(*) AS n FROM ${table}`).first()).n;

test("all ten researched smartphones produce 45 current comparisons under every preset",()=>{
  assert.equal(products.length,10);const pairs=contract.researchComparisons(products,"smartphones",batch.researchedAt);assert.equal(pairs.length,45);
  for(const p of pairs){const left=products.find((x)=>x.id===p.leftProductId),right=products.find((x)=>x.id===p.rightProductId);assert.equal(discovery.isCurrentPublicComparison(p,left,right),true);for(const preset of Object.keys(phone.smartphonePresets)){const score=phone.scoreSmartphoneComparison(left,right,preset);assert.equal(score.eligible,true);assert.ok(Math.abs(score.scoreLeft+score.scoreRight-100)<.001);}}
});
test("unknown facts and lost provenance cannot contribute to phone scores",()=>{
  const unknown={...products[0],specsJson:"{}",specProvenanceJson:"{}"};assert.equal(phone.scoreSmartphoneComparison(unknown,products[1]).eligible,false);
  const unverified={...products[0],specProvenanceJson:"{}"};assert.equal(phone.scoreSmartphoneComparison(unverified,products[1]).coveragePercent,0);
  const missingPrice={...products[0],specsJson:JSON.stringify({...batch.products[0].specs,price_usd:undefined})};assert.equal(phone.scoreSmartphoneComparison(missingPrice,products[1],"value").eligible,false);
  const changed={...products[0],specsJson:JSON.stringify({...batch.products[0].specs,main_camera_mp:400,battery_mah:14000})};assert.deepEqual(phone.scoreSmartphoneComparison(changed,products[1]).scoreLeft,phone.scoreSmartphoneComparison(products[0],products[1]).scoreLeft);
});
test("invalid, duplicate, and unsupported research is rejected",()=>{
  const bad=structuredClone(batch);bad.products[0].fieldSources={};assert.throws(()=>contract.validateResearchBatch(bad));
  const duplicate=structuredClone(batch);duplicate.products.push(duplicate.products[0]);assert.throws(()=>contract.validateResearchBatch(duplicate));
  const invalid=structuredClone(batch);invalid.products[0].specs.battery_mah=-1;assert.throws(()=>contract.validateResearchBatch(invalid));
  const hostile=structuredClone(batch);hostile.products[0].sourceUrl="https://apple.com.attacker.invalid/phone";assert.throws(()=>contract.validateResearchBatch(hostile));
});
test("draft upload, approval, rerun, and stale-update protections work through the D1 query adapter on SQLite",async()=>{
  await store.uploadResearchBatch(batch,"research-agent");assert.equal(await count("catalog_products"),0);assert.equal(await count("comparisons"),0);
  await store.uploadResearchBatch(batch,"research-agent");assert.equal(await count("research_batches"),1);
  const digest=await contract.researchDigest(batch);await assert.rejects(()=>store.publishResearchBatch(batch.id,"wrong","owner"));assert.equal(await count("catalog_products"),0);
  const result=await store.publishResearchBatch(batch.id,digest,"owner");assert.equal(result.products,10);assert.equal(result.comparisons,45);assert.equal(await count("catalog_products"),10);assert.equal(await count("comparisons"),45);
  await store.publishResearchBatch(batch.id,digest,"owner");assert.equal(await count("comparisons"),45);assert.equal(await count("research_publications"),1);
  const original=await d1.prepare("SELECT slug FROM comparisons ORDER BY slug").all();
  const revision=structuredClone(batch);revision.id="smartphones-test-revision";revision.products[0].specs.weight_grams=176;
  await store.uploadResearchBatch(revision,"research-agent");assert.equal((await d1.prepare("SELECT specs_json FROM catalog_products WHERE slug='iphone-17'").first()).specs_json,products[0].specsJson);
  await store.publishResearchBatch(revision.id,await contract.researchDigest(contract.validateResearchBatch(revision)),"owner");assert.deepEqual((await d1.prepare("SELECT slug FROM comparisons ORDER BY slug").all()).results,original.results);
  const stale=structuredClone(batch);stale.id="smartphones-test-stale";await store.uploadResearchBatch(stale,"research-agent");
  await d1.prepare("UPDATE catalog_products SET updated_at='2099-01-01T00:00:00Z' WHERE slug='iphone-17'").run();await assert.rejects(async()=>store.publishResearchBatch(stale.id,await contract.researchDigest(stale),"owner"));
  assert.equal((await d1.prepare("SELECT status FROM research_batches WHERE id=?").bind(stale.id).first()).status,"pending");
});
