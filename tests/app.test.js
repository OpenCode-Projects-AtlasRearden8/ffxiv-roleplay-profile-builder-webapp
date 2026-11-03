/* Adventurer's Ledger — DOM-based tests (happy-dom + node:test).
   Each test boots the real index.html document, runs the real
   templates.js and app.js scripts against it, then drives the DOM
   like a user would: typing, clicking, toggling, importing.
   Copyright (c) 2026 Asdale Dynamics, LLC — MIT licensed. */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Window } = require('happy-dom');

const ROOT = path.join(__dirname, '..');
const HTML_RAW = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const TEMPLATES_SRC = readFileSync(path.join(ROOT, 'js', 'templates.js'), 'utf8');
const APP_SRC = readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');

const HTML_NO_SCRIPTS = HTML_RAW
  .replace(/<script[^>]*><\/script>\s*/g, '')
  .replace(/<script[^>]*>[\s\S]*?<\/script>\s*/g, '');

function setGlobal(key, value) {
  try {
    Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
  } catch (e) {
    try { globalThis[key] = value; } catch (e2) { /* keep host global */ }
  }
}

function bootApp(opts) {
  const o = opts || {};
  const window = new Window({ url: 'about:blank' });
  window.document.write(HTML_NO_SCRIPTS);
  window.document.close();

  setGlobal('window', window);
  setGlobal('document', window.document);
  setGlobal('localStorage', window.localStorage);
  setGlobal('navigator', window.navigator);

  if (o.seedState) {
    window.localStorage.setItem('ffxiv-adventurers-ledger-v1', JSON.stringify(o.seedState));
  }

  vm.runInThisContext(TEMPLATES_SRC, { filename: 'js/templates.js' });
  vm.runInThisContext(APP_SRC, { filename: 'js/app.js' });

  return { window, document: window.document, App: window.App, localStorage: window.localStorage };
}

function fire(el, type) {
  el.dispatchEvent(new globalThis.window.Event(type, { bubbles: true, cancelable: true }));
}

function click(el) {
  el.dispatchEvent(new globalThis.window.MouseEvent('click', { bubbles: true, cancelable: true }));
}

function stateWith(overrides) {
  const App = globalThis.window.App;
  const s = App.blankState();
  return App.mergeInto(s, overrides || {});
}

test('index.html wires the real scripts (they are run by the test harness)', () => {
  assert.match(HTML_RAW, /<script src="js\/templates\.js"><\/script>/);
  assert.match(HTML_RAW, /<script src="js\/app\.js"><\/script>/);
  assert.match(HTML_NO_SCRIPTS, /id="save-status"/);
  assert.doesNotMatch(HTML_NO_SCRIPTS, /<script/);
});

test('app boots against the real index.html and exposes its API', () => {
  const { window, App } = bootApp();
  assert.ok(App, 'window.App should be defined');
  for (const fn of ['buildStateFromForm', 'applyStateToForm', 'exportJSON', 'importJSON', 'blankState']) {
    assert.equal(typeof App[fn], 'function', 'App.' + fn + ' should exist');
  }
  const select = window.document.getElementById('template-select');
  assert.ok(select.options.length >= 5, 'template select should list all bundled templates');
});

test('every bundled template is spoiler-proof (nothing spoiler-ish pre-enabled)', () => {
  const { window, App } = bootApp();
  const templates = window.FF_TEMPLATES;
  assert.ok(Array.isArray(templates) && templates.length >= 4);
  const ids = new Set(templates.map((t) => t.id));
  assert.equal(ids.size, templates.length, 'template ids must be unique');
  for (const tpl of templates) {
    const d = tpl.data;
    assert.equal(d.version, App.STATE_VERSION, tpl.id + ' missing version');
    assert.equal(d.spoilers.enabled, false, tpl.id + ' master spoiler toggle must be off');
    for (const key of Object.keys(d.spoilers.sections)) {
      const sec = d.spoilers.sections[key];
      assert.equal(sec.enabled, false, tpl.id + '/' + key + ' spoiler opt-in must be off');
      assert.equal(sec.text, '', tpl.id + '/' + key + ' must not ship spoiler text');
    }
    for (const traitKey of Object.keys(d.personality)) {
      const v = d.personality[traitKey];
      assert.ok(v >= 0 && v <= 100, tpl.id + ' trait ' + traitKey + ' out of range');
    }
    assert.ok(Array.isArray(d.hooks), tpl.id + ' hooks must be an array');
  }
});

