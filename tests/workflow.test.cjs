const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodes=new Map();
function node(){return {value:'',checked:false,hidden:false,style:{},dataset:{},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},insertAdjacentHTML(){},querySelector(){return node()},querySelectorAll(){return []},focus(){},click(){},remove(){},setAttribute(){}}}
const document={querySelector:s=>{if(!nodes.has(s))nodes.set(s,node());return nodes.get(s)},querySelectorAll:()=>[],addEventListener(){},createElement:()=>node(),head:node(),body:node()};
const ctx=vm.createContext({document,window:{addEventListener(){},scrollTo(){}},navigator:{userAgent:'test'},location:{protocol:'file:'},localStorage:{getItem(){return null},setItem(){}},setTimeout(){},clearTimeout(){},setInterval(){},clearInterval(){},console,Blob,File,URL,URLSearchParams,TextEncoder,Uint8Array,DataView,structuredClone,Date,confirm:()=>true});
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];vm.runInContext(script,ctx);vm.runInContext(fs.readFileSync(__dirname+'/../workflow.js','utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
run(`profile={name:'Test',person:'man',cloudId:'w-test',cats:[{name:'Outerwear',prefix:'OW'}]};dbName='test';items=[{id:'OW-001',name:'Coat',category:'Outerwear',photos:['data:image/jpeg;base64,QQ=='],updatedAt:'1'},{id:'OW-002',name:'Sold coat',category:'Outerwear',archived:true,photos:[],updatedAt:'1'}];faces=[{id:'face',data:'x'}];trips=[{id:'trip-test',name:'Test',startDate:'2026-12-01',endDate:'2026-12-02',per:'one',snapshotId:snapshotId()}];`);
run("$('#tp_plans').value='Paris in December, two dinners, carry-on only';");assert.equal(run('draftValues().plans'),'Paris in December, two dinners, carry-on only');assert.equal(run('draftValues().conversational'),true);
ctx.sampleSheet='data:image/jpeg;base64,'+'A'.repeat(190000);const sheets=run("splitReferenceSheets({id:'test',handoff:{photoSheets:[sampleSheet]}})");assert.equal(sheets[0].chunks.length,4);assert.equal(sheets[0].chunks.map(c=>c.data.text).join(''),ctx.sampleSheet);assert.ok(sheets[0].chunks.every(c=>c.data.text.length<=60000));
assert.throws(()=>run("toCloud('trip',{handoff:{photoSheets:['image']}},new Map())"),/REFERENCE_PENDING/);assert.ok(run("toCloud('trip',{handoff:{photoReferences:[]}},new Map()).handoff"));
const sheetUpload=new Map();ctx.sheetUpload=sheetUpload;const sheetTrip=run("({id:'sheet-trip',handoff:{photoAttachments:[{filename:'sheet.jpg',image:'data:image/jpeg;base64,QQ=='}]}})");ctx.sheetTrip=sheetTrip;const cloudSheet=run("toCloud('trip',sheetTrip,sheetUpload)");assert.ok(cloudSheet.handoff.photoAttachments[0].image.startsWith('sb:'));assert.equal(sheetUpload.size,1);assert.equal(sheetTrip.handoff.photoAttachments[0].image,'data:image/jpeg;base64,QQ==');
const plan=run(`({tripId:'trip-test',snapshotId:snapshotId(),startDate:'2026-12-01',endDate:'2026-12-02',outfits:[{date:'2026-12-01',slot:'day',scene:'Paris',itemIds:['OW-001']},{date:'2026-12-02',slot:'day',scene:'Paris',itemIds:['OW-001']}]})`);ctx.plan=plan;
assert.equal(run('validatePlan(plan).id'),'trip-test');
run("trips[0].conversational=true;delete trips[0].startDate;delete trips[0].endDate");assert.equal(run('validatePlan(plan).id'),'trip-test');run("trips[0].conversational=false;trips[0].startDate='2026-12-01';trips[0].endDate='2026-12-02'");
function bad(mut,rx){ctx.bad=structuredClone(plan);run(mut);assert.throws(()=>run('validatePlan(bad)'),rx)}
bad("bad.outfits[0].itemIds=['OW-999']",/Unknown or archived/);
bad("bad.outfits[0].itemIds=['OW-002']",/Unknown or archived/);
bad("bad.outfits.pop()",/Missing day/);
bad("bad.snapshotId='stale'",/older or different/);
bad("bad.endDate='2026-12-03'",/dates differ/);
bad("bad.outfits[0].date='2026-02-30'",/Invalid outfit date/);
bad("bad.outfits[0].itemIds=['OW-001','OW-001']",/repeated/);
bad("bad.outfits[0].scene=''",/setting/);
assert.equal(run("safeLink('javascript:alert(1)')"),'');assert.equal(run("safeLink('https://example.com/p')"),'https://example.com/p');
assert.equal(run('hasAI()'),false);assert.equal(run('hasOpenAI()'),false);
assert.equal(run('activeItems().length'),1);assert.equal(run("canSwipeDraft({id:'empty',status:'draft'})"),true);assert.equal(run("canSwipeDraft({id:'planned',status:'planned'})"),false);run("outfits.push({id:'guard',tripId:'has-outfits',itemIds:[]})");assert.equal(run("canSwipeDraft({id:'has-outfits',status:'draft'})"),false);run("outfits=[]");assert.equal(run("renderErrors({itemIds:['OW-002']})").includes('archived'),true);
assert.equal(run("isPastTrip({endDate:'2000-01-01'})"),true);assert.equal(run("isPastTrip({endDate:'2099-01-01'})"),false);
assert.equal(run("validateClosetPatch({snapshotId:snapshotId(),changes:[{id:'OW-001',fields:{archived:true}}]}).length"),1);
assert.throws(()=>run("validateClosetPatch({snapshotId:snapshotId(),changes:[{id:'OW-001',fields:{id:'OW-100'}}]})"),/Unsupported/);
assert.throws(()=>run("validateClosetPatch({snapshotId:snapshotId(),changes:[{id:'OW-001',fields:{category:'Imaginary'}}]})"),/Add the category/);
assert.throws(()=>run("validateClosetPatch({snapshotId:snapshotId(),changes:[{id:'OW-001',fields:{archived:'false'}}]})"),/Invalid/);
run("$('#showArchived').checked=false;render()");assert.equal(run("$('#cats').innerHTML.includes('Sold coat')"),false);
run("$('#showArchived').checked=true;render()");assert.equal(run("$('#cats').innerHTML.includes('Sold coat')"),true);
run("renderHome()");assert.equal(run("$('#nextTrip').innerHTML.includes('Test')"),true);
const saved={items:new Map(),trips:new Map(),outfits:new Map(),meta:new Map()};
ctx.fakeDB={transaction(){const t={objectStore:n=>({put:v=>saved[n].set(v.id,structuredClone(v)),delete:id=>saved[n].delete(id)})};queueMicrotask(()=>t.oncomplete?.());return t}};
(async()=>{
run("editingTrip='trip-test';db=fakeDB;outfits=[{id:'old',tripId:'trip-test',date:'2026-12-01',slot:'day',itemIds:['OW-001'],scene:'Paris',renders:[{image:'saved-render'}]},{id:'removed',tripId:'trip-test',date:'2026-11-01',itemIds:['OW-001'],renders:[]}];");
await run('applyPlan(plan)');assert.equal(saved.trips.get('trip-test').status,'planned');assert.equal(saved.outfits.get('old').renders[0].image,'saved-render');assert.equal(saved.meta.get('del:outfit:removed').kind,'outfit');assert.equal(run('tripOutfits(trips[0]).length'),2);assert.equal(run('editingTrip'),null);assert.equal(run("$('#tp_plans').value"),'');
await run("savePatchAtomically(validateClosetPatch({snapshotId:snapshotId(),changes:[{id:'OW-001',fields:{color:'black'}}]}))");assert.equal(saved.items.get('OW-001').color,'black');assert.equal(run("itemById('OW-001').color"),'black');
run("session={uid:'test-user',access:'NEVER-COPY-THIS'};profile.cloudId='w-test'");const request=run("connectedRequest({id:'trip-test',snapshotId:'test-snapshot',handoff:{photoAttachments:[],faceAttachments:[],returnAccess:{endpoint:'https://example.com/return',expiresAt:'2026-12-01'}}})");assert.ok(request.includes('trip-test'));assert.ok(request.includes('get_trip_bundle'));assert.ok(request.includes('get_reference_image'));assert.ok(request.includes('actual face-reference images'));assert.ok(request.includes('STOP before generating'));assert.ok(!request.includes('Bearer '));assert.ok(!request.includes('Use ChatGPT Work'));assert.ok(request.includes('@Wardrobe development'));assert.ok(!request.includes('NEVER-COPY-THIS'));
run("verifyHandoffReady=async()=>{};syncNow=async()=>{};syncState={err:false};syncing=false;api=async()=>[{data:{handoff:{preparedAt:'ready'}}}];");await run("syncHandoff({id:'trip-test',snapshotId:snapshotId(),handoff:{preparedAt:'ready'}},'w-test')");run("api=async()=>[]");await assert.rejects(run("syncHandoff({id:'trip-test',snapshotId:snapshotId(),handoff:{preparedAt:'missing'}},'w-test')"),/not finished syncing/);
// A failed download must abort record hydration, not silently remove photographs.
run("photoDownloads=0;downloadPhoto=async()=>{photoDownloads++;return null};shrink=async u=>u");
await assert.rejects(run("fromCloud('item',{photos:['sb:'+ 'a'.repeat(64)]})"),/could not be downloaded/);
await assert.rejects(run("fromCloud('face',{data:'sb:'+ 'a'.repeat(64)})"),/could not be downloaded/);
await assert.rejects(run("fromCloud('outfit',{renders:[{image:'sb:'+ 'a'.repeat(64)}]})"),/could not be downloaded/);
await assert.rejects(run("fromCloud('trip',{optionalLooks:[{id:'optional-1',renders:[{image:'sb:'+ 'a'.repeat(64)}]}]})"),/could not be downloaded/);
// Keep externally uploaded SHA-256 references stable across metadata edits.
run("photoDownloads=0;downloadPhoto=async()=>{photoDownloads++;return 'data:image/jpeg;base64,QQ=='}");
ctx.hydrated=await run("fromCloud('item',{id:'SU-001',photos:['sb:'+ 'a'.repeat(64)]})");
const downloads=run('photoDownloads');
await run("fromCloud('item',{id:'SU-001',photos:['sb:'+ 'a'.repeat(64)]},hydrated)");assert.equal(run('photoDownloads'),downloads);
ctx.cachedUploads=new Map();const cachedCloud=run("toCloud('item',hydrated,cachedUploads)");assert.equal(cachedCloud.photos[0],'sb:'+'a'.repeat(64));assert.equal(ctx.cachedUploads.size,0);assert.equal(cachedCloud._photoSources,undefined);
ctx.hydratedTrip=await run("fromCloud('trip',{id:'trip-test',optionalLooks:[{id:'optional-1',renders:[{image:'sb:'+ 'b'.repeat(64)}]}]})");
const tripDownloads=run('photoDownloads');
await run("fromCloud('trip',{id:'trip-test',optionalLooks:[{id:'optional-1',renders:[{image:'sb:'+ 'b'.repeat(64)}]}]},hydratedTrip)");assert.equal(run('photoDownloads'),tripDownloads);
const cloudTrip=run("toCloud('trip',hydratedTrip,cachedUploads)");assert.equal(cloudTrip.optionalLooks[0].renders[0].image,'sb:'+'b'.repeat(64));assert.equal(cloudTrip.optionalLooks[0]._photoSources,undefined);
// No-render imports cannot be labeled a complete lookbook.
run("trips[0].snapshotId=snapshotId();plan.snapshotId=snapshotId();previewPlan(plan)");assert.ok(run("$('#planReview').innerHTML.includes('Save outfit plan')"));
// Old proposals must not interrupt a fresh handoff or mask its progress.
run("trips=[{id:'old-trip',snapshotId:'old-snapshot'},{id:'current-trip',snapshotId:snapshotId()}];editingTrip='current-trip';shownProposalKey='';$('#planMsg').textContent='';api=async path=>{if(!path.includes('kind=eq.proposal'))throw new Error('Stale proposal fetched images');return [{id:'old-trip',data:{status:'complete',updatedAt:'2099',plan:{tripId:'old-trip',snapshotId:'old-snapshot'}}},{id:'current-trip',data:{status:'rendering',updatedAt:'2026',plan:{tripId:'current-trip',snapshotId:snapshotId()}}}]}");
await run('checkReturnedPlans()');assert.equal(run("$('#planMsg').textContent"),'');
// A completed result arriving during a different draft must notify without replacing it.
run("trips.push({id:'completed-trip',snapshotId:snapshotId()});api=async()=>[{id:'completed-trip',data:{status:'complete',updatedAt:'new',plan:{snapshotId:snapshotId()}}}];editJourney=()=>{throw Error('Background replaced draft')};$('#tp_plans').value='Unsaved trip typing';");
await run('checkReturnedPlans()');assert.equal(run("$('#tp_plans').value"),'Unsaved trip typing');assert.equal(run('editingTrip'),'current-trip');
run("api=async()=>[{id:'current-trip',data:{status:'rendering',updatedAt:'2026',plan:{tripId:'current-trip',snapshotId:snapshotId()}}}]");

await run('checkReturnedPlans(true)');assert.match(run("$('#planMsg').textContent"),/images have not all returned/);
// A different trip's pending render must not be reported for this trip.
run("api=async()=>[{id:'old-trip',data:{status:'rendering',plan:{tripId:'old-trip',snapshotId:'old-snapshot'}}}]");
await run('checkReturnedPlans(true)');assert.equal(run("$('#planMsg').textContent"),'No new proposal has arrived yet.');
await assert.rejects(run('aiChat([])'),/disabled/);const z=await run("zipFiles([new File(['hello'],'one.txt'),new File(['world'],'two.txt')])");fs.writeFileSync('/tmp/wardrobe-test.zip',Buffer.from(await z.arrayBuffer()));console.log('Passed: workflow validation, journey reset, failed-download recovery, photo reference reuse, optional render sync, partial-plan labeling, no-API guard and ZIP generation.');})().catch(e=>{console.error(e);process.exitCode=1});
// Project conversation destination and strict host/path validation.
assert.equal(run('validatedWardrobeProjectUrl(DEFAULT_WARDROBE_PROJECT_URL)'),run('DEFAULT_WARDROBE_PROJECT_URL'));
assert.equal(run('chatGPTRoute()'),run('DEFAULT_WARDROBE_PROJECT_URL'));
for(const url of ['https://chatgpt.com/g/g-p-test','https://chatgpt.com/project/test']){ctx.routeTest=url;assert.equal(run('validatedWardrobeProjectUrl(routeTest)'),url)}
for(const url of ['https://chatgpt.com/c/6ae08427-9110-83ea-93b6-2aa2af0442a6','https://chatgpt.com.evil.test/g/g-p-test','http://chatgpt.com/g/g-p-test','https://user@chatgpt.com/g/g-p-test','https://chatgpt.com:444/g/g-p-test','https://chatgpt.com/g/g-p-test/c/bad','https://chatgpt.com/g/g-p-test/extra']){ctx.routeTest=url;assert.equal(run('validatedWardrobeProjectUrl(routeTest)'),'')}
run("localStorage.getItem=()=>''");assert.equal(run('savedWardrobeProjectUrl()'),'');assert.equal(run('chatGPTRoute()'),'https://chatgpt.com/');run("navigator.userAgent='iPhone'");assert.equal(run('chatGPTRoute()'),'com.openai.chat://');
run("localStorage.getItem=()=>DEFAULT_WARDROBE_PROJECT_URL");assert.equal(run('chatGPTRoute()'),run('DEFAULT_WARDROBE_PROJECT_URL'));
run("localStorage.getItem=()=>null;navigator.userAgent='test'");
