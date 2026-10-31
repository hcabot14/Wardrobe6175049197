const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 const elements=new Map();const node=id=>{if(!elements.has(id))elements.set(id,{hidden:false,disabled:false,checked:false,value:'',textContent:'',options:[],append(x){this.options.push(x)}});return elements.get(id)};
 let approved=0,revoked=0,redirected=0;
 const trip={id:'trip-test',name:'Prepared trip',snapshot:'current',wardrobe:'w-test'};
 const approval={preparedTrips:async()=>[trip],approveTrip:async s=>{assert.equal(s,trip);approved++;return {expiresAt:'tomorrow'}},revokeTrip:async s=>{assert.equal(s,trip);revoked++}};
 const context=vm.createContext({URL,console,document:{getElementById:node,createElement:()=>({})},location:{href:'https://wardrobe.test/connector.html?trip=trip-test',assign(){redirected++}},localStorage:{},fetch:async()=>({ok:true,json:async()=>({})}),createApproval:()=>approval});
 const src=fs.readFileSync(__dirname+'/../connector/approval/page.mjs','utf8').replace("import {createApproval} from './core.mjs';",'');
 vm.runInContext(src.replace('begin().catch(e=>status(e.message));','globalThis.ready=begin();'),context);await context.ready;
 assert.equal(node('trip').value,'0');assert.equal(node('approve').disabled,true);assert.equal(approved,0);
 node('confirm').checked=true;node('confirm').onchange();assert.equal(node('approve').disabled,false);
 await node('approve').onclick();assert.equal(approved,1);assert.equal(redirected,0);assert.match(node('status').textContent,/Trip approved until/);
 await node('withdraw').onclick();assert.equal(revoked,1);assert.equal(node('confirm').checked,false);assert.equal(node('approve').disabled,true);
 console.log('Passed: installed-connector trip selection requires explicit checkbox, grants only on click, stays on page and supports withdrawal.');
})().catch(e=>{console.error(e);process.exitCode=1});
