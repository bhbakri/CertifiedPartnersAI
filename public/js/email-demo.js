(function(){
const $=id=>document.getElementById(id);
let configured=false;
function payload(){return {case_id:$('case').value,sender:{name:$('name').value.trim(),company:$('company').value.trim(),offer:$('offer').value.trim()}};}
async function request(path,body,headers={}){
 const r=await fetch('/api/email-demo/'+path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
 const data=await r.json();if(!r.ok)throw new Error([data.error,...(data.reasons||[])].join('\n'));return data;
}
function clearDraft(){$('subject').value='';$('body').value='';$('notes').textContent='';$('copy-email').disabled=true;}
function showBrief(b){$('summary').textContent=`${b.template.name} (${b.template.id}) — ${b.selection.score}/12 information categories. `+(b.email_status.eligible_for_email?'Eligible for drafting.':'Blocked: '+b.email_status.reasons.join('; '));$('template').textContent=b.template.body;$('brief').textContent=JSON.stringify(b,null,2);$('generate').disabled=!configured||!b.email_status.eligible_for_email;}
async function preview(){const b=await request('brief',payload());showBrief(b);return b;}
async function copy(text){try{await navigator.clipboard.writeText(text);$('status').textContent='Copied.';}catch{$('status').textContent='Clipboard unavailable. Select and copy the text below.';$('brief').parentElement.open=true;$('brief').textContent=text;}}
$('case').addEventListener('change',()=>{clearDraft();$('status').textContent='';preview().catch(e=>$('status').textContent=e.message);});
$('preview').onclick=()=>preview().catch(e=>$('status').textContent=e.message);
$('copy-brief').onclick=async()=>{try{const b=await preview();await copy(b.ai_instructions.join('\n')+'\n\nEMAIL BRIEF:\n'+JSON.stringify(b,null,2));}catch(e){$('status').textContent=e.message;}};
$('copy-email').onclick=()=>copy('Subject: '+$('subject').value+'\n\n'+$('body').value);
$('form').onsubmit=async(e)=>{
 e.preventDefault();clearDraft();const input=payload();$('fields').disabled=true;
 const started=performance.now();let timer=setInterval(()=>$('status').textContent='Generating draft… '+Math.floor((performance.now()-started)/1000)+'s',500);
 $('status').textContent='Generating draft…';
 try{
  const b=await request('brief',input);showBrief(b);
  const d=await request('generate',input,{'X-Demo-Key':$('password').value});
  $('subject').value=d.subject;$('body').value=d.body;$('copy-email').disabled=false;
  $('notes').textContent=['Requires human review. Nothing was sent.',...d.warnings,...d.review_notes,...d.unresolved_fields.map(x=>'Missing: '+x)].join('\n');
  $('status').textContent=`Draft generated in ${((performance.now()-started)/1000).toFixed(1)} seconds total (${d.elapsed_seconds}s AI request). Template: ${d.template}.`;
 }catch(e){$('status').textContent=e.message;}
 finally{clearInterval(timer);$('fields').disabled=false;}
};
fetch('/api/email-demo/cases').then(r=>{if(!r.ok)throw new Error('Unable to load cases');return r.json();}).then(async data=>{
 configured=data.configured;
 for(const c of data.cases){const o=document.createElement('option');o.value=c.id;o.textContent=`${c.id} — ${c.company} — ${c.template} (${c.score}/12)${c.eligible?'':' — ineligible'}`;$('case').appendChild(o);}
 const first=data.cases.find(c=>c.eligible);if(first)$('case').value=first.id;
 $('fields').disabled=false;
 $('setup').textContent=configured?`AI drafting available (${data.model}). Enter your demo password to generate.`:'AI drafting needs OPENAI_API_KEY and EMAIL_DEMO_KEY in Render. Template preview and Copy prompt for ChatGPT work now.';
 await preview();
}).catch(e=>{$('setup').textContent=e.message;});
})();