test('fresh form starts blank, neutral, and absolutely spoiler-off', () => {
  const { window, App } = bootApp();
  const d = window.document;
  App.applyStateToForm(App.blankState(), d);
  assert.equal(d.getElementById('bio-name').value, '');
  assert.equal(d.getElementById('trait-warmth').value, '50');
  assert.equal(d.getElementById('trait-faith').value, '50');
  assert.equal(d.getElementById('hooks-list').children.length, 0);
  assert.equal(d.getElementById('spoilers-enabled').checked, false);
  assert.equal(d.getElementById('spoiler-sections').hidden, true, 'spoiler block hidden by default');
  assert.equal(d.getElementById('spoiler-sensitive').value, '');
});

test('buildStateFromForm reads every kind of field', () => {
  const { window, App } = bootApp();
  const d = window.document;
  d.getElementById('bio-name').value = 'Test Sable';
  d.getElementById('bio-summary').value = 'A brief intro.';
  d.getElementById('trait-honesty').value = '88';
  d.getElementById('contact-walkups').checked = true;
  click(d.getElementById('btn-add-hook'));
  d.querySelector('.hook-text').value = 'Testing hook 1';
  const state = App.buildStateFromForm(d);
  assert.equal(state.bio.name, 'Test Sable');
  assert.equal(state.bio.summary, 'A brief intro.');
  assert.equal(state.personality.honesty, 88);
  assert.equal(state.personality.warmth, 50, 'untouched slider stays neutral');
  assert.deepEqual(state.hooks, ['Testing hook 1']);
  assert.equal(state.contact.walkups, true);
  assert.equal(state.contact.tells, false);
  assert.equal(state.spoilers.enabled, false);
});

test('apply/build round-trip preserves the full card', () => {
  const { window, App } = bootApp();
  const d = window.document;
  const original = stateWith({
    bio: { name: 'Round Trip', race: 'Miqote', summary: 'multi\nline' },
    appearance: { hair: 'white', notes: 'glowy eyes' },
    personality: { warmth: 12, temper: 97, faith: 3 },
    personalityNotes: 'quirky',
    hooks: ['hook one', 'hook two'],
    fc: { name: 'Test FC', tag: 'TFC', rank: 'Captain', homeworld: 'somewhere', notes: 'hi' },
    contact: { walkups: true, tells: true, mail: false, party: true, notes: 'be nice' },
    spoilers: {
      enabled: true,
      sections: { backstory: { enabled: true, text: 'secret!' } }
    }
  });
  const fitted = App.applyStateToForm(original, d);
  const rebuilt = App.buildStateFromForm(d);
  assert.deepEqual(rebuilt, fitted);
});

test('mergeInto clamps trait values into 0..100', () => {
  const { window, App } = bootApp();
  const merged = App.mergeInto(App.blankState(), { personality: { warmth: 900, humor: -12, temper: 60.4 } });
  assert.equal(merged.personality.warmth, 100);
  assert.equal(merged.personality.humor, 0);
  assert.equal(merged.personality.temper, 60);
});

test('export JSON is parseable, disclaims affiliation, and hides spoilers by default', () => {
  const { window, App } = bootApp();
  const d = window.document;
  const s = App.blankState();
  s.bio.name = 'Export Test';
  App.applyStateToForm(s, d);
  d.getElementById('spoiler-backstory').value = 'TOP SECRET STORY';
  d.getElementById('spoiler-backstory-enabled').checked = true;
  const json = App.exportJSON(App.buildStateFromForm(d));
  assert.ok(!json.includes('TOP SECRET STORY'), 'section opt-in alone must not leak spoilers');
  assert.ok(json.includes('not affiliated with Square Enix'));
  const parsed = JSON.parse(json);
  assert.equal(parsed.version, 1);
  assert.equal(parsed.spoilers.enabled, false);
  assert.deepEqual(parsed.hooks, []);
});

