const assert=require('node:assert/strict');
const {test}=require('node:test');

test('prepared trips and approval persist; withdrawal and snapshot changes still apply',async()=>{
 const {createApproval}=await import('../connector/approval/core.mjs');
 let clock=Date.parse('2026-11-03'),grant;
 const user='00000000-0000-4000-8000-000000000001';
 const trip={id:'trip-test',wardrobe:'w-test',data:{snapshotId:'snapshot',handoff:{returnAccess:{token:'private-test',expiresAt:'2000-01-01'}}}};
 let session={uid:user,access:'test',refresh:'refresh',exp:clock+3600000};
 const storage={getItem:()=>JSON.stringify(session),setItem:(_,v)=>{session=JSON.parse(v)}};
 const approval=createApproval({base:'https://test.invalid',anon:'anon',clientId:'client',redirectUri:'https://chatgpt.com/callback',resource:'https://test.invalid/connector',storage,now:()=>clock,fetch:async(url,options)=>{
  const u=new URL(url);
  if(u.pathname==='/auth/v1/token')return Response.json({access_token:'fresh',refresh_token:'refresh',expires_in:3600,user:{id:user}});
  if(u.pathname==='/auth/v1/user')return Response.json({id:user});
  assert.equal(u.pathname,'/rest/v1/records');
  if(options.method==='POST'){grant=JSON.parse(options.body);return Response.json({})}
  assert.equal(u.searchParams.get('user_id'),'eq.'+user);
  if(options.method==='PATCH'){assert.equal(u.searchParams.get('wardrobe'),'eq.w-test');assert.equal(u.searchParams.get('id'),'eq.trip-test');grant.deleted=JSON.parse(options.body).deleted;return Response.json({})}
  return Response.json([trip]);
 }});
 let [selection]=await approval.preparedTrips();assert.ok(selection);
 await approval.approveTrip(selection);assert.equal(grant.data.expiresAt,null);assert.equal(grant.data.snapshot,'snapshot');
 clock+=365*86400000;assert.equal((await approval.preparedTrips()).length,1);
 await approval.revokeTrip(selection);assert.equal(grant.deleted,true);
 trip.data.snapshotId='changed';await assert.rejects(approval.approveTrip(selection),/changed/);
 delete trip.data.handoff.returnAccess.token;assert.equal((await approval.preparedTrips()).length,0);
});

test('connector accepts legacy and persistent approvals while preserving all bindings',async()=>{
 const {createServer}=await import('../supabase/functions/wardrobe-connector-dev/server.mjs');
 let clock=Date.parse('2026-11-03'),authExpired=false,upstreamCalls=0;
 const user='00000000-0000-4000-8000-000000000001',base='https://test.invalid',resource=base+'/functions/v1/wardrobe-connector-dev';
 const trip={snapshotId:'snapshot',handoff:{returnAccess:{token:'test-private',expiresAt:'2000-01-01'}}};
 let grant={clientId:'client',tripId:'trip-test',snapshot:'snapshot',scopes:['wardrobe.read','wardrobe.write'],expiresAt:'2000-01-01'};
 const handle=createServer({supabaseUrl:base,serviceKey:'server-test',resourceUrl:resource,clientIds:['client']},{now:()=>clock,fetch:async(url,options)=>{
  const u=new URL(url);
  if(u.pathname==='/auth/v1/user')return Response.json({id:user});
  if(u.pathname==='/rest/v1/records'){
   assert.equal(u.searchParams.get('user_id'),'eq.'+user);assert.equal(u.searchParams.get('deleted'),'eq.false');
   if(u.searchParams.get('wardrobe')!=='eq.w-test'||u.searchParams.get('id')!=='eq.trip-test')return Response.json([]);
   const data=u.searchParams.get('kind')==='eq.trip'?trip:grant;return Response.json(data?[{data}]:[]);
  }
  assert.equal(u.pathname,'/functions/v1/wardrobe-handoff');assert.equal(options.headers.Authorization,'Bearer test-private');upstreamCalls++;
  return Response.json({catalogMatches:true,catalog:{items:[]},currentCatalog:{items:[]}});
 }});
 const call=async(patch={},name='get_trip_bundle')=>{
  const c={sub:user,iss:base+'/auth/v1',role:'authenticated',iat:clock/1000,exp:clock/1000+(authExpired?-1:3600),client_id:'client',aud:resource,scope:'openid'};
  const jwt='e30.'+Buffer.from(JSON.stringify(c)).toString('base64url')+'.signature';
  return handle(new Request(resource,{method:'POST',headers:{Authorization:'Bearer '+jwt,'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:{wardrobe_id:'w-test',trip_id:'trip-test',...patch}}})}));
 };
 const result=async(patch,name)=>(await(await call(patch,name)).json()).result;
 assert.equal((await result()).isError,undefined);
 clock+=365*86400000;let r=await result();assert.equal(r.isError,undefined);assert.equal(JSON.parse(r.content[0].text).expiresAt,null);
 grant.expiresAt=null;trip.handoff.returnAccess.expiresAt=null;assert.equal((await result()).isError,undefined);
 const approved=structuredClone(grant);grant=null;let before=upstreamCalls;assert.equal((await result()).isError,true);assert.equal(upstreamCalls,before);
 grant=structuredClone(approved);grant.clientId='another';assert.equal((await result()).isError,true);
 grant=structuredClone(approved);grant.snapshot='stale';assert.equal((await result()).isError,true);
 grant=structuredClone(approved);grant.scopes=[];assert.equal((await result()).isError,true);
 grant=structuredClone(approved);assert.equal((await result({wardrobe_id:'w-other'})).isError,true);assert.equal((await result({trip_id:'trip-other'})).isError,true);
 assert.equal((await result({snapshot:'stale',proposal:{}},'save_proposal')).isError,true);
 delete trip.handoff.returnAccess.token;assert.equal((await result()).isError,true);
 authExpired=true;assert.equal((await call()).status,401);
});

test('actual reference registration works without a trip deadline',async()=>{
 const {registerReferences}=await import('../supabase/functions/wardrobe-connector-dev/reference-widget.mjs');
 const refs={key:'trip:snapshot:look',expiresAt:null,outfit:{},references:[{fileName:'Face-reference-1.jpg',mimeType:'image/jpeg',data:Buffer.from([255,216,255]).toString('base64')}]};
 let uploads=0;const host={uploadFile:async()=>({fileId:'file-'+ ++uploads}),setWidgetState:async()=>{}};
 assert.equal((await registerReferences(host,refs)).length,1);refs.expiresAt='2000-01-01';assert.equal((await registerReferences(host,refs)).length,1);
});
