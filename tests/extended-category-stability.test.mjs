import assert from 'node:assert/strict';
import test, {after} from 'node:test';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
const root=fileURLToPath(new URL('..',import.meta.url));
const vite=await createServer({configFile:false,appType:'custom',root,resolve:{alias:{'@':root}},server:{middlewareMode:true,hmr:false}});
after(()=>vite.close());
const model=await vite.ssrLoadModule('/lib/extended-category-specs.ts');
const contract=await vite.ssrLoadModule('/lib/research-contract.ts');
const seo=await vite.ssrLoadModule('/lib/seo.ts');
const discovery=await vite.ssrLoadModule('/lib/comparison-discovery.ts');
const groups={};
for(const category of model.extendedCategorySlugs){
 const batch=JSON.parse(await readFile(`${root}/data/research/${category}-2026-09-10.json`,'utf8'));
 groups[category]=batch.products.map(p=>contract.researchCatalogProduct(p,category,batch.researchedAt));
 test(`${category}: preserves all 45 approved balanced comparisons and correct indexing`,()=>{
  const products=groups[category],pairs=contract.researchComparisons(products,category,batch.researchedAt);
  assert.equal(pairs.length,45);
  for(const pair of pairs){assert.equal(discovery.isCurrentPublicComparison(pair,products.find(p=>p.id===pair.leftProductId),products.find(p=>p.id===pair.rightProductId)),true);}
  for(const p of products){assert.equal(seo.isIndexableCatalogProduct(p),true);const ld=seo.productJsonLd(p);assert.equal(ld.category,model.extendedCategoryModels[category].name);assert.ok(ld.additionalProperty.length>=3);}
  assert.match(seo.comparisonJsonLd(pairs[0].slug,products[0],products[1]).url,new RegExp(`/compare/${category}/`));
 });
 test(`${category}: changed, malformed, or future evidence cannot be scored or indexed`,()=>{
  const original=groups[category][0];
  const changed={...original,specsJson:JSON.stringify({...JSON.parse(original.specsJson),price_usd:1})};
  assert.equal(model.verifiedExtendedSpecs(category,changed).price_usd,undefined);
  assert.equal(model.scoreExtendedComparison(category,changed,groups[category][1]).factors.find(f=>f.key==='price_usd').available,false);
  for(const value of ['null','[]','{}','invalid']){const p={...original,specProvenanceJson:value};assert.deepEqual(model.verifiedExtendedSpecs(category,p),{});assert.equal(seo.isIndexableCatalogProduct(p),false);}
  const sources=JSON.parse(original.specProvenanceJson);sources.price_usd.retrievedAt='2099-01-01T00:00:00Z';
  assert.equal(model.verifiedExtendedSpecs(category,{...original,specProvenanceJson:JSON.stringify(sources)}).price_usd,undefined);
 });
}
test('Travel recommendations follow the selected winner, and reversing sides preserves results',()=>{
 const products=groups['portable-speakers'],a=products.find(p=>p.slug==='jbl-charge-6'),b=products.find(p=>p.slug==='jbl-flip-7');
 assert.match(model.draftExtendedVerdict('portable-speakers',a,b).headline,/Charge 6/);
 assert.match(model.draftExtendedVerdict('portable-speakers',a,b,'travel').headline,/Flip 7.*travel/);
 const score=model.scoreExtendedComparison('portable-speakers',a,b,'travel'),reverse=model.scoreExtendedComparison('portable-speakers',b,a,'travel');
 assert.equal(score.scoreLeft,reverse.scoreRight);
 assert.deepEqual(model.scoreExtendedComparison('portable-speakers',a,b,'constructor'),model.scoreExtendedComparison('portable-speakers',a,b));
});
test('Portable and standalone presets require applicable devices and essential evidence',()=>{
 const systems=groups['game-consoles'];
 for(const [i,a] of systems.entries())for(const b of systems.slice(i+1)){
  const s=model.scoreExtendedComparison('game-consoles',a,b,'portable');
  const specs=[a,b].map(p=>JSON.parse(p.specsJson));
  if(specs.some(p=>p.form_factor==='home-console')){assert.equal(s.eligible,false);assert.equal(s.scoreLeft,null);assert.match(s.unavailableReason,/two portable/);assert.doesNotMatch(model.draftExtendedVerdict('game-consoles',a,b,'portable').headline,/leads|tied/);}
 }
 const portable=systems.filter(p=>JSON.parse(p.specsJson).form_factor!=='home-console');
 assert.equal(model.scoreExtendedComparison('game-consoles',portable[0],portable[1],'portable').eligible,true);
 const vr=groups['vr-headsets'];const tethered=vr.find(p=>JSON.parse(p.specsJson).standalone===false);const standalone=vr.find(p=>JSON.parse(p.specsJson).standalone===true);
 assert.equal(model.scoreExtendedComparison('vr-headsets',tethered,standalone,'standalone').eligible,false);
});
