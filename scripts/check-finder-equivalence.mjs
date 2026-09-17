import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {createServer} from 'vite';
import ts from 'typescript';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const baselineRef=process.argv[2] ?? '3326316d8190b43d2d5de9a4173a073c56166e7c';
const baseline=execFileSync('git',['show',`${baselineRef}:lib/product-finder.ts`],{cwd:root,encoding:'utf8'});
const vite=await createServer({configFile:false,appType:'custom',root,resolve:{alias:{'@':root}},plugins:[{
  name:'refactor-baseline',resolveId(id){if(id==='virtual:baseline-finder')return id;},
  load(id){if(id==='virtual:baseline-finder')return {code:baseline,loader:'ts'};},
  transform(code,id){if(id==='virtual:baseline-finder')return {code:ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText};}
}],server:{middlewareMode:true,hmr:false}});
try {
  const previous=await vite.ssrLoadModule('virtual:baseline-finder');
  const current=await vite.ssrLoadModule('/lib/product-finder.ts');
  const contract=await vite.ssrLoadModule('/lib/research-contract.ts');
  const {parseProductCsv}=await vite.ssrLoadModule('/lib/csv-product-import.ts');
  let cases=0;
  for(const category of Object.keys(current.finderCategories)){
    let products,date;
    if(category==='headphones'){
      date='2026-09-05T00:00:00Z';
      products=parseProductCsv(await readFile(`${root}/tests/fixtures/top-10-headphones.csv`,'utf8')).map((p,i)=>contract.researchCatalogProduct({...p,slug:`qa-headphone-${i}`,region:'US',configuration:'Standard',notes:'QA fixture',priceBasis:'reference_price',fieldSources:Object.fromEntries(Object.keys(p.specs).map(key=>[key,{sourceUrl:p.sourceUrl,retrievedAt:date}]))},category,date));
    }else{
      const filename=category==='smartphones'?'2026-09-09':'2026-09-10';
      const batch=JSON.parse(await readFile(`${root}/data/research/${category}-${filename}.json`,'utf8'));date=batch.researchedAt;
      products=batch.products.map(p=>contract.researchCatalogProduct(p,category,date));
    }
    const pairs=contract.researchComparisons(products,category,date);
    for(const preset of [...Object.keys(current.finderPresets(category)),'invalid']){
      for(const budget of [null,100,1000,-1]){
        for(const requirements of [[],...current.finderRequirements[category].map(r=>[r.key]),['invalid']]){
          const preferences={preset,budget,requirements};
          assert.deepEqual(current.rankFinderProducts(category,products,pairs,preferences),previous.rankFinderProducts(category,products,pairs,preferences));
          cases++;
        }
      }
    }
    const edgePairs=[...pairs,...pairs.map(p=>({...p,leftProductId:p.rightProductId,rightProductId:p.leftProductId})),...pairs.map(p=>({...p,status:'needs_review'}))];
    const preferences={preset:'balanced',budget:null,requirements:[]};
    assert.deepEqual(current.rankFinderProducts(category,products,edgePairs,preferences),previous.rankFinderProducts(category,products,edgePairs,preferences));cases++;
  }
  console.log(JSON.stringify({categories:6,matchingScenarios:cases}));
} finally {await vite.close();}
