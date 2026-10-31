// Host-owned file registration; no external URLs, model API, or credentials.
export const referenceWidgetUri='ui://widget/wardrobe-references-v3.html';
export async function registerReferences(host,payload,onProgress=()=>{}){
 if(!host?.uploadFile||!host?.setWidgetState)throw Error('This ChatGPT session does not support reference-file registration.');
 if(!payload||typeof payload.key!=='string'||!Array.isArray(payload.references)||!payload.references.length||payload.references.length>32||!Number.isFinite(Date.parse(payload.expiresAt))||Date.parse(payload.expiresAt)<=Date.now())throw Error('Reference package is invalid or expired. Prepare it again.');
 const prior=host.widgetState?.privateContent;
 const files=prior?.key===payload.key&&Array.isArray(prior.files)?prior.files.slice():[];
 const persist=()=>host.setWidgetState({modelContent:{status:files.length===payload.references.length?'registered':'registering',key:payload.key,outfit:payload.outfit,files:files.map(f=>({fileId:f.fileId,fileName:f.fileName}))},privateContent:{key:payload.key,files},imageIds:files.map(f=>f.fileId)});
 let total=0;
 for(const ref of payload.references){
  if(!/^[a-zA-Z0-9_.-]+\.(jpg|png)$/.test(ref.fileName)||!['image/jpeg','image/png'].includes(ref.mimeType)||typeof ref.data!=='string'||ref.data.length>16*1024*1024)throw Error('Invalid reference file.');
  total+=ref.data.length;if(total>48*1024*1024)throw Error('Reference package is too large.');
 }
 for(const ref of payload.references){
  if(Date.parse(payload.expiresAt)<=Date.now())throw Error('Trip approval expired. Prepare a fresh request.');
  if(files.some(f=>f.fileName===ref.fileName))continue;
  const bytes=Uint8Array.from(atob(ref.data),c=>c.charCodeAt(0));
  const result=await host.uploadFile(new File([bytes],ref.fileName,{type:ref.mimeType}));
  if(typeof result?.fileId!=='string'||!result.fileId)throw Error('ChatGPT did not register a reference file.');
  files.push({fileId:result.fileId,fileName:ref.fileName});await persist();onProgress(files.length,payload.references.length);
 }
 await persist();return files;
}
export function connectReferenceHost(target,onResult,timeoutMs=15000){
 return new Promise((resolve,reject)=>{
  const id='wardrobe-ui-initialize';let initialized=false;
  const timer=setTimeout(()=>reject(Error('ChatGPT did not initialize the reference component.')),timeoutMs);
  target.addEventListener('message',event=>{
   if(event.source!==target.parent||event.data?.jsonrpc!=='2.0')return;
   const message=event.data;
   if(message.id===id&&!initialized){clearTimeout(timer);if(message.error){reject(Error('ChatGPT rejected component initialization.'));return}initialized=true;target.parent.postMessage({jsonrpc:'2.0',method:'ui/notifications/initialized',params:{}},'*');resolve(message.result);}
   if(initialized&&message.method==='ui/notifications/tool-result')onResult(message.params);
   if(initialized&&message.method==='ping'&&message.id!==undefined)target.parent.postMessage({jsonrpc:'2.0',id:message.id,result:{}},'*');
  });
  target.parent.postMessage({jsonrpc:'2.0',id,method:'ui/initialize',params:{appInfo:{name:'Wardrobe references',version:'0.3.0'},appCapabilities:{availableDisplayModes:['inline']},protocolVersion:'2026-01-26'}},'*');
 });
}
export const referenceWidgetHtml=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:15px system-ui;padding:16px;color:inherit}p{line-height:1.5}button{padding:10px;border-radius:8px}</style></head><body><h3>Outfit reference files</h3><p id="status" role="status">Connecting to ChatGPT…</p><button id="retry" hidden>Retry registration</button><script>
const registerReferences=${registerReferences.toString()};
const connectReferenceHost=${connectReferenceHost.toString()};
let busy=false,finished=false,ready=false,latestResult;
function payload(){const m=window.openai?.toolResponseMetadata;return latestResult?._meta?.referencesPackage||m?.referencesPackage||m?._meta?.referencesPackage||m?.mcp_tool_result?._meta?.referencesPackage||m?.call_tool_result?._meta?.referencesPackage}
async function start(){if(!ready||busy||finished)return;const p=payload();if(!p)return;busy=true;document.getElementById('retry').hidden=true;try{const files=await registerReferences(window.openai,p,(n,total)=>document.getElementById('status').textContent='Preparing reference '+n+' of '+total+'…');finished=true;document.getElementById('status').textContent=files.length+' actual reference files registered with ChatGPT. Image-generation use still needs verification.';if(window.openai.sendFollowUpMessage)await window.openai.sendFollowUpMessage({prompt:'Wardrobe reference registration completed for '+p.key+'. The component state contains '+files.length+' registered reference image IDs and the exact saved outfit. Use these actual file references for the next image-generation step; do not substitute descriptions or prior generated images. If the host does not expose them to image generation, report that limitation. Do not change the saved proposal or mark the trip complete.'});}catch(e){document.getElementById('status').textContent=e.message;document.getElementById('retry').hidden=false;}finally{busy=false}}
document.getElementById('retry').onclick=start;window.addEventListener('openai:set_globals',start);connectReferenceHost(window,result=>{latestResult=result;start()}).then(()=>{ready=true;document.getElementById('status').textContent='Waiting for approved reference photos…';window.parent.postMessage({jsonrpc:'2.0',method:'ui/notifications/size-changed',params:{height:180}},'*');start()}).catch(e=>{document.getElementById('status').textContent=e.message});
</script></body></html>`;
