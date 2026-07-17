const POS_COLORS = { QB: '#ff6e58', RB: '#b8f36b', WR: '#76dedd', TE: '#f4cf57', DL: '#ae8cff', LB: '#ff9ad6', DB: '#7fa8ff', K: '#aaa', DST: '#aaa' };
const TEAM_NAMES = ['Sunday Scaries','Gridiron Dept.','Louisville Bats','Fourth & Long','Run CMC','The Audibles','Blitz Club','Goal Line Co.','Turf Kings','No Punt Intended'];
const state = { players: [], ranked: [], picks: [], myRoster: [], myTeamIndex: 3, draftId: 'demo-draft', settings: { QB:2, RB:5, WR:6, TE:2, DL:2, LB:3, DB:2 }, filter: 'ALL', query: '', connected: false };
const worker = new Worker('./draft-worker.js', { type: 'classic' });

async function loadPlayers() {
  const cached = localStorage.getItem('fourth-down-player-cache');
  try {
    const response = await fetch('/.netlify/functions/espn-players');
    if (!response.ok) throw new Error('Live rankings unavailable');
    const payload = await response.json();
    state.players = payload.players;
    localStorage.setItem('fourth-down-player-cache', JSON.stringify(state.players));
  } catch {
    try {
      const csv = await (await fetch('./player_data.csv')).text();
      state.players = parseCSV(csv);
    } catch {
      state.players = cached ? JSON.parse(cached) : [];
    }
  }
  seedDraft();
  recalculate();
}

function parseCSV(csv) {
  return csv.trim().split(/\r?\n/).slice(1).map(line => {
    const cells = line.split(',');
    const [id, ovr, offRank, defRank, name, team, pos, bye] = cells;
    const rank = Number(offRank || defRank || ovr || 999);
    return { id: String(id), name, team, pos, bye: Number(bye) || 0, baseRank: rank, source: '2026 baseline' };
  }).filter(player => player.name && player.pos);
}

function seedDraft() {
  if (state.picks.length || !state.players.length) return;
  const seedNames = ['Ja\'Marr Chase','Bijan Robinson','Saquon Barkley','CeeDee Lamb','Josh Allen','Justin Jefferson','Lamar Jackson','Jahmyr Gibbs','Puka Nacua','Amon-Ra St. Brown','Jalen Hurts','Nico Collins','Joe Burrow','Malik Nabers','Brock Bowers','Christian McCaffrey','Drake London','Brian Thomas Jr.','De\'Von Achane','Trey McBride','Jayden Daniels','Ashton Jeanty','Breece Hall','A.J. Brown','Jonathan Taylor','Ladd McConkey','George Kittle','Garrett Wilson','Kyren Williams','Tee Higgins','Davante Adams','Mike Evans','James Cook','Kenneth Walker III','Marvin Harrison Jr.','Derrick Henry','Josh Jacobs','D.J. Moore'];
  state.picks = seedNames.map((name, index) => {
    const player = state.players.find(p => p.name === name);
    return player ? { ...player, pick: index + 1, teamIndex: snakeTeam(index), isMine: snakeTeam(index) === state.myTeamIndex } : null;
  }).filter(Boolean);
  state.myRoster = state.picks.filter(p => p.isMine);
}

function snakeTeam(index) { const round = Math.floor(index / 10); const slot = index % 10; return round % 2 ? 9 - slot : slot; }
function recalculate() { worker.postMessage({ players: state.players, draftedIds: state.picks.map(p => p.id), myRoster: state.myRoster, recentPicks: state.picks.slice(-5), settings: state.settings }); }
worker.onmessage = event => { state.ranked = event.data; renderAll(); };

