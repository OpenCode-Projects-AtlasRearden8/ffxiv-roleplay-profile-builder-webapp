# Adventurer's Ledger — FFXIV Roleplay Profile Builder

A static, fully offline single-page web app for building **Final Fantasy XIV
roleplay character cards**: fill in the bio, appearance, personality sliders,
story hooks, free-company info, and contact preferences — then export a clean
JSON card to share.

Built and maintained by **Asdale Dynamics, LLC** (MIT licensed).

## Why it exists

- **Local-first.** Everything lives in your browser's localStorage. No login,
  no account, no analytics, no network calls — it even works from a USB stick
  or with Wi-Fi off.
- **Spoilers off by default.** Spoiler sections are hidden and *excluded from
  exports* unless you opt in — master toggle first, then per-section toggles.
- **Accessible.** WCAG AA targets: real labels, visible focus, landmarks, a
  polite live region for save status, and reduced-motion support.
- **Warm, friendly UI.** One page, serif headings, terracotta-and-cream.
  Beginner-friendly on purpose — like a friend explaining it.

## Running it

No build step. Either:

1. **Double-click `index.html`** — plain scripts, works from `file://`, or
2. Serve the folder if you prefer: `npx serve .` or `python3 -m http.server`.

Open it, start from a template (Blank Card, Wandering Adventurer, Sellsword
with a Code, Kindly Chirurgeon, Studious Arcanist), and type. The card
autosaves as you type.

## Features

| Feature | Details |
|---|---|
| Bio | Name, epithet, race, clan, age, occupation, birthplace, pronouns, brief bio |
| Appearance | Height, build, hair, eyes, notable features, common dress, notes |
| Personality sliders | Warmth, confidence, temper, honesty, humor, discipline, sociability, faith — with readable plain-English output values |
| Story hooks | Add / remove / auto-renumber; empty hooks collapse out of exports |
| Free company | Name, tag, rank, homeworld/data-center note, links |
| Contact preferences | Walk-ups, tells, in-game mail, surprise parties, plus free-text notes |
| Spoiler opt-in | Master toggle + per-section opt-ins (backstory secrets, revealed-in-RP facts, future plans, sensitive topics). Off by default; excluded from JSON until enabled |
| Templates | Five bundled starter cards; applying one replaces the form (spoiler-proof — templates never ship spoiler data) |
| JSON export | Preview, copy to clipboard, or download a `.json` file named after the character |
| JSON import | Paste any previously exported card and restore it |
| Autosave | Every edit writes to localStorage; reopening the page restores your card |

## The exported JSON (short version)

```json
{
  "version": 1,
  "tool": "Adventurer's Ledger (fan-made, not affiliated with Square Enix)",
  "bio": { "name": "…", "pronouns": "…", "summary": "…" },
  "appearance": { "hair": "…", "eyes": "…" },
  "personality": { "warmth": 50 },
  "hooks": [ "…" ],
  "fc": { "name": "…", "tag": "…", "rank": "…" },
  "contact": { "walkups": true, "tells": false },
  "spoilers": { "enabled": false, "sections": {} }
}
```

Spoiler section content only appears when the card's master toggle **and**
that section's opt-in are both on. There are no URLs, keys, or tokens
anywhere in the data model.

## Tests

DOM-based tests run the real `index.html` in a virtual browser
([happy-dom](https://github.com/capricorn86/happy-dom)) and drive it like a
user: typing, clicking, toggling, importing — 30 tests cover templates,
autosave, round-tripping, spoiler gating, hooks, import/export, a11y
contraption checks, and a no-network assertion.

```bash
npm install
npm test
```

Requires Node 18+ to run tests. The app itself needs nothing but a browser.

## Accessibility notes

- Single `<h1>`, logical heading order, `nav`-free single page, skip link to
  the `#main` landmark.
- Every input has a programmatic label (the test suite asserts this).
- Status messages announced via `role="status"` / `aria-live="polite"`.
- Focus-visible outlines are always visible; `prefers-reduced-motion` honored.
- Contrast: body text ≥ 10:1, links ≥ 6:1, primary buttons ≈ 5.7:1 — all meet
  WCAG AA.

## Fan content notice

Adventurer's Ledger is an unofficial fan tool made for the FFXIV roleplay
community. It is not affiliated with, endorsed by, sponsored by, or approved
by Square Enix. FINAL FANTASY and FINAL FANTASY XIV are trademarks or
registered trademarks of Square Enix Holdings Co., Ltd. Please review Square
Enix's Fan Content Policy and Material Usage Guidelines before sharing fan
works. Character names and flavor text in the bundled templates are fictional
inventions made up for this tool, not game characters. The app gives no
advice of any kind — for education and fun only.

## Privacy

All data stays in your browser's localStorage under the key
`ffxiv-adventurers-ledger-v1`. Nothing is transmitted. The only network
request a browser might make from this page is the footer link to the official
site, which is an ordinary hyperlink. Clearing the card (or your site data)
removes everything.

## License

MIT — see `LICENSE`. Copyright (c) 2026 Asdale Dynamics, LLC.
