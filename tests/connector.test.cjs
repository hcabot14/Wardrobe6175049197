const assert=require('node:assert/strict');
const {createConnector}=require('../connector/prototype.cjs');
(async()=>{
 const binding={userId:'user',wardrobeId:'wardrobe',tripId:'trip-test',snapshot:'current',expiresAt:'2099-01-01',scopes:['read','write']};let calls=[];
 const invoke=createConnector({authorize:async(p,t)=>p==='signed-in'&&t===binding.tripId?binding:null,backend:async(b,n,a)=>{calls.push({b,n,a});return n==='get_reference_image'?{bytes:new Uint8Array([137,80,78,71]),mimeType:'image/png'}:{ok:true}}});
 for(const p of [null,'wrong'])await assert.rejects(invoke(p,'get_trip_bundle',{trip_id:'trip-test'}),/Unauthorized/);
 await assert.rejects(invoke('signed-in','get_trip_bundle',{trip_id:'other'}),/Unauthorized/);
 binding.expiresAt='2000-01-01';await assert.rejects(invoke('signed-in','get_trip_bundle',{trip_id:'trip-test'}),/expired/);binding.expiresAt='2099-01-01';
 await assert.rejects(invoke('signed-in','save_proposal',{trip_id:'trip-test',snapshot:'old'}),/Stale/);
 binding.scopes=['read'];await assert.rejects(invoke('signed-in','save_proposal',{trip_id:'trip-test',snapshot:'current'}),/Unauthorized/);binding.scopes.push('write');
 assert.equal(calls.length,0);
 const image=await invoke('signed-in','get_reference_image',{trip_id:'trip-test',kind:'sheet',id:'sheet.jpg',user:'attacker',token:'secret'});
 assert.equal(image.content[0].type,'image');assert.deepEqual(Buffer.from(image.content[0].data,'base64'),Buffer.from([137,80,78,71]));assert.deepEqual(calls[0].a,{kind:'sheet',id:'sheet.jpg',index:0});
 await assert.rejects(invoke('signed-in','upload_render',{trip_id:'trip-test',snapshot:'current',proposal_id:'other'}),/outside/);
 await assert.rejects(invoke('signed-in','get_reference_image',{trip_id:'trip-test',kind:'render',id:'anything'}),/Invalid/);
 console.log('Passed: connector adapter auth, expiry, scope, snapshot, payload isolation and MCP image envelope (mock backend only).');
})().catch(e=>{console.error(e);process.exitCode=1});
