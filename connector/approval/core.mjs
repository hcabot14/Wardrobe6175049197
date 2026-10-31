// Browser approval logic. Public config only; sessions never leave their fixed Supabase origin.
export function createApproval({base,anon,clientId,redirectUri,resource,storage,fetch:request=fetch,now=Date.now}){
 const origin=new URL(base);if(origin.protocol!=='https:'||origin.username||origin.password||origin.port)throw Error('Invalid sign-in service');base=origin.origin;
 const configured=()=>{if(!clientId||!redirectUri||!resource)throw Error('The development connector is not configured yet.');const u=new URL(redirectUri);if(u.protocol!=='https:'||u.hostname!=='chatgpt.com'||u.username||u.password||u.port)throw Error('Invalid ChatGPT callback');};
 let session,details,approvedTrip;
 const read=()=>{try{return JSON.parse(storage.getItem('wardrobe-session'))}catch{return null}};
 const keep=j=>{session={access:j.access_token,refresh:j.refresh_token,exp:now()+(j.expires_in||3600)*1000,uid:j.user.id,email:j.user.email};storage.setItem('wardrobe-session',JSON.stringify(session));};
 async function raw(path,options={}){const r=await request(base+path,{...options,headers:{apikey:anon,...options.headers},redirect:'error',signal:AbortSignal.timeout(20000)});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(r.status===401?'Please sign in to Wardrobe again.':'Wardrobe could not complete this request. Please try again.');return data;}
 async function token(){session=read();if(!session?.access||!session?.uid)throw Error('Sign in to Wardrobe in this browser first.');if(!Number.isFinite(session.exp)||session.exp<=now()+60000){if(!session.refresh)throw Error('Sign in to Wardrobe again.');keep(await raw('/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh})}));}return session.access;}
 async function api(path,options={}){return raw(path,{...options,headers:{...options.headers,Authorization:'Bearer '+await token()}})}
 async function identity(){const user=await api('/auth/v1/user');if(user.id!==session.uid)throw Error('Wardrobe account changed. Reload this page.');return user}
 function safeCallback(value){const u=new URL(value),expected=new URL(redirectUri);if(u.origin!==expected.origin||u.pathname!==expected.pathname||u.username||u.password||u.port||u.hash||expected.search)throw Error('Unexpected authorization return address');return u.href}
 async function loadAuthorization(id){details=null;approvedTrip=null;configured();if(!/^[a-zA-Z0-9_-]{8,200}$/.test(id||''))throw Error('Open this page from the ChatGPT connection request.');await identity();const d=await api('/auth/v1/oauth/authorizations/'+encodeURIComponent(id));
  if(d.redirect_url){return {redirect:safeCallback(d.redirect_url)}}
  if(d.authorization_id!==id||d.client?.id!==clientId||d.user?.id!==session.uid||d.redirect_uri!==redirectUri||!String(d.scope||'').split(' ').includes('openid')||String(d.scope).split(/\s+/).filter(Boolean).some(x=>!['openid','email','offline_access'].includes(x)))throw Error('This request does not match the Wardrobe development connector.');
  details=d;return {clientName:d.client.name||'ChatGPT',account:d.user.email,scope:d.scope};
 }
 async function preparedTrips(){configured();await identity();const q=new URLSearchParams({select:'wardrobe,id,data',user_id:'eq.'+session.uid,kind:'eq.trip',deleted:'eq.false',limit:'200'});const rows=await api('/rest/v1/records?'+q);return rows.filter(x=>x.data?.snapshotId&&Number.isFinite(Date.parse(x.data?.handoff?.returnAccess?.expiresAt))&&Date.parse(x.data.handoff.returnAccess.expiresAt)>now()).map(x=>({id:x.id,wardrobe:x.wardrobe,name:x.data.name||x.id,snapshot:x.data.snapshotId,expiresAt:x.data.handoff.returnAccess.expiresAt}));}
 async function approveTrip(selection){configured();await identity();
  const fresh=(await preparedTrips()).find(x=>x.id===selection.id&&x.wardrobe===selection.wardrobe&&x.snapshot===selection.snapshot);if(!fresh)throw Error('This trip changed or expired. Prepare it again in Wardrobe.');
  if(details&&details.user.id!==session.uid)throw Error('Wardrobe account changed. Reopen the connection request.');
  const expiresAt=new Date(Math.min(Date.parse(fresh.expiresAt),now()+24*3600000)).toISOString();
  const grant={clientId,tripId:fresh.id,snapshot:fresh.snapshot,scopes:['wardrobe.read','wardrobe.write'],expiresAt};
  const row={user_id:session.uid,wardrobe:fresh.wardrobe,kind:'connector_grant',id:fresh.id,data:grant,deleted:false};
  await api('/rest/v1/records?on_conflict=user_id,wardrobe,kind,id',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(row)});
  approvedTrip={...fresh,grant};return {expiresAt,tripName:fresh.name};
 }
 async function revokeTrip(selection){configured();await identity();if(!/^w-[a-z0-9]+$/.test(selection.wardrobe)||!/^trip-[a-z0-9-]+$/.test(selection.id))throw Error('Invalid trip');const q=new URLSearchParams({user_id:'eq.'+session.uid,wardrobe:'eq.'+selection.wardrobe,kind:'eq.connector_grant',id:'eq.'+selection.id});await api('/rest/v1/records?'+q,{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({deleted:true})});approvedTrip=null;}
 async function decide(id,action){if(!details||details.authorization_id!==id||!['approve','deny'].includes(action))throw Error('Load a valid connection request first.');if(action==='approve'&&(!approvedTrip||Date.parse(approvedTrip.grant.expiresAt)<=now()))throw Error('Choose and approve a prepared trip first.');
  if(action==='deny'&&approvedTrip)await revokeTrip(approvedTrip);
  const d=await api('/auth/v1/oauth/authorizations/'+encodeURIComponent(id)+'/consent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})});return {redirect:safeCallback(d.redirect_url)};
 }
 return {loadAuthorization,preparedTrips,approveTrip,revokeTrip,decide};
}