test('spoilers export ONLY with master toggle ON plus per-section opt-in', () => {
  const { window, App } = bootApp();
  const d = window.document;
  App.applyStateToForm(stateWith({
    bio: { name: 'S' },
    spoilers: {
      enabled: true,
      sections: {
        backstory: { enabled: true, text: 'the secret' },
        future: { enabled: false, text: 'the unchosen plan' }
      }
    }
  }), d);
  const parsed = JSON.parse(App.exportJSON(App.buildStateFromForm(d)));
  assert.equal(parsed.spoilers.enabled, true);
  assert.equal(parsed.spoilers.sections.backstory.text, 'the secret');
  assert.equal(parsed.spoilers.sections.future, undefined, 'unopted section excluded');
});

test('master toggle OFF hides spoiler section from exports even with text present', () => {
  const { window, App } = bootApp();
  const d = window.document;
  App.applyStateToForm(stateWith({
    bio: { name: 'X' },
    spoilers: {
      enabled: false,
      sections: { sensitive: { enabled: true, text: 'boundaries note' } }
    }
  }), d);
  const parsed = JSON.parse(App.exportJSON(App.buildStateFromForm(d)));
  assert.equal(parsed.spoilers.enabled, false);
  assert.deepEqual(Object.keys(parsed.spoilers.sections), []);
});

test('master toggle flings the spoiler editor open and shut', () => {
  const { window, App } = bootApp();
  const d = window.document;
  const master = d.getElementById('spoilers-enabled');
  const wrap = d.getElementById('spoiler-sections');
  assert.equal(wrap.hidden, true);
  master.checked = true;
  fire(master, 'change');
  assert.equal(wrap.hidden, false);
  master.checked = false;
  fire(master, 'change');
  assert.equal(wrap.hidden, true);
  assert.match(d.getElementById('save-status').textContent, /excluded/);
});

test('typing autosaves to localStorage and a re-boot restores the card', () => {
  const { window, App, localStorage } = bootApp();
  const d = window.document;
  d.getElementById('bio-name').value = 'Autosaved Agnes';
  fire(d.getElementById('bio-name'), 'input');
  const raw = localStorage.getItem(App.STORAGE_KEY);
  assert.ok(raw, 'autosave should write to localStorage');
  assert.equal(JSON.parse(raw).bio.name, 'Autosaved Agnes');

  const again = bootApp({ seedState: JSON.parse(raw) });
  assert.equal(again.document.getElementById('bio-name').value, 'Autosaved Agnes');
});

test('story hooks: add, type, remove, auto-renumber', () => {
  const { window, App } = bootApp();
  const d = window.document;
  const add = d.getElementById('btn-add-hook');
  click(add); click(add);
  const tas = d.querySelectorAll('.hook-text');
  assert.equal(tas.length, 2, 'two hook entries after two clicks');
  tas[0].value = 'first';
  tas[1].value = 'second';
  const labels = d.querySelectorAll('.hook-label');
  assert.equal(labels[0].textContent, 'Hook 1');
  assert.equal(labels[1].textContent, 'Hook 2');
  click(d.querySelector('.hook-entry .remove-hook'));
  const after = d.querySelectorAll('.hook-text');
  assert.equal(after.length, 1);
  assert.equal(after[0].value, 'second');
  assert.equal(d.querySelector('.hook-label').textContent, 'Hook 1', 'labels renumber');
  fire(after[0], 'input');
  assert.deepEqual(App.buildStateFromForm(d).hooks, ['second']);
});

test('empty hooks collapse to [] on export', () => {
  const { window, App } = bootApp();
  const d = window.document;
  click(d.getElementById('btn-add-hook'));
  d.querySelector('.hook-text').value = '   ';
  const parsed = JSON.parse(App.exportJSON(App.buildStateFromForm(d)));
  assert.deepEqual(parsed.hooks, []);
});

test('applying the Sellsword template fills bio, sliders, hooks; spoilers stay off', () => {
  const { window, App } = bootApp();
  const d = window.document;
  const select = d.getElementById('template-select');
  select.value = 'sellsword';
  click(d.getElementById('btn-apply-template'));
  assert.equal(d.getElementById('bio-name').value, 'Brandt Ironlatch');
  assert.equal(d.getElementById('trait-honesty').value, '88');
  assert.equal(d.getElementById('trait-warmth').value, '28');
  assert.equal(d.getElementById('hooks-list').querySelectorAll('.hook-text').length, 2);
  assert.equal(d.getElementById('spoilers-enabled').checked, false);
  const ls = JSON.parse(window.localStorage.getItem(App.STORAGE_KEY));
  assert.equal(ls.bio.name, 'Brandt Ironlatch');

  select.value = 'blank';
  click(d.getElementById('btn-apply-template'));
  assert.equal(d.getElementById('bio-name').value, '');
  assert.equal(d.getElementById('hooks-list').children.length, 0, 'blank template resets hooks');
});

