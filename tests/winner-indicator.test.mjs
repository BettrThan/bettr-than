import assert from 'node:assert/strict';
import test, {after} from 'node:test';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';

const root=fileURLToPath(new URL('..',import.meta.url));
const vite=await createServer({configFile:false,appType:'custom',root,esbuild:{jsx:'automatic'},resolve:{alias:{'@':root}},server:{middlewareMode:true,hmr:false}});
after(()=>vite.close());
const {resolveWinner}=await vite.ssrLoadModule('/lib/winner-indicator.ts');
const {WinnerIndicator}=await vite.ssrLoadModule('/components/winner-indicator.tsx');
const render=(props)=>renderToStaticMarkup(React.createElement(WinnerIndicator,{leftLabel:'Alpha',rightLabel:'Beta',...props}));

const contract=await vite.ssrLoadModule('/lib/research-contract.ts');
const extended=await vite.ssrLoadModule('/lib/extended-category-specs.ts');
const phones=await vite.ssrLoadModule('/lib/smartphone-specs.ts');

test('winner resolution handles ties, close boundary, reversed products and invalid evidence',()=>{
 assert.deepEqual(resolveWinner(80,20),{state:'left',close:false});
 assert.deepEqual(resolveWinner(20,80),{state:'right',close:false});
 assert.deepEqual(resolveWinner(50,50),{state:'tie',close:false});
 assert.deepEqual(resolveWinner(51.5,48.5),{state:'left',close:true});
 assert.deepEqual(resolveWinner(48.4,51.6),{state:'right',close:false});
 for(const bad of [null,undefined,NaN,Infinity,-1,101,'50'])assert.equal(resolveWinner(bad,50).state,'unavailable');
 assert.equal(resolveWinner(50,50,false).state,'unavailable');
 assert.equal(resolveWinner(0,100).state,'right');
 assert.equal(resolveWinner(null,null,false,true).state,'loading');
});

test('badge exposes true result with the wide opening facing the leader and an upright underline',()=>{
 const left=render({leftScore:51,rightScore:49});
 assert.match(left,/data-winner="left"/);assert.match(left,/Alpha narrowly leads/);
 assert.match(left,/M18 57 H46/);assert.match(left,/--winner-turn:0deg/);
 const right=render({leftScore:49,rightScore:51});assert.match(right,/Beta narrowly leads/);assert.match(right,/--winner-turn:180deg/);assert.match(right,/wide opening faces the leader/);
 assert.match(render({leftScore:50,rightScore:50}),/Alpha and Beta are tied/);
 assert.match(render({leftScore:50,rightScore:50,eligible:false}),/Not enough shared evidence/);
 assert.doesNotMatch(render({leftScore:50,rightScore:50,eligible:false}),/are tied/);
 assert.match(render({loading:true}),/Comparison result loading/);
});

for(const category of ['smartphones','portable-speakers','vr-headsets','wearables','game-consoles'])test(`${category}: every researched pair and preset agrees with the badge`,async()=>{
 const date=category==='smartphones'?'2026-09-09':'2026-09-10';
 const batch=JSON.parse(await readFile(`${root}/data/research/${category}-${date}.json`,'utf8'));
 const products=batch.products.map(p=>contract.researchCatalogProduct(p,category,batch.researchedAt));
 const presets=category==='smartphones'?phones.smartphonePresets:extended.extendedCategoryModels[category].presets;
 for(let i=0;i<products.length;i++)for(let j=i+1;j<products.length;j++)for(const preset of Object.keys(presets)){
  const score=category==='smartphones'?phones.scoreSmartphoneComparison(products[i],products[j],preset):extended.scoreExtendedComparison(category,products[i],products[j],preset);
  const r=resolveWinner(score.scoreLeft,score.scoreRight,score.eligible);
  assert.equal(r.state,!score.eligible?'unavailable':score.scoreLeft===score.scoreRight?'tie':score.scoreLeft>score.scoreRight?'left':'right');
  const flipped=resolveWinner(score.scoreRight,score.scoreLeft,score.eligible);
  assert.equal(flipped.state,r.state==='left'?'right':r.state==='right'?'left':r.state);
 }
});

test('Headphones: all pairs and presets use eligible evidence, including missing-data fallback',async()=>{
 const {parseProductCsv}=await vite.ssrLoadModule('/lib/csv-product-import.ts');
 const h=await vite.ssrLoadModule('/lib/headphone-specs.ts');
 const rows=parseProductCsv(await readFile(`${root}/tests/fixtures/top-10-headphones.csv`,'utf8'));
 const products=rows.map((r,i)=>({id:String(i),slug:String(i),canonicalName:r.canonicalName,specsJson:JSON.stringify(r.specs),specProvenanceJson:JSON.stringify(h.sanitizeProductSpecProvenance({},r.specs,{sourceUrl:r.sourceUrl,retrievedAt:'2026-09-05T00:00:00Z',sourceType:'manufacturer'}))}));
 for(let i=0;i<products.length;i++)for(let j=i+1;j<products.length;j++)for(const preset of Object.keys(h.headphonePresetLabels)){
  const s=h.scoreHeadphoneComparison(products[i],products[j],preset);
  const eligible=s.availableWeight>0&&s.coreCoveragePercent>=h.HEADPHONE_PUBLIC_COVERAGE_THRESHOLD;
  const r=resolveWinner(s.scoreLeft,s.scoreRight,eligible);
  assert.equal(r.state,!eligible?'unavailable':!s.winner?'tie':s.winner.id===products[i].id?'left':'right');
 }
 const empty=h.scoreHeadphoneComparison({...products[0],specsJson:'{}'},products[1]);
 assert.equal(resolveWinner(empty.scoreLeft,empty.scoreRight,empty.availableWeight>0&&empty.coreCoveragePercent>=h.HEADPHONE_PUBLIC_COVERAGE_THRESHOLD).state,'unavailable');
});
