const rosterTargets = { QB: 2, RB: 5, WR: 6, TE: 2, DL: 2, LB: 3, DB: 2 };

function rankPlayers({ players, draftedIds, myRoster, recentPicks, settings }) {
  const drafted = new Set(draftedIds);
  const rosterCounts = myRoster.reduce((acc, player) => {
    acc[player.pos] = (acc[player.pos] || 0) + 1;
    return acc;
  }, {});
  const recentCounts = recentPicks.slice(-5).reduce((acc, player) => {
    acc[player.pos] = (acc[player.pos] || 0) + 1;
    return acc;
  }, {});
  const positionAvailable = {};
  players.filter(p => !drafted.has(p.id)).forEach(player => {
    (positionAvailable[player.pos] ||= []).push(player.baseRank);
  });

  return players.filter(player => !drafted.has(player.id)).map(player => {
    const base = 100 - Math.min(78, player.baseRank * .62);
    const target = settings?.[player.pos] || rosterTargets[player.pos] || 1;
    const filled = rosterCounts[player.pos] || 0;
    const need = Math.max(0, (target - filled) / Math.max(1, target));
    const needBoost = need * (['QB','RB','WR','TE'].includes(player.pos) ? 14 : 8);
    const pool = positionAvailable[player.pos] || [];
    const nextRank = pool.find(rank => rank > player.baseRank) || player.baseRank + 8;
    const tierGap = Math.min(9, (nextRank - player.baseRank) * 1.7);
    const runBoost = Math.min(6, (recentCounts[player.pos] || 0) * 1.5);
    const byePenalty = myRoster.filter(p => p.bye === player.bye).length * 1.3;
    const score = Math.max(1, Math.min(99, base + needBoost + tierGap + runBoost - byePenalty));
    let signal = 'FAIR VALUE';
    if (tierGap >= 5) signal = 'TIER BREAK';
    if (needBoost >= 9) signal = 'ROSTER FIT';
    if (runBoost >= 4.5) signal = 'POSITION RUN';
    if (score >= 90) signal = 'BEST AVAILABLE';
    return { ...player, score: Math.round(score), need, tierGap, runBoost, signal };
  }).sort((a, b) => b.score - a.score || a.baseRank - b.baseRank);
}

self.onmessage = event => self.postMessage(rankPlayers(event.data));
