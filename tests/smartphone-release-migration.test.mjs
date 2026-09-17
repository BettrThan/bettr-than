import assert from "node:assert/strict";
import {readFile,readdir} from "node:fs/promises";
import test from "node:test";
import {DatabaseSync} from "node:sqlite";
const root=new URL("../drizzle/",import.meta.url);
test("approved smartphone migration preserves existing catalog and votes and is replay-safe",async()=>{
 const db=new DatabaseSync(":memory:");
 try {
 for(const name of (await readdir(root)).filter(n=>n.endsWith(".sql")&&!n.includes("approved_smartphone_launch")).sort())db.exec(await readFile(new URL(name,root),"utf8"));
 db.exec(`INSERT INTO catalog_products (id,ingestion_job_id,slug,canonical_name,brand,category_slug,source_url,facts_json,specs_json) VALUES ('existing-headphone','existing-job','existing-headphone','Existing Headphone','Example','headphones','https://example.com','[]','{"weight_grams":250}'); INSERT INTO votes (comparison_slug,visitor_id,choice_slug) VALUES ('existing-comparison','existing-visitor','existing-headphone');`);
 const before=JSON.stringify(db.prepare("SELECT * FROM catalog_products").all());const votes=JSON.stringify(db.prepare("SELECT * FROM votes").all());
 const migration=await readFile(new URL("0010_approved_smartphone_launch.sql",root),"utf8");
 db.exec(migration);db.exec(migration);
 assert.equal(db.prepare("SELECT count(*) n FROM catalog_products WHERE category_slug='smartphones' AND status='published'").get().n,10);
 assert.equal(db.prepare("SELECT count(*) n FROM comparisons WHERE category_slug='smartphones' AND status='published' AND verdict_status='approved'").get().n,45);
 assert.equal(JSON.stringify(db.prepare("SELECT * FROM catalog_products WHERE category_slug='headphones'").all()),before);
 assert.equal(JSON.stringify(db.prepare("SELECT * FROM votes").all()),votes);
 assert.equal(db.prepare("SELECT count(*) n FROM research_publications WHERE accepted=1").get().n,1);
 assert.equal(db.prepare("SELECT count(*) n FROM comparisons c LEFT JOIN catalog_products l ON l.id=c.left_product_id LEFT JOIN catalog_products r ON r.id=c.right_product_id WHERE l.id IS NULL OR r.id IS NULL").get().n,0);
 }finally{db.close();}
});
