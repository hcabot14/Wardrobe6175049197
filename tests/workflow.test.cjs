const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodes=new Map();
function node(){return {value:'',checked:false,hidden:false,style:{},dataset:{},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},insertAdjacentHTML(){},querySelector(){return node()},querySelectorAll(){return []},focus(){},click(){},remove(){},setAttribute(){}}}
const document={querySelector:s=>{if(!nodes.has(s))nodes.set(s,node());return nodes.get(s)},querySelectorAll:()=>[],addEventListener(){},createElement:()=>node(),head:node(),body:node()};
const ctx=vm.createContext({document,window:{addEventListener(){},scrollTo(){}},navigator:{userAgent:'test'},location:{protocol:'file:'},localStorage:{getItem(){return null},setItem(){}},setTimeout(){},clearTimeout(){},setInterval(){},clearInterval(){},console,Blob,File,URL,TextEncoder,Uint8Array,DataView,structuredClone,Date,confirm:()=>true});
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];vm.runInContext(script,ctx);vm.runInContext(fs.readFileSync(__dirname+'/../workflow.js','utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
run(`profile={name:'Test',person:'man',cloudId:'w-test',cats:[{name:'Outerwear',prefix:'OW'}]};dbName='test';items=[{id:'OW-001',name:'Coat',category:'Outerwear',photos:['data:image/jpeg;base64,QQ=='],updatedAt:'1'},{id:'OW-002',name:'Sold coat',category:'Outerwear',archived:true,photos:[],updatedAt:'1'}];faces=[{id:'face',data:'x'}];trips=[{id:'trip-test',name:'Test',startDate:'2026-12-01',endDate:'2026-12-02',per:'one',snapshotId:snapshotId()}];`);
const plan=run(`({tripId:'trip-test',snapshotId:snapshotId(),startDate:'2026-12-01',endDate:'2026-12-02',outfits:[{date:'2026-12-01',slot:'day',scene:'Paris',itemIds:['OW-001']},{date:'2026-12-02',slot:'day',scene:'Paris',itemIds:['OW-001']}]})`);ctx.plan=plan;
assert.equal(run('validatePlan(plan).id'),'trip-test');
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
assert.equal(run('activeItems().length'),1);assert.equal(run("renderErrors({itemIds:['OW-002']})").includes('archived'),true);
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
run("db=fakeDB;outfits=[{id:'old',tripId:'trip-test',date:'2026-12-01',slot:'day',itemIds:['OW-001'],scene:'Paris',renders:[{image:'saved-render'}]},{id:'removed',tripId:'trip-test',date:'2026-11-01',itemIds:['OW-001'],renders:[]}];");
await run('applyPlan(plan)');assert.equal(saved.trips.get('trip-test').status,'planned');assert.equal(saved.outfits.get('old').renders[0].image,'saved-render');assert.equal(saved.meta.get('del:outfit:removed').kind,'outfit');assert.equal(run('tripOutfits(trips[0]).length'),2);
await run("savePatchAtomically(validateClosetPatch({snapshotId:snapshotId(),changes:[{id:'OW-001',fields:{color:'black'}}]}))");assert.equal(saved.items.get('OW-001').color,'black');assert.equal(run("itemById('OW-001').color"),'black');
await assert.rejects(run('aiChat([])'),/disabled/);const z=await run("zipFiles([new File(['hello'],'one.txt'),new File(['world'],'two.txt')])");fs.writeFileSync('/tmp/wardrobe-test.zip',Buffer.from(await z.arrayBuffer()));console.log('Passed: initialization, plan validation, stale snapshot protection, archive filtering, safe links, no-API guard, rendering requirements and ZIP generation.');})().catch(e=>{console.error(e);process.exitCode=1});
