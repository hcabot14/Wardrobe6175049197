/* Development MCP bridge. Production handoff stays untouched. No model API. */
const READ='wardrobe.read',WRITE='wardrobe.write',MAX_IMAGE=12*1024*1024;
const str={type:'string',minLength:1};
const scope={wardrobe_id:{...str,pattern:'^w-[a-z0-9]+$'},trip_id:{...str,pattern:'^trip-[a-z0-9-]+$'}};
const file={type:'object',properties:{download_url:str,file_id:str,mime_type:{type:'string'},file_name:{type:'string'}},required:['download_url','file_id'],additionalProperties:false};
const specs=[
 ['get_trip_bundle','Read the current catalog, snapshot and reference manifest for an approved trip.',{},[]],
 ['get_reference_image','Return one approved sheet, face or garment photograph as actual image content.',{kind:{enum:['sheet','face','item']},id:str,index:{type:'integer',minimum:0,maximum:40}},['kind','id']],
 ['save_proposal','Stage an outfit proposal for review. Does not complete or accept a lookbook.',{snapshot:str,proposal:{type:'object'}},['snapshot','proposal']],
 ['upload_render','Store one generated image matching the staged proposal. Never pass image base64.',{snapshot:str,proposal_id:str,image:file,metadata:{type:'object'}},['snapshot','proposal_id','image','metadata']],
 ['complete_proposal','Verify all images for the saved proposal and mark it ready for user review.',{snapshot:str,proposal_id:str},['snapshot','proposal_id']]
];
export const toolDescriptors=specs.map(([name,description,properties,required],i)=>({name,title:name.replaceAll('_',' '),description,inputSchema:{type:'object',properties:{...scope,...properties},required:['wardrobe_id','trip_id',...required],additionalProperties:false},annotations:{readOnlyHint:i<2,destructiveHint:false,idempotentHint:i!==3,openWorldHint:i===3},securitySchemes:[{type:'oauth2',scopes:['openid']}],_meta:{securitySchemes:[{type:'oauth2',scopes:['openid']}],...(i===3?{'openai/fileParams':['image']}:{})}}));
class Failure extends Error{constructor(status,message){super(message);this.status=status}}
const fail=(status,message)=>{throw new Failure(status,message)};
function httpsUrl(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port)throw Error('Expected HTTPS URL');return u}
function claims(token){try{return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(token.split('.')[1].replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0))))}catch{fail(401,'Invalid access token')}}
async function limitedBytes(response,max){const reader=response.body?.getReader();if(!reader)fail(502,'Missing image');const chunks=[];let size=0;try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();fail(413,'Payload exceeds allowed size')}chunks.push(value)}}finally{reader.releaseLock()}const out=new Uint8Array(size);let offset=0;for(const c of chunks){out.set(c,offset);offset+=c.length}return out}
function imageType(bytes){if(bytes.length>=8&&[137,80,78,71,13,10,26,10].every((x,i)=>bytes[i]===x))return 'image/png';if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';fail(400,'Only PNG or JPEG image bytes are accepted')}
function base64(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s)}
export function createServer(config,{fetch:request=fetch,now=Date.now}={}){
 const base=httpsUrl(config.supabaseUrl).origin,resource=httpsUrl(config.resourceUrl).href;
 const issuer=base+'/auth/v1',clientIds=config.clientIds||[];
 // Supabase strips /functions/v1 at its gateway; keep both exact paths valid.
 const resourcePath=new URL(resource).pathname;
 const routePaths=new Set([resourcePath,resourcePath.replace(/^\/functions\/v1(?=\/)/,'')]);
 const trustedOrigins=new Set((config.fileOrigins||[]).map(x=>httpsUrl(x).origin));
 const headers={apikey:config.serviceKey,Authorization:'Bearer '+config.serviceKey};
 const json=(body,status=200,extra={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...extra}});
 const authChallenge=()=>json({error:'Sign in with Wardrobe to use this connector'},401,{'WWW-Authenticate':`Bearer resource_metadata="${resource}/.well-known/oauth-protected-resource"`});
 async function getRow(user,wardrobe,kind,id){const q=new URLSearchParams({select:'data',user_id:'eq.'+user,wardrobe:'eq.'+wardrobe,kind:'eq.'+kind,id:'eq.'+id,deleted:'eq.false'});const r=await request(base+'/rest/v1/records?'+q,{headers,redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok)fail(502,'Record lookup failed');const rows=await r.json();return rows.length===1?rows[0].data:null}
 async function authenticate(req){
  if(!clientIds.length||!config.serviceKey)fail(503,'Connector authentication is not configured');
  const match=/^Bearer ([A-Za-z0-9_.-]+)$/.exec(req.headers.get('Authorization')||'');if(!match)fail(401,'Sign in required');
  // /user is the authority for signature/session validation; decoded claims are NEVER trusted before this succeeds.
  const r=await request(issuer+'/user',{headers:{apikey:config.serviceKey,Authorization:'Bearer '+match[1]},redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!r.ok)fail(401,'Invalid access token');const user=await r.json(),c=claims(match[1]);
  if(!/^[a-f0-9-]{36}$/.test(user.id||'')||c.sub!==user.id||c.iss!==issuer||c.role!=='authenticated'||!Number.isFinite(c.exp)||c.exp*1000<=now()||!Number.isFinite(c.iat)||c.iat*1000>now()+30000||(c.nbf!==undefined&&(!Number.isFinite(c.nbf)||c.nbf*1000>now()))||!clientIds.includes(c.client_id)||!(Array.isArray(c.aud)?c.aud:[c.aud]).includes(resource)||!String(c.scope||'').split(' ').includes('openid'))fail(401,'Token issuer, audience, client, scope or expiry is invalid');
  return {userId:user.id,clientId:c.client_id};
 }
 async function bindingFor(principal,args,write){
  if(!/^w-[a-z0-9]+$/.test(args.wardrobe_id||'')||!/^trip-[a-z0-9-]+$/.test(args.trip_id||''))fail(400,'Invalid trip scope');
  const [trip,grant]=await Promise.all([getRow(principal.userId,args.wardrobe_id,'trip',args.trip_id),getRow(principal.userId,args.wardrobe_id,'connector_grant',args.trip_id)]);
  if(!trip||!grant||grant.clientId!==principal.clientId||grant.tripId!==args.trip_id||grant.snapshot!==trip.snapshotId||!grant.scopes?.includes(write?WRITE:READ)||!Number.isFinite(Date.parse(grant.expiresAt))||Date.parse(grant.expiresAt)<=now())fail(403,'This trip has not been approved for this connector, or its approval expired');
  const access=trip.handoff?.returnAccess;
  if(!access?.token||!Number.isFinite(Date.parse(access.expiresAt))||Date.parse(access.expiresAt)<=now())fail(403,'Prepare a fresh handoff in Wardrobe');
  if(write&&args.snapshot!==trip.snapshotId)fail(409,'Stale snapshot');
  // Never trust returnAccess.endpoint from a row. The only upstream is our own handoff service.
  const endpoint=new URL(base+'/functions/v1/wardrobe-handoff');endpoint.search=new URLSearchParams({user:principal.userId,wardrobe:args.wardrobe_id,trip:args.trip_id,snapshot:trip.snapshotId}).toString();
  return {endpoint,token:access.token,trip,principal,expiresAt:new Date(Math.min(Date.parse(access.expiresAt),Date.parse(grant.expiresAt))).toISOString()};
 }
 async function upstream(binding,query,options={}){const u=new URL(binding.endpoint);for(const [k,v]of Object.entries(query))u.searchParams.set(k,v);const r=await request(u.href,{...options,headers:{...options.headers,Authorization:'Bearer '+binding.token},redirect:'error',signal:AbortSignal.timeout(30000)});if(!r.ok)fail(r.status===409?409:502,r.status===409?'Trip or catalog changed, or required renders are missing':'Private handoff operation failed');return r}
 async function invoke(principal,name,args){
  const spec=toolDescriptors.find(x=>x.name===name);if(!spec)fail(400,'Unknown tool');
  if(!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).some(k=>!Object.hasOwn(spec.inputSchema.properties,k)))fail(400,'Unexpected tool arguments');
  if(spec.inputSchema.required.some(k=>args[k]===undefined))fail(400,'Missing tool argument');
  const write=!spec.annotations.readOnlyHint,b=await bindingFor(principal,args,write);
  const text=x=>({content:[{type:'text',text:JSON.stringify(x)}]});
  if(name==='get_trip_bundle'){
   const data=await(await upstream(b,{kind:'bundle'})).json();if(!data.catalogMatches)fail(409,'Catalog changed; prepare a fresh handoff');
   // Explicit projection. No access token, private endpoint, storage URL or session is returned.
   return text({tripId:args.trip_id,snapshotId:b.trip.snapshotId,instructions:data.instructions,catalog:data.catalog,currentCatalog:data.currentCatalog,photoAttachments:(data.photoAttachments||[]).map(x=>({filename:x.filename,itemIds:x.itemIds})),faceAttachments:(data.faceAttachments||[]).map(x=>({id:x.id})),expiresAt:b.expiresAt});
  }
  if(name==='get_reference_image'){
   const index=args.index??0;if(!['sheet','face','item'].includes(args.kind)||typeof args.id!=='string'||!args.id||!Number.isInteger(index)||index<0||index>40)fail(400,'Invalid reference');
   const r=await upstream(b,{kind:args.kind,id:args.id,index:String(index)}),bytes=await limitedBytes(r,MAX_IMAGE),mimeType=imageType(bytes);
   return {content:[{type:'image',mimeType,data:base64(bytes)}]};
  }
  if(name==='save_proposal')return text(await(await upstream(b,{action:'proposal'},{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan:args.proposal,status:'rendering'})})).json());
  if(args.proposal_id!==args.trip_id)fail(400,'Proposal outside trip');
  if(name==='complete_proposal'){
   const staged=await getRow(principal.userId,args.wardrobe_id,'proposal',args.trip_id);
   if(staged?.plan?.snapshotId!==args.snapshot)fail(409,'No matching staged proposal');
   return text(await(await upstream(b,{action:'proposal'},{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan:staged.plan,status:'complete'})})).json());
  }
  if(name==='upload_render'){
   const image=args.image;if(!image||typeof image.file_id!=='string'||!image.file_id||typeof image.download_url!=='string')fail(400,'Supply a ChatGPT file');
   let u;try{u=httpsUrl(image.download_url)}catch{fail(400,'Invalid file URL')}
   // Exact configured ChatGPT file origins only; no wildcards or redirected/private endpoints.
   if(!trustedOrigins.has(u.origin))fail(400,'File origin has not been approved for this deployment: '+u.origin);
   const r=await request(u.href,{redirect:'error',signal:AbortSignal.timeout(30000)});if(!r.ok)fail(502,'ChatGPT file download failed');
   const bytes=await limitedBytes(r,MAX_IMAGE),mime=imageType(bytes),form=new FormData();form.set('image',new File([bytes],'render.'+(mime==='image/png'?'png':'jpg'),{type:mime}));form.set('metadata',JSON.stringify(args.metadata));
   return text(await(await upstream(b,{}, {method:'POST',body:form})).json());
  }
 }
 return async req=>{
  try{
   const url=new URL(req.url);
   if([...routePaths].some(path=>url.pathname===path+'/.well-known/oauth-protected-resource'))return json({resource,authorization_servers:[issuer],scopes_supported:['openid'],bearer_methods_supported:['header']});
   if(!routePaths.has(url.pathname))return json({error:'Not found'},404);
   if(req.method!=='POST')return json({error:'Use MCP POST'},405,{'Allow':'POST'});
   if(req.headers.has('Origin')&&req.headers.get('Origin')!=='https://chatgpt.com')return json({error:'Origin not allowed'},403);
   if(!req.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Use application/json'},415);
   const source=await limitedBytes(req,2*1024*1024);let rpc;try{rpc=JSON.parse(new TextDecoder().decode(source))}catch{return json({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Invalid JSON'}},400)}
   if(!rpc||rpc.jsonrpc!=='2.0'||typeof rpc.method!=='string'||rpc.id!==undefined&&typeof rpc.id!=='string'&&typeof rpc.id!=='number')return json({jsonrpc:'2.0',id:null,error:{code:-32600,message:'Invalid request'}},400);
   if(!['initialize','notifications/initialized','ping','tools/list','tools/call'].includes(rpc.method))return json({jsonrpc:'2.0',id:rpc.id??null,error:{code:-32601,message:'Method not found'}});
   // Discovery is public; tool calls alone authenticate and require approved-trip binding.
   let result;
   if(rpc.method==='initialize')result={protocolVersion:['2025-03-26','2025-06-18','2025-11-25'].includes(rpc.params?.protocolVersion)?rpc.params.protocolVersion:'2025-03-26',serverInfo:{name:'wardrobe-connector-dev',version:'0.2.0'},capabilities:{tools:{listChanged:false}}};
   if(rpc.method==='notifications/initialized')return new Response(null,{status:202});
   if(rpc.method==='ping')result={};
   if(rpc.method==='tools/list')result={tools:toolDescriptors};
   if(rpc.method==='tools/call'){
    if(rpc.id===undefined)return json({jsonrpc:'2.0',id:null,error:{code:-32600,message:'Tool calls require a request ID'}},400);
    try{const principal=await authenticate(req);result=await invoke(principal,rpc.params?.name,rpc.params?.arguments)}catch(e){if(e.status===401)return authChallenge();result={isError:true,content:[{type:'text',text:e instanceof Failure?e.message:'Connector operation failed'}]}}
   }
   if(rpc.id===undefined)return new Response(null,{status:202});
   return json({jsonrpc:'2.0',id:rpc.id,result});
  }catch(e){return json({error:e instanceof Failure?e.message:'Connector request failed'},e instanceof Failure?e.status:500)}
 };
}
