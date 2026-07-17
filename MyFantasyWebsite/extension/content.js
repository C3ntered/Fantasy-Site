// ESPN does not publish a stable draft-room DOM contract. Keep all selectors here
// so page changes can be repaired without touching the ranking app.
const SELECTORS = ['[data-testid*="draft-pick"]','.draft-pick','.pick-history-item','[class*="DraftPick"]'];
const seen = new Set();
function textFrom(node, selectors) { for (const selector of selectors) { const found=node.querySelector(selector); if(found?.textContent?.trim()) return found.textContent.trim(); } return ''; }
function scan() {
  const leagueId = new URL(location.href).searchParams.get('leagueId') || 'demo-draft';
  const nodes = SELECTORS.flatMap(selector=>[...document.querySelectorAll(selector)]);
  nodes.forEach((node,index)=>{
    const playerName=textFrom(node,['[data-testid*="player-name"]','[class*="playerName"]','.player-name','a']) || node.textContent?.split('\n')[0]?.trim();
    if(!playerName||playerName.length>120)return;
    const pickText=textFrom(node,['[data-testid*="pick-number"]','[class*="pickNumber"]']) || '';
    const pickNumber=Number(pickText.match(/\d+/)?.[0])||index+1;
    const key=`${pickNumber}:${playerName}`; if(seen.has(key))return; seen.add(key);
    chrome.storage.local.get({myTeamName:''}, settings => {
      const isMyPick=node.matches('[class*="myTeam"], [data-is-user-team="true"]') || (settings.myTeamName && node.textContent.toLowerCase().includes(settings.myTeamName.toLowerCase()));
      chrome.runtime.sendMessage({action:'fourth-down-pick',pick:{playerName,pickNumber,isMyPick,draftId:leagueId}});
    });
  });
}
new MutationObserver(scan).observe(document.body,{childList:true,subtree:true}); scan();