test('status region reports template pick problems instead of failing', () => {
  const { window, App } = bootApp();
  const d = window.document;
  click(d.getElementById('btn-apply-template'));
  assert.match(d.getElementById('save-status').textContent, /Pick a template/i);
  select();
  function select() {
    d.getElementById('template-select').value = 'sellsword';
  }
  click(d.getElementById('btn-apply-template'));
  assert.match(d.getElementById('save-status').textContent, /Sellsword/);
});

test('moving a slider updates its readable output', () => {
  const { window, App } = bootApp();
  const d = window.document;
  const slider = d.getElementById('trait-temper');
  slider.value = '90';
  fire(slider, 'input');
  const out = d.getElementById('out-temper');
  assert.match(out.textContent, /90/);
  assert.match(out.textContent, /Fiery/);
  slider.value = '10';
  fire(slider, 'input');
  assert.match(d.getElementById('out-temper').textContent, /10/);
  assert.match(d.getElementById('out-temper').textContent, /Mellow/);
  assert.equal(App.describeTrait('warmth', 50), '50 – neutral');
});

test('import applies valid JSON and reports parse failures politely', () => {
  const { window, App } = bootApp();
  const d = window.document;
  const good = App.exportJSON(stateWith({ bio: { name: 'Imported Ivy' }, hooks: ['hook A'] }));
  d.getElementById('import-input').value = good;
  click(d.getElementById('btn-import-json'));
  assert.equal(d.getElementById('bio-name').value, 'Imported Ivy');
  assert.deepEqual(App.buildStateFromForm(d).hooks, ['hook A']);
  assert.equal(d.getElementById('spoilers-enabled').checked, false, 'import never silently enables spoilers');

  d.getElementById('import-input').value = 'not json at all {';
  click(d.getElementById('btn-import-json'));
  assert.match(d.getElementById('save-status').textContent, /Import failed/);

  d.getElementById('import-input').value = '["array"]';
  click(d.getElementById('btn-import-json'));
  assert.match(d.getElementById('save-status').textContent, /Import failed/);
});

test('imported card carries explicit spoiler opt-in only when flagged', () => {
  const { window, App } = bootApp();
  const d = window.document;
  const exported = App.exportJSON(stateWith({
    bio: { name: 'Explicit' },
    spoilers: { enabled: true, sections: { revealed: { enabled: true, text: 'she is void-touch' } } }
  }));
  d.getElementById('import-input').value = exported;
  click(d.getElementById('btn-import-json'));
  assert.equal(d.getElementById('spoilers-enabled').checked, true);
  assert.equal(d.getElementById('spoiler-revealed').value, 'she is void-touch');
  const reOut = JSON.parse(App.exportJSON(App.buildStateFromForm(d)));
  assert.equal(reOut.spoilers.enabled, true);
  assert.equal(reOut.spoilers.sections.revealed.enabled, true);
});

test('export filename is a clean slug of character name', () => {
  const { window, App } = bootApp();
  assert.equal(App.downloadFilename(stateWith({ bio: { name: 'Feo Ul!! (Great)' } })), 'feo-ul-great-card.json');
  assert.equal(App.downloadFilename(App.blankState()), 'ffxiv-character-card.json');
});

test('clear card resets the form and saved state', () => {
  const { window, App } = bootApp();
  const d = window.document;
  d.getElementById('bio-name').value = 'To Be Cleared';
  fire(d.getElementById('bio-name'), 'input');
  click(d.getElementById('btn-clear-card'));
  assert.equal(d.getElementById('bio-name').value, '');
  const ls = window.localStorage.getItem(App.STORAGE_KEY);
  assert.equal(JSON.parse(ls).bio.name, '');
});

test('preview JSON shows export in the textarea and opens the panel', () => {
  const { window, App } = bootApp();
  const d = window.document;
  d.getElementById('bio-name').value = 'Preview Pete';
  fire(d.getElementById('bio-name'), 'input');
  click(d.getElementById('btn-show-json'));
  const out = d.getElementById('export-output');
  assert.ok(out.value.includes('"bio"'), 'JSON preview should show the card');
  assert.ok(out.value.includes('Preview Pete'));
  assert.equal(d.getElementById('export-details').open, true);
});

