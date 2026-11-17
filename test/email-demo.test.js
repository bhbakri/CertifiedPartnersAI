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

test('OpenRouter catalog filters models, caches results and routes chosen model with server credentials',async()=>{
 let catalogs=0,generations=0;
 await run({apiKey:'openai-secret',openrouterKey:'router-secret',demoKey:'secret',allowedModels:'vendor/good',fetchImpl:async(url,options)=>{
  assert.equal(options.headers.Authorization,'Bearer router-secret');
  if(url.endsWith('/models')){catalogs++;return Response.json({data:[{id:'vendor/good',name:'Good',architecture:{output_modalities:['text']},supported_parameters:['structured_outputs']},{id:'vendor/no-schema',architecture:{output_modalities:['text']},supported_parameters:[]},{id:'vendor/not-allowed',architecture:{output_modalities:['text']},supported_parameters:['structured_outputs']}]});}
  generations++;assert.equal(url,'https://openrouter.ai/api/v1/chat/completions');const input=JSON.parse(options.body);assert.equal(input.model,'vendor/good');assert.equal(input.provider.require_parameters,true);assert.equal(input.max_tokens,1800);assert.equal(input.response_format.type,'json_schema');assert.equal(input.store,undefined);
  return Response.json({model:'vendor/good',choices:[{finish_reason:'stop',message:{content:JSON.stringify({subject:'Hello',body:'Draft',unresolved_fields:[],review_notes:[]})}}]});
 }},async base=>{
  const config=await(await fetch(base+'/cases')).json();assert.deepEqual(config.providers,['openrouter','openai']);assert.equal(config.defaultProvider,'openrouter');assert.ok(!JSON.stringify(config).includes('router-secret'));
  const catalog=await(await fetch(base+'/models?provider=openrouter')).json();assert.deepEqual(catalog.models,[{id:'vendor/good',name:'Good'}]);
  await fetch(base+'/models?provider=openrouter');assert.equal(catalogs,1);
  assert.equal((await post(base,'/generate',{case_id:'CASE-001',provider:'openrouter',model:'vendor/no-schema'})).status,400);assert.equal(generations,0);
  assert.equal((await post(base,'/generate',{case_id:'CASE-001',provider:'openrouter',model:'vendor/good'},'wrong')).status,401);
  const result=await post(base,'/generate',{case_id:'CASE-001',provider:'openrouter',model:'vendor/good'});assert.equal(result.status,200);assert.equal(result.data.provider,'openrouter');assert.equal(result.data.requested_model,'vendor/good');assert.equal(generations,1);
 });
});
test('OpenRouter catalog failures fail closed; unconfigured providers cannot generate',async()=>{
 await run({apiKey:'',openrouterKey:'router',demoKey:'secret',fetchImpl:async()=>new Response('private upstream',{status:503})},async base=>{
  assert.equal((await fetch(base+'/models?provider=openrouter')).status,502);
  assert.equal((await post(base,'/generate',{case_id:'CASE-001',provider:'openrouter',model:'vendor/good'})).status,502);
  assert.equal((await post(base,'/generate',{case_id:'CASE-001',provider:'openai'})).status,503);
  assert.equal((await post(base,'/generate',{case_id:'CASE-001',provider:'other'})).status,400);
 });
});
