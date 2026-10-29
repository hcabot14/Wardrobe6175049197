const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../workflow.js','utf8');const code=source.slice(source.indexOf('async function verifyHandoffReady('),source.indexOf('async function syncHandoff('));
let status=200,bundle={catalogMatches:true},calls=[];
const context=vm.createContext({URLSearchParams,AbortSignal,session:{uid:'test-owner'},fetch:async(url,options)=>{calls.push({url,options});return {ok:status===200,status,json:async()=>bundle}}});vm.runInContext(code,context);
context.trip={id:'trip-test',snapshotId:'snapshot',handoff:{returnAccess:{endpoint:'https://test.invalid/handoff',token:'scoped-test-token'}}};
(async()=>{
 await vm.runInContext("verifyHandoffReady(trip,'w-test')",context);assert.equal(calls.length,1);assert.ok(!calls[0].url.includes('scoped-test-token'));assert.equal(calls[0].options.headers.Authorization,'Bearer scoped-test-token');assert.equal(calls[0].options.cache,'no-store');
 bundle={catalogMatches:false};await assert.rejects(vm.runInContext("verifyHandoffReady(trip,'w-test')",context),/live wardrobe differ/);
 status=401;await assert.rejects(vm.runInContext("verifyHandoffReady(trip,'w-test')",context),/HTTP 401/);
 console.log('Passed: synced handoff verifies private access and current catalog before copying the request.');
})().catch(e=>{console.error(e);process.exitCode=1});
