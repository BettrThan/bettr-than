import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const categories={
  "portable-speakers":{file:"portable-speakers-2026-09-10.json",minimumShared:6,minimumCoverage:60,weights:{price_usd:20,battery_hours:20,weight_grams:15,durability_score:20,powerbank:10,usb_audio:5,auracast:5,floats:5}},
  "vr-headsets":{file:"vr-headsets-2026-09-10.json",minimumShared:6,minimumCoverage:55,weights:{price_usd:25,resolution_per_eye_mpx:20,refresh_rate_hz:10,weight_grams:15,standalone:10,eye_tracking:5,hand_tracking:5,color_passthrough:5,battery_hours:5}},
  wearables:{file:"wearables-2026-09-10.json",minimumShared:7,minimumCoverage:55,weights:{price_usd:20,battery_days:20,weight_grams:15,water_resistance_m:10,gps:8,heart_rate:5,ecg:7,spo2:5,temperature:5,sleep_tracking:5}},
  "game-consoles":{file:"game-consoles-2026-09-10.json",minimumShared:5,minimumCoverage:55,weights:{price_usd:25,storage_gb:20,weight_grams:15,output_resolution_score:15,max_refresh_hz:10,expandable_storage:10,disc_drive:5}},
};
const root=new URL("../data/research/",import.meta.url);

for(const [category,model] of Object.entries(categories))test(`${category} batch contains ten source-complete products and all 45 balanced comparisons`,async()=>{
  const batch=JSON.parse(await readFile(new URL(model.file,root),"utf8"));
  assert.equal(batch.category,category);assert.equal(batch.products.length,10);assert.equal(new Set(batch.products.map((p)=>p.slug)).size,10);
  for(const product of batch.products){assert.match(product.sourceUrl,/^https:\/\//);assert.ok(Object.keys(product.specs).length>=8,product.canonicalName);for(const key of Object.keys(product.specs)){const source=product.fieldSources[key];assert.ok(source,`${product.canonicalName} ${key}`);assert.match(source.sourceUrl,/^https:\/\//);assert.ok(Number.isFinite(Date.parse(source.retrievedAt)));}}
  let eligible=0;
  for(let i=0;i<batch.products.length;i++)for(let j=i+1;j<batch.products.length;j++){const a=batch.products[i].specs,b=batch.products[j].specs;const shared=Object.keys(a).filter((key)=>b[key]!==undefined).length;const coverage=Object.entries(model.weights).filter(([key])=>a[key]!==undefined&&b[key]!==undefined).reduce((sum,[,weight])=>sum+weight,0);if(shared>=model.minimumShared&&coverage>=model.minimumCoverage)eligible++;}
  assert.equal(eligible,45);
});

test("current-market replacements are present and unverified RingConn Gen 3 is excluded",async()=>{
  const wearable=JSON.parse(await readFile(new URL(categories.wearables.file,root),"utf8"));const names=wearable.products.map((p)=>p.canonicalName);
  for(const expected of ["Apple Watch Series 12 (46 mm GPS)","Apple Watch Ultra 4","Google Pixel Watch 5 (41 mm)","Oura Ring 5","RingConn Gen 2 Air"])assert.ok(names.includes(expected));
  assert.ok(!names.some((name)=>name.includes("Gen 3")));
});
