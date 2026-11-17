import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {dashboardRouter} from '../src/dashboard/router.js';

test('profiles migrate, isolate rules, rescore open leads, persist and protect active profile',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'profiles-')),stateFile=join(dir,'state.json');
 let server;
 async function start(){const app=express();app.use(express.json());app.use('/api',dashboardRouter({stateFile}));server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));}
 const stop=()=>new Promise(r=>server.close(r));
 const call=async(action,args=[])=>{const r=await fetch(`http://127.0.0.1:${server.address().port}/api/${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({args})});return {status:r.status,...await r.json()};};
 await start();
 try{
  const original=(await call('getRules')).value;
  await stop();
  const legacy=JSON.parse(readFileSync(stateFile));delete legacy.profiles;delete legacy.activeProfileId;legacy.rules.thresholds.queueMin=43;
  writeFileSync(stateFile,JSON.stringify(legacy));await start();
  assert.equal((await call('listProfiles')).value.activeProfileId,'default');
  assert.equal((await call('getProfile',['default'])).value.rules.thresholds.queueMin,43);
  const alternative=structuredClone(original);alternative.weights={industry:100,size:0,interest:0};alternative.industry.tier1Score=1;alternative.industry.tier2Score=1;alternative.industry.otherScore=1;
  const created=await call('createProfile',['  Healthcare  ',alternative]);assert.equal(created.status,200);const id=created.value.id;
  assert.equal(created.value.name,'Healthcare');
  assert.equal((await call('createProfile',['healthcare',alternative])).status,409);
  assert.equal((await call('createProfile',['',alternative])).status,400);
  assert.equal((await call('createProfile',['Broken',{...alternative,weights:{industry:99,size:0,interest:0}}])).status,400);
  assert.equal((await call('getRules')).value.thresholds.queueMin,43);
  const before=(await call('listLeads')).value;
  const switched=await call('activateProfile',[id]);assert.equal(switched.status,200);
  assert.equal(switched.value.rescored,before.filter(l=>['lead','email'].includes(l.stage)).length);
  const after=(await call('listLeads')).value;
  for(const lead of after){const old=before.find(l=>l.id===lead.id);if(['lead','email'].includes(lead.stage)){assert.equal(lead.scoringProfileId,id);assert.notDeepEqual(lead.scoring,old.scoring);}else{assert.deepEqual(lead,old);}}
  assert.equal((await call('saveRules',[original,'default'])).status,409);
  alternative.thresholds.queueMin=50;
  assert.equal((await call('saveRules',[alternative,id])).status,200);
  assert.equal((await call('getProfile',['default'])).value.rules.thresholds.queueMin,43);
  assert.equal((await call('deleteProfile',[id])).status,409);
  assert.equal((await call('activateProfile',['missing'])).status,409);
  assert.equal((await call('renameProfile',[id,'Healthcare teams'])).status,200);
  await stop();await start();
  assert.equal((await call('listProfiles')).value.activeProfileId,id);
  assert.equal((await call('getRules')).value.thresholds.queueMin,50);
  await call('resetSampleData');
  assert.equal((await call('listProfiles')).value.profiles.length,2);
  assert.equal((await call('getRules')).value.thresholds.queueMin,50);
  await call('activateProfile',['default']);
  assert.equal((await call('getRules')).value.thresholds.queueMin,43);
  assert.equal((await call('deleteProfile',[id])).status,200);
  assert.equal((await call('deleteProfile',['default'])).status,409);
 }finally{await stop();rmSync(dir,{recursive:true,force:true});}
});
