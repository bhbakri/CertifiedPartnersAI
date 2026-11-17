import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {emailDemoRouter} from '../src/email-demo.js';
async function run(options,fn){const a=express();a.use(express.json());a.use(emailDemoRouter(options));const s=a.listen(0,'127.0.0.1');await new Promise(r=>s.once('listening',r));const base='http://127.0.0.1:'+s.address().port;try{await fn(base);}finally{await new Promise(r=>s.close(r));}}
async function post(base,path,body,key='secret'){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json','X-Demo-Key':key},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
test('email demo reuses real brief and blocks ineligible cases before provider call',async()=>{
 let calls=0;
 await run({apiKey:'provider-key',demoKey:'secret',fetchImpl:async(_url,options)=>{
  calls++;const body=JSON.parse(options.body);assert.ok(body.messages[0].content.includes('Use only supplied facts'));assert.equal(JSON.parse(body.messages[1].content).data.sender.name,'Bassem');
  return Response.json({model:'test-model',choices:[{finish_reason:'stop',message:{content:JSON.stringify({subject:'Test',body:'Hello Bassem',unresolved_fields:[],review_notes:['Review required']})}}]});
 }},async base=>{
  const list=await (await fetch(base+'/cases')).json();assert.equal(list.cases.length,30);
  const yes=list.cases.find(c=>c.eligible),no=list.cases.find(c=>!c.eligible);
  assert.equal((await post(base,'/generate',{case_id:yes.id},'wrong')).status,401);
  assert.equal((await post(base,'/generate',{case_id:no.id})).status,409);assert.equal(calls,0);
  assert.equal((await post(base,'/brief',{case_id:yes.id})).data.selection.score,yes.score);
  const result=await post(base,'/generate',{case_id:yes.id,sender:{name:'Bassem'}});assert.equal(result.status,200);assert.equal(result.data.subject,'Test');assert.equal(calls,1);
  assert.equal((await post(base,'/brief',{case_id:'missing'})).status,404);
 });
});
test('unconfigured demo permits preview without pretending to generate',async()=>{await run({apiKey:'',demoKey:''},async base=>{assert.equal((await post(base,'/brief',{case_id:'CASE-001'})).status,200);assert.equal((await post(base,'/generate',{case_id:'CASE-001'})).status,503);});});
test('provider failure and malformed output give safe errors',async()=>{for(const response of [new Response('secret upstream details',{status:401}),Response.json({choices:[{finish_reason:'stop',message:{content:'not JSON'}}]})]){await run({apiKey:'test',demoKey:'secret',fetchImpl:async()=>response},async base=>{const r=await post(base,'/generate',{case_id:'CASE-001'});assert.equal(r.status,502);assert.ok(!JSON.stringify(r.data).includes('secret upstream details'));});}});
