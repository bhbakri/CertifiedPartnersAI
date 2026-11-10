(function(){
 async function request(method,args){
   const response=await fetch('/api/'+method,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({args})});
   const result=await response.json();
   if(!response.ok) throw new Error(result.error || 'Request failed');
   return result.value;
 }
 window.addEventListener('unhandledrejection',function(e){ if(window.UI) UI.toast(e.reason?.message || 'Request failed'); });
 window.Api={
getMeta:function(){return request('getMeta',[]);},
listLeads:function(){return request('listLeads',[]);},
getLead:function(id){return request('getLead',[id]);},
approveLead:function(id){return request('approveLead',[id]);},
rejectLead:function(id,reason){return request('rejectLead',[id,reason]);},
reopenLead:function(id){return request('reopenLead',[id]);},
saveDraft:function(id,draft){return request('saveDraft',[id,draft]);},
regenerateDraft:function(id){return request('regenerateDraft',[id]);},
approveEmail:function(id,draft,sendAt){return request('approveEmail',[id,draft,sendAt]);},
getRules:function(){return request('getRules',[]);},
saveRules:function(rules){return request('saveRules',[rules]);},
rescoreOpenLeads:function(){return request('rescoreOpenLeads',[]);},
resetSampleData:function(){return request('resetSampleData',[]);}
};
})();
