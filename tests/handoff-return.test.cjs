const assert=require('node:assert/strict');let handle;const token='beta-test-token';
const user='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',wardrobe='w-betatest',trip='trip-betatest',snapshot='beta-snapshot';
const item={id:'OW-001',data:{id:'OW-001',updatedAt:'1',name:'Test coat',photos:['sb:'+'a'.repeat(64)]}};
const record={id:trip,data:{snapshotId:snapshot,handoff:{instructions:'Test instructions',returnAccess:{token,expiresAt:new Date(Date.now()+60000).toISOString()},photoAttachments:[{filename:'sheet.jpg',image:'sb:'+'a'.repeat(64)}],catalog:{items:[{id:'OW-001',updatedAt:'1',photoCount:1}]},faceAttachments:[]}}};
let proposal=null,renders=[],writes=[];
const plan={tripId:trip,snapshotId:snapshot,startDate:'2026-10-12',endDate:'2026-10-12',outfitsPerDay:'one',outfits:[{date:'2026-10-12',slot:'day',itemIds:['OW-001'],scene:'Edgartown'}],gaps:[],optionalLooks:[]};
global.Deno={env:{get:k=>k==='SUPABASE_URL'?'https://test.invalid':k==='SUPABASE_SERVICE_ROLE_KEY'?'server-test-key':undefined},serve:fn=>handle=fn};
global.fetch=async(input,options={})=>{const u=new URL(input);if(u.pathname==='/rest/v1/records'){
 if(options.method==='POST'){const row=JSON.parse(options.body);assert.equal(row.user_id,user);assert.equal(row.wardrobe,wardrobe);assert.ok(['proposal','render'].includes(row.kind));if(row.kind==='proposal'){assert.equal(row.id,trip);proposal=row.data}else renders.push(row);writes.push(row);return new Response(null,{status:201})}
 const uid=u.searchParams.get('user_id');assert.ok([user,other].some(x=>uid==='eq.'+x));assert.equal(u.searchParams.get('deleted'),'eq.false');
 if(uid!=='eq.'+user||u.searchParams.get('wardrobe')!=='eq.'+wardrobe)return Response.json([]);
 const k=u.searchParams.get('kind');return Response.json(k==='eq.trip'?[record]:k==='eq.item'?[item]:k==='eq.proposal'?(proposal?[{id:trip,data:proposal}]:[]):k==='eq.render'?renders:[]);
 }if(u.pathname.startsWith('/storage/v1/object/photos/'+user+'/'))return new Response('{}',{status:200});
 if(u.pathname==='/storage/v1/object/authenticated/photos/'+user+'/'+'a'.repeat(64)+'.jpg')return new Response(new Uint8Array([255,216,255,224,0,1]),{headers:{'Content-Type':'image/jpeg'}});
 throw Error('Unexpected fetch '+u.pathname)};
function req(params={},body,auth=token){const q=new URLSearchParams({user,wardrobe,trip,snapshot,...params});return new Request('https://test.invalid/handoff?'+q,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+auth,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})}
(async()=>{
await import('../supabase/functions/wardrobe-handoff/index.ts');
let r=await handle(req({kind:'bundle'}));assert.equal(r.status,200);const bundle=await r.json();assert.equal(bundle.currentCatalog.items.length,1);assert.equal(bundle.photoAttachments[0].image,undefined);assert.ok(!JSON.stringify(bundle).includes(token));
assert.equal((await handle(req({kind:'bundle',user:other}))).status,401);assert.equal((await handle(req({kind:'bundle',wardrobe:'w-other'}))).status,401);assert.equal((await handle(req({kind:'bundle'},undefined,'wrong'))).status,401);assert.equal((await handle(req({kind:'bundle',snapshot:'stale'}))).status,409);
r=await handle(req({action:'proposal'},{plan,status:'rendering'}));assert.equal(r.status,200);assert.equal((await r.json()).saved,true);assert.equal(proposal.status,'rendering');
assert.equal((await handle(req({action:'proposal'},{plan,status:'complete'}))).status,409);
const unknown=structuredClone(plan);unknown.outfits[0].itemIds=['OW-999'];assert.equal((await handle(req({action:'proposal'},{plan:unknown,status:'rendering'}))).status,400);
const cross=structuredClone(plan);cross.tripId='trip-other';assert.equal((await handle(req({action:'proposal'},{plan:cross,status:'rendering'}))).status,400);
const invalid=structuredClone(plan);invalid.endDate='2026-10-13';assert.equal((await handle(req({action:'proposal'},{plan:invalid,status:'rendering'}))).status,400);
item.data.archived=true;assert.equal((await handle(req({action:'proposal'},{plan,status:'rendering'}))).status,409);delete item.data.archived;
r=await handle(req({action:'proposal'},{plan,status:'partial',error:'Image limit reached'}));assert.equal(r.status,200);assert.equal(proposal.status,'partial');
const form=new FormData();form.set('image',new File([new Uint8Array([255,216,255,224,0,1])],'look.jpg',{type:'image/jpeg'}));form.set('metadata',JSON.stringify({...plan.outfits[0],variant:'owned'}));
const q=new URLSearchParams({user,wardrobe,trip,snapshot});r=await handle(new Request('https://test.invalid/handoff?'+q,{method:'POST',headers:{Authorization:'Bearer '+token},body:form}));assert.equal(r.status,200);assert.equal((await r.json()).saved,true);
r=await handle(req({action:'proposal'},{plan,status:'complete'}));assert.equal(r.status,200);assert.equal(proposal.status,'complete');
// Catalog edits without a regenerated trip must block writes.
item.data.updatedAt='2';assert.equal((await handle(req({action:'proposal'},{plan,status:'rendering'}))).status,409);item.data.updatedAt='1';
item.data.photos.push('sb:'+'b'.repeat(64));assert.equal((await handle(req({action:'proposal'},{plan,status:'rendering'}))).status,409);item.data.photos.pop();
// Optional renders must match date and slot as well as garments and scene.
const optionalPlan=structuredClone(plan);optionalPlan.gaps=[{id:'REC-001',item:'Test purchase'}];optionalPlan.optionalLooks=[{id:'optional-1',date:plan.startDate,slot:'day',itemIds:['OW-001'],productIds:['REC-001'],scene:'Edgartown'}];
assert.equal((await handle(req({action:'proposal'},{plan:optionalPlan,status:'rendering'}))).status,200);
const wrongForm=new FormData();wrongForm.set('image',new File([new Uint8Array([255,216,255,224,0,1])],'look.jpg'));wrongForm.set('metadata',JSON.stringify({date:'2026-10-13',slot:'evening',variant:'optional-1',itemIds:['OW-001'],scene:'Edgartown'}));
assert.equal((await handle(new Request('https://test.invalid/handoff?'+q,{method:'POST',headers:{Authorization:'Bearer '+token},body:wrongForm}))).status,409);
record.data.handoff.returnAccess.expiresAt='2000-01-01';assert.equal((await handle(req({kind:'bundle'}))).status,401);
assert.ok(writes.every(x=>x.kind!=='trip'&&x.kind!=='item'));console.log('Passed: private bundle, cross-account and cross-wardrobe isolation, token/expiry/snapshot checks, scoped proposals, invalid IDs/dates, partial progress, real image upload and completeness gate.');
})().catch(e=>{console.error(e);process.exitCode=1});
