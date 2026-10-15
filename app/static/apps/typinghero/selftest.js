/* Typing Hero self-test: open /typing-hero/?selftest and read the result.
 * Verifies chart generation, judging and curriculum invariants in-browser. */
(() => {
  'use strict';
  const TH = window.TH;
  const C = TH.core;
  const results = [];
  const check = (name, ok, extra) => results.push({ name, ok: !!ok, extra: extra || '' });

  const levels = TH.CFG.levels;
  const byId = Object.fromEntries(levels.map((l) => [l.id, l]));

  // determinism
  const a = C.buildChart(byId['1-1']);
  const b = C.buildChart(byId['1-1']);
  check('chart is deterministic', JSON.stringify(a.notes) === JSON.stringify(b.notes));

  // every notes level: keys valid, notes sorted, focus coverage, lanes valid
  levels.filter((l) => l.mode === 'notes').forEach((l) => {
    const ch = C.buildChart(l);
    const allowed = new Set(l.keys);
    const sorted = ch.notes.every((n, i) => i === 0 || n.t > ch.notes[i - 1].t);
    check(`${l.id} notes use only allowed keys`, ch.notes.every((n) => allowed.has(n.ch)));
    check(`${l.id} notes sorted + lanes valid`, sorted && ch.notes.every((n) => n.lane >= 0 && n.lane < 9));
    check(`${l.id} has a sensible length`, ch.notes.length >= 20 && ch.notes.length <= 400, String(ch.notes.length));
    if (l.focus.length) {
      const f = ch.notes.filter((n) => l.focus.includes(n.ch)).length / ch.notes.length;
      check(`${l.id} focus keys >= 35%`, f >= 0.35, f.toFixed(2));
    }
    const missing = l.keys.filter((k) => !ch.notes.some((n) => n.ch === k));
    if (ch.notes.length >= l.keys.length) check(`${l.id} covers every key`, missing.length === 0, missing.join(''));
    else check(`${l.id} covers every focus key`, l.focus.every((k) => ch.notes.some((n) => n.ch === k)));
    const dup = ch.notes.some((n, i) => i > 0 && l.keys.length > 1 && n.ch === ch.notes[i - 1].ch && n.t - ch.notes[i - 1].t < ch.stepMs * 1.01);
    check(`${l.id} no instant repeats`, !dup);
  });

  levels.filter((l) => l.mode === 'words').forEach((l) => {
    const ch = C.buildChart(l);
    const letters = new Set(l.keys.map((k) => k.toLowerCase()));
    check(`${l.id} words typable`, ch.words.every((w) => [...w.text].every((c) => letters.has(c.toLowerCase()))));
    check(`${l.id} word count`, ch.words.length === l.count);
  });

  levels.filter((l) => l.mode === 'sentences').forEach((l) => {
    const ch = C.buildChart(l);
    check(`${l.id} sentences typable`, ch.lines.every((s) => [...s].every((c) => /[A-Za-z .,'!?]/.test(c))));
  });

  // judging
  check('judge perfect', C.judge(10, 200) === 'perfect');
  check('judge great', C.judge(100, 200) === 'great');
  check('judge good', C.judge(-190, 200) === 'good');
  check('multiplier caps at 4', C.multiplier(500) === 4 && C.multiplier(0) === 1 && C.multiplier(10) === 2);
  check('stars thresholds', C.starsFor(0.99, 0, 0) === 5 && C.starsFor(0.8, 0, 0) === 2 && C.starsFor(0.5, 0, 0) === 0);
  check('5 stars need wpm goal', C.starsFor(0.99, 20, 10) === 4);

  // keyboard facts
  check('F is left index', C.fingerOf('f') === 'li' && C.fingerOf('F') === 'li');
  check('J is right index', C.fingerOf('j') === 'ri');
  check('space is thumb', C.fingerOf(' ') === 'th');
  check('? uses right pinky + shift', C.fingerOf('?') === 'rp' && C.needsShift('?'));
  check('every letter has a finger', 'abcdefghijklmnopqrstuvwxyz'.split('').every((c) => C.fingerOf(c)));

  // curriculum chain
  check('level ids unique', new Set(levels.map((l) => l.id)).size === levels.length);
  check('requires resolve', levels.every((l) => !l.requires || byId[l.requires]));

  const failed = results.filter((r) => !r.ok);
  window.TH_SELFTEST = { total: results.length, failed, results };
  const out = document.createElement('pre');
  out.id = 'selftest-out';
  out.style.cssText = 'position:fixed;inset:auto 8px 8px auto;max-width:420px;max-height:50vh;overflow:auto;background:#000c;color:#fff;padding:8px;font:12px monospace;z-index:999';
  out.textContent = `SELFTEST ${failed.length ? 'FAILED' : 'PASSED'}: ${results.length - failed.length}/${results.length}\n` +
    failed.map((f) => `x ${f.name} ${f.extra}`).join('\n');
  document.body.append(out);
})();
