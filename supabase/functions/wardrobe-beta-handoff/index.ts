// Short-lived, trip-scoped capability. No model calls or client-side secret keys.
const base=Deno.env.get('SUPABASE_URL')!;
const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default;
const headers={apikey:secret,Authorization:'Bearer '+secret};
const cors={'Access-Control-Allow-Origin':'https://hcabot14.github.io','Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
async function rows(user:string,wardrobe:string,kind:string,id?:string){const q=new URLSearchParams({select:'id,data',user_id:'eq.'+user,wardrobe:'eq.'+wardrobe,kind:'eq.'+kind,deleted:'eq.false'});if(id)q.set('id','eq.'+id);const r=await fetch(base+'/rest/v1/records?'+q,{headers});if(!r.ok)throw Error('Record lookup failed');return await r.json();}
const digest=async(bytes:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');
async function sameSecret(a:string,b:string){if(!a||!b)return false;return await digest(new TextEncoder().encode(a))===await digest(new TextEncoder().encode(b));}
const validDate=(s:unknown):s is string=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
function validateProposal(plan:any,trip:string,snapshot:string,items:any[]){
 if(!plan||plan.tripId!==trip||plan.snapshotId!==snapshot)throw Error('Proposal outside this handoff');
 if(!validDate(plan.startDate)||!validDate(plan.endDate)||plan.endDate<plan.startDate||(Date.parse(plan.endDate)-Date.parse(plan.startDate))/86400000>90)throw Error('Invalid trip dates');
 if(!['one','two'].includes(plan.outfitsPerDay||'one')||!Array.isArray(plan.outfits)||!plan.outfits.length||plan.outfits.length>182)throw Error('Invalid daily outfits');
 const allowed=new Set(items.filter(x=>!x.data.archived&&!x.data.mergedInto).map(x=>x.id)),slots=new Set();
 const owned=(ids:any)=>Array.isArray(ids)&&ids.length>0&&new Set(ids).size===ids.length&&ids.every(id=>allowed.has(id));
 for(const x of plan.outfits){const slot=x.slot||'day',key=x.date+':'+slot;if(!validDate(x.date)||x.date<plan.startDate||x.date>plan.endDate||!['day','evening'].includes(slot)||slots.has(key)||!owned(x.itemIds)||!String(x.scene||'').trim())throw Error('Invalid or inactive outfit');slots.add(key);}
 for(let d=new Date(plan.startDate+'T12:00:00Z');d.toISOString().slice(0,10)<=plan.endDate;d.setUTCDate(d.getUTCDate()+1))for(const slot of (plan.outfitsPerDay==='two'?['day','evening']:['day']))if(!slots.has(d.toISOString().slice(0,10)+':'+slot))throw Error('Missing daily outfit');
 if(plan.gaps!==undefined&&!Array.isArray(plan.gaps))throw Error('Invalid recommendations');
 const products=new Set();for(const g of plan.gaps||[]){if(!g.id||products.has(g.id)||!String(g.item||'').trim()||(g.pairWith||[]).some(id=>!allowed.has(id)))throw Error('Invalid recommendation');products.add(g.id);}
 if(plan.optionalLooks!==undefined&&!Array.isArray(plan.optionalLooks))throw Error('Invalid optional looks');
 const lookIds=new Set();for(const x of plan.optionalLooks||[]){if(!x.id||x.id==='owned'||lookIds.has(x.id)||!Array.isArray(x.itemIds)||new Set(x.itemIds).size!==x.itemIds.length||x.itemIds.some(id=>!allowed.has(id))||!Array.isArray(x.productIds)||!x.productIds.length||new Set(x.productIds).size!==x.productIds.length||x.productIds.some(id=>!products.has(id))||!String(x.scene||'').trim()||(x.date&&(!validDate(x.date)||x.date<plan.startDate||x.date>plan.endDate))||(x.slot&&!['day','evening'].includes(x.slot))||(x.renders||[]).length)throw Error('Invalid optional look');lookIds.add(x.id);}
 if((plan.renders||[]).length)throw Error('Upload images separately');
}
const matchesLook=(z:any,look:any,variant:string)=>z.variant===variant&&z.date===look.date&&z.slot===(look.slot||'day')&&JSON.stringify(z.itemIds)===JSON.stringify(look.itemIds)&&z.scene===look.scene&&JSON.stringify(z.productIds||[])===JSON.stringify(look.productIds||[]);
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 if(!['GET','POST'].includes(req.method))return json({error:'Method not allowed'},405);
 try{
  const u=new URL(req.url),user=u.searchParams.get('user')||'',wardrobe=u.searchParams.get('wardrobe')||'',trip=u.searchParams.get('trip')||'',snapshot=u.searchParams.get('snapshot')||'';
  if(!/^[0-9a-f-]{36}$/.test(user)||!/^w-[a-z0-9]+$/.test(wardrobe)||!/^trip-[a-z0-9-]+$/.test(trip)||!snapshot)return json({error:'Invalid scope'},400);
  const record=(await rows(user,wardrobe,'trip',trip))[0],access=record?.data?.handoff?.returnAccess;
  if(!record||!access||!await sameSecret(req.headers.get('Authorization')?.replace(/^Bearer /,'')||'',access.token)||Date.parse(access.expiresAt)<=Date.now()||!Number.isFinite(Date.parse(access.expiresAt)))return json({error:'Invalid or expired trip access'},401);
  if(record.data.snapshotId!==snapshot)return json({error:'Wardrobe snapshot changed'},409);
  if(req.method==='GET'&&u.searchParams.get('kind')==='bundle'){
   const active=(await rows(user,wardrobe,'item')).filter((x:any)=>!x.data.archived&&!x.data.mergedInto);
   const currentCatalog={wardrobe,items:active.map(({id,data}:any)=>({id,category:data.category,name:data.name,color:data.color,brand:data.brand,material:data.material,size:data.size,notes:data.notes,extra:data.extra,reversible:!!data.reversible,updatedAt:data.updatedAt,photoCount:(data.photos||[]).length}))};
   return json({tripId:trip,snapshotId:snapshot,instructions:record.data.handoff.instructions,catalog:record.data.handoff.catalog,currentCatalog,photoAttachments:(record.data.handoff.photoAttachments||[]).map(({image,...sheet}:any)=>sheet),faceAttachments:record.data.handoff.faceAttachments||[],expiresAt:access.expiresAt});
  }
  if(req.method==='POST'&&u.searchParams.get('action')==='proposal'){
   if(!req.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Use application/json'},400);
   const text=await req.text();if(text.length>2*1024*1024)return json({error:'Proposal exceeds 2 MB'},413);
   let body;try{body=JSON.parse(text)}catch{return json({error:'Invalid JSON'},400)}
   if(!['rendering','partial','complete'].includes(body.status))return json({error:'Invalid proposal status'},400);
   const active=await rows(user,wardrobe,'item');
   try{validateProposal(body.plan,trip,snapshot,active)}catch(e){return json({error:(e as Error).message},400)}
   if(body.status==='complete'){
    const renders=(await rows(user,wardrobe,'render')).map((x:any)=>x.data).filter((x:any)=>x.tripId===trip&&x.snapshotId===snapshot);
    const expected=[...body.plan.outfits.map((look:any)=>({look,variant:'owned'})),...(body.plan.optionalLooks||[]).map((look:any)=>({look,variant:look.id}))];
    const missing=expected.filter(({look,variant})=>!renders.some((z:any)=>matchesLook(z,look,variant)));
    if(missing.length)return json({error:'Images have not all returned',missingImages:missing.length},409);
   }
   const latest=(await rows(user,wardrobe,'trip',trip))[0];if(latest?.data?.snapshotId!==snapshot||latest.data.handoff.returnAccess.token!==access.token)return json({error:'Handoff changed during save'},409);
   const at=new Date().toISOString(),data={plan:body.plan,status:body.status,updatedAt:at,...(body.status==='partial'?{error:String(body.error||'Some images remain to be generated.').slice(0,1000)}:{})};
   const saved=await fetch(base+'/rest/v1/records?on_conflict=user_id,wardrobe,kind,id',{method:'POST',headers:{...headers,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({user_id:user,wardrobe,kind:'proposal',id:trip,data,deleted:false})});
   if(!saved.ok)return json({error:'Proposal save failed'},502);
   return json({saved:true,tripId:trip,status:body.status,updatedAt:at});
  }
  if(req.method==='GET'){
   const kind=u.searchParams.get('kind'),id=u.searchParams.get('id')||'',index=Number(u.searchParams.get('index')||'0');
   if(!['sheet','item','face','render'].includes(kind||'')||!Number.isInteger(index)||index<0||index>40)return json({error:'Invalid reference'},400);
   let ref:string|undefined;
   if(kind==='sheet'){
    if(index!==0)return json({error:'Invalid sheet index'},400);
    const sheet=(record.data.handoff.photoAttachments||[]).find((x:{filename:string})=>x.filename===id);
    if(!sheet)return json({error:'Sheet outside this handoff'},403);
    ref=sheet.image;
   }else{
    const permitted=kind==='render'?true:kind==='item'?record.data.handoff.catalog.items.some((x:{id:string})=>x.id===id):(record.data.handoff.faceAttachments||[]).some((x:{id:string})=>x.id===id);
    if(!permitted)return json({error:'Reference outside this handoff'},403);
    const row=(await rows(user,wardrobe,kind!,id))[0];if(!row||row.data.archived||row.data.mergedInto)return json({error:'Reference is not active'},409);
    if(kind==='render'&&(row.data.tripId!==trip||row.data.snapshotId!==snapshot))return json({error:'Render outside this handoff'},403);
    ref=kind==='render'?row.data.image:kind==='item'?row.data.photos?.[index]:row.data.data;
   }
   if(typeof ref==='string'&&/^data:image\/(png|jpeg);base64,/.test(ref)){const comma=ref.indexOf(','),raw=atob(ref.slice(comma+1));if(raw.length>12*1024*1024)return json({error:'Reference exceeds 12 MB'},413);return new Response(Uint8Array.from(raw,c=>c.charCodeAt(0)),{headers:{...cors,'Content-Type':ref.slice(5,ref.indexOf(';')),'Cache-Control':'no-store'}});}
   if(typeof ref!=='string'||!/^sb:[a-f0-9]{32,64}$/.test(ref))return json({error:'Stored reference unavailable'},404);
   const r=await fetch(base+'/storage/v1/object/authenticated/photos/'+user+'/'+ref.slice(3)+'.jpg',{headers});if(!r.ok)return json({error:'Photo download failed'},502);
   return new Response(r.body,{headers:{...cors,'Content-Type':r.headers.get('Content-Type')||'image/jpeg','Cache-Control':'no-store'}});
  }
  const existing=(await rows(user,wardrobe,'render')).filter((r:{data:{tripId:string,snapshotId:string}})=>r.data.tripId===trip&&r.data.snapshotId===snapshot);if(existing.length>=80)return json({error:'This lookbook already has 80 renders'},429);
  const size=Number(req.headers.get('content-length')||0);if(size>12*1024*1024)return json({error:'Image exceeds 12 MB'},413);
  const form=await req.formData(),file=form.get('image');if(!(file instanceof File)||file.size===0||file.size>12*1024*1024)return json({error:'Supply an image under 12 MB'},400);
  const meta=JSON.parse(String(form.get('metadata')||'{}'));
  const proposal=(await rows(user,wardrobe,'proposal',trip))[0]?.data?.plan;
  if(!proposal||proposal.snapshotId!==snapshot||proposal.tripId!==trip)return json({error:'Save the matching proposal before uploading renders'},409);
  const variant=String(meta.variant||'owned'),look=variant==='owned'?(proposal.outfits||[]).find((x:{date:string,slot?:string})=>x.date===meta.date&&(x.slot||'day')===meta.slot):(proposal.optionalLooks||[]).find((x:{id:string})=>x.id===variant);
  if(!look||JSON.stringify(look.itemIds)!==JSON.stringify(meta.itemIds)||look.scene!==meta.scene)return json({error:'Render does not match the proposed look'},409);
  for(const id of meta.itemIds){const item=(await rows(user,wardrobe,'item',id))[0];if(!item||item.data.archived||item.data.mergedInto)return json({error:'Render includes an inactive garment'},409);}
  const bytes=new Uint8Array(await file.arrayBuffer()),png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71&&bytes[4]===13&&bytes[5]===10&&bytes[6]===26&&bytes[7]===10,jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(!png&&!jpeg)return json({error:'Only JPEG or PNG images are accepted'},400);
  const hash=await digest(bytes),path=user+'/'+hash+'.jpg',image='sb:'+hash;
  const upload=await fetch(base+'/storage/v1/object/photos/'+path,{method:'POST',headers:{...headers,'Content-Type':png?'image/png':'image/jpeg','x-upsert':'false'},body:bytes});
  if(!upload.ok){const e=await upload.json().catch(()=>({}));if(e.statusCode!=='409'&&e.statusCode!==409&&e.error!=='Duplicate')return json({error:'Image storage failed'},502);}
  const latest=(await rows(user,wardrobe,'trip',trip))[0];if(latest?.data?.snapshotId!==snapshot||latest.data.handoff.returnAccess.token!==access.token)return json({error:'Handoff changed during upload'},409);
  const at=new Date().toISOString(),id='render-'+crypto.randomUUID();
  const data={tripId:trip,snapshotId:snapshot,date:meta.date,slot:meta.slot,variant,itemIds:meta.itemIds,productIds:look.productIds||[],scene:meta.scene,image,at,model:'ChatGPT',updatedAt:at};
  const saved=await fetch(base+'/rest/v1/records',{method:'POST',headers:{...headers,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({user_id:user,wardrobe,kind:'render',id,data,deleted:false})});
  if(!saved.ok)return json({error:'Image metadata save failed'},502);
  return json({saved:true,id,image,tripId:trip,snapshotId:snapshot});
 }catch{return json({error:'Unable to process handoff request'},500);}
});