function renderAll() { renderRecommendations(); renderRoster(); renderPicks(); renderBoard(); renderTable(); renderContext(); }
function posStyle(pos) { return `--pos-color:${POS_COLORS[pos] || '#aaa'}`; }
function reasonFor(player) {
  if (player.signal === 'POSITION RUN') return `${player.pos} demand is accelerating. Waiting risks losing the current value tier.`;
  if (player.signal === 'ROSTER FIT') return `Fills a meaningful ${player.pos} need without reaching past market value.`;
  if (player.signal === 'TIER BREAK') return `Last player in this model tier; the drop to the next option is unusually steep.`;
  return `Strong blend of overall value, roster construction, and near-term scarcity.`;
}
function renderRecommendations() {
  document.querySelector('#recommendations').innerHTML = state.ranked.slice(0, 4).map((p, index) => `<article class="player-card" style="${posStyle(p.pos)}">
    <span class="rank">0${index + 1}</span><div><div class="player-name">${p.name}</div><div class="player-meta"><span class="position-tag">${p.pos}</span><span>${p.team} · BYE ${p.bye || '—'}</span></div></div>
    <div class="score-block"><strong>${p.score}</strong><span>FIT SCORE</span><button class="pick-button" data-draft="${p.id}">Draft player</button></div><div class="reason">${reasonFor(p)}</div></article>`).join('');
  document.querySelectorAll('[data-draft]').forEach(button => button.addEventListener('click', () => draftPlayer(button.dataset.draft, true)));
}
function renderRoster() {
  const order = ['QB','RB','WR','TE','DL','LB','DB'];
  const counts = state.myRoster.reduce((a,p) => (a[p.pos]=(a[p.pos]||0)+1,a),{});
  document.querySelector('#rosterNeeds').innerHTML = order.map(pos => { const current = counts[pos] || 0; const target = state.settings[pos]; const fill = Math.min(100, current / target * 100); return `<div class="need-row" style="${posStyle(pos)}"><strong>${pos}</strong><div class="need-track"><i style="--fill:${fill}%"></i></div><span>${current}/${target}</span></div>`; }).join('');
}
function renderPicks() {
  const recent = state.picks.slice(-5).reverse();
  document.querySelector('#latestPicks').innerHTML = recent.length ? recent.map(p => `<div class="pick-tile"><span>PICK ${p.pick}</span><strong>${p.name}</strong><small>${p.pos} · ${TEAM_NAMES[p.teamIndex]}</small></div>`).join('') : '<span>No picks yet</span>';
  const counts = state.picks.slice(-5).reduce((a,p)=>(a[p.pos]=(a[p.pos]||0)+1,a),{}); const run = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
  if (run) { document.querySelector('#positionRun').textContent = `${run[1]} ${run[0]}`; document.querySelector('#roomIntel').textContent = run[1] >= 3 ? `${run[0]} is moving. The current tier is thinning faster than expected.` : `No major run yet. Stay disciplined and take the best roster-adjusted value.`; }
}
function renderBoard() {
  const cells = ['<div class="board-cell header"></div>', ...TEAM_NAMES.map(n => `<div class="board-cell header">${n}</div>`)];
  for (let round=0; round<8; round++) { cells.push(`<div class="board-cell round">R${round+1}</div>`); for (let team=0; team<10; team++) { const pickNumber = round*10 + (round%2 ? 10-team : team+1); const p=state.picks.find(x=>x.pick===pickNumber); const onClock=pickNumber===state.picks.length+1; cells.push(`<div class="board-cell ${p?'picked':''} ${onClock?'on-clock':''}" style="${p?posStyle(p.pos):''}">${p?`<strong>${p.name}</strong><span>${p.pos} · ${p.team}</span>`:onClock?'<strong>ON CLOCK</strong>':''}</div>`); } }
  document.querySelector('#draftBoard').innerHTML = cells.join('');
}
function renderTable() {
  const list = state.ranked.filter(p => (state.filter === 'ALL' || p.pos === state.filter) && p.name.toLowerCase().includes(state.query)).slice(0, 100);
  document.querySelector('#playerTable').innerHTML = list.map((p,i)=>`<tr style="${posStyle(p.pos)}"><td>${String(i+1).padStart(2,'0')}</td><td class="table-player"><strong>${p.name}</strong><small>${p.team} · Bye ${p.bye||'—'}</small></td><td><span class="position-tag">${p.pos}</span></td><td><div class="value-bar"><b>${p.score}</b><i style="--value:${p.score}%"></i></div></td><td><span class="signal">${p.signal}</span></td><td><button class="draft-link" data-table-draft="${p.id}">Draft</button></td></tr>`).join('');
  document.querySelectorAll('[data-table-draft]').forEach(b=>b.addEventListener('click',()=>draftPlayer(b.dataset.tableDraft,false)));
}
function renderContext() { const next=state.picks.length+1, round=Math.ceil(next/10); document.querySelector('#draftRound').textContent=`ROUND ${round} · PICK ${next}`; }
function draftPlayer(id, isMine) { const player=state.players.find(p=>p.id===id); if(!player||state.picks.some(p=>p.id===id))return; const pick={...player,pick:state.picks.length+1,teamIndex:snakeTeam(state.picks.length),isMine}; state.picks.push(pick); if(isMine)state.myRoster.push(pick); recalculate(); }
function simulatePick() { const next=state.ranked.find((p,i)=>i>0) || state.ranked[0]; if(next)draftPlayer(next.id,snakeTeam(state.picks.length)===state.myTeamIndex); }

document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>{ document.querySelectorAll('.tab,.view').forEach(el=>el.classList.remove('active')); tab.classList.add('active'); document.querySelector(`#${tab.dataset.view}-view`).classList.add('active'); }));
document.querySelector('#connectionButton').addEventListener('click',()=>document.querySelector('#connectionDialog').showModal());
document.querySelector('#connectDraft').addEventListener('click',event=>{ event.preventDefault(); state.draftId=document.querySelector('#draftIdInput').value.trim()||'demo-draft'; state.connected=true; document.querySelector('#connectionLabel').textContent='ESPN room live'; document.querySelector('.status-dot').style.background='#b8f36b'; document.querySelector('#connectionDialog').close(); pollDraft(); });
document.querySelector('#simulatePick').addEventListener('click',simulatePick);
document.querySelector('#undoPick').addEventListener('click',()=>{ const p=state.picks.pop(); if(p?.isMine)state.myRoster=state.myRoster.filter(x=>x.pick!==p.pick); recalculate(); });
document.querySelector('#positionFilter').addEventListener('change',e=>{state.filter=e.target.value;renderTable();});
document.querySelector('#playerSearch').addEventListener('input',e=>{state.query=e.target.value.toLowerCase();renderTable();});
let seconds=87; setInterval(()=>{seconds=Math.max(0,seconds-1);document.querySelector('#clock').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;},1000);
async function pollDraft(){ if(!state.connected)return; try { const data=await(await fetch(`/.netlify/functions/ingest-pick?draftId=${encodeURIComponent(state.draftId)}`)).json(); for(const remote of data.picks||[]){ if(state.picks.some(p=>p.remoteId===remote.id))continue; const player=state.players.find(p=>p.name.toLowerCase()===String(remote.playerName).toLowerCase()); if(player&&!state.picks.some(p=>p.id===player.id)){ state.picks.push({...player,pick:remote.pickNumber||state.picks.length+1,teamIndex:Number(remote.teamIndex)||snakeTeam(state.picks.length),isMine:Boolean(remote.isMyPick),remoteId:remote.id}); if(remote.isMyPick)state.myRoster.push(player); recalculate(); } } } catch{} setTimeout(pollDraft,2500); }
loadPlayers();
