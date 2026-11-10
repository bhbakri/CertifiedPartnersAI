import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {dashboardRouter} from '../src/dashboard/router.js';
test('dashboard shares saved rules, persists across restart and gates demo approvals',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'dashboard-'));const stateFile=join(dir,'state.json');
 async function start(){const app=express();app.use(express.json());app.use('/api',dashboardRouter({stateFile}));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));return server;}
 let server=await start();
 const call=async(action,args=[])=>{const r=await fetch(`http://127.0.0.1:${server.address().port}/api/${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({args})});return {status:r.status,...await r.json()};};
 try{
  const rules=(await call('getRules')).value;
  assert.equal((await call('saveRules',[{...rules,weights:{industry:80,size:30,interest:35}}])).status,400);
  rules.thresholds.queueMin=45;
  assert.equal((await call('saveRules',[rules])).status,200);
  assert.ok((await call('rescoreOpenLeads')).value>0);
  assert.equal((await call('approveLead',['pinecrest'])).status,409);
  assert.equal((await call('approveLead',['harborline'])).value.stage,'email');
  assert.equal((await call('approveEmail',['harborline',{subject:'[Name]',body:'unsubscribe'},new Date().toISOString()])).status,400);
  const draft={subject:'Question',body:'Hello, could we discuss your workflow? Reply unsubscribe to opt out.'};
  assert.equal((await call('saveDraft',['harborline',draft])).status,200);
  await new Promise(r=>server.close(r));server=await start();
  assert.equal((await call('getRules')).value.thresholds.queueMin,45);
  assert.equal((await call('getLead',['harborline'])).value.draft.body,draft.body);
  assert.equal((await call('approveEmail',['harborline',draft,new Date().toISOString()])).demo,true);
  assert.equal((await call('getLead',['unknown'])).status,404);
 }finally{await new Promise(r=>server.close(r));rmSync(dir,{recursive:true,force:true});}
});
