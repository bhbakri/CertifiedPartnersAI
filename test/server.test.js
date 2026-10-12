import test from 'node:test';
import assert from 'node:assert/strict';
import { selectTemplate, buildBrief, cases, workbook } from '../src/selection.js';
import { createApp } from '../src/server.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const full = {company: {'Company Name':'Acme',Industry:'Manufacturing',City:'Provo',Employees:0,Technologies:'ERP',Keywords:'operations'},contact:{'First Name':'Maya',Title:'VP'},outreach:{'Pain Point':'reporting','Recent Signal':'expansion','Recommended Offer':'Assessment','Relationship Type':'Existing customer'}};
test('all template boundaries, missing sentinels, zero and duplicate facts', () => {
 const fields = [['company','Company Name'],['contact','First Name'],['contact','Title'],['company','Industry'],['company','City'],['company','Employees'],['company','Technologies'],['company','Keywords'],['outreach','Pain Point'],['outreach','Recent Signal'],['outreach','Recommended Offer'],['outreach','Relationship Type']];
 for (let n=0;n<=12;n++) {
  const context={company:{},contact:{},outreach:{}};
  for(const [group,key] of fields.slice(0,n)) context[group][key]=full[group][key];
  const r=selectTemplate(context); assert.equal(r.selection.score,n);
  assert.equal(r.template.id,n<=2?'minimal':n<=5?'basic':n<=8?'targeted':'detailed');
 }
 assert.equal(selectTemplate({company:{Industry:' N/A '},outreach:{Company:'Acme'},contact:{}}).selection.score,1);
 assert.equal(selectTemplate({company:{'Company Name':'Acme'},outreach:{Company:'Acme'}}).selection.score,1);
});
test('all workbook cases join correctly and retain all eight sheets', () => {
 assert.equal(Object.keys(workbook.sheets).length,8); assert.equal(cases.length,30);
 for(const c of cases) {const b=buildBrief(c['Case ID']); assert.equal(b.data.contact['Company ID'],c['Company ID']);assert.ok(b.template);assert.equal(b.email_status.draft_only,true);}
 assert.throws(()=>buildBrief('missing'),/Unknown/);
 assert.ok(cases.some(c=>!buildBrief(c['Case ID']).email_status.eligible_for_email));
});
test('real MCP client initialization, discovery, call, errors and HTTP gates', async () => {
 const http=createApp({token:'test-secret'}).listen(0,'127.0.0.1'); await new Promise(r=>http.once('listening',r));
 const base='http://127.0.0.1:'+http.address().port;
 const client=new Client({name:'integration-test',version:'1.0.0'});
 try {
  assert.equal((await fetch(base+'/health')).status,200);
  assert.equal((await fetch(base+'/mcp',{method:'POST'})).status,401);
  assert.equal((await fetch(base+'/mcp',{method:'POST',headers:{Authorization:'Bearer test-secret',Origin:'https://unknown.example'}})).status,403);
  assert.equal((await fetch(base+'/mcp',{headers:{Authorization:'Bearer test-secret'}})).status,405);
  await client.connect(new StreamableHTTPClientTransport(new URL(base+'/mcp'),{requestInit:{headers:{Authorization:'Bearer test-secret'}}}));
  assert.equal((await client.listTools()).tools.length,3);
  const r=await client.callTool({name:'prepare_email_brief',arguments:{case_id:'CASE-001',sender:{name:'Bassem'}}});
  assert.equal(r.structuredContent.case_id,'CASE-001');assert.equal(r.structuredContent.data.sender.name,'Bassem');
  assert.equal((await client.callTool({name:'prepare_email_brief',arguments:{case_id:'bad'}})).isError,true);
 } finally {await client.close();await new Promise(r=>http.close(r));}
});
