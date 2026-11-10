import express from 'express';
import vm from 'node:vm';
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';
const num=z.number().finite().min(0), score=num.max(100);
const range=z.object({fullMin:num,fullMax:num,partialMin:num,partialMax:num}).refine(r=>r.partialMin<=r.fullMin && r.fullMin<=r.fullMax && r.fullMax<=r.partialMax,'Partial range must surround full range');
const rules=z.object({weights:z.object({industry:score,size:score,interest:score}).refine(w=>w.industry+w.size+w.interest===100,'Weights must total 100'),industry:z.object({tier1:z.array(z.string().min(1).max(200)).max(100),tier2:z.array(z.string().min(1).max(200)).max(100),excluded:z.array(z.string().min(1).max(200)).max(100),tier1Score:score,tier2Score:score,otherScore:score}),size:z.object({employees:range,revenue:range,fullScore:score,partialScore:score,lowScore:score}),interest:z.object({halfAfterDays:num,extraSignalBonus:num.max(20)}),thresholds:z.object({queueMin:score,strongMin:score,cooldownDays:num.max(3650)}).refine(t=>t.queueMin<=t.strongMin,'Invalid thresholds')}).refine(r=>{const a=[...r.industry.tier1,...r.industry.tier2,...r.industry.excluded].map(x=>x.toLowerCase());return new Set(a).size===a.length;},'Duplicate industry');
const id=z.string().min(1).max(100),draft=z.object({subject:z.string().max(500),body:z.string().max(30000)});
const schemas={getMeta:z.tuple([]),listLeads:z.tuple([]),getRules:z.tuple([]),getLead:z.tuple([id]),approveLead:z.tuple([id]),rejectLead:z.tuple([id,z.string().min(1).max(2000)]),reopenLead:z.tuple([id]),saveDraft:z.tuple([id,draft]),regenerateDraft:z.tuple([id]),approveEmail:z.tuple([id,draft,z.string().datetime()]),saveRules:z.tuple([rules]),rescoreOpenLeads:z.tuple([]),resetSampleData:z.tuple([])};
export function dashboardRouter({stateFile=process.env.DASHBOARD_STATE_FILE || resolve('.runtime/dashboard.json')}={}) {
 const router=express.Router();
 let stored=null;
 if(existsSync(stateFile)){stored=readFileSync(stateFile,'utf8'); const data=JSON.parse(stored); rules.parse(data.rules); if(!Array.isArray(data.leads)) throw new Error('Invalid dashboard state');}
 const window={localStorage:{getItem:()=>stored,setItem:(_key,value)=>{
   mkdirSync(dirname(stateFile),{recursive:true});writeFileSync(stateFile+'.tmp',value,{mode:0o600});renameSync(stateFile+'.tmp',stateFile);stored=value;
 }}};
 const context=vm.createContext({window,Date,JSON,Promise});
 for(const path of ['../../public/js/data.js','../../public/js/scoring.js','./demo-engine.cjs']) {
   let source=readFileSync(new URL(path,import.meta.url),'utf8');
   source=source.replace("try { window.localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) { /* blocked */ }", "window.localStorage.setItem(STORE_KEY, JSON.stringify(db));");
   vm.runInContext(source,context);context.SampleData=window.SampleData;context.Scoring=window.Scoring;
 }
 const actions=window.Api;
 router.post('/:action',async(req,res)=>{
   if(req.headers['sec-fetch-site']==='cross-site' || (req.headers.origin && new URL(req.headers.origin).host!==req.headers.host)) return res.status(403).json({error:'Cross-origin requests are not allowed'});
   const action=req.params.action;
   if(!Object.hasOwn(schemas,action)) return res.status(404).json({error:'Unknown action'});
   const parsed=schemas[action].safeParse(req.body?.args);
   if(!parsed.success) return res.status(400).json({error:parsed.error.issues.map(x=>x.message).join('; ')});
   try {
     const args=parsed.data;
     if(['approveLead','approveEmail'].includes(action)) {
       const lead=await actions.getLead(args[0]),r=await actions.getRules();
       if(!lead.contact?.verified || lead.optOut || lead.doNotContact) return res.status(409).json({error:'Lead requires a verified contact and no suppression'});
       if(window.Scoring.industryTier(lead.industry,r)==='excluded' || (lead.lastContacted && window.Scoring.daysSince(lead.lastContacted)<r.thresholds.cooldownDays)) return res.status(409).json({error:'Lead is excluded or in contact cooldown'});
       if(action==='approveLead' && lead.stage!=='lead') return res.status(409).json({error:'Lead must be in lead review'});
       if(action==='approveEmail') {
         if(lead.stage!=='email') return res.status(409).json({error:'Approve the lead first'});
         const d=args[1];
         if(!d.subject.trim() || !d.body.trim() || /\[[^\]]+\]/.test(d.subject+d.body) || !/unsubscribe/i.test(d.body)) return res.status(400).json({error:'Complete the draft, remove placeholders, and include unsubscribe'});
       }
     }
     res.json({value:await actions[action](...args),demo:true});
   }catch(error){const missing=error.message.startsWith('Lead not found');res.status(missing?404:500).json({error:missing?error.message:'Unable to save or load dashboard data'});}
 });
 return router;
}
