const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodes=new Map();
function node(){return {value:'',checked:false,hidden:false,style:{},dataset:{},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},insertAdjacentHTML(){},querySelector(){return node()},querySelectorAll(){return []},matches(){return false},focus(){},click(){},remove(){},setAttribute(){}}}
const document={querySelector:s=>{if(!nodes.has(s))nodes.set(s,node());return nodes.get(s)},querySelectorAll:()=>[],addEventListener(){},createElement:()=>node(),head:node(),body:node()};
const ctx=vm.createContext({document,window:{addEventListener(){},scrollTo(){}},navigator:{userAgent:'test'},location:{protocol:'file:'},localStorage:{getItem(){return null},setItem(){}},setTimeout(){},clearTimeout(){},setInterval(){},clearInterval(){},sessionStorage:{getItem(){return null},setItem(){}},console,Blob,File,URL,URLSearchParams,TextEncoder,Uint8Array,DataView,structuredClone,Date,confirm:()=>true});
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];vm.runInContext(script,ctx);vm.runInContext(fs.readFileSync(__dirname+'/../workflow.js','utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);

run(`profile={name:'Test',person:'man',cloudId:'w-test',cats:[]};dbName='fixture';items=[{id:'OW-001',name:'Coat',category:'Outerwear',photos:['data:image/jpeg;base64,QQ=='],updatedAt:'1'}];faces=[{id:'face',data:'photo',addedAt:'1'}];trips=[{id:'trip-test',where:'New York',plans:'two nights',status:'draft'}];editingTrip='trip-test';`);
const signature=run('referencePhotoSignature()');run("items[0].photos[0]='data:image/jpeg;base64,Qg=='");assert.notEqual(run('referencePhotoSignature()'),signature);run("items[0].photos[0]='data:image/jpeg;base64,QQ=='");assert.equal(run('referencePhotoSignature()'),signature);
run(`trips[0].snapshotId=snapshotId();trips[0].handoff={photoSignature:referencePhotoSignature(),faceSignature:faceSignature()};`);assert.equal(run('preparedTripIsCurrent(trips[0])'),true);
run("items[0].photos[0]='data:image/jpeg;base64,Qg=='");assert.equal(run('preparedTripIsCurrent(trips[0])'),false);run("items[0].photos[0]='data:image/jpeg;base64,QQ=='");
run("faces[0].data='changed'");assert.equal(run('preparedTripIsCurrent(trips[0])'),false);run("faces[0].data='photo'");
run("items[0].archived=true");assert.equal(run('preparedTripIsCurrent(trips[0])'),false);run("delete items[0].archived");
assert.equal(run("validatedWardrobeProjectUrl('https://chatgpt.com/g/g-p-test/project')"),'https://chatgpt.com/g/g-p-test/project');
run("stagedTripPlans.set('trip-test',{tripId:'trip-test'});updateJourneyAction()");assert.equal(run("$('#planBtn').textContent"),'Render');
run("items[0].photos[0]='changed';updateJourneyAction()");assert.equal(run("$('#planBtn').textContent"),'Generate');
ctx.fakeDB={transaction(){const t={objectStore:()=>({put(){}})};queueMicrotask(()=>t.oncomplete?.());return t}};run("db=fakeDB;items[0].photos[0]='data:image/jpeg;base64,QQ==';$('#tp_plans').value='different brief';");
(async()=>{
 await run('saveBrief()');assert.equal(run('trips[0].handoff'),undefined);assert.equal(run('trips[0].plans'),'different brief');assert.equal(run('trips[0].status'),'draft');
 let writes=0,revealed=false;ctx.el={style:{},parentElement:{querySelector:()=>({setAttribute(){},tabIndex:-1}),classList:{toggle:(name,value)=>revealed=value}}};run('revealDraftDelete(el,true)');assert.equal(revealed,true);assert.equal(ctx.el.style.transform,'translateX(-88px)');assert.equal(run('trips[0].dismissed'),undefined);run('revealDraftDelete(el,false)');assert.equal(ctx.el.style.transform,'');
 // The click reserves a destination synchronously, then navigates only after request copy.
 const events=[];ctx.window.open=()=>{events.push('reserve');return {opener:null,document:{body:{}},location:{set href(u){events.push('navigate:'+u)}},close(){events.push('close')}}};ctx.navigator.clipboard={writeText:async()=>events.push('copy')};
 run("planTrip=async()=>{requestReady={tripId:'trip-test'};trips[0].handoff={photoAttachments:[],faceAttachments:[]};};editingTrip='trip-test';stagedTripPlans.clear()");
 await run("$('#planBtn').onclick()");assert.equal(events[0],'reserve');assert.equal(events[1],'copy');assert.match(events[2],/navigate:https:\/\/chatgpt.com\/g\/.*\/project$/);
 assert.equal(run('editingTrip'),null);assert.equal(run("$('#tp_plans').value"),'');run("editingTrip='trip-test';$('#tp_plans').value='two nights'");events.length=0;ctx.navigator.clipboard.writeText=async()=>{events.push('copy-failed');throw Error('denied')};await run("$('#planBtn').onclick()");assert.deepEqual(events,['reserve','copy-failed','close']);
 run("resetJourney()");assert.equal(run('editingTrip'),null);assert.equal(run('trips.length'),1);assert.equal(run("$('#tp_plans').value"),'');
 const src=fs.readFileSync(__dirname+'/../workflow.js','utf8');assert.match(src,/placeholder="Going to New York for two nights on October 15th"/);assert.ok(!src.includes('Generate images from saved outfits'));assert.ok(!src.includes('Open Wardrobe ChatGPT project'));assert.ok(!src.includes('>New journey</button>'));assert.ok(!src.includes('<summary>Other options</summary>'));
 console.log('Passed: same-count photo replacement/archive/face invalidation, stale Render reset, changed-brief invalidation, explicit delete reveal, draft retention, fresh project route and copy-before-navigation with denied-copy recovery.');
})().catch(e=>{console.error(e);process.exitCode=1});
