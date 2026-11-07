import { readFileSync } from 'node:fs';
const env = Object.fromEntries(readFileSync('.secrets.env','utf8').split(/\r?\n/).map(l=>l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map(m=>[m[1],m[2]]));
const q = process.argv[2];
const r = await fetch(`${env.POSTHOG_HOST}/api/projects/${env.POSTHOG_PROJECT_ID}/query/`, { method:'POST', headers:{Authorization:`Bearer ${env.POSTHOG_PERSONAL_KEY}`,'Content-Type':'application/json'}, body: JSON.stringify({query:{kind:'HogQLQuery',query:q}})});
const d = await r.json(); console.log(JSON.stringify(d.columns), '\n' + (d.results||[]).map(x=>JSON.stringify(x)).join('\n') || JSON.stringify(d));