test('download renders JSON into textarea with a name-based filename', () => {
  const { window, App } = bootApp();
  const d = window.document;
  d.getElementById('bio-name').value = 'Download Dora';
  click(d.getElementById('btn-download-json'));
  assert.ok(d.getElementById('export-output').value.includes('Download Dora'));
  assert.equal(App.downloadFilename(App.buildStateFromForm(d)), 'download-dora-card.json');
});

test('copy JSON fills the preview textarea even without clipboard support', () => {
  const { window, App } = bootApp();
  const d = window.document;
  d.getElementById('bio-name').value = 'Copy Cat';
  click(d.getElementById('btn-copy-json'));
  assert.ok(d.getElementById('export-output').value.includes('Copy Cat'));
});

test('a11y: single h1, skip link, main landmark, live status region', () => {
  const { window } = bootApp();
  const d = window.document;
  assert.equal(d.querySelectorAll('h1').length, 1);
  const skip = d.querySelector('a.skip-link');
  assert.ok(skip && skip.getAttribute('href') === '#main');
  assert.ok(d.getElementById('main'));
  const status = d.getElementById('save-status');
  assert.equal(status.getAttribute('aria-live'), 'polite');
  assert.equal(status.getAttribute('role'), 'status');
});

test('a11y: every text control has a programmatic label', () => {
  const { window } = bootApp();
  const d = window.document;
  click(d.getElementById('btn-add-hook'));
  const controls = d.querySelectorAll('input[type="text"], input[type="range"], textarea, select');
  assert.ok(controls.length > 30);
  const unlabeled = [];
  controls.forEach((c) => {
    const id = c.getAttribute('id') || '';
    const byFor = id && d.querySelector('label[for="' + id + '"]');
    const aria = (c.getAttribute('aria-label') || '').trim();
    const labeled = byFor || aria || (c.closest && c.closest('label'));
    if (!labeled) unlabeled.push(id || c.name || c.className);
  });
  assert.deepEqual(unlabeled, [], 'every control must be labeled');
});

test('a11y: every checkbox is paired with a label', () => {
  const { window } = bootApp();
  const d = window.document;
  const boxes = d.querySelectorAll('input[type="checkbox"]');
  assert.ok(boxes.length >= 9);
  boxes.forEach((b) => {
    const id = b.getAttribute('id');
    const labeled = d.querySelector('label[for="' + id + '"]') || b.closest('label');
    assert.ok(labeled, 'checkbox ' + id + ' must have a label');
  });
});

test('chirurgeon template frames healing as in-character with a real-advice disclaimer', () => {
  const { window, App } = bootApp();
  const d = window.document;
  d.getElementById('template-select').value = 'chirurgeon';
  click(d.getElementById('btn-apply-template'));
  const card = App.exportJSON(App.buildStateFromForm(d));
  assert.match(card, /never gives real-world medical or health advice/);
});

test('state strings never contain secret-shaped fields or stray URLs', () => {
  const { window, App } = bootApp();
  const d = window.document;
  d.getElementById('bio-name').value = 'Secret Scanner';
  click(d.getElementById('btn-add-hook'));
  const json = App.exportJSON(App.buildStateFromForm(d));
  assert.ok(!/(api[_-]?key|token|password|bearer)\s*[:"=]/i.test(json), 'no secret-shaped fields');
  assert.ok(!/https?:\/\//.test(json), 'exports stay URL-free');
});

test('no network is touched while interacting; localStorage is the only store', () => {
  const { window, App } = bootApp();
  const d = window.document;
  let networkTouched = false;
  const origFetch = window.fetch;
  window.fetch = function () { networkTouched = true; return Promise.reject(new Error('offline')); };
  d.getElementById('bio-name').value = 'Local Only';
  fire(d.getElementById('bio-name'), 'input');
  click(d.getElementById('btn-show-json'));
  click(d.getElementById('btn-download-json'));
  click(d.getElementById('btn-copy-json'));
  assert.equal(networkTouched, false);
  window.fetch = origFetch;
  assert.equal(JSON.parse(window.localStorage.getItem(App.STORAGE_KEY)).bio.name, 'Local Only');
});
