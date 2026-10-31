import {createApproval} from './core.mjs';
const $=id=>document.getElementById(id),id=new URL(location.href).searchParams.get('authorization_id');
let approval,trips=[];const status=s=>{$('status').textContent=s};
async function begin(){
 const r=await fetch('./connector/approval/config.json',{cache:'no-store'});if(!r.ok)throw Error('Connection settings unavailable.');const cfg=await r.json();
 approval=createApproval({base:cfg.supabaseUrl,anon:cfg.anon,clientId:cfg.clientId,redirectUri:cfg.redirectUri,resource:cfg.resource,storage:localStorage});
 if(!id){
  trips=await approval.preparedTrips();const requested=new URL(location.href).searchParams.get('trip');
  for(let n=0;n<trips.length;n++){const option=document.createElement('option');option.value=String(n);option.textContent=trips[n].name;$('trip').append(option);if(requested===trips[n].id)$('trip').value=String(n)}
  $('consent').hidden=false;$('deny').hidden=true;$('revoke').hidden=false;
  $('account').textContent='For the installed Wardrobe development connector. Installing the connector in ChatGPT is a separate step.';
  $('approve').textContent='Approve selected trip for 24 hours';status('Choose and explicitly approve the trip ChatGPT may access.');
  const update=()=>{const selected=trips[$('trip').value];$('approve').disabled=!selected||!$('confirm').checked;$('withdraw').disabled=!selected;$('expiry').textContent=selected?'Access ends within 24 hours, or sooner when the private handoff expires.':'';};
  $('trip').onchange=()=>{$('confirm').checked=false;update()};$('confirm').onchange=update;
  $('approve').onclick=async()=>{$('approve').disabled=true;try{const result=await approval.approveTrip(trips[$('trip').value]);status('Trip approved until '+result.expiresAt+'. Return to Wardrobe, open ChatGPT, select @Wardrobe development, then paste your copied request.')}catch(e){status(e.message)}finally{update()}};
  $('withdraw').onclick=async()=>{try{await approval.revokeTrip(trips[$('trip').value]);$('confirm').checked=false;update();status('Trip approval withdrawn.')}catch(e){status(e.message)}};update();return;
 }
 const data=await approval.loadAuthorization(id);if(data.redirect){location.assign(data.redirect);return}
 $('account').textContent='Connecting '+data.clientName+' as '+data.account+'. Sign-in permissions: '+data.scope.replaceAll('offline_access','stay connected').replaceAll('openid','verify identity');
 trips=await approval.preparedTrips();for(let n=0;n<trips.length;n++){const option=document.createElement('option');option.value=String(n);option.textContent=trips[n].name;$('trip').append(option)}
 $('consent').hidden=false;status(trips.length?'Choose the trip ChatGPT may work on.':'No prepared trip is available. Return to Wardrobe, prepare your trip, then reopen the connection request.');
 const update=()=>{const selected=trips[$('trip').value];$('approve').disabled=!selected||!$('confirm').checked;$('expiry').textContent=selected?'Access ends within 24 hours, or sooner when the private handoff expires.':'';};$('trip').onchange=update;$('confirm').onchange=update;
 $('approve').onclick=async()=>{const trip=trips[$('trip').value];$('approve').disabled=true;$('deny').disabled=true;try{await approval.approveTrip(trip);$('revoke').hidden=false;$('withdraw').onclick=async()=>{try{await approval.revokeTrip(trip);status('Trip approval withdrawn.');$('revoke').hidden=true;update()}catch(e){status(e.message)}};const decision=await approval.decide(id,'approve');status('Trip approved. Returning to ChatGPT…');location.assign(decision.redirect)}catch(e){status(e.message);update()}finally{$('deny').disabled=false}};
 $('deny').onclick=async()=>{try{$('deny').disabled=true;const decision=await approval.decide(id,'deny');location.assign(decision.redirect)}catch(e){status(e.message);$('deny').disabled=false}};
}
begin().catch(e=>status(e.message));
