import {createApproval} from './core.mjs';
const $=id=>document.getElementById(id),id=new URL(location.href).searchParams.get('authorization_id');
let approval,trips=[];const status=s=>{$('status').textContent=s};
async function begin(){
 const r=await fetch('./connector/approval/config.json',{cache:'no-store'});if(!r.ok)throw Error('Connection settings unavailable.');const cfg=await r.json();
 approval=createApproval({base:cfg.supabaseUrl,anon:cfg.anon,clientId:cfg.clientId,redirectUri:cfg.redirectUri,resource:cfg.resource,storage:localStorage});
 if(!id){trips=await approval.preparedTrips();for(let n=0;n<trips.length;n++){const option=document.createElement('option');option.value=String(n);option.textContent=trips[n].name;$('trip').append(option)}$('consent').hidden=false;$('confirm').closest('label').hidden=true;$('approve').hidden=true;$('deny').hidden=true;$('revoke').hidden=false;$('withdraw').disabled=true;status('Choose a trip to withdraw its connector approval.');$('trip').onchange=()=>{$('withdraw').disabled=!trips[$('trip').value]};$('withdraw').onclick=async()=>{try{await approval.revokeTrip(trips[$('trip').value]);status('Trip approval withdrawn.')}catch(e){status(e.message)}};return}
 const data=await approval.loadAuthorization(id);if(data.redirect){location.assign(data.redirect);return}
 $('account').textContent='Connecting '+data.clientName+' as '+data.account+'. Sign-in permissions: '+data.scope.replaceAll('offline_access','stay connected').replaceAll('openid','verify identity');
 trips=await approval.preparedTrips();for(let n=0;n<trips.length;n++){const option=document.createElement('option');option.value=String(n);option.textContent=trips[n].name;$('trip').append(option)}
 $('consent').hidden=false;status(trips.length?'Choose the trip ChatGPT may work on.':'No prepared trip is available. Return to Wardrobe, prepare your trip, then reopen the connection request.');
 const update=()=>{const selected=trips[$('trip').value];$('approve').disabled=!selected||!$('confirm').checked;$('expiry').textContent=selected?'Access ends within 24 hours, or sooner when the private handoff expires.':'';};$('trip').onchange=update;$('confirm').onchange=update;
 $('approve').onclick=async()=>{const trip=trips[$('trip').value];$('approve').disabled=true;$('deny').disabled=true;try{await approval.approveTrip(trip);$('revoke').hidden=false;$('withdraw').onclick=async()=>{try{await approval.revokeTrip(trip);status('Trip approval withdrawn.');$('revoke').hidden=true;update()}catch(e){status(e.message)}};const decision=await approval.decide(id,'approve');status('Trip approved. Returning to ChatGPT…');location.assign(decision.redirect)}catch(e){status(e.message);update()}finally{$('deny').disabled=false}};
 $('deny').onclick=async()=>{try{$('deny').disabled=true;const decision=await approval.decide(id,'deny');location.assign(decision.redirect)}catch(e){status(e.message);$('deny').disabled=false}};
}
begin().catch(e=>status(e.message));
