
/* =========================================================
   Scoring rules page — Lead Review
   Plain JavaScript, no libraries. Everything is wrapped in
   an IIFE so nothing leaks into the global scope except
   window.LeadReviewScoring (a small API for teammates).

   Events fired on `document` (for back-end hookup):
     "scoringrules:saved"   detail = config object
     "scoringrules:rescore" detail = config object
   ========================================================= */
(function () {
  'use strict';

  var STORAGE_KEY = 'leadReview.scoringRules';

  var DEFAULTS = {
    weights: { industry: 35, size: 30, interest: 35 },
    industries: {
      tier1: ['Freight and logistics', 'Healthcare services', 'Field services'],
      tier2: ['Food manufacturing', 'Data services', 'Software'],
      excluded: []
    },
    companySize: {
      employees: { fullMin: 50, fullMax: 500, partialMin: 10, partialMax: 2000 },
      revenue: { fullMin: 5, fullMax: 100, partialMin: 1, partialMax: 100 } // in $M
    },
    interest: [
      { signal: 'Posts or asks about the problem you solve', strength: 'Strong', min: 90, max: 100 },
      { signal: 'Hiring for a related role', strength: 'Medium', min: 60, max: 75 },
      { signal: 'Growth news: expansion, funding, new product', strength: 'Weak', min: 30, max: 50 },
      { signal: 'No signal found', strength: 'None', min: 0, max: 0 }
    ],
    thresholds: { queueMin: 40, strongMin: 80, skipDays: 90, requireApproval: true }
  };

  var TIER_NAMES = { tier1: 'Tier 1', tier2: 'Tier 2', excluded: 'Excluded' };
  var MIN_WEIGHT = 5;

  // ---------- State ----------
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var backendRules;
  function loadSaved() { return clone(DEFAULTS); }
  function fromBackend(r) {
    return Object.assign(clone(DEFAULTS), {weights:r.weights, industries:{tier1:r.industry.tier1,tier2:r.industry.tier2,excluded:r.industry.excluded},companySize:{employees:r.size.employees,revenue:r.size.revenue},thresholds:{queueMin:r.thresholds.queueMin,strongMin:r.thresholds.strongMin,skipDays:r.thresholds.cooldownDays,requireApproval:true}});
  }
  function toBackend() {
    var r=clone(backendRules);
    r.weights=clone(state.weights);
    Object.assign(r.industry, clone(state.industries));
    Object.assign(r.size, clone(state.companySize));
    Object.assign(r.thresholds,{queueMin:state.thresholds.queueMin,strongMin:state.thresholds.strongMin,cooldownDays:state.thresholds.skipDays});
    return r;
  }
  var state = loadSaved();
  var savedSnapshot = JSON.stringify(state);
  var editingIndustries = false;
  var editingRanges = false;

  // ---------- Helpers ----------
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function fmtNum(n) { return Number(n).toLocaleString('en-US'); }
  function isDirty() { return JSON.stringify(state) !== savedSnapshot; }

  function updateDirty() {
    $('sr-dirty').hidden = !isDirty();
  }

  function showError(id, msg) {
    var n = $(id);
    n.textContent = msg || '';
    n.hidden = !msg;
  }

  var toastTimer;
  function toast(msg, isError) {
    var t = $('sr-toast');
    t.textContent = msg;
    t.className = 'sr-toast' + (isError ? ' sr-toast--error' : '');
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2800);
  }

  // =========================================================
  // Weights bar (draggable dividers + keyboard arrows)
  // =========================================================
  function renderWeights() {
    var w = state.weights;
    var segs = { industry: 'sr-seg-industry', size: 'sr-seg-size', interest: 'sr-seg-interest' };
    Object.keys(segs).forEach(function (k) {
      var s = $(segs[k]);
      s.style.flex = '0 0 ' + w[k] + '%';
      s.firstElementChild.textContent = w[k] + '%';
    });
    var h0 = $('sr-handle-0'), h1 = $('sr-handle-1');
    h0.style.left = w.industry + '%';
    h1.style.left = (w.industry + w.size) + '%';
    h0.setAttribute('aria-valuenow', w.industry);
    h0.setAttribute('aria-valuetext', 'Industry fit ' + w.industry + '%, Company size ' + w.size + '%');
    h1.setAttribute('aria-valuenow', w.industry + w.size);
    h1.setAttribute('aria-valuetext', 'Company size ' + w.size + '%, Indicated interest ' + w.interest + '%');
  }

  function moveBoundary(index, pct) {
    var w = state.weights;
    pct = Math.round(pct);
    if (index === 0) {
      var pair = w.industry + w.size;
      var ind = Math.min(Math.max(pct, MIN_WEIGHT), pair - MIN_WEIGHT);
      w.industry = ind;
      w.size = pair - ind;
    } else {
      var b = Math.min(Math.max(pct, w.industry + MIN_WEIGHT), 100 - MIN_WEIGHT);
      w.size = b - w.industry;
      w.interest = 100 - b;
    }
    renderWeights();
    updateDirty();
  }

  function initWeights() {
    var bar = $('sr-weights');
    [0, 1].forEach(function (i) {
      var h = $('sr-handle-' + i);
      h.setAttribute('aria-valuemin', 0);
      h.setAttribute('aria-valuemax', 100);

      h.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        h.setPointerCapture(e.pointerId);
        h.classList.add('is-dragging');
        function onMove(ev) {
          var r = bar.getBoundingClientRect();
          moveBoundary(i, ((ev.clientX - r.left) / r.width) * 100);
        }
        function onUp() {
          h.classList.remove('is-dragging');
          h.removeEventListener('pointermove', onMove);
          h.removeEventListener('pointerup', onUp);
          h.removeEventListener('pointercancel', onUp);
        }
        h.addEventListener('pointermove', onMove);
        h.addEventListener('pointerup', onUp);
        h.addEventListener('pointercancel', onUp);
      });

      h.addEventListener('keydown', function (e) {
        var step = e.shiftKey ? 5 : 1;
        var cur = i === 0 ? state.weights.industry : state.weights.industry + state.weights.size;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { moveBoundary(i, cur - step); e.preventDefault(); }
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { moveBoundary(i, cur + step); e.preventDefault(); }
      });
    });
    renderWeights();
  }

  // =========================================================
  // Industry fit (chips, add/remove, edit mode)
  // =========================================================
  function findIndustry(name) {
    var lower = name.trim().toLowerCase();
    var tiers = Object.keys(state.industries);
    for (var i = 0; i < tiers.length; i++) {
      var list = state.industries[tiers[i]];
      for (var j = 0; j < list.length; j++) {
        if (list[j].toLowerCase() === lower) return tiers[i];
      }
    }
    return null;
  }

  function renderIndustries() {
    document.querySelectorAll('.sr-chips').forEach(function (box) {
      var tier = box.getAttribute('data-tier');
      box.innerHTML = '';

      state.industries[tier].forEach(function (name, idx) {
        var chip = el('span', 'sr-chip sr-chip--' + tier, name);
        if (editingIndustries) {
          var x = el('button', 'sr-chip__remove', '×');
          x.type = 'button';
          x.setAttribute('aria-label', 'Remove ' + name);
          x.addEventListener('click', function () {
            state.industries[tier].splice(idx, 1);
            renderIndustries();
            updateDirty();
          });
          chip.appendChild(x);
        }
        box.appendChild(chip);
      });

      // "Excluded" always shows the add chip (matches the design);
      // tiers 1 & 2 show it only in edit mode.
      if (tier === 'excluded' || editingIndustries) {
        var add = el('button', 'sr-chip sr-chip--add', tier === 'excluded' ? '[Add an industry]' : '+ Add');
        add.type = 'button';
        add.addEventListener('click', function () { openAddInput(box, add, tier); });
        box.appendChild(add);
      }
    });
    $('sr-edit-industries').textContent = editingIndustries ? 'Done' : 'Edit industries';
  }

  function openAddInput(box, addBtn, tier) {
    var input = el('input', 'sr-chip-input');
    input.type = 'text';
    input.placeholder = 'Industry name, then Enter';
    input.setAttribute('aria-label', 'Add industry to ' + TIER_NAMES[tier]);
    box.replaceChild(input, addBtn);
    input.focus();

    var done = false;
    function commit(keepOpen) {
      if (done) return;
      var val = input.value.trim().replace(/\s+/g, ' ');
      if (!val) { done = true; renderIndustries(); return; }
      if (val.length > 60) { showError('sr-industry-error', 'Industry names must be 60 characters or fewer.'); return; }
      var existing = findIndustry(val);
      if (existing) {
        showError('sr-industry-error', '"' + val + '" is already in ' + TIER_NAMES[existing] + '.');
        input.select();
        return;
      }
      showError('sr-industry-error', '');
      state.industries[tier].push(val);
      done = true;
      updateDirty();
      renderIndustries();
      if (keepOpen) {
        // re-open the input so several can be added in a row
        var newBox = document.querySelector('.sr-chips[data-tier="' + tier + '"]');
        var newAdd = newBox.querySelector('.sr-chip--add');
        if (newAdd) openAddInput(newBox, newAdd, tier);
      }
    }
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); commit(true); }
      if (e.key === 'Escape') { done = true; showError('sr-industry-error', ''); renderIndustries(); }
    });
    input.addEventListener('blur', function () {
      if (!input.value.trim()) { done = true; showError('sr-industry-error', ''); renderIndustries(); }
      else commit(false);
    });
  }

  function initIndustries() {
    $('sr-edit-industries').addEventListener('click', function () {
      editingIndustries = !editingIndustries;
      showError('sr-industry-error', '');
      renderIndustries();
    });
    renderIndustries();
  }

  // =========================================================
  // Company size (view table / editable inputs)
  // =========================================================
  function partialText(r, prefix, suffix, isRevenue) {
    var parts = [];
    function f(n) { return prefix + fmtNum(n) + suffix; }
    if (r.partialMin < r.fullMin) {
      parts.push(f(r.partialMin) + '–' + f(isRevenue ? r.fullMin : r.fullMin - 1));
    }
    if (r.partialMax > r.fullMax) {
      parts.push(f(isRevenue ? r.fullMax : r.fullMax + 1) + '–' + f(r.partialMax));
    }
    return parts.length ? parts.join(', ') : '—';
  }

  function rangeInput(group, key, label) {
    var i = el('input', 'sr-range-input');
    i.type = 'number';
    i.min = 0;
    i.step = 'any';
    i.value = state.companySize[group][key];
    i.setAttribute('data-group', group);
    i.setAttribute('data-key', key);
    i.setAttribute('aria-label', label);
    return i;
  }

  function pair(group, minKey, maxKey, label, prefix, suffix) {
    var wrap = el('span', 'sr-range-pair');
    if (prefix) wrap.appendChild(document.createTextNode(prefix));
    wrap.appendChild(rangeInput(group, minKey, label + ' minimum'));
    wrap.appendChild(document.createTextNode('–' + (prefix || '')));
    wrap.appendChild(rangeInput(group, maxKey, label + ' maximum'));
    if (suffix) wrap.appendChild(document.createTextNode(suffix));
    return wrap;
  }

  function renderSize() {
    var body = $('sr-size-body');
    var emp = state.companySize.employees;
    var rev = state.companySize.revenue;
    body.innerHTML = '';

    var rows = [
      ['Full score', 'full'],
      ['Partial score (60)', 'partial'],
      ['Low score (20)', 'low']
    ];

    rows.forEach(function (r) {
      var tr = el('tr');
      tr.appendChild(el('td', null, r[0]));
      var tdE = el('td', 'sr-mono');
      var tdR = el('td', 'sr-mono');

      if (r[1] === 'low') {
        tdE.textContent = 'outside';
        tdR.textContent = 'outside';
      } else if (!editingRanges) {
        if (r[1] === 'full') {
          tdE.textContent = fmtNum(emp.fullMin) + '–' + fmtNum(emp.fullMax);
          tdR.textContent = '$' + fmtNum(rev.fullMin) + 'M–$' + fmtNum(rev.fullMax) + 'M';
        } else {
          tdE.textContent = partialText(emp, '', '', false);
          tdR.textContent = partialText(rev, '$', 'M', true);
        }
      } else {
        var k = r[1];
        tdE.appendChild(pair('employees', k + 'Min', k + 'Max', r[0] + ' employees', '', ''));
        tdR.appendChild(pair('revenue', k + 'Min', k + 'Max', r[0] + ' revenue in millions', '$', 'M'));
      }
      tr.appendChild(tdE);
      tr.appendChild(tdR);
      body.appendChild(tr);
    });

    if (editingRanges) {
      var note = el('tr');
      var td = el('td', null, 'Partial range is the outer limit around the full range.');
      td.colSpan = 3;
      td.style.fontSize = '11.5px';
      td.style.color = 'var(--sr-text-faint)';
      note.appendChild(td);
      body.appendChild(note);

      body.querySelectorAll('.sr-range-input').forEach(function (inp) {
        inp.addEventListener('input', function () {
          var v = parseFloat(inp.value);
          state.companySize[inp.getAttribute('data-group')][inp.getAttribute('data-key')] = isNaN(v) ? null : v;
          validateSize(false);
          updateDirty();
        });
      });
    }
    $('sr-edit-ranges').textContent = editingRanges ? 'Done' : 'Edit ranges';
  }

  // Returns an error message, or '' if valid
  function sizeError() {
    var labels = { employees: 'Employees', revenue: 'Revenue' };
    var groups = ['employees', 'revenue'];
    for (var i = 0; i < groups.length; i++) {
      var r = state.companySize[groups[i]];
      var vals = [r.partialMin, r.fullMin, r.fullMax, r.partialMax];
      for (var j = 0; j < vals.length; j++) {
        if (vals[j] === null || vals[j] === undefined || isNaN(vals[j]) || vals[j] < 0) {
          return labels[groups[i]] + ': every range needs a number of 0 or more.';
        }
      }
      if (r.fullMin > r.fullMax) return labels[groups[i]] + ': full score minimum must be below its maximum.';
      if (r.partialMin > r.fullMin || r.partialMax < r.fullMax) {
        return labels[groups[i]] + ': the partial range must surround the full range.';
      }
    }
    return '';
  }

  function validateSize(show) {
    var msg = sizeError();
    document.querySelectorAll('.sr-range-input').forEach(function (i) { i.classList.toggle('is-invalid', !!msg); });
    if (show || !msg) showError('sr-size-error', msg);
    return !msg;
  }

  function initSize() {
    $('sr-edit-ranges').addEventListener('click', function () {
      if (editingRanges && !validateSize(true)) return; // stay in edit mode until fixed
      editingRanges = !editingRanges;
      renderSize();
    });
    renderSize();
  }

  // =========================================================
  // Indicated interest (read-only table, rendered from data)
  // =========================================================
  function renderInterest() {
    var body = $('sr-interest-body');
    body.innerHTML = '';
    state.interest.forEach(function (row) {
      var tr = el('tr');
      tr.appendChild(el('td', null, row.signal));
      var td = el('td');
      td.appendChild(el('span', 'sr-badge sr-badge--' + row.strength.toLowerCase(), row.strength));
      tr.appendChild(td);
      tr.appendChild(el('td', 'sr-mono', row.min === row.max ? String(row.min) : row.min + '–' + row.max));
      body.appendChild(tr);
    });
  }

  // =========================================================
  // Thresholds
  // =========================================================
  var THRESH = [
    { id: 'sr-queue-min', key: 'queueMin' },
    { id: 'sr-strong-min', key: 'strongMin' },
    { id: 'sr-skip-days', key: 'skipDays' }
  ];

  function thresholdError() {
    var t = state.thresholds;
    function bad(v, max) { return v === null || isNaN(v) || v < 0 || v > max || Math.floor(v) !== v; }
    if (bad(t.queueMin, 100)) return { id: 'sr-queue-min', msg: 'Review queue score must be a whole number from 0 to 100.' };
    if (bad(t.strongMin, 100)) return { id: 'sr-strong-min', msg: 'Strong lead score must be a whole number from 0 to 100.' };
    if (t.strongMin < t.queueMin) return { id: 'sr-strong-min', msg: 'Strong lead score can’t be lower than the review queue score.' };
    if (bad(t.skipDays, 3650)) return { id: 'sr-skip-days', msg: 'Days must be a whole number from 0 to 3,650.' };
    return null;
  }

  function validateThresholds() {
    var err = thresholdError();
    THRESH.forEach(function (f) { $(f.id).classList.toggle('is-invalid', !!err && err.id === f.id); });
    showError('sr-threshold-error', err ? err.msg : '');
    return !err;
  }

  function renderThresholds() {
    THRESH.forEach(function (f) { $(f.id).value = state.thresholds[f.key]; });
  }

  function initThresholds() {
    THRESH.forEach(function (f) {
      $(f.id).addEventListener('input', function (e) {
        var v = e.target.value === '' ? null : Number(e.target.value);
        state.thresholds[f.key] = v;
        validateThresholds();
        updateDirty();
      });
      $(f.id).addEventListener('keydown', function (e) { if (e.key === 'Enter') e.target.blur(); });
    });
    state.thresholds.requireApproval = true; // safeguard is always on
    renderThresholds();
  }

  // =========================================================
  // Save / Re-score
  // =========================================================
  function validateAll() {
    var okT = validateThresholds();
    var okS = validateSize(true);
    var w = state.weights;
    var okW = w.industry + w.size + w.interest === 100;
    return okT && okS && okW;
  }

  async function save() {
    if (!validateAll()) {
      if (sizeError() && !editingRanges) { editingRanges = true; renderSize(); validateSize(true); }
      toast('Fix the highlighted fields before saving.', true);
      return false;
    }
    if (!isDirty()) { toast('No changes to save.'); return true; }

    try { backendRules = await Api.saveRules(toBackend()); } catch (e) { toast(e.message, true); return false; }
    savedSnapshot = JSON.stringify(state);
    updateDirty();
    document.dispatchEvent(new CustomEvent('scoringrules:saved', { detail: clone(state) }));
    toast('Scoring rules saved. New leads will use these rules.');
    return true;
  }

  function openModal() {
    var dirty = isDirty();
    $('sr-modal-text').textContent = dirty
      ? 'You have unsaved changes. They will be saved first, then every open lead will be scored again with the new rules.'
      : 'Every open lead will be scored again with the current rules. Leads may move in or out of the review queue.';
    $('sr-modal-confirm').textContent = dirty ? 'Save and re-score' : 'Re-score';
    $('sr-modal').hidden = false;
    $('sr-modal-confirm').focus();
  }
  function closeModal() {
    $('sr-modal').hidden = true;
    $('sr-rescore-btn').focus();
  }

  async function rescore() {
    closeModal();
    if (isDirty() && !(await save())) return;
    var btn = $('sr-rescore-btn');
    btn.disabled = true;
    try { var count = await Api.rescoreOpenLeads(); toast(count + ' open leads re-scored.'); }
    catch(e) { toast(e.message,true); }
    finally { btn.disabled = false; }
  }

  function initActions() {
    $('sr-save-btn').addEventListener('click', save);
    $('sr-rescore-btn').addEventListener('click', function () {
      if (!validateAll()) { toast('Fix the highlighted fields before re-scoring.', true); return; }
      openModal();
    });
    $('sr-modal-cancel').addEventListener('click', closeModal);
    $('sr-modal-confirm').addEventListener('click', rescore);
    $('sr-modal').addEventListener('click', function (e) { if (e.target === $('sr-modal')) closeModal(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('sr-modal').hidden) closeModal();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
    });
    window.addEventListener('beforeunload', function (e) {
      if (isDirty()) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  // ---------- Small public API for the rest of the project ----------
  window.LeadReviewScoring = {
    getConfig: function () { return clone(state); },
    getDefaults: function () { return clone(DEFAULTS); },
    setConfig: function (cfg) {
      state = Object.assign(clone(DEFAULTS), clone(cfg));
      savedSnapshot = JSON.stringify(state);
      renderAll();
    }
  };

  function renderAll() {
    renderWeights();
    renderIndustries();
    renderSize();
    renderInterest();
    renderThresholds();
    updateDirty();
  }

  async function init() {
    $('sr-save-btn').disabled = true;
    $('sr-rescore-btn').disabled = true;
    try { backendRules = await Api.getRules(); state = fromBackend(backendRules); savedSnapshot = JSON.stringify(state); }
    catch(e) { toast('Unable to load rules: ' + e.message, true); return; }
    $('sr-save-btn').disabled = false;
    $('sr-rescore-btn').disabled = false;

    initWeights();
    initIndustries();
    initSize();
    renderInterest();
    initThresholds();
    initActions();
    updateDirty();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

