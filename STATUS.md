# STATUS.md — Adventurer's Ledger

FFXIV roleplay profile builder — static, offline, local-storage-only.
Maintained by Asdale Dynamics, LLC. Last verified: 2026-11-03.

## What was built

- `index.html` — single-page app: bio, appearance, 8 personality sliders
  (with readable plain-English output values), story hooks (add/remove), free-company info,
  contact-preference checkboxes, spoiler section (hidden by default),
  fan-content notices, footer.
- `js/templates.js` — 5 bundled spoiler-proof starter cards (Blank, Wandering
  Adventurer, Sellsword with a Code, Kindly Chirurgeon, Studious Arcanist).
- `js/app.js` — state model, autosave to localStorage, template application,
  JSON preview/copy/download/import, spoiler gating (master + per-section
  opt-in), status announcements.
- `css/styles.css` — warm cream/terracotta single-page UI, WCAG AA contrast,
  focus-visible, reduced-motion support.
- `tests/app.test.js` — 30 DOM-based tests (happy-dom boots the real
  `index.html` and drives it like a user).
- `README.md`, `LICENSE` (MIT, `Copyright (c) 2026 Asdale Dynamics, LLC`).

## How to run

Open `index.html` directly in any browser (works from `file://`), or serve:
`npx serve .` / `python3 -m http.server`. No build step, no dependencies at
runtime, no login, no network calls.

## How to test

```bash
npm install   # dev-only dependency: happy-dom
npm test      # node --test tests/ → 30/30 pass
```

## Verification results (2026-11-03)

- `npm test`: **30 pass, 0 fail** (node v20.19.2). Covers templates
  (spoiler-proof, unique ids, trait ranges), full state round-trip, spoiler
  export gating (master off → excluded; master on + per-section on → included;
  unopted/empty → excluded), localStorage autosave + reboot restore, hook
  add/remove/renumber, template apply/blank-reset, import success/failure, a11y
  structural checks (single h1, skip link, landmarks, live-status region,
  every control labeled), no-network assertion, no secret-shaped fields.
- `node --check` passes on all JS.
- `index.html` tag-balance parse: clean.
- Secret/credentials scan over shipped files: only benign feature names
  ("backstory secrets"). No API keys, tokens, or personal data anywhere.
- Exact LICENSE copyright line present; README credits Asdale Dynamics, LLC.

## Known gaps / notes

- Character portraits/photo handling not included (kept data URL-free on
  purpose); a future version could support optional local data-URI images.
- Export adapters for other RP platforms (discussed in README as an idea) are
  not implemented — plain JSON only.
- No print stylesheet yet.
- Contrast values were hand-checked against WCAG 1.4.3 math but not
  screenshot-verified in every browser theme.
- The "no network" test stubs `fetch`; it cannot catch exotic settings-page
  behavior in real browsers (e.g., a browser preloading `npx serve` would only
  stem from the user's own choice to serve, not the app).
