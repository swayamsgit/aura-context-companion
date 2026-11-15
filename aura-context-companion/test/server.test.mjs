import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
test('server serves UI and keeps API off without explicit configuration',async()=>{
 const server=spawn(process.execPath,['src/server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'3012',META_LIVE_ENABLED:'false',META_MAX_CALLS:'0'}});
 try{await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 const status=await fetch('http://127.0.0.1:3012/api/status').then(r=>r.json());assert.equal(status.enabled,false);
 const home=await fetch('http://127.0.0.1:3012/').then(r=>r.text());assert.match(home,/Context, gently remembered/);
 const rejected=await fetch('http://127.0.0.1:3012/api/summary',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(rejected.status,503);
 }finally{server.kill();}
});

