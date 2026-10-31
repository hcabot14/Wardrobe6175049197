const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 const src=fs.readFileSync(__dirname+'/../workflow.js','utf8');const code=src.slice(src.indexOf('async function authorizePreparedTrip('),src.indexOf('async function syncHandoff('));
 const trip={id:'trip-test',snapshotId:'snapshot',handoff:{preparedAt:'prepared',returnAccess:{expiresAt:new Date(Date.now()+48*3600000).toISOString()}}};
 let writes=[],settingsOk=true,client='client-test',base='https://wardrobe.test',changed=false;
 const c=vm.createContext({session:{uid:'owner'},profile:{cloudId:'w-test'},trips:[trip],trip,Date,JSON,snapshotId:()=>changed?'stale':'snapshot',cloudBase:()=>base,fetch:async()=>({ok:settingsOk,json:async()=>({supabaseUrl:base,clientId:client})}),api:async(path,opts)=>writes.push({path,...JSON.parse(opts.body)})});vm.runInContext(code,c);
 const before=Date.now();await vm.runInContext("authorizePreparedTrip(trip,'w-test')",c);assert.equal(writes.length,1);const row=writes[0];assert.equal(row.user_id,'owner');assert.equal(row.wardrobe,'w-test');assert.equal(row.id,'trip-test');assert.equal(row.kind,'connector_grant');assert.equal(row.data.snapshot,'snapshot');assert.equal(row.data.clientId,client);assert.deepEqual(row.data.scopes,['wardrobe.read','wardrobe.write']);assert.ok(Date.parse(row.data.expiresAt)<=Date.now()+24*3600000);assert.ok(Date.parse(row.data.expiresAt)>=before+24*3600000);
 trip.handoff.returnAccess.expiresAt=new Date(Date.now()+3600000).toISOString();await vm.runInContext("authorizePreparedTrip(trip,'w-test')",c);assert.equal(writes[1].data.expiresAt,trip.handoff.returnAccess.expiresAt);
 changed=true;await assert.rejects(vm.runInContext("authorizePreparedTrip(trip,'w-test')",c),/trip changed/);changed=false;settingsOk=false;await assert.rejects(vm.runInContext("authorizePreparedTrip(trip,'w-test')",c),/settings/);assert.equal(writes.length,2);
 assert.ok(src.includes('await syncHandoff(t,wardrobe);await authorizePreparedTrip(t,wardrobe);requestReady='));
 console.log('Passed: prepared trip grants only exact owner/client/trip/snapshot, caps expiry, and fails closed on stale state/settings before handoff.');
})().catch(e=>{console.error(e);process.exitCode=1});
