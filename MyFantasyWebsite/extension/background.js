chrome.runtime.onMessage.addListener((message) => {
  if(message.action!=='fourth-down-pick')return;
  chrome.storage.local.get({draftId:'',endpoint:''}, async settings => {
    if(!settings.endpoint) { console.warn('Fourth Down: finish setup from the extension options page.'); return; }
    try { await fetch(settings.endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...message.pick,draftId:settings.draftId||message.pick.draftId})}); } catch(error) { console.warn('Fourth Down sync failed',error); }
  });
});
