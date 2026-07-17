const { randomUUID } = require('node:crypto');
exports.handler = async function(event) {
  const { getStore } = await import('@netlify/blobs');
  const params = event.queryStringParameters || {};
  const store = getStore({ name:'draft-picks', consistency:'strong' });
  if (event.httpMethod === 'POST') {
    let body; try { body=JSON.parse(event.body||'{}'); } catch { return {statusCode:400,body:'Invalid JSON'}; }
    const draftId=String(body.draftId||params.draftId||'').trim().slice(0,100);
    if(!draftId||!body.playerName) return {statusCode:400,body:'draftId and playerName are required'};
    const key=`${draftId}.json`; const existing=(await store.get(key,{type:'json'}))||{picks:[]};
    if(!existing.picks.some(p=>p.pickNumber===body.pickNumber&&p.playerName===body.playerName)) existing.picks.push({id:randomUUID(),playerName:String(body.playerName).slice(0,120),pickNumber:Number(body.pickNumber)||existing.picks.length+1,teamIndex:Number(body.teamIndex)||0,isMyPick:Boolean(body.isMyPick),at:Date.now()});
    await store.setJSON(key,existing); return {statusCode:200,headers:{'content-type':'application/json'},body:JSON.stringify({ok:true})};
  }
  if(event.httpMethod!=='GET') return {statusCode:405,body:'Method not allowed'};
  const draftId=String(params.draftId||'demo-draft').trim().slice(0,100); const data=(await store.get(`${draftId}.json`,{type:'json'}))||{picks:[]};
  return {statusCode:200,headers:{'content-type':'application/json','cache-control':'no-store'},body:JSON.stringify(data)};
};
