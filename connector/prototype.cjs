'use strict';
// Development-only tool adapter. Never expose this module directly as HTTP/MCP.
// Trusted host supplies authenticated principal + server-side trip binding on EVERY call.
const tools=['get_trip_bundle','get_reference_image','save_proposal','upload_render','complete_proposal'];
function createConnector({authorize,backend,now=Date.now}){
 if(typeof authorize!=='function'||typeof backend!=='function')throw Error('Trusted adapters required');
 return async function invoke(principal,name,args={}){
  if(!tools.includes(name))throw Error('Unknown tool');
  const write=['save_proposal','upload_render','complete_proposal'].includes(name);
  const binding=await authorize(principal,args.trip_id,write?'write':'read');
  if(!binding||!binding.userId||!binding.wardrobeId||binding.tripId!==args.trip_id||!binding.snapshot||!Number.isFinite(Date.parse(binding.expiresAt))||Date.parse(binding.expiresAt)<=now()||!binding.scopes?.includes(write?'write':'read'))throw Error('Unauthorized or expired');
  if(write&&args.snapshot!==binding.snapshot)throw Error('Stale snapshot');
  // Backend must use the binding, never model-provided user/wardrobe/token/URL.
  // Backend rechecks live snapshot, object allowlist, IDs and completeness atomically.
  let payload;
  switch(name){
   case 'get_trip_bundle': payload={};break;
   case 'get_reference_image':
    if(!['sheet','item','face'].includes(args.kind)||typeof args.id!=='string'||!Number.isInteger(args.index??0)||(args.index??0)<0)throw Error('Invalid reference');
    payload={kind:args.kind,id:args.id,index:args.index??0};break;
   case 'save_proposal':payload={proposal:args.proposal};break;
   case 'upload_render':
    if(args.proposal_id!==binding.tripId)throw Error('Proposal outside trip');
    if(!(args.image instanceof Uint8Array)||!args.image.length||args.image.length>12*1024*1024)throw Error('Invalid image bytes');
    payload={image:args.image,metadata:args.metadata};break;
   case 'complete_proposal':
    if(args.proposal_id!==binding.tripId)throw Error('Proposal outside trip');
    payload={};break;
  }
  const result=await backend(binding,name,payload);
  if(name==='get_reference_image'){
   if(!(result.bytes instanceof Uint8Array)||!result.bytes.length||result.bytes.length>12*1024*1024||!['image/png','image/jpeg'].includes(result.mimeType))throw Error('Image unavailable');
   return {content:[{type:'image',mimeType:result.mimeType,data:Buffer.from(result.bytes).toString('base64')}]};
  }
  return result; // Trusted backend must return a public projection, never its binding or secrets.
 };
}
module.exports={createConnector,tools};
