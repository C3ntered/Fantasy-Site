const fs = require('node:fs');
const vm = require('node:vm');
let handler; const sandbox = { self: { set onmessage(fn){handler=fn;}, postMessage(value){sandbox.result=value;} } }; vm.createContext(sandbox); vm.runInContext(fs.readFileSync('draft-worker.js','utf8'),sandbox);
handler({data:{players:[{id:'1',pos:'WR',baseRank:1,bye:8},{id:'2',pos:'QB',baseRank:2,bye:9}],draftedIds:[],myRoster:[],recentPicks:[],settings:{WR:3,QB:1}}});
if (!sandbox.result || sandbox.result.length !== 2 || sandbox.result[0].score < sandbox.result[1].score) process.exit(1);
console.log('Ranking worker passed its roster-fit test.');
