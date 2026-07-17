const POSITION_MAP = { 1:'QB', 2:'RB', 3:'WR', 4:'TE', 5:'K', 16:'DST' };
exports.handler = async function(event) {
  if (event.httpMethod !== 'GET') return { statusCode:405, body:'Method not allowed' };
  const season = Math.max(2025, Math.min(2030, Number(event.queryStringParameters?.season) || new Date().getFullYear()));
  const filter = { players: { limit: 500, sortDraftRanks: { sortPriority: 100, sortAsc: true, value: 'STANDARD' } } };
  try {
    const response = await fetch(`https://fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/players?scoringPeriodId=0&view=players_wl`, { headers: { 'x-fantasy-filter': JSON.stringify(filter), 'user-agent': 'FourthDown/1.0' } });
    if (!response.ok) throw new Error(`ESPN returned ${response.status}`);
    const rows = await response.json();
    const players = rows.map((row,index)=>({ id:String(row.id), name:row.fullName, team:row.proTeamId ? String(row.proTeamId) : 'FA', pos:POSITION_MAP[row.defaultPositionId] || 'FLEX', bye:0, baseRank:Number(row.draftRanksByRankType?.STANDARD?.rank)||index+1, source:'ESPN' })).filter(p=>['QB','RB','WR','TE','K','DST'].includes(p.pos));
    return { statusCode:200, headers:{'content-type':'application/json','cache-control':'public, max-age=1800'}, body:JSON.stringify({season,source:'ESPN unofficial fantasy endpoint',players}) };
  } catch(error) { return { statusCode:503, headers:{'content-type':'application/json'}, body:JSON.stringify({error:'Live ESPN player data is temporarily unavailable.',detail:error.message}) }; }
};
