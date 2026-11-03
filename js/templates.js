/* Adventurer's Ledger — FFXIV roleplay profile builder
   Bundled card templates. All character names and flavor text are
   fictional inventions for this fan tool — not existing game NPCs.
   Template data is spoiler-free by design; no template ever
   pre-fills a spoiler field or enables a spoiler toggle.
   Copyright (c) 2026 Asdale Dynamics, LLC — MIT licensed. */
(function () {
  'use strict';

  var TRAITS = ['warmth', 'confidence', 'temper', 'honesty', 'humor', 'discipline', 'sociability', 'faith'];

  function traits(opts) {
    var t = {};
    for (var i = 0; i < TRAITS.length; i++) {
      t[TRAITS[i]] = 50;
    }
    if (opts) {
      for (var k in opts) {
        t[k] = opts[k];
      }
    }
    return t;
  }

  var SPOILER_SECTIONS = ['backstory', 'revealed', 'future', 'sensitive'];

  // Every template gets the full spoiler "off" skeleton.
  function spoilerSkeleton() {
    var sections = {};
    for (var i = 0; i < SPOILER_SECTIONS.length; i++) {
      sections[SPOILER_SECTIONS[i]] = { enabled: false, text: '' };
    }
    return { enabled: false, sections: sections };
  }

  function build(id, name, description, data) {
    var base = {
      version: 1,
      bio: { name: '', title: '', race: '', clan: '', age: '', occupation: '', birthplace: '', pronouns: '', summary: '' },
      appearance: { height: '', build: '', hair: '', eyes: '', notable: '', style: '', notes: '' },
      personality: traits(null),
      personalityNotes: '',
      hooks: [],
      fc: { name: '', tag: '', rank: '', homeworld: '', notes: '' },
      contact: { walkups: false, tells: false, mail: false, party: false, notes: '' },
      spoilers: spoilerSkeleton()
    };
    if (data && data.personality) {
      var merged = base.personality;
      for (var k in data.personality) merged[k] = data.personality[k];
      delete data.personality;
    }
    if (data && data.spoilers) { delete data.spoilers; } // templates are spoiler-proof
    mergeShallow(base, data);
    return { id: id, name: name, description: description, data: base };
  }

  function mergeShallow(target, src) {
    if (!src) return target;
    for (var k in src) {
      if (k === 'bio' || k === 'appearance' || k === 'fc' || k === 'contact') {
        mergeShallow(target[k], src[k]);
      } else {
        target[k] = src[k];
      }
    }
    return target;
  }

  window.FF_TEMPLATES = [
    build('blank', 'Blank Card', 'A clean starting point — everything neutral, no spoilers.',
      {}),

    build('wanderer', 'Wandering Adventurer', 'A friendly, coin-tossed traveler happy to meet anyone.',
      {
        bio: {
          title: 'The Lantern of La Noscea',
          race: 'Hyur', clan: 'Midlander', age: '27',
          occupation: 'Wandering adventurer',
          birthplace: 'a fishing village near Limsa Lominsa',
          pronouns: 'she/her',
          summary: 'Rowena walks from camp to camp fixing roofs, hauling crates, and swapping stories for supper. She asks few questions and remembers every answer.'
        },
        appearance: {
          height: '5 fulms, 8 ilms', build: 'wire-strong', hair: 'sun-faded copper braid',
          eyes: 'grey-green', notable: 'freckled nose, salt-scarred hands', style: 'patched travelling coat, ledger slung over one shoulder'
        },
        personality: traits({ warmth: 78, confidence: 62, temper: 30, honesty: 70, humor: 66, sociability: 72 }),
        hooks: [
          'Will trade honest work for a hot meal and one good story',
          'Is quietly mapping every ferry schedule on the coast — why?'
        ],
        contact: { walkups: true, tells: true, mail: true, party: false, notes: "IC walk-ups always welcome; a tell first is kind but not required." }
      }),

    build('sellsword', 'Sellsword with a Code', 'A guarded blade-for-hire who does not break contracts.',
      {
        bio: {
          name: 'Brandt Ironlatch',
          race: 'Roegadyn', clan: 'Hellsguard', age: '34',
          occupation: 'Sellsword',
          birthplace: 'the mountains above Ala Mhigo',
          pronouns: 'he/him',
          summary: 'Brandt takes the work others decline and finishes it, provided the terms hold. He says little, but his ledger of favors is long and current.'
        },
        appearance: {
          height: 'well over 6 fulms', build: 'granite', hair: 'black, shaved at the sides',
          eyes: 'dark brown', notable: 'knuckle tattoos fading with age', style: 'battered mail over a plain gambeson'
        },
        personality: traits({ warmth: 28, confidence: 85, temper: 45, honesty: 88, humor: 12, discipline: 90, sociability: 22 }),
        hooks: [
          'Will not take coin from anyone under fifteen summers — no exceptions',
          'Owes one unnamed favor to a scribe who once cleared his name'
        ],
        contact: { walkups: true, tells: false, mail: true, party: false, notes: 'Approach IC first. Big jobs: discuss out of character beforehand.' }
      }),

    build('chirurgeon', 'Kindly Chirurgeon', 'A studious field-medic archetype whose advice stays in-character.',
      {
        bio: {
          name: 'Greylan Moss',
          race: 'Elezen', clan: 'Wildwood', age: '41',
          occupation: 'Field chirurgeon (in-character healer)',
          birthplace: 'a quiet town in the Black Shroud',
          pronouns: 'they/them',
          summary: 'Greylan patches hunters and adventurers with gravel-checked calm, then lectures everyone about wearing boots. Out of character, their player never gives real-world medical or health advice — an in-character herb is an herb, nothing more.'
        },
        personality: traits({ warmth: 70, confidence: 55, temper: 18, honesty: 76, humor: 40, discipline: 74, sociability: 48, faith: 62 }),
        hooks: [
          'Fills a small notebook with tuition debts owed and forgiven',
          'Is assembling a plain-language pamphlet on setting bones — needs someone to test-read it'
        ],
        contact: { walkups: true, tells: true, mail: false, party: true, notes: 'Walk-ups welcome. Nothing said in character is medical, financial, or life advice out of character.' }
      }),

    build('arcanist', 'Studious Arcanist', 'A meticulous scholar who over-explains everything.',
      {
        bio: {
          name: 'Sistel Quietly',
          race: 'Lalafell', clan: 'Plainsfolk',
          occupation: 'Arcanist and self-published essayist',
          birthplace: 'thanalan border country',
          pronouns: 'she/her',
          summary: 'Sistel files reports on her own experiments, footnotes included. She is delighted to be asked, and will absolutely hand you a reading list.'
        },
        personality: traits({ warmth: 58, confidence: 44, temper: 22, honesty: 90, humor: 34, discipline: 84, sociability: 30 }),
        hooks: [
          'Wants a witness for a book-recommendation experiment, seven days minimum',
          'Seeks a partner in crime for a perfectly legal library venture (mostly legal)'
        ],
        contact: { walkups: false, tells: true, mail: true, party: false, notes: 'Tell first — she freezes if startled. Loves gridania library events.' }
      })
  ];

  if (typeof window !== 'undefined' && !window.FF_TEMPLATE_INFO) {
    window.FF_TEMPLATE_INFO = {
      ids: window.FF_TEMPLATES.map(function (t) { return t.id; })
    };
  }
})();
