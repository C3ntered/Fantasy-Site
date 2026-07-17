const fields={siteUrl:document.querySelector('#siteUrl'),myTeamName:document.querySelector('#teamName'),draftId:document.querySelector('#draftId')};
chrome.storage.local.get({siteUrl:'',myTeamName:'',draftId:''},saved=>Object.entries(fields).forEach(([key,input])=>input.value=saved[key]||''));
document.querySelector('#save').addEventListener('click',async()=>{
  const status=document.querySelector('#status');
  try {
    const site=new URL(fields.siteUrl.value.trim()); const origin=`${site.origin}/*`;
    const granted=await chrome.permissions.request({origins:[origin]}); if(!granted)throw new Error('Site access was not granted.');
    await chrome.storage.local.set({siteUrl:site.origin,endpoint:`${site.origin}/.netlify/functions/ingest-pick`,myTeamName:fields.myTeamName.value.trim(),draftId:fields.draftId.value.trim()});
    status.textContent='Connected. Open your ESPN draft room when it is time.';
  } catch(error) { status.textContent=error.message; }
});
