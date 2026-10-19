/* Password recovery uses Supabase Auth's email verification; no admin credentials. */
'use strict';
function openResetRequest(email=''){
 openSheet(`${shead('Reset password')}<p>Enter your Wardrobe account email. We’ll email you a link to choose a new password.</p><label for="resetEmail">Email</label><input id="resetEmail" type="email" autocomplete="email" inputmode="email" value="${esc(email)}"><div class="row"><button class="primary" id="sendResetEmail">Send reset email</button><button id="resetBack">Back to sign in</button></div><div id="resetMessage" class="msg" role="status"></div>`,{locked:!profile});
 $('#resetBack').onclick=async()=>{closeModal(true);await start();if(profile){showTab('more');openPanel('sync')}};
 $('#sendResetEmail').onclick=async e=>{
  const button=e.currentTarget,email=$('#resetEmail').value.trim(),msg=$('#resetMessage');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){msg.textContent='Enter your account email address.';return}
  button.disabled=true;msg.className='msg';msg.textContent='Sending…';
  try{const redirect=new URL('./',location.href).href;await authCall('recover?redirect_to='+encodeURIComponent(redirect),{email});msg.className='msg ok';msg.textContent='If an account exists for that email, a reset link has been sent. Check your inbox and spam folder, then open the newest email.'}
  catch(err){msg.className='msg err';msg.textContent=err.message}
  finally{button.disabled=false}
 };
}
async function recoveryUser(access){
 const response=await fetch(cloudBase()+'/auth/v1/user',{headers:{apikey:cloudCfg().anon,Authorization:'Bearer '+access}});
 const user=await response.json().catch(()=>({}));
 if(!response.ok||!user.id)throw new Error('This reset link has expired or is invalid. Request a new reset email.');
 return user;
}
async function saveRecoveredPassword(access,password,confirmation){
 if(password.length<8)throw new Error('Use a password of at least 8 characters.');
 if(password!==confirmation)throw new Error('The two passwords do not match.');
 const response=await fetch(cloudBase()+'/auth/v1/user',{method:'PUT',headers:{apikey:cloudCfg().anon,Authorization:'Bearer '+access,'Content-Type':'application/json'},body:JSON.stringify({password})});
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(result.msg||result.message||result.error_description||result.error||'Password could not be updated. Request a fresh reset link and try again.');
 return result;
}
async function handlePasswordRecovery(){
 const params=new URLSearchParams(location.hash.slice(1)),isRecovery=params.get('type')==='recovery',failed=params.has('error_code')||params.has('error_description');
 if(!isRecovery&&!failed)return false;
 // Remove the credentials before rendering or making any requests. Keep them only in memory.
 const access=params.get('access_token'),refresh=params.get('refresh_token'),expiresIn=Number(params.get('expires_in'))||3600;
 history.replaceState(null,'',location.pathname+location.search);
 const problem=message=>{openSheet(`${shead('Reset password')}<p class="msg err">${esc(message)}</p><button class="primary" id="freshReset">Request a new reset email</button>`,{locked:true});$('#freshReset').onclick=()=>openResetRequest()};
 if(failed||!access||!refresh){problem('This reset link has expired or is incomplete. Request a new reset email.');return true}
 openSheet(`${shead('Reset password')}<p>Checking your reset link…</p>`,{locked:true});
 let user;try{user=await recoveryUser(access)}catch(err){problem(err.message);return true}
 openSheet(`${shead('Choose a new password')}<p>${esc(user.email||'Your Wardrobe account')}</p><label for="newPassword">New password</label><input id="newPassword" type="password" autocomplete="new-password" minlength="8"><label for="confirmPassword">Confirm new password</label><input id="confirmPassword" type="password" autocomplete="new-password" minlength="8"><button class="primary" id="saveNewPassword" style="margin-top:16px">Save new password</button><div id="passwordMessage" class="msg" role="status"></div>`,{locked:true});
 $('#saveNewPassword').onclick=async e=>{
  const button=e.currentTarget,msg=$('#passwordMessage');button.disabled=true;
  try{
   await saveRecoveredPassword(access,$('#newPassword').value,$('#confirmPassword').value);
   $('#newPassword').value='';$('#confirmPassword').value='';
   keepSession({access_token:access,refresh_token:refresh,expires_in:expiresIn,user});
   openSheet(`${shead('Password updated')}<p>Your new password is saved.</p><button class="primary" id="openRecoveredWardrobe">Open my wardrobe</button>`,{locked:true});
   $('#openRecoveredWardrobe').onclick=async e=>{e.currentTarget.disabled=true;try{closeModal(true);await syncNow();await start()}catch(err){openSheet(`${shead('Password updated')}<p>Your password was saved. Sign in with it under More → Sync.</p><p class="msg err">${esc(err.message)}</p>`)}};
  }catch(err){msg.className='msg err';msg.textContent=err.message;button.disabled=false}
 };
 return true;
}
async function bootWardrobe(){
 if(await handlePasswordRecovery())return;
 if(new URLSearchParams(location.search).get('reset')==='1'){openResetRequest(session?.email||'');return}
 await start();
}
