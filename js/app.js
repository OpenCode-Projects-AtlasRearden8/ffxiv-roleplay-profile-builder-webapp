/* Adventurer's Ledger — FFXIV roleplay profile builder
   Static, offline, local-storage-only. No accounts, no network calls.
   Copyright (c) 2026 Asdale Dynamics, LLC — MIT licensed. */
(function () {
  'use strict';

  var STORAGE_KEY = 'ffxiv-adventurers-ledger-v1';
  var STATE_VERSION = 1;

  var TRAITS = [
    { key: 'warmth', low: 'Aloof', high: 'Warm' },
    { key: 'confidence', low: 'Timid', high: 'Bold' },
    { key: 'temper', low: 'Mellow', high: 'Fiery' },
    { key: 'honesty', low: 'Sly', high: 'Forthright' },
    { key: 'humor', low: 'Deadpan', high: 'Playful' },
    { key: 'discipline', low: 'Chaotic', high: 'Disciplined' },
    { key: 'sociability', low: 'Quiet', high: 'Chatty' },
    { key: 'faith', low: 'Skeptical', high: 'Devout' }
  ];

  var SPOILER_SECTIONS = [
    { key: 'backstory', label: 'Backstory secrets' },
    { key: 'revealed', label: 'Revealed-in-RP facts' },
    { key: 'future', label: 'Future story plans' },
    { key: 'sensitive', label: 'Sensitive topics & boundaries' }
  ];

  var FIELD_MAP = [
    ['bio', 'name', 'bio-name'], ['bio', 'title', 'bio-title'],
    ['bio', 'race', 'bio-race'], ['bio', 'clan', 'bio-clan'],
    ['bio', 'age', 'bio-age'], ['bio', 'occupation', 'bio-occupation'],
    ['bio', 'birthplace', 'bio-birthplace'], ['bio', 'pronouns', 'bio-pronouns'],
    ['bio', 'summary', 'bio-summary'],
    ['appearance', 'height', 'app-height'], ['appearance', 'build', 'app-build'],
    ['appearance', 'hair', 'app-hair'], ['appearance', 'eyes', 'app-eyes'],
    ['appearance', 'notable', 'app-notable'], ['appearance', 'style', 'app-style'],
    ['appearance', 'notes', 'app-notes'],
    ['fc', 'name', 'fc-name'], ['fc', 'tag', 'fc-tag'], ['fc', 'rank', 'fc-rank'],
    ['fc', 'homeworld', 'fc-homeworld'], ['fc', 'notes', 'fc-notes'],
    ['contact', 'notes', 'contact-notes']
  ];

  var CHECK_MAP = [
    ['contact', 'walkups', 'contact-walkups'], ['contact', 'tells', 'contact-tells'],
    ['contact', 'mail', 'contact-mail'], ['contact', 'party', 'contact-party']
  ];

  var SPOILER_IDS = {
    enabled: 'spoilers-enabled',
    sections: {},
    text: {}
  };
  SPOILER_SECTIONS.forEach(function (s) {
    SPOILER_IDS.sections[s.key] = 'spoiler-' + s.key + '-enabled';
    SPOILER_IDS.text[s.key] = 'spoiler-' + s.key;
  });

  function $(id) {
    return document.getElementById(id);
  }

  function blankState() {
    var traits = {};
    TRAITS.forEach(function (t) { traits[t.key] = 50; });
    var spoilers = { enabled: false, sections: {} };
    SPOILER_SECTIONS.forEach(function (s) {
      spoilers.sections[s.key] = { enabled: false, text: '' };
    });
    return {
      version: STATE_VERSION,
      bio: { name: '', title: '', race: '', clan: '', age: '', occupation: '', birthplace: '', pronouns: '', summary: '' },
      appearance: { height: '', build: '', hair: '', eyes: '', notable: '', style: '', notes: '' },
      personality: traits,
      personalityNotes: '',
      hooks: [],
      fc: { name: '', tag: '', rank: '', homeworld: '', notes: '' },
      contact: { walkups: false, tells: false, mail: false, party: false, notes: '' },
      spoilers: spoilers
    };
  }

  function slug(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'ffxiv-character';
  }

  function buildStateFromForm(root) {
    var doc = root || document;
    var state = blankState();
    FIELD_MAP.forEach(function (m) {
      var el = doc.getElementById(m[2]);
      if (el) state[m[0]][m[1]] = el.value;
    });
    var notes = doc.getElementById('personality-notes');
    if (notes) state.personalityNotes = notes.value;
    TRAITS.forEach(function (t) {
      var el = doc.getElementById('trait-' + t.key);
      var n = el && el.value !== '' ? Number(el.value) : 50;
      state.personality[t.key] = Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 50;
    });
    CHECK_MAP.forEach(function (m) {
      var el = doc.getElementById(m[2]);
      if (el) state[m[0]][m[1]] = !!el.checked;
    });
    var list = doc.getElementById('hooks-list');
    if (list) {
      state.hooks = [];
      var items = list.querySelectorAll('textarea.hook-text');
      for (var i = 0; i < items.length; i++) {
        var v = String(items[i].value).trim();
        if (v) state.hooks.push(v);
      }
    }
    var master = doc.getElementById(SPOILER_IDS.enabled);
    state.spoilers.enabled = !!(master && master.checked);
    SPOILER_SECTIONS.forEach(function (s) {
      var on = doc.getElementById(SPOILER_IDS.sections[s.key]);
      var txt = doc.getElementById(SPOILER_IDS.text[s.key]);
      state.spoilers.sections[s.key] = {
        enabled: !!(on && on.checked),
        text: txt ? txt.value : ''
      };
    });
    return state;
  }

  function applyStateToForm(state, root) {
    var doc = root || document;
    var clean = mergeInto(blankState(), state || {});
    FIELD_MAP.forEach(function (m) {
      var el = doc.getElementById(m[2]);
      if (el) el.value = clean[m[0]][m[1]];
    });
    var notes = doc.getElementById('personality-notes');
    if (notes) notes.value = clean.personalityNotes;
    TRAITS.forEach(function (t) {
      var el = doc.getElementById('trait-' + t.key);
      if (el) {
        el.value = String(clean.personality[t.key]);
        var out = doc.getElementById('out-' + t.key);
        if (out) out.textContent = describeTrait(t.key, clean.personality[t.key]);
      }
    });
    CHECK_MAP.forEach(function (m) {
      var el = doc.getElementById(m[2]);
      if (el) el.checked = !!clean[m[0]][m[1]];
    });
    var list = doc.getElementById('hooks-list');
    if (list) {
      list.innerHTML = '';
      (clean.hooks || []).forEach(function (text) {
        addHookTo(list, String(text));
      });
    }
    var master = doc.getElementById(SPOILER_IDS.enabled);
    if (master) master.checked = !!clean.spoilers.enabled;
    SPOILER_SECTIONS.forEach(function (s) {
      var on = doc.getElementById(SPOILER_IDS.sections[s.key]);
      var txt = doc.getElementById(SPOILER_IDS.text[s.key]);
      var sec = clean.spoilers.sections[s.key] || { enabled: false, text: '' };
      if (on) on.checked = !!sec.enabled;
      if (txt) txt.value = sec.text || '';
    });
    return clean;
  }

  function describeTrait(key, value) {
    var trait = null;
    for (var i = 0; i < TRAITS.length; i++) {
      if (TRAITS[i].key === key) { trait = TRAITS[i]; break; }
    }
    if (!trait) return String(value);
    var lean;
    if (value === 50) lean = 'neutral';
    else if (value < 35) lean = 'leans ' + trait.low;
    else if (value < 50) lean = 'slightly ' + trait.low;
    else if (value <= 65) lean = 'slightly ' + trait.high;
    else lean = 'leans ' + trait.high;
    return value + ' – ' + lean;
  }

  function mergeInto(target, src) {
    if (!src || typeof src !== 'object') return target;
    for (var k in src) {
      if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
      if (k === 'spoilers' && src[k] && typeof src[k] === 'object') {
        target.spoilers.enabled = !!src[k].enabled;
        if (src[k].sections) {
          SPOILER_SECTIONS.forEach(function (s) {
            var inc = src[k].sections[s.key];
            if (inc && typeof inc === 'object') {
              target.spoilers.sections[s.key] = {
                enabled: !!inc.enabled,
                text: typeof inc.text === 'string' ? inc.text : ''
              };
            }
          });
        }
      } else if (k === 'personality' && src[k] && typeof src[k] === 'object') {
        TRAITS.forEach(function (t) {
          var v = Number(src[k][t.key]);
          if (Number.isFinite(v)) {
            target.personality[t.key] = Math.min(100, Math.max(0, Math.round(v)));
          }
        });
      } else if (k === 'hooks' && Array.isArray(src[k])) {
        target.hooks = src[k].map(function (h) { return typeof h === 'string' ? h : String(h); }).slice(0, 50);
      } else if (target[k] && typeof target[k] === 'object' && !Array.isArray(target[k]) && typeof src[k] === 'object') {
        mergeInto(target[k], src[k]);
      } else if (typeof src[k] === 'string' || typeof src[k] === 'boolean') {
        if (k in target && typeof target[k] !== 'object') target[k] = src[k];
      }
    }
    return target;
  }

  // Spoilers: excluded from exports unless master AND per-section opt-in.
  function filterSpoilers(state) {
    var out = { enabled: false, sections: {} };
    if (state && state.spoilers) {
      SPOILER_SECTIONS.forEach(function (s) {
        var src = (state.spoilers.sections || {})[s.key] || {};
        if (state.spoilers.enabled && src.enabled && typeof src.text === 'string' && src.text.trim()) {
          out.enabled = true;
          out.sections[s.key] = { enabled: true, text: src.text };
        }
      });
    }
    return out;
  }

  function cardToJSON(state) {
    var clean = mergeInto(blankState(), state || {});
    return {
      version: STATE_VERSION,
      tool: "Adventurer's Ledger (fan-made, not affiliated with Square Enix)",
      bio: clone(clean.bio),
      appearance: clone(clean.appearance),
      personality: clone(clean.personality),
      personalityNotes: clean.personalityNotes,
      hooks: clone(clean.hooks),
      fc: clone(clean.fc),
      contact: clone(clean.contact),
      spoilers: filterSpoilers(clean)
    };
  }

  function exportJSON(state) {
    return JSON.stringify(cardToJSON(state), null, 2);
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function importJSON(text) {
    var parsed = JSON.parse(String(text));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Import failed: JSON must be a character card object.');
    }
    return mergeInto(blankState(), parsed);
  }

  function downloadFilename(state) {
    var name = state && state.bio && state.bio.name ? slug(state.bio.name) : 'ffxiv-character';
    return name + '-card.json';
  }

  function status(msg) {
    var el = $('save-status');
    if (el) {
      el.textContent = msg;
      el.dataset.announce = String(Date.now());
    }
  }

  function save(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return mergeInto(blankState(), parsed);
    } catch (e) {
      return null;
    }
  }

  function addHookTo(list, text) {
    var wrap = document.createElement('div');
    wrap.className = 'hook-entry';
    var lab = document.createElement('label');
    lab.className = 'hook-label';
    lab.textContent = 'Hook ' + (list.children.length + 1);
    var ta = document.createElement('textarea');
    ta.className = 'hook-text';
    ta.rows = 2;
    ta.value = typeof text === 'string' ? text : '';
    ta.setAttribute('aria-label', 'Story hook text');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-quiet remove-hook';
    btn.textContent = 'Remove hook';
    lab.appendChild(ta);
    wrap.appendChild(lab);
    wrap.appendChild(btn);
    list.appendChild(wrap);
    return wrap;
  }

  function renderTemplateOptions(select) {
    if (!select || typeof window.FF_TEMPLATES === 'undefined') return;
    select.innerHTML = '';
    var ph = document.createElement('option');
    ph.value = '';
    ph.textContent = 'Choose a template…';
    select.appendChild(ph);
    window.FF_TEMPLATES.forEach(function (t) {
      var opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name + ' — ' + t.description;
      select.appendChild(opt);
    });
  }

  function init() {
    var root = document;

    var select = $('template-select');
    renderTemplateOptions(select);

    var saved = load();
    if (saved) applyStateToForm(saved, root);
    else applyStateToForm(blankState(), root);

    root.addEventListener('input', function (ev) {
      var state = buildStateFromForm(root);
      save(state);
      status('Saved in this browser. Nothing leaves your device.');
      var target = ev && ev.target;
      if (target && target.dataset && target.dataset.trait) {
        var out = $('out-' + target.dataset.trait);
        if (out) out.textContent = describeTrait(target.dataset.trait, Number(target.value));
      }
    });

    var addHook = $('btn-add-hook');
    if (addHook) {
      addHook.addEventListener('click', function () {
        var list = $('hooks-list');
        addHookTo(list, '');
        var last = list.querySelector('.hook-entry:last-of-type textarea');
        if (last) last.focus();
        save(buildStateFromForm(root));
        status('Hook added.');
      });
    }

    var hooksList = $('hooks-list');
    if (hooksList) {
      hooksList.addEventListener('click', function (ev) {
        var btn = ev.target && ev.target.closest ? ev.target.closest('.remove-hook') : null;
        if (!btn) return;
        var entry = btn.closest('.hook-entry');
        if (entry && entry.parentNode) entry.parentNode.removeChild(entry);
        renumberHooks(hooksList);
        save(buildStateFromForm(root));
        status('Hook removed.');
      });
    }

    function renumberHooks(list) {
      var labels = list.querySelectorAll('.hook-label');
      for (var i = 0; i < labels.length; i++) {
        labels[i].childNodes[0].nodeValue = 'Hook ' + (i + 1);
      }
    }

    var applyBtn = $('btn-apply-template');
    if (applyBtn) {
      applyBtn.addEventListener('click', function () {
        var id = select && select.value;
        var tpl = null;
        if (typeof window.FF_TEMPLATES !== 'undefined') {
          for (var i = 0; i < window.FF_TEMPLATES.length; i++) {
            if (window.FF_TEMPLATES[i].id === id) { tpl = window.FF_TEMPLATES[i]; break; }
          }
        }
        if (!tpl) { status('Pick a template first.'); return; }
        applyStateToForm(tpl.data, root);
        save(buildStateFromForm(root));
        status('Template "' + tpl.name + '" applied. It replaced the form contents.');
      });
    }

    var clearBtn = $('btn-clear-card');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        var ok = (typeof window.confirm === 'function')
          ? window.confirm('Clear the whole card? This cannot be undone.')
          : true;
        if (ok === false) return;
        applyStateToForm(blankState(), root);
        save(buildStateFromForm(root));
        status('Card cleared.');
      });
    }

    var showBtn = $('btn-show-json');
    var outTA = $('export-output');
    var details = $('export-details');
    if (showBtn && outTA) {
      showBtn.addEventListener('click', function () {
        var state = buildStateFromForm(root);
        if (!state.bio.name) status('Tip: add a name for a nicer export filename.');
        outTA.value = exportJSON(state);
        if (details) details.open = true;
        outTA.focus();
        status('JSON preview ready. Spoilers excluded unless you opted in per section.');
      });
    }

    var dlBtn = $('btn-download-json');
    if (dlBtn && outTA) {
      dlBtn.addEventListener('click', function () {
        var state = buildStateFromForm(root);
        var json = exportJSON(state);
        outTA.value = json;
        if (details) details.open = true;
        try {
          var blob = new Blob([json], { type: 'application/json' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = downloadFilename(state);
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
          status('Download started.');
        } catch (e) {
          status('Download failed — copy the JSON below instead.');
        }
      });
    }

    var copyBtn = $('btn-copy-json');
    if (copyBtn && outTA) {
      copyBtn.addEventListener('click', function () {
        var state = buildStateFromForm(root);
        var json = exportJSON(state);
        outTA.value = json;
        if (details) details.open = true;
        var done = function (ok) {
          status(ok ? 'JSON copied to your clipboard.' : 'Clipboard unavailable — select and copy the text below.');
        };
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          navigator.clipboard.writeText(json).then(function () { done(true); }, function () { done(false); });
        } else {
          done(false);
        }
      });
    }

    var importBtn = $('btn-import-json');
    var importTA = $('import-input');
    if (importBtn && importTA) {
      importBtn.addEventListener('click', function () {
        try {
          var state = importJSON(importTA.value);
          applyStateToForm(state, root);
          save(state);
          status('Card imported. Spoilers stay off unless this card explicitly opted in.');
        } catch (e) {
          status('Import failed: ' + (e && e.message ? e.message : 'could not parse that JSON.'));
        }
      });
    }

    var master = $('spoilers-enabled');
    var spoilerWrap = $('spoiler-sections');
    function refreshSpoilerVisibility() {
      if (!master || !spoilerWrap) return;
      spoilerWrap.hidden = !master.checked;
    }
    if (master) {
      master.addEventListener('change', function () {
        refreshSpoilerVisibility();
        save(buildStateFromForm(root));
        status(master.checked
          ? 'Spoiler sections opened. They export only with per-section opt-in.'
          : 'Spoiler sections hidden and excluded from exports.');
      });
    }
    refreshSpoilerVisibility();
  }

  function boot() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  var API = {
    STORAGE_KEY: STORAGE_KEY,
    STATE_VERSION: STATE_VERSION,
    TRAITS: TRAITS,
    SPOILER_SECTIONS: SPOILER_SECTIONS,
    blankState: blankState,
    buildStateFromForm: buildStateFromForm,
    applyStateToForm: applyStateToForm,
    filterSpoilers: filterSpoilers,
    cardToJSON: cardToJSON,
    exportJSON: exportJSON,
    importJSON: importJSON,
    downloadFilename: downloadFilename,
    describeTrait: describeTrait,
    mergeInto: mergeInto,
    save: save,
    load: load,
    slug: slug,
    init: init
  };

  if (typeof window !== 'undefined') {
    window.App = API;
    boot();
  }
})();
