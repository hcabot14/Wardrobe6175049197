const assert=require('node:assert/strict');
(async()=>{
 const {createServer,toolDescriptors}=await import('../supabase/functions/wardrobe-connector-dev/server.mjs');
 const base='https://wardrobe.test',resource=base+'/functions/v1/wardrobe-connector-dev';
 const user='00000000-0000-4000-8000-000000000001';
 const clock=Date.parse('2026-10-31T01:00:00Z');
 const claim={sub:user,iss:base+'/auth/v1',aud:resource,role:'authenticated',client_id:'chatgpt-test',scope:'openid',iat:clock/1000-60,exp:clock/1000+600};
 const jwt=c=>'header.'+Buffer.from(JSON.stringify(c)).toString('base64url')+'.signature';
 let acceptedToken=jwt(claim),authCalls=0,requests=[],catalogMatches=true,status='rendering';
 const trip={snapshotId:'snapshot',handoff:{returnAccess:{token:'PRIVATE-HANDOFF-TOKEN',expiresAt:'2026-11-01',endpoint:'https://evil.test'}}};
 const grant={clientId:'chatgpt-test',tripId:'trip-test',snapshot:'snapshot',scopes:['wardrobe.read','wardrobe.write'],expiresAt:'2026-11-01'};
 const plan={tripId:'trip-test',snapshotId:'snapshot',outfits:[]};
 const png=new Uint8Array([137,80,78,71,13,10,26,10,1,2,3]);
 const network=async(input,options={})=>{
  const u=new URL(input);requests.push({url:u.href,options});
  if(u.pathname==='/auth/v1/user'){authCalls++;assert.equal(options.headers.apikey,'SERVER-KEY');return options.headers.Authorization==='Bearer '+acceptedToken?Response.json({id:user}):Response.json({}, {status:401})}
  if(u.pathname==='/rest/v1/records'){
   assert.equal(options.headers.Authorization,'Bearer SERVER-KEY');assert.equal(u.searchParams.get('user_id'),'eq.'+user);assert.equal(u.searchParams.get('wardrobe'),'eq.w-test');
   if(u.searchParams.get('id')!=='eq.trip-test')return Response.json([]);
   const kind=u.searchParams.get('kind');return Response.json(kind==='eq.trip'?[{data:trip}]:kind==='eq.connector_grant'?[{data:grant}]:kind==='eq.proposal'?[{data:{plan}}]:[])
  }
  if(u.origin==='https://files.test'){assert.equal(options.redirect,'error');assert.equal(options.headers,undefined);return new Response(png)}
  assert.equal(u.origin,base);assert.equal(u.pathname,'/functions/v1/wardrobe-handoff');assert.equal(u.searchParams.get('user'),user);assert.equal(u.searchParams.get('wardrobe'),'w-test');assert.equal(u.searchParams.get('snapshot'),'snapshot');assert.equal(options.headers.Authorization,'Bearer PRIVATE-HANDOFF-TOKEN');assert.ok(!u.href.includes('PRIVATE'));
  if(u.searchParams.get('kind')==='bundle')return Response.json({catalogMatches,instructions:'Plan from actual references',catalog:{items:[{id:'OW-001'}]},currentCatalog:{items:[{id:'OW-001'}]},photoAttachments:[{filename:'sheet.jpg',image:'SECRET-STORAGE',itemIds:['OW-001']}],faceAttachments:[{id:'face',image:'SECRET-STORAGE'}]});
  if(u.searchParams.get('kind'))return u.searchParams.get('id')==='outside'?Response.json({}, {status:403}):new Response(png);
  if(u.searchParams.get('action')==='proposal'){const body=JSON.parse(options.body);assert.equal(body.plan.snapshotId,'snapshot');status=body.status;return Response.json({saved:true,status})}
  assert.ok(options.body instanceof FormData);assert.equal(options.body.get('image').size,png.length);return Response.json({saved:true,id:'render-test'});
 };
 const config={supabaseUrl:base,resourceUrl:resource,serviceKey:'SERVER-KEY',clientIds:['chatgpt-test'],fileOrigins:['https://files.test']};
 const serve=createServer(config,{fetch:network,now:()=>clock});
 const args={wardrobe_id:'w-test',trip_id:'trip-test'};
 async function rpc(method,params,token=acceptedToken,handler=serve){return handler(new Request(resource,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}))}
 async function call(name,more={},token=acceptedToken){const response=await rpc('tools/call',{name,arguments:{...args,...more}},token);return {response,body:await response.json()}}
 let response=await rpc('initialize',{protocolVersion:'2025-06-18'},'');assert.equal((await response.json()).result.protocolVersion,'2025-06-18');
 response=await rpc('tools/list',{},'');assert.equal((await response.json()).result.tools.length,5);assert.equal(authCalls,0);assert.equal(requests.length,0);
 const upload=toolDescriptors.find(x=>x.name==='upload_render');assert.deepEqual(upload._meta['openai/fileParams'],['image']);assert.deepEqual(upload.inputSchema.properties.image.required,['download_url','file_id']);
 response=await serve(new Request(resource+'/.well-known/oauth-protected-resource'));assert.equal((await response.json()).resource,resource);
 let result=await call('get_trip_bundle',{},'');assert.equal(result.response.status,401);assert.match(result.response.headers.get('WWW-Authenticate'),/resource_metadata/);
 result=await call('get_trip_bundle',{},'forged');assert.equal(result.response.status,401);
 for(const patch of [{aud:'https://other.test'},{iss:'https://other.test'},{client_id:'other'},{exp:1},{scope:'email'},{role:'service_role'},{sub:'different'},{nbf:clock/1000+60}]){acceptedToken=jwt({...claim,...patch});result=await call('get_trip_bundle');assert.equal(result.response.status,401)}acceptedToken=jwt(claim);
 result=await call('get_trip_bundle');assert.equal(result.body.result.isError,undefined);assert.ok(!JSON.stringify(result.body).includes('PRIVATE'));assert.ok(!JSON.stringify(result.body).includes('SECRET-STORAGE'));assert.ok(JSON.stringify(result.body).includes('OW-001'));
 result=await call('get_reference_image',{kind:'sheet',id:'sheet.jpg'});assert.equal(result.body.result.content[0].type,'image');assert.deepEqual(Buffer.from(result.body.result.content[0].data,'base64'),Buffer.from(png));
 result=await call('get_reference_image',{kind:'sheet',id:'outside'});assert.equal(result.body.result.isError,true);
 grant.expiresAt='2000-01-01';result=await call('get_trip_bundle');assert.equal(result.body.result.isError,true);grant.expiresAt='2026-11-01';
 grant.scopes=['wardrobe.read'];result=await call('save_proposal',{snapshot:'snapshot',proposal:plan});assert.equal(result.body.result.isError,true);grant.scopes.push('wardrobe.write');
 result=await call('save_proposal',{snapshot:'stale',proposal:plan});assert.equal(result.body.result.isError,true);
 result=await call('get_trip_bundle',{trip_id:'trip-other'});assert.equal(result.body.result.isError,true);
 result=await call('get_trip_bundle',{user_id:'attacker'});assert.equal(result.body.result.isError,true);
 catalogMatches=false;result=await call('get_trip_bundle');assert.equal(result.body.result.isError,true);catalogMatches=true;
 result=await call('save_proposal',{snapshot:'snapshot',proposal:plan});assert.equal(status,'rendering');assert.equal(JSON.parse(result.body.result.content[0].text).saved,true);
 const uploadArgs={snapshot:'snapshot',proposal_id:'trip-test',image:{file_id:'file-test',download_url:'https://files.test/render.png'},metadata:{itemIds:['OW-001']}};
 result=await call('upload_render',uploadArgs);assert.equal(JSON.parse(result.body.result.content[0].text).saved,true);
 const before=requests.filter(x=>x.url.startsWith('https://files.test')).length;
 for(const url of ['http://files.test/render','https://files.test.evil.test/render','https://127.0.0.1/render','https://user@files.test/render','https://files.test:444/render']){result=await call('upload_render',{...uploadArgs,image:{file_id:'file-test',download_url:url}});assert.equal(result.body.result.isError,true)}
 assert.equal(requests.filter(x=>x.url.startsWith('https://files.test')).length,before);
 result=await call('complete_proposal',{snapshot:'snapshot',proposal_id:'other'});assert.equal(result.body.result.isError,true);
 result=await call('complete_proposal',{snapshot:'snapshot',proposal_id:'trip-test'});assert.equal(status,'complete');assert.equal(JSON.parse(result.body.result.content[0].text).saved,true);
 response=await rpc('tools/call',{name:'get_trip_bundle',arguments:args},acceptedToken,createServer({...config,clientIds:[]},{fetch:network,now:()=>clock}));assert.equal((await response.json()).result.isError,true);
 response=await serve(new Request(resource,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://evil.test'},body:'{}'}));assert.equal(response.status,403);
 console.log('Passed: MCP discovery, OAuth authority/claims, approved-trip isolation, secret projection, actual image envelopes, proposal staging/completion, bounded file transfer and SSRF restrictions (mock network).');
})().catch(e=>{console.error(e);process.exitCode=1});
