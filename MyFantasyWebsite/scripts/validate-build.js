const fs = require('node:fs');
const path = require('node:path');
const required = ['index.html','styles.css','app.js','draft-worker.js','player_data.csv','public/og.png','netlify/functions/espn-players.js','netlify/functions/ingest-pick.js','extension/manifest.json','extension/content.js','extension/background.js','extension/options.html','extension/options.js'];
const missing = required.filter(file => !fs.existsSync(file));
if (missing.length) { console.error(`Missing required files: ${missing.join(', ')}`); process.exit(1); }
const html = fs.readFileSync('index.html','utf8');
for (const id of ['recommendations','draftBoard','playerTable','connectionDialog']) if (!html.includes(`id="${id}"`)) { console.error(`Missing UI mount: ${id}`); process.exit(1); }
fs.rmSync('dist',{recursive:true,force:true});
fs.mkdirSync('dist/public',{recursive:true});
for (const file of ['index.html','styles.css','app.js','draft-worker.js','player_data.csv']) fs.copyFileSync(file,path.join('dist',file));
fs.copyFileSync('public/og.png','dist/public/og.png');
console.log(`Fourth Down build validated (${required.length} assets) and staged for deployment.`);
