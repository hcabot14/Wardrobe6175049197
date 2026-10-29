const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../workflow.js','utf8');const code=source.slice(source.indexOf('async function verifyHandoffReady('),source.indexOf('async function syncHandoff('));
let status=200,bundle={catalogMatches:true},calls=[];
const context=vm.createContext({URLSearchParams,AbortSignal,session:{uid:'test-owner'},fetch:async(url,options)=>{calls.push({url,options});return {ok:status===200,status,json:async()=>bundle}}});vm.runInContext(code,context);
context.trip={id:'trip-test',snapshotId:'snapshot',handoff:{returnAccess:{endpoint:'https://test.invalid/handoff',token:'scoped-test-token'}}};
(async()=>{
 await vm.runInContext("verifyHandoffReady(trip,'w-test')",context);assert.equal(calls.length,1);assert.ok(!calls[0].url.includes('scoped-test-token'));assert.equal(calls[0].options.headers.Authorization,'Bearer scoped-test-token');assert.equal(calls[0].options.cache,'no-store');
 bundle={catalogMatches:false};await assert.rejects(vm.runInContext("verifyHandoffReady(trip,'w-test')",context),/live wardrobe differ/);
 status=401;await assert.rejects(vm.runInContext("verifyHandoffReady(trip,'w-test')",context),/HTTP 401/);
 // A signed-out trip must preserve its brief and offer sync sign-in, never export files.
 const message={},out={innerHTML:'',querySelector:()=>signin},signin={};let opened=null,saved=0;
 const c=vm.createContext({session:null,requestReady:{},handoffWorking:false,cloudReady:()=>true,profile:{cloudId:'w-test'},syncState:{},$:sel=>({'#planMsg':message,'#planBtn':{},'#requestFiles':out}[sel]),waitForSync:async()=>{},activeItems:()=>[{}],saveBrief:async()=>{saved++;return{}},snapshotId:()=> 'snapshot',openPanel:key=>opened=key});
 vm.runInContext(source.slice(source.indexOf('function showTripSignIn('),source.indexOf("$('#planBtn').onclick=()=>planTrip();")),c);
 await vm.runInContext('planTrip()',c);assert.equal(saved,1);assert.match(message.textContent,/Sign in/);assert.match(out.innerHTML,/Sign in to continue/);assert.doesNotMatch(out.innerHTML,/Download|Share files|File fallback/);assert.equal(c.requestReady,null);signin.onclick();assert.equal(opened,'sync');
 console.log('Passed: synced handoff verifies private access and current catalog; signed-out trips preserve the brief and open sign-in without exporting photographs.');
})().catch(e=>{console.error(e);process.exitCode=1});
