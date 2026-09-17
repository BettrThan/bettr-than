import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {registerHooks} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';

// Run the actual built request handler without opening a network listener.
// Only the Cloudflare environment is adapted; production routes, rendering,
// cryptography and D1 queries execute against disposable SQLite.
const root=fileURLToPath(new URL('..',import.meta.url));
const sqlite=new DatabaseSync(':memory:');
const statement=(sql,args=[])=>({
 bind(...values){return statement(sql,values);},
 async all(){return {success:true,results:sqlite.prepare(sql).all(...args),meta:{}};},
 async run(){const r=sqlite.prepare(sql).run(...args);return {success:true,results:[],meta:{changes:Number(r.changes)}};},
 async raw(){const q=sqlite.prepare(sql);q.setReturnArrays(true);return q.all(...args);},
 async first(){return sqlite.prepare(sql).get(...args)??null;},
});
const d1={prepare:statement,async batch(items){sqlite.exec('BEGIN');try{const results=[];for(const item of items)results.push(await item.all());sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
for(const name of (await readdir(`${root}/drizzle`)).filter(n=>n.endsWith('.sql')&&!n.includes('approved_smartphone_launch')).sort())sqlite.exec(await readFile(`${root}/drizzle/${name}`,'utf8'));
const vite=await createServer({configFile:false,appType:'custom',root,resolve:{alias:{'@':root}},server:{middlewareMode:true,hmr:false}});
const contract=await vite.ssrLoadModule('/lib/research-contract.ts');
const groups={};
function insert(table,record){const entries=Object.entries(record);const columns=entries.map(([key])=>key.replace(/[A-Z]/g,c=>'_'+c.toLowerCase()));sqlite.prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(()=>'?').join(',')})`).run(...entries.map(([,value])=>value));}
for(const category of ['smartphones','portable-speakers','vr-headsets','wearables','game-consoles']){
 const date=category==='smartphones'?'2026-09-09':'2026-09-10';
 const batch=JSON.parse(await readFile(`${root}/data/research/${category}-${date}.json`,'utf8'));
 const products=batch.products.map(p=>contract.researchCatalogProduct(p,category,batch.researchedAt));
 const pairs=contract.researchComparisons(products,category,batch.researchedAt);
 for(const p of products)insert('catalog_products',p);
 for(const p of pairs)insert('comparisons',p);
 groups[category]={products,pairs};
}
const {parseProductCsv}=await vite.ssrLoadModule('/lib/csv-product-import.ts');
const researchedAt='2026-09-05T00:00:00Z';
const headphones=parseProductCsv(await readFile(`${root}/tests/fixtures/top-10-headphones.csv`,'utf8')).map((p,i)=>contract.researchCatalogProduct({...p,slug:`qa-headphone-${i}`,region:'US',configuration:'Standard',notes:'QA fixture',priceBasis:'reference_price',fieldSources:Object.fromEntries(Object.keys(p.specs).map(key=>[key,{sourceUrl:p.sourceUrl,retrievedAt:researchedAt}]))},'headphones',researchedAt));
const headphonePairs=contract.researchComparisons(headphones,'headphones',researchedAt);
assert.equal(headphonePairs.length,45);
for(const p of headphones)insert('catalog_products',p);
for(const p of headphonePairs)insert('comparisons',p);
groups.headphones={products:headphones,pairs:headphonePairs};
const finder=await vite.ssrLoadModule('/lib/product-finder.ts');
const {commerceReadiness}=await vite.ssrLoadModule('/lib/commerce-readiness.ts');
const offerCsv=await vite.ssrLoadModule('/lib/offer-csv.ts');
await vite.close();
const env={DB:d1,ADMIN_USER_ID:'qa-owner',VOTE_SIGNING_SECRET:'test-only-signing-key-not-a-production-secret',ASSETS:{fetch:async()=>new Response(new Uint8Array([0xff,0xd8,0xff]),{headers:{'content-type':'image/jpeg'}})}};
globalThis.__qaWorkerEnv=env;
const hooks=registerHooks({resolve(specifier,context,next){return specifier==='cloudflare:workers'?{url:'test:cloudflare-env',shortCircuit:true}:next(specifier,context);},load(url,context,next){return url==='test:cloudflare-env'?{format:'module',source:'export const env = globalThis.__qaWorkerEnv;',shortCircuit:true}:next(url,context);}});
const {default:worker}=await import('../dist/server/index.js');
const request=(path,init)=>worker.fetch(new Request(`https://qa.invalid${path}`,init),env,{waitUntil(){},passThroughOnException(){}});
const plainText=(html)=>html.replace(/<[^>]+>/g,'').replaceAll('&amp;','&').replaceAll('&#x27;',"'").replaceAll('&quot;','"').replaceAll('<!-- -->','');
function assertSpecificationSides(html,leftName,rightName){
 const table=html.match(/<table\b[^>]*>[\s\S]*?<\/table>/)?.[0];
 assert.ok(table,'comparison must expose a semantic specifications table');
 const headers=[...table.match(/<thead>[\s\S]*?<\/thead>/)[0].matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map(m=>plainText(m[1]));
 assert.deepEqual(headers,[leftName,'Specification',rightName]);
 const rows=[...table.match(/<tbody>[\s\S]*?<\/tbody>/)[0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)];
 assert.ok(rows.length>0);
 for(const row of rows){
  assert.deepEqual([...row[1].matchAll(/<(td|th)\b/g)].map(m=>m[1]),['td','th','td']);
  assert.match(row[1],/<th\b[^>]*scope="row"/,'middle specification remains the accessible row header');
 }
}
after(()=>{hooks.deregister();sqlite.close();delete globalThis.__qaWorkerEnv;});

test('built homepage renders all six category controls and direct category images',async()=>{
 const r=await request('/');assert.equal(r.status,200);const html=await r.text();
 for(const label of ['Headphones','Smartphones','Speakers','VR','Wearables','Gaming'])assert.ok(html.includes(label));
 assert.doesNotMatch(html,/<img[^>]*_vinext\/image/);
 assert.match(html,/role="tab"[^>]*>.*?Headphones/s);
});
for(const [category,{products,pairs}] of Object.entries(groups))test(`built ${category} collection, product metadata, and comparison render`,async()=>{
 for(const path of [`/category/${category}`,`/catalog/${products[0].slug}`,`/compare/${category}/${pairs[0].slug}`]){
  const response=await request(path);assert.equal(response.status,200,path);const html=await response.text();assert.ok(html.includes(products[0].canonicalName),path);assert.doesNotMatch(html,/name="robots" content="noindex/);
  if(path.startsWith('/compare/')){assert.match(html,/class="bt-winner"/);assert.match(html,/data-winner="(?:left|right|tie|unavailable)"/);assert.match(html,/winner-product-pair/);assert.match(html,/data-comparison-selector/);assert.match(html,/<h1[^>]*>Choose products to compare<\/h1>/);assert.equal((html.match(/data-product-score/g)??[]).length,2);}
 }
 const pair=pairs.at(-1),path=`/compare/${category}/${pair.slug}`;
 const response=await request(path);assert.equal(response.status,200);const html=await response.text();
 assertSpecificationSides(html,products.find(p=>p.id===pair.leftProductId).canonicalName,products.find(p=>p.id===pair.rightProductId).canonicalName);
 assert.match(html,/comparison-priorities-heading/);
 assert.match(html,/comparison-priorities-options/);
 const values=[...html.matchAll(/<input\b[^>]*\bvalue="([^"]*)"/g)].map(m=>m[1].replaceAll('&amp;','&').replaceAll('&#x27;',"'").replaceAll('&quot;','"'));
 for(const id of [pair.leftProductId,pair.rightProductId])assert.ok(values.includes(products.find(p=>p.id===id).canonicalName),`${category} selector must prefill the current pair`);
 assert.ok(html.includes(`href="${path}"`));
});
test('legacy speaker comparison keeps a prefilled selector and centered scores',async()=>{
 const response=await request('/compare/bose-soundlink-flex-2-vs-jbl-flip-7');assert.equal(response.status,200);const html=await response.text();assert.match(html,/data-comparison-selector/);assert.match(html,/Choose products to compare/);assert.equal((html.match(/<div\b[^>]*data-product-score/g)??[]).length,2);
});
test('three legacy-colliding speaker pairs support feature and use-case voting end to end',async()=>{
 const slugs=['bose-soundlink-flex-2-vs-jbl-flip-7','jbl-flip-7-vs-ue-wonderboom-4','bose-soundlink-flex-2-vs-ue-wonderboom-4'];
 for(const slug of slugs)for(const [dimensionType,dimensionKey] of [['attribute','battery_hours'],['use_case','travel']]){
  const path=`/api/votes/${slug}`,get=await request(`${path}?dimensionType=${dimensionType}&dimensionKey=${dimensionKey}`);
  assert.equal(get.status,200,slug);const {actionToken}=await get.json();assert.ok(actionToken);
  const pair=groups['portable-speakers'].pairs.find(p=>p.slug===slug),choiceSlug=groups['portable-speakers'].products.find(p=>p.id===pair.leftProductId).slug;
  const post=await request(path,{method:'POST',headers:{origin:'https://qa.invalid','content-type':'application/json',cookie:get.headers.get('set-cookie').split(';')[0]},body:JSON.stringify({choiceSlug,dimensionType,dimensionKey,actionToken})});
  assert.equal(post.status,200,slug);assert.equal((await post.json()).totals[choiceSlug],1);
 }
});
test('withdrawn catalog comparisons cannot fall back to a legacy voting record',async()=>{
 const slug='bose-soundlink-flex-2-vs-jbl-flip-7';sqlite.prepare("UPDATE comparisons SET status='needs_review' WHERE slug=?").run(slug);
 try{assert.equal((await request(`/api/votes/${slug}`)).status,404);}finally{sqlite.prepare("UPDATE comparisons SET status='published' WHERE slug=?").run(slug);}
});
test('cached category-image requests fall back to originals without an image transformer',async()=>{
 const r=await request('/_vinext/image?url=%2Fproducts%2Fheadphones.jpg&w=640&q=75');assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/^image\/jpeg/);
 const invalid=await request('/_vinext/image?url=%2Fproducts%2Fheadphones.jpg&w=invalid&q=75');assert.equal(invalid.status,400);
});

test('finder ranks every category, respects hard filters, and excludes unpublished or stale comparisons',async()=>{
 for(const [category,{products,pairs}] of Object.entries(groups)){
  const ranked=finder.rankFinderProducts(category,products,pairs,{preset:'balanced',budget:null,requirements:[]});
  assert.equal(ranked.results.length,10,category);assert.equal(ranked.eligiblePairs.length,45);
  assert.equal(finder.rankFinderProducts(category,products,pairs,{preset:'balanced',budget:1,requirements:[]}).results.length,0);
  assert.equal(finder.rankFinderProducts(category,products,pairs.map(p=>({...p,status:'draft'})),{preset:'balanced',budget:null,requirements:[]}).results.length,0);
  assert.equal(finder.rankFinderProducts(category,products,pairs.map(p=>({...p,verdictDataVersion:'stale'})),{preset:'balanced',budget:null,requirements:[]}).results.length,0);
  assert.equal(finder.rankFinderProducts(category,products,pairs,{preset:'balanced',budget:null,requirements:['unknown']}).results.length,0);
  const response=await request(`/find?category=${category}`);assert.equal(response.status,200);const html=await response.text();assert.match(html,/Top specification match/);assert.match(html,/name="robots" content="noindex/);
 }
 const phones=groups.smartphones;
 const ios=finder.rankFinderProducts('smartphones',phones.products,phones.pairs,{preset:'value',budget:1000,requirements:['ios']});
 assert.ok(ios.results.length>0);for(const item of ios.results){assert.ok(item.referencePrice<=1000);assert.equal(finder.finderSpecs('smartphones',item.product).operating_system,'iOS');}
 const sourceLost={...phones.products[0],specProvenanceJson:'{}'};assert.deepEqual(finder.finderSpecs('smartphones',sourceLost),{});
 const noMatches=await(await request('/find?category=smartphones&require=ios&require=android')).text();assert.match(noMatches,/No verified matches/);
 for(const category of ['smartphones','headphones','vr-headsets']){
  const pair=groups[category].pairs[0],html=await(await request(`/compare/${category}/${pair.slug}?preset=value`)).text();
  assert.match(html,/(?:aria-pressed|aria-selected)="true"[^>]*>Value<\/button>/);
 }
});

test('offer CSV rejects duplicates, unknown products, future prices and unsafe destinations',()=>{
 const p=groups.smartphones.products[0],headers=offerCsv.offerCsvHeaders.join(','),now=new Date().toISOString();
 const row=[p.slug,'QA Shop','https://example.com','https://example.com/product','99.00','0','in_stock','affiliate',now,'draft'].join(',');
 const good=offerCsv.previewOfferCsv(`${headers}\n${row}`,[p]);assert.deepEqual(good[0].errors,[]);
 assert.ok(offerCsv.previewOfferCsv(`${headers}\n${row}\n${row}`,[p])[1].errors.length);
 assert.ok(offerCsv.previewOfferCsv(`${headers}\n${row}`,[])[0].errors.length);
 assert.ok(offerCsv.previewOfferCsv(`${headers}\n${row.replace(now,'2999-01-01T00:00:00Z')}`,[p])[0].errors.length);
 assert.ok(offerCsv.previewOfferCsv(`${headers}\n${row.replace('https://example.com/product','https://[::1]/product')}`,[p])[0].errors.length);
});

test('owner bulk offers work across six categories, preserve observations and redirect with correct attribution',async()=>{
 const headers={'content-type':'application/json',origin:'https://qa.invalid','oai-authenticated-user-id':'qa-owner','oai-authenticated-user-email':'qa@example.invalid'};
 const now=new Date().toISOString();
 const csv=[offerCsv.offerCsvHeaders.join(','),...Object.values(groups).map(({products})=>[products[0].slug,'QA Shop','https://example.com','https://example.com/product?partner=approved','99.00','5.00','in_stock','affiliate',now,'approved'].join(','))].join('\n');
 const upload=commit=>request('/api/admin/offers/import',{method:'POST',headers,body:JSON.stringify({csv,commit})});
 assert.equal((await request('/api/admin/offers/import',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({csv})})).status,403);
 assert.equal((await request('/api/admin/offers/import',{method:'POST',headers:{...headers,origin:'https://other.invalid'},body:JSON.stringify({csv})})).status,403);
 const preview=await upload(false);assert.equal(preview.status,200);assert.equal((await preview.json()).rows.length,6);assert.equal(sqlite.prepare('select count(*) as n from retailer_offers').get().n,0);
 const imported=await upload(true);assert.equal(imported.status,200);assert.ok((await imported.json()).results.every(row=>row.status==='created'));
 const repeated=await upload(true);assert.ok((await repeated.json()).results.every(row=>row.status==='updated'));
 assert.equal(sqlite.prepare('select count(*) as n from retailer_offers').get().n,6);assert.equal(sqlite.prepare('select count(*) as n from price_observations').get().n,12);
 for(const [category,{products,pairs}] of Object.entries(groups)){
  const p=products[0],offer=sqlite.prepare('select * from retailer_offers where product_id=?').get(p.id);
  const productHtml=await(await request(`/catalog/${p.slug}`)).text();assert.match(productHtml,/QA Shop/);assert.match(productHtml,/Affiliate link/);assert.match(productHtml,/\$104\.00/);
  const comparisonHtml=await(await request(`/compare/${category}/${pairs[0].slug}`)).text();assert.ok(comparisonHtml.includes(`comparison=${pairs[0].slug}`));
  const click=await worker.fetch(new Request(`https://bettrthan.com/go/offer/${offer.id}?comparison=${pairs[0].slug}`),env,{waitUntil(){}});
  assert.equal(click.status,302);assert.equal(click.headers.get('location'),'https://example.com/product?partner=approved');assert.equal(click.headers.get('cache-control'),'no-store');
  const event=sqlite.prepare("select * from analytics_events where event_name='retailer_clicked' and category_slug=?").get(category);assert.equal(event.comparison_slug,pairs[0].slug);
 }
 const offer=sqlite.prepare('select * from retailer_offers limit 1').get();
 const disable=await request('/api/admin/offers',{method:'PATCH',headers,body:JSON.stringify({offerId:offer.id,action:'disable'})});assert.equal(disable.status,200);assert.equal((await request(`/go/offer/${offer.id}`)).status,404);
 const admin=await request('/admin/offers',{headers});assert.equal(admin.status,200);const html=await admin.text();assert.match(html,/Set up offers in bulk/);for(const {products}of Object.values(groups))assert.ok(html.includes(products[0].canonicalName));
 assert.equal((await request('/how-we-earn')).status,200);
});

test('buying guides render unique canonical pages with useful finder links',async()=>{
 const index=await request('/guides');assert.equal(index.status,200);
 for(const category of Object.keys(groups)){
  const response=await request(`/guides/${category}`);assert.equal(response.status,200);
  const html=await response.text();assert.match(html,/Not a hands-on review/);assert.ok(html.includes(`https://bettrthan.com/guides/${category}`));assert.ok(html.includes(`/find?category=${category}`));
 }
 assert.equal((await request('/guides/not-a-category')).status,404);
 const sitemap=await request('/sitemap.xml');assert.equal(sitemap.status,200);const xml=await sitemap.text();assert.ok(xml.includes('https://bettrthan.com/guides/headphones'));
});

test('analytics dashboard separates category events and click activity from revenue',async()=>{
 sqlite.prepare('insert into analytics_events(event_name,category_slug) values(?,?)').run('guide_viewed','smartphones');
 const headers={'oai-authenticated-user-id':'qa-owner','oai-authenticated-user-email':'qa@example.invalid'};
 const response=await request('/admin/analytics',{headers});assert.equal(response.status,200);const html=await response.text();assert.match(html,/Category activity/);assert.match(html,/Guide views/);assert.match(html,/not unique visitors or a conversion funnel/);assert.match(html,/Purchase and commission reports are not connected/);
 const anon=await request('/admin/analytics');assert.ok([302,303,307,308,401,403,404].includes(anon.status));
});

test('rankings show ten products in Balanced score order in every category without priority controls',async()=>{
 for(const [category,{products,pairs}] of Object.entries(groups)){
  const expected=finder.rankFinderProducts(category,products,pairs,{preset:'balanced',budget:null,requirements:[]}).results.slice(0,10);
  assert.equal(expected.length,10);
  const response=await request(`/rankings?category=${category}&preset=invalid`);
  assert.equal(response.status,200);
  const html=await response.text();
  const rows=[...html.matchAll(/<li\b[^>]*data-ranking-product="([^"]+)"[^>]*>([\s\S]*?)<\/li>/g)];
  assert.deepEqual(rows.map(row=>row[1]),expected.map(item=>item.product.id));
  rows.forEach((row,index)=>{
   assert.ok(row[2].includes(`aria-label="Rank ${index+1}"`));
   assert.ok(plainText(row[2]).includes(expected[index].product.canonicalName));
   assert.ok(plainText(row[2]).includes(expected[index].average.toFixed(1)));
   assert.match(row[2],/<img\b|role="img"/);
  });
  assert.match(html,/aria-label="Rankings category"/);
  assert.match(html,/aria-label="Product rankings"/);
  assert.ok(html.includes(`https://bettrthan.com/rankings?category=${category}`));
  assert.doesNotMatch(html,/<select\b|What matters most|name="preset"/);
 }
 const fallback=await request('/rankings?category=invalid');assert.equal(fallback.status,200);assert.match(plainText(await fallback.text()),/Headphones: the top 10/);
 const plain=await request('/rankings');assert.equal(plain.status,200);
 sqlite.prepare("update comparisons set status='needs_review' where category_slug='headphones'").run();
 try{
  const empty=await request('/rankings');assert.equal(empty.status,200);const html=await empty.text();
  assert.match(html,/No products have eligible published comparisons/);assert.doesNotMatch(html,/data-ranking-product=/);
 }finally{sqlite.prepare("update comparisons set status='published' where category_slug='headphones'").run();}
});

test('scoring methodology is public and readiness is owner-only with truthful coverage',async()=>{
 const response=await request('/how-we-score');assert.equal(response.status,200);const html=await response.text();
 for(const category of Object.keys(groups))assert.ok(html.includes(`data-scoring-category="${category}"`));
 assert.match(html,/split numeric-factor weight proportionally/);assert.match(html,/not.*60% product quality/);
 assert.ok(html.includes('https://bettrthan.com/how-we-score'));
 const xml=await(await request('/sitemap.xml')).text();assert.ok(xml.includes('/how-we-score'));assert.ok(!xml.includes('/admin/readiness'));
 for(const category of Object.keys(groups))assert.ok(xml.includes(`/rankings?category=${category}`));
 const owner={'oai-authenticated-user-id':'qa-owner','oai-authenticated-user-email':'qa@example.invalid'};
 const page=await request('/admin/readiness',{headers:owner});assert.equal(page.status,200);const dashboard=await page.text();
 assert.match(dashboard,/Commerce readiness/);assert.match(dashboard,/do not verify partner enrollment/);assert.match(dashboard,/noindex/);
 for(const category of Object.keys(groups))assert.ok(dashboard.includes(`data-readiness-category="${category}"`));
 for(const headers of [{},{'oai-authenticated-user-id':'other-user','oai-authenticated-user-email':'other@example.invalid'}]){
  const denied=await request('/admin/readiness',{headers});assert.ok([302,303,307,308,401,403,404].includes(denied.status));
 }
 const {products,pairs}=groups.headphones;
 const fresh={id:'fresh',productId:products[0].id,retailerName:'Example',priceMinor:100,shippingMinor:0,totalPriceMinor:100,currency:'USD',availability:'in_stock',isAffiliate:true,isSponsored:false,lastCheckedAt:'2026-09-16T00:00:00Z',staleAfterAt:'2026-09-23T00:00:00Z'};
 const offers=new Map([[products[0].id,[fresh,{...fresh,id:'stale',staleAfterAt:'2026-09-01T00:00:00Z'},{...fresh,id:'out',availability:'out_of_stock'}]]]);
 const category=commerceReadiness(products,pairs,offers,new Date('2026-09-17T00:00:00Z')).find(row=>row.category==='headphones');
 assert.equal(category.productCount,10);assert.equal(category.currentComparisons,45);assert.equal(category.possibleComparisons,45);
 assert.equal(category.coveredProducts,1);assert.equal(category.affiliateProducts,1);assert.equal(category.rows[0].freshOffers,1);assert.equal(category.rows[0].staleOffers,1);
 const empty=commerceReadiness([],[],new Map());assert.ok(empty.every(row=>row.productCount===0&&row.possibleComparisons===0&&row.coveredProducts===0));
});
