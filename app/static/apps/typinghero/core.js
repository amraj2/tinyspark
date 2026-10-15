/* Typing Hero core: keyboard facts, chart generation, judging and stats.
 * Pure logic (no DOM) so it can be verified by selftest.js. */
(() => {
  'use strict';
  const TH = (window.TH = window.TH || {});
  const CFG = JSON.parse(document.getElementById('th-config').textContent);
  TH.CFG = CFG;

  const LANES = CFG.laneOrder;                       // lp lr lm li th ri rm rr rp
  const KEY_FINGER = {};
  Object.entries(CFG.fingerKeys).forEach(([f, keys]) => [...keys].forEach((k) => { KEY_FINGER[k] = f; }));

  const baseKey = (ch) => (CFG.shifted[ch] ? CFG.shifted[ch] : ch.toLowerCase());
  const fingerOf = (ch) => KEY_FINGER[baseKey(ch)] || null;
  const laneOf = (ch) => { const f = fingerOf(ch); return f ? LANES.indexOf(f) : -1; };
  const handOf = (ch) => { const f = fingerOf(ch); return !f || f === 'th' ? 'x' : f[0]; };
  const needsShift = (ch) => ch !== ch.toLowerCase() || !!CFG.shifted[ch];
  const keyLabel = (ch) => (ch === ' ' ? 'SPACE' : ch.toUpperCase());

  // ----- seeded random -----
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ----- rhythm library: one bar = 8 half-beat steps -----
  const RHYTHMS = {
    1: [[1, 0, 0, 0, 1, 0, 0, 0], [1, 0, 1, 0, 1, 0, 1, 0]],
    2: [[1, 0, 1, 0, 1, 0, 1, 0], [1, 0, 1, 0, 1, 0, 0, 0]],
    3: [[1, 0, 1, 0, 1, 0, 1, 0], [1, 0, 1, 1, 1, 0, 1, 0], [1, 1, 1, 0, 1, 0, 1, 0]],
    4: [[1, 0, 1, 1, 1, 0, 1, 1], [1, 1, 1, 1, 1, 0, 1, 0], [1, 0, 1, 0, 1, 1, 1, 1]],
    5: [[1, 1, 1, 1, 1, 1, 1, 0], [1, 1, 1, 0, 1, 1, 1, 0]],
  };
  const REST_BAR = [1, 0, 0, 0, 1, 0, 0, 0];

  // ----- chart: notes -----
  function buildNoteChart(level, tempo = 1) {
    const rng = mulberry32(hashStr('notes:' + level.id));
    const beatMs = 60000 / (level.bpm * tempo);
    const stepMs = beatMs / 2;
    const leadMs = beatMs * 4;
    const keys = level.keys.filter((k) => laneOf(k) >= 0);
    const focus = (level.focus || []).filter((k) => keys.includes(k));
    const diff = Math.min(5, Math.max(1, level.rhythm || 1));
    const lib = RHYTHMS[diff];
    const weight = (k) => (focus.includes(k) ? 3 : k === ' ' ? 0.6 : 1);

    // 1. rhythm: which steps carry a note
    const slots = [];
    let pattern = lib[0];
    for (let bar = 0; bar < level.bars; bar++) {
      if (bar % 2 === 0) pattern = lib[Math.floor(rng() * lib.length)];
      const p = bar % 4 === 3 ? REST_BAR : pattern;
      p.forEach((on, s) => { if (on) slots.push({ bar, step: s }); });
    }

    // 2. keys: 2-bar phrases, often repeated so patterns can be memorised
    function pickKey(prev) {
      for (let tries = 0; tries < 6; tries++) {
        let total = 0;
        const ws = keys.map((k) => { const w = weight(k); total += w; return w; });
        let r = rng() * total;
        let k = keys[keys.length - 1];
        for (let i = 0; i < keys.length; i++) { r -= ws[i]; if (r <= 0) { k = keys[i]; break; } }
        if (keys.length > 1 && k === prev) continue;
        if (diff <= 2 && prev && handOf(k) !== 'x' && handOf(k) === handOf(prev) && rng() < 0.6) continue;
        return k;
      }
      return keys.find((k) => k !== prev) || keys[0];
    }

    const seq = [];
    const groups = new Map();
    slots.forEach((s, i) => {
      const g = Math.floor(s.bar / 2);
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(i);
    });
    let prevPhrase = null;
    let prev = null;
    [...groups.keys()].sort((a, b) => a - b).forEach((g) => {
      const idxs = groups.get(g);
      let phrase;
      if (prevPhrase && prevPhrase.length === idxs.length && rng() < 0.5) {
        phrase = prevPhrase.slice();
      } else {
        phrase = [];
        idxs.forEach((_, j) => { prev = pickKey(j === 0 ? prev : phrase[j - 1]); phrase.push(prev); });
      }
      idxs.forEach((slot, j) => { seq[slot] = phrase[j]; });
      prev = phrase[phrase.length - 1];
      prevPhrase = phrase;
    });

    // 3. coverage: focus keys >= 40% of notes first, then every other key
    //    appears as often as the song length allows (2x, else 1x).
    const counts = {};
    seq.forEach((k) => { counts[k] = (counts[k] || 0) + 1; });
    const put = (i, k) => { counts[seq[i]]--; seq[i] = k; counts[k] = (counts[k] || 0) + 1; };
    const clash = (i, k) => (i > 0 && seq[i - 1] === k) || (i < seq.length - 1 && seq[i + 1] === k);
    const wantFocus = focus.length ? Math.ceil(seq.length * 0.4) : 0;
    const focusCount = () => focus.reduce((n, k) => n + (counts[k] || 0), 0);
    let guard = 0;
    while (focus.length && focusCount() < wantFocus && guard++ < 600) {
      const i = Math.floor(rng() * seq.length);
      if (focus.includes(seq[i])) continue;
      const k = focus[Math.floor(rng() * focus.length)];
      if (clash(i, k)) continue;
      put(i, k);
    }
    const minEach = seq.length >= keys.length * 3 ? 2 : seq.length >= keys.length ? 1 : 0;
    if (minEach) {
      keys.forEach((k) => {
        let g = 0;
        while ((counts[k] || 0) < minEach && g++ < 600) {
          const i = Math.floor(rng() * seq.length);
          const cur = seq[i];
          if (cur === k || counts[cur] <= minEach || clash(i, k)) continue;
          if (focus.includes(cur) && focusCount() - 1 < wantFocus) continue;
          put(i, k);
        }
      });
    }

    const notes = slots.map((s, i) => ({
      id: i, t: leadMs + (s.bar * 8 + s.step) * stepMs, ch: seq[i], lane: laneOf(seq[i]), gold: false,
    }));
    // 4. golden phrases (fill the Spark meter)
    if (notes.length >= 24) {
      [0.28, 0.55, 0.8].forEach((f) => {
        const start = Math.floor(notes.length * f);
        for (let j = 0; j < 4 && start + j < notes.length; j++) notes[start + j].gold = true;
      });
    }
    const last = notes[notes.length - 1];
    return { kind: 'notes', notes, beatMs, stepMs, leadMs, lengthMs: last.t + 1800, total: notes.length };
  }

  // ----- chart: words -----
  function buildWordsChart(level, tempo = 1) {
    const rng = mulberry32(hashStr('words:' + level.id));
    const letters = level.keys.filter((k) => /^[a-z]$/.test(k));
    let pool = (level.pool || []).slice();
    const focus = (level.focus || []).filter((k) => /^[a-z]$/.test(k));
    const drill = () => {
      const n = 3 + Math.floor(rng() * 3);
      let s = '';
      for (let i = 0; i < n; i++) s += letters[Math.floor(rng() * letters.length)];
      return s;
    };
    const useDrills = pool.length < 8;
    const out = [];
    const cps = (level.wpm * tempo * 5) / 60;
    let spawn = 3000;
    for (let i = 0; i < level.count; i++) {
      let w;
      if (useDrills) w = drill();
      else {
        for (let tries = 0; tries < 8; tries++) {
          w = pool[Math.floor(rng() * pool.length)];
          if (!out.slice(-4).some((o) => o.text.toLowerCase() === w)) {
            if (!focus.length || focus.some((f) => w.includes(f)) || tries > 3) break;
          }
        }
      }
      if (level.caps && rng() < 0.35 && level.keys.includes(w[0].toUpperCase())) {
        w = w[0].toUpperCase() + w.slice(1);
      }
      const dur = (w.length / cps) * 1000;
      const fall = Math.max(3800, dur + 2400);
      out.push({ id: i, text: w, spawn, dur, fall, gold: i % 5 === 4 });
      spawn += dur + 700;
    }
    const last = out[out.length - 1];
    return { kind: 'words', words: out, lengthMs: last.spawn + last.fall + 500, total: out.reduce((n, w) => n + w.text.length, 0), cps };
  }

  // ----- chart: sentences -----
  function buildSentenceChart(level, tempo = 1) {
    const rng = mulberry32(hashStr('sent:' + level.id));
    const all = (CFG.sentences[String(level.tier || 1)] || CFG.sentences['1']).slice();
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    const lines = [];
    for (let i = 0; i < level.count; i++) lines.push(all[i % all.length]);
    const cps = (level.wpm * tempo * 5) / 60;
    return { kind: 'sentences', lines, cps, total: lines.reduce((n, l) => n + l.length, 0) };
  }

  function buildChart(level, tempo = 1) {
    if (level.mode === 'words') return buildWordsChart(level, tempo);
    if (level.mode === 'sentences') return buildSentenceChart(level, tempo);
    return buildNoteChart(level, tempo);
  }

  // ----- judging / scoring -----
  const WINDOWS = { chill: 260, normal: 200, pro: 140 };
  const METER = {
    chill: { hit: 2, perfect: 3, miss: -3, wrong: -1, floor: 8 },
    normal: { hit: 2, perfect: 3, miss: -6, wrong: -3, floor: 0 },
    pro: { hit: 1.5, perfect: 2.5, miss: -8, wrong: -4, floor: 0 },
  };
  function judge(dt, win) {
    const a = Math.abs(dt);
    if (a <= win * 0.35) return 'perfect';
    if (a <= win * 0.65) return 'great';
    return 'good';
  }
  const POINTS = { perfect: 100, great: 80, good: 60 };
  const multiplier = (combo) => Math.min(4, 1 + Math.floor(combo / 10));

  function starsFor(acc, goalWpm, wpm) {
    let s = acc >= 0.98 ? 5 : acc >= 0.93 ? 4 : acc >= 0.85 ? 3 : acc >= 0.75 ? 2 : acc >= 0.6 ? 1 : 0;
    if (s === 5 && goalWpm && wpm < goalWpm) s = 4;
    return s;
  }

  // ----- per-key stats & practice -----
  function troubleKeys(keyStats, unlocked, n = 5) {
    return unlocked
      .map((k) => {
        const s = keyStats[k] || { hit: 0, wrong: 0, miss: 0 };
        const tries = s.hit + s.wrong + s.miss;
        return { k, tries, rate: tries ? (s.wrong + s.miss) / tries : 0 };
      })
      .filter((x) => x.tries >= 6 && x.rate >= 0.12)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, n)
      .map((x) => x.k);
  }

  function practiceLevel(trouble, unlocked) {
    const keys = [...new Set([...trouble, ...unlocked.filter((k) => /[a-z;' ]/.test(k)).slice(0, 12)])];
    return {
      id: 'practice', world: 0, name: 'Trouble Spots', mode: 'notes',
      blurb: 'A custom song built around the keys you find trickiest.',
      keys, focus: trouble, bpm: 66, rhythm: 2, bars: 16, boss: false,
    };
  }

  function unlockedKeysFor(levels, completedIds) {
    const set = new Set();
    levels.forEach((l) => { if (completedIds.has(l.id)) l.keys.forEach((k) => set.add(k)); });
    return [...set];
  }

  TH.core = {
    LANES, KEY_FINGER, fingerOf, laneOf, handOf, needsShift, keyLabel, baseKey,
    hashStr, mulberry32, RHYTHMS, buildChart, buildNoteChart, buildWordsChart, buildSentenceChart,
    WINDOWS, METER, judge, POINTS, multiplier, starsFor, troubleKeys, practiceLevel, unlockedKeysFor,
  };
})();
