const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),workflow=fs.readFileSync(__dirname+'/../workflow.js','utf8');
const basePush=html.slice(html.indexOf('async function pushWardrobe('),html.indexOf('async function applyRows('));
const reconciliation=workflow.slice(workflow.indexOf('function compareSyncStamp('),workflow.indexOf('const normalPushWardrobe='));
const old='2026-10-10T20:08:24.182Z',newer='2026-10-11T17:00:39.003Z',latest='2026-10-29T20:10:00.000Z';
const garment=(id,updatedAt,count,name='Coat')=>({id,name,updatedAt,photos:Array.from({length:count},(_,i)=>'photo-'+i)});
function fixture(local,remote,pushed={}){
 const d={items:new Map(local.map(x=>[x.id,structuredClone(x)])),meta:new Map([['sync',{id:'sync',pushed:{...pushed}}]])};let rows=structuredClone(remote),writes=[],queries=[],pullHook=null;
 const context=vm.createContext({URLSearchParams,Date,Map,Set,JSON,Object,String,Number,Math,session:{uid:'owner'},db:d,items:structuredClone(local),STAMP:{item:x=>x.updatedAt||x.createdAt||'',meta:x=>x.updatedAt||''},STORE:{item:'items'},
  getAll:async(store,db)=>[...db[store].values()].map(x=>structuredClone(x)),dGet:async(db,store,id)=>structuredClone(db[store].get(id)),dPut:async(db,store,x)=>db[store].set(x.id,structuredClone(x)),dDel:async(db,store,id)=>db[store].delete(id),syncState0:async db=>structuredClone(db.meta.get('sync')),
  api:async path=>{const q=new URL('https://test.invalid'+path).searchParams;assert.equal(q.get('user_id'),'eq.owner');assert.equal(q.get('wardrobe'),'eq.w-test');assert.equal(q.get('kind'),'eq.item');queries.push(q);return rows.slice(Number(q.get('offset')),Number(q.get('offset'))+1000)},
  fromCloud:async(kind,data)=>{if(pullHook)await pullHook();return structuredClone(data)},toCloud:(kind,x)=>structuredClone(x),uploadPhotos:async()=>{},pushRows:async batch=>{for(const x of batch){assert.equal(x.user_id,'owner');assert.equal(x.wardrobe,'w-test');writes.push(structuredClone(x));const i=rows.findIndex(y=>y.id===x.id);if(i<0)rows.push(structuredClone(x));else rows[i]=structuredClone(x)}}});
 vm.runInContext(basePush+reconciliation,context);
 return {d,writes,queries,context,get remote(){return rows},setHook:fn=>pullHook=fn,run:()=>vm.runInContext("reconcileItemSync(db,'w-test',()=>{})",context),push:()=>vm.runInContext("pushWardrobe(db,'w-test',()=>{})",context)};
}
(async()=>{
 // Exact user regression: cached upload acknowledgements say local corrections
 // were sent, but the server still holds fewer photos and older metadata.
 const a=garment('OW-007',newer,4,'Corrected rust jacket'),b=garment('OW-014',newer,8,'Corrected overshirt');
 let f=fixture([a,b],[{id:a.id,data:garment(a.id,old,2),deleted:false},{id:b.id,data:garment(b.id,old,3),deleted:false}],{'item:OW-007':newer,'item:OW-014':newer});
 assert.equal(await f.push(),0,'Old cached-ack logic reproduces the lost upload');assert.equal(f.remote[0].data.photos.length,2);
 await f.run();assert.equal(await f.push(),2);assert.deepEqual(f.remote.map(x=>x.data.photos.length),[4,8]);assert.deepEqual(f.remote.map(x=>x.data.name),[a.name,b.name]);assert.equal(f.d.meta.get('sync').pushed['item:OW-014'],newer);
 const n=f.writes.length;await f.run();assert.equal(await f.push(),0);assert.equal(f.writes.length,n,'Verified records are not repeatedly uploaded');
 // A stale device must not overwrite a newer server correction.
 f=fixture([garment('OW-001',old,1)],[{id:'OW-001',data:garment('OW-001',newer,3,'Newer server coat'),deleted:false}],{});await f.run();assert.equal(await f.push(),0);assert.equal(f.d.items.get('OW-001').name,'Newer server coat');assert.equal(f.context.items[0].photos.length,3);assert.equal(f.writes.length,0);
 // A missing server row invalidates a false acknowledgement.
 f=fixture([a],[],{'item:OW-007':newer});await f.run();assert.equal(await f.push(),1);
 // Server deletion wins over an older local item; a local pending deletion is not restored.
 f=fixture([a],[{id:a.id,deleted:true,data:{at:latest}}],{});await f.run();assert.equal(f.d.items.size,0);assert.equal(await f.push(),0);
 f=fixture([],[{id:a.id,data:a,deleted:false}],{});f.d.meta.set('del:item:'+a.id,{id:'del:item:'+a.id,kind:'item',key:a.id,at:latest});await f.run();assert.equal(f.d.items.size,0);await f.push();assert.equal(f.remote[0].deleted,true);
 // Ambiguous equal-version differences must preserve both copies, not silently acknowledge either.
 f=fixture([a],[{id:a.id,data:garment(a.id,newer,2),deleted:false}],{});await assert.rejects(f.run(),/Conflicting saved versions/);assert.equal(f.d.items.get(a.id).photos.length,4);assert.equal(f.remote[0].data.photos.length,2);assert.equal(f.writes.length,0);
 // A user edit made while downloading the server copy is not overwritten.
 f=fixture([garment(a.id,old,1)],[{id:a.id,data:a,deleted:false}],{});f.setHook(async()=>f.d.items.set(a.id,garment(a.id,latest,6,'Concurrent correction')));await f.run();await f.push();assert.equal(f.remote[0].data.name,'Concurrent correction');assert.equal(f.remote[0].data.photos.length,6);
 // Download failure leaves local data and its acknowledgement untouched.
 f=fixture([garment(a.id,old,1)],[{id:a.id,data:a,deleted:false}],{'item:OW-007':old});f.setHook(async()=>{throw Error('Photo download failed')});await assert.rejects(f.run(),/Photo download failed/);assert.equal(f.d.items.get(a.id).updatedAt,old);assert.equal(f.d.meta.get('sync').pushed['item:OW-007'],old);
 assert.ok(workflow.indexOf("await syncNow();await waitForSync();if(syncState.err)",workflow.indexOf('planTrip=async function'))<workflow.indexOf('const pack=await planningPhotoFiles',workflow.indexOf('planTrip=async function')),'Sync must finish before photographing the snapshot');
 console.log('Passed: stale upload acknowledgements reproduced and repaired; newer server edits/deletions, missing rows, pending deletes, concurrent edits and failed photo downloads preserved.');
})().catch(e=>{console.error(e);process.exitCode=1});
