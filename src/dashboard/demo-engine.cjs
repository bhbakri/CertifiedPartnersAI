/*
 * The ONLY place the screens get or save data.
 *
 * For now it keeps everything in the browser (localStorage), seeded from
 * js/data.js. When the back end exists, replace the inside of each function
 * with a fetch() call to the server. Every function already returns a
 * Promise, so the screens will not need to change.
 *
 *   Example later:
 *   listLeads: function () { return fetch('/api/leads').then(r => r.json()); }
 */
(function () {
  var STORE_KEY = 'leadReviewConsole.v1';
  var memoryFallback = null; // used if the browser blocks localStorage

  function clone(x) {
    return JSON.parse(JSON.stringify(x));
  }

  function seed() {
    var rules = clone(SampleData.rules);
    var leads = clone(SampleData.leads).map(function (lead) {
      lead.scoring = Scoring.scoreLead(lead, rules);
      lead.draft = lead.stage === 'lead' || lead.stage === 'rejected' ? null : buildDraft(lead);
      return lead;
    });
    return { rules: rules, leads: leads, meta: clone(SampleData.meta), activeProfileId: 'default', profiles: [{id:'default',name:'Default',rules:clone(rules)}] };
  }

  function load() {
    var raw = null;
    try { raw = window.localStorage.getItem(STORE_KEY); } catch (e) { /* blocked */ }
    if (raw) {
      var db = JSON.parse(raw);
      if (!db.profiles) { db.activeProfileId='default'; db.profiles=[{id:'default',name:'Default',rules:clone(db.rules)}]; save(db); }
      return db;
    }
    if (memoryFallback) return memoryFallback;
    var db = seed();
    save(db);
    return db;
  }

  function save(db) {
    memoryFallback = db;
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) { /* blocked */ }
  }

  // Simulates a network call so the screens are written for async data.
  function respond(value) {
    return Promise.resolve(clone(value));
  }

  function findLead(db, id) {
    var lead = db.leads.filter(function (l) { return l.id === id; })[0];
    if (!lead) throw new Error('Lead not found: ' + id);
    return lead;
  }

  // Stand-in for the back end's draft writer.
  function buildDraft(lead) {
    var c = lead.contact || {};
    return {
      subject: 'A question about ' + lead.topic,
      body:
        'Hi ' + (c.firstName || '[First name]') + ',\n\n' +
        lead.hook + ' That is a problem we spend a lot of time on at [YOUR COMPANY].\n\n' +
        'We help teams like yours [ONE-LINE VALUE PROPOSITION]. If it would be useful, I can share a short example of how [A SIMILAR CUSTOMER] handled it.\n\n' +
        'Would a 15-minute call next week make sense?\n\n' +
        'Thanks,\n[Sender name]\n[YOUR COMPANY]\n\n' +
        'If you would rather not hear from us, reply "unsubscribe" and we will stop.'
    };
  }

  function profile(db,id) {
    var found=db.profiles.find(function(p){return p.id===id;});
    if(!found) throw new Error('Profile: not found');
    return found;
  }
  function uniqueName(db,name,except) {
    if(db.profiles.some(function(p){return p.id!==except && p.name.toLowerCase()===name.toLowerCase();})) throw new Error('Profile: that name is already used');
  }
  function profileList(db) {return {activeProfileId:db.activeProfileId,profiles:db.profiles.map(function(p){return {id:p.id,name:p.name};})};}
  function rescore(db) {
    var count=0;
    db.leads.forEach(function(l){if(l.stage==='lead'||l.stage==='email'){l.scoring=Scoring.scoreLead(l,db.rules);l.scoredAt=new Date().toISOString();l.scoringProfileId=db.activeProfileId;count++;}});
    return count;
  }

  window.Api = {
    getMeta: function () {
      return respond(load().meta);
    },

    listLeads: function () {
      return respond(load().leads);
    },

    getLead: function (id) {
      return respond(findLead(load(), id));
    },

    approveLead: function (id) {
      var db = load();
      var lead = findLead(db, id);
      lead.stage = 'email';
      lead.approvedAt = new Date().toISOString();
      if (!lead.draft) lead.draft = buildDraft(lead);
      save(db);
      return respond(lead);
    },

    rejectLead: function (id, reason) {
      var db = load();
      var lead = findLead(db, id);
      lead.stage = 'rejected';
      lead.rejectReason = reason;
      lead.rejectedAt = new Date().toISOString();
      save(db);
      return respond(lead);
    },

    // Sends the lead back to "Needs review" (undo an approval or rejection).
    reopenLead: function (id) {
      var db = load();
      var lead = findLead(db, id);
      lead.stage = 'lead';
      delete lead.rejectReason;
      save(db);
      return respond(lead);
    },

    saveDraft: function (id, draft) {
      var db = load();
      var lead = findLead(db, id);
      lead.draft = { subject: draft.subject, body: draft.body };
      save(db);
      return respond(lead);
    },

    regenerateDraft: function (id) {
      var db = load();
      var lead = findLead(db, id);
      lead.draft = buildDraft(lead);
      save(db);
      return respond(lead);
    },

    // Front end only: marks the email approved and scheduled.
    // Nothing is actually sent until the back end exists.
    approveEmail: function (id, draft, sendAt) {
      var db = load();
      var lead = findLead(db, id);
      lead.draft = { subject: draft.subject, body: draft.body };
      lead.stage = 'sent'; // legacy UI bucket, simulation only
      lead.deliveryStatus = 'demo_only';
      lead.sendAt = sendAt;
      lead.sentAt = sendAt;
      lead.lastContacted = sendAt;
      save(db);
      return respond(lead);
    },

    listProfiles: function(){return respond(profileList(load()));},
    getProfile: function(id){return respond(profile(load(),id));},
    createProfile: function(name,rules){
      var db=load();uniqueName(db,name);
      if(db.profiles.length>=50) throw new Error('Profile: maximum of 50 profiles reached');
      var p={id:'profile-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),name:name,rules:clone(rules)};
      db.profiles.push(p);save(db);return respond(p);
    },
    renameProfile: function(id,name){var db=load();uniqueName(db,name,id);profile(db,id).name=name;save(db);return respond(profileList(db));},
    deleteProfile: function(id){
      var db=load();profile(db,id);
      if(id===db.activeProfileId) throw new Error('Profile: activate another profile before deleting this one');
      db.profiles=db.profiles.filter(function(p){return p.id!==id;});save(db);return respond(profileList(db));
    },
    activateProfile: function(id){
      var db=load();var p=profile(db,id);db.rules=clone(p.rules);db.activeProfileId=id;
      var count=rescore(db);save(db);return respond({profile:p,rescored:count});
    },

    getRules: function () {
      return respond(load().rules);
    },

    saveRules: function (rules, expectedProfileId) {
      var db = load();
      if(expectedProfileId && expectedProfileId!==db.activeProfileId) throw new Error('Profile: active profile changed in another session; reload before saving');
      db.rules = clone(rules);
      profile(db,db.activeProfileId).rules=clone(rules);
      save(db);
      return respond(db.rules);
    },

    // Re-scores leads still in review (needs review + email to approve).
    rescoreOpenLeads: function () {
      var db = load();
      var count = rescore(db);
      save(db);
      return respond(count);
    },

    resetSampleData: function () {
      var previous=load();
      var db = seed();
      db.profiles=clone(previous.profiles);db.activeProfileId=previous.activeProfileId;db.rules=clone(previous.rules);rescore(db);
      save(db);
      return respond(true);
    }
  };
})();
