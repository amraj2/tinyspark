/* Word Wizard: learn vocabulary by casting spells (quiz + letter scramble). */
(() => {
  'use strict';
  const { $, h, pick, shuffle, createStore, toast, speak, stopSpeaking, canSpeak, config, stars } = window.TS;
  const CFG = config();
  const ROUND = 6;
  const RANKS = [
    { min: 0, name: 'Apprentice', emoji: '🧙' },
    { min: 8, name: 'Spellcaster', emoji: '🪄' },
    { min: 20, name: 'Wizard', emoji: '🔮' },
    { min: 40, name: 'Archmage', emoji: '👑' },
  ];
  const BADGES = [
    { id: 'first', name: 'First spell', test: (s) => s.rounds >= 1 },
    { id: 'perfect', name: 'Perfect cast', test: (s) => s.perfect >= 1 },
    { id: 'ten', name: '10 words learned', test: (s) => learned(s) >= 10 },
    { id: 'archmage', name: 'Archmage rank', test: (s) => learned(s) >= 40 },
  ];

  const store = createStore('tinyspark-wordwizard-v1', { level: 1, words: {}, rounds: 0, perfect: 0, badges: [] });
  const S = store.data;
  const byLevel = (l) => CFG.words.filter((w) => w.level === l);
  const rec = (w) => S.words[w] || { box: 0, seen: 0 };
  function learned(s) { return Object.values(s.words).filter((r) => r.box >= 1).length; }

  let mode = 'quiz';
  let round = null;

  // ----- round building -----
  function pickWords(level, n) {
    const pool = byLevel(level).map((w) => {
      const r = rec(w.word);
      return { w, score: r.box * 2 + r.seen * 0.5 + Math.random() * 2 };
    });
    pool.sort((a, b) => a.score - b.score);
    return pool.slice(0, n).map((x) => x.w);
  }

  function newRound() {
    stopSpeaking();
    round = { i: 0, correct: 0, items: pickWords(S.level, ROUND), answered: false, hinted: false, built: [] };
    renderStage();
  }

  function grade(word, ok, perfectly) {
    const r = rec(word);
    r.seen += 1;
    if (ok) r.box = Math.min(3, r.box + (perfectly === false ? 0 : 1));
    else r.box = Math.max(0, r.box - 1);
    S.words[word] = r;
    store.saveSoon();
  }

  // ----- UI: header bits -----
  function rank() {
    const n = learned(S);
    return RANKS.filter((r) => n >= r.min).pop();
  }

  function renderChrome() {
    const r = rank();
    $('progressChip').textContent = `${r.emoji} ${r.name} · ${learned(S)} words learned`;
    $('learnedCount').textContent = String(learned(S));
    $('levelPicker').replaceChildren(...[1, 2, 3].map((n) => h('button', {
      type: 'button', role: 'radio', 'aria-checked': String(S.level === n),
      class: 'seg-btn' + (S.level === n ? ' on' : ''),
      onclick: () => { S.level = n; store.save(); renderChrome(); if (mode !== 'book') newRound(); },
    }, h('strong', null, 'Level ' + n), h('small', null, CFG.levelNames[String(n)]))));
  }

  // ----- UI: stage -----
  function renderStage() {
    $('bookStage').hidden = mode !== 'book';
    $('stage').hidden = mode === 'book';
    if (mode === 'book') { renderBook(); return; }
    if (!round) { newRound(); return; }
    if (round.i >= round.items.length) { renderEnd(); return; }
    mode === 'quiz' ? renderQuiz() : renderScramble();
  }

  function header() {
    return h('div', { class: 'game-bar' },
      h('span', { class: 'game-sub' }, `Spell ${round.i + 1} of ${round.items.length}`),
      h('div', { class: 'progress-bar', style: 'flex:1;min-width:120px', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(round.items.length), 'aria-valuenow': String(round.i) },
        h('span', { style: `width:${(round.i / round.items.length) * 100}%` })));
  }

  function blanked(item) {
    const re = new RegExp(item.word, 'i');
    return item.example.replace(re, '_____');
  }

  function feedbackBox(item, ok, extra) {
    return h('div', { class: 'feedback ' + (ok ? 'good' : 'bad'), role: 'status' },
      h('strong', null, ok ? 'Spell cast! ✨ ' : 'Not quite - the word is '),
      h('strong', null, item.word),
      h('p', null, item.meaning + '.'),
      h('p', { class: 'game-sub' }, '“' + item.example + '”'),
      extra || null);
  }

  function nextButton() {
    const last = round.i === round.items.length - 1;
    return h('div', { class: 'game-actions' },
      canSpeak ? h('button', { class: 'ghost-btn', type: 'button', onclick: () => speak(round.items[round.i].word + '. ' + round.items[round.i].meaning) }, '🔊 Hear it') : null,
      h('button', { class: 'kid-button', type: 'button', onclick: () => { round.i += 1; round.answered = false; round.hinted = false; round.built = []; round.options = null; round.tiles = null; renderStage(); } },
        last ? 'See my result' : 'Next spell'));
  }

  function renderQuiz() {
    const item = round.items[round.i];
    if (!round.options) {
      const others = shuffle(byLevel(item.level).filter((w) => w.word !== item.word)).slice(0, 3);
      round.options = shuffle([item, ...others]).map((w) => w.word);
    }
    const opts = round.options.map((word) => h('button', {
      type: 'button', class: 'opt-btn',
      onclick: (ev) => answerQuiz(word, item, ev.currentTarget.parentNode),
    }, word));
    $('stage').replaceChildren(
      header(),
      h('h2', null, 'Which word fits this spell?'),
      h('p', { class: 'game-q' }, item.meaning[0].toUpperCase() + item.meaning.slice(1) + '.'),
      h('p', { class: 'game-sub' }, '“' + blanked(item) + '”'),
      h('div', { class: 'opt-grid' }, opts),
      h('div', { id: 'fb' }));
  }

  function answerQuiz(word, item, grid) {
    if (round.answered) return;
    round.answered = true;
    const ok = word === item.word;
    if (ok) round.correct += 1;
    grade(item.word, ok);
    grid.querySelectorAll('button').forEach((b) => {
      b.disabled = true;
      if (b.textContent === item.word) b.classList.add('correct');
      else if (b.textContent === word) b.classList.add('wrong');
    });
    $('fb').replaceChildren(feedbackBox(item, ok), nextButton());
    renderChrome();
  }

  function renderScramble() {
    const item = round.items[round.i];
    if (!round.tiles) {
      let letters = shuffle(item.word.split(''));
      let guard = 0;
      while (letters.join('') === item.word && guard++ < 10) letters = shuffle(letters);
      round.tiles = letters.map((ch, i) => ({ ch, id: i, used: false }));
      round.built = [];
    }
    const draw = () => {
      const slots = item.word.split('').map((_, i) => {
        const t = round.built[i];
        return h('button', {
          type: 'button', class: 'slot' + (t ? ' filled' : ''),
          'aria-label': t ? `Letter ${t.ch}, tap to remove` : 'Empty letter slot',
          disabled: round.answered,
          onclick: () => { if (t && !round.answered) { t.used = false; round.built.splice(i, 1); draw(); } },
        }, t ? t.ch : '');
      });
      const tiles = round.tiles.map((t) => h('button', {
        type: 'button', class: 'tile', disabled: t.used || round.answered,
        onclick: () => {
          t.used = true;
          round.built.push(t);
          draw();
          if (round.built.length === item.word.length) finishScramble(item);
        },
      }, t.ch));
      $('scrambleBox').replaceChildren(
        h('div', { class: 'slots', 'aria-label': 'Your word' }, slots),
        h('div', { class: 'tiles', 'aria-label': 'Letters to use' }, tiles));
    };
    $('stage').replaceChildren(
      header(),
      h('h2', null, 'Unscramble the letters'),
      h('p', { class: 'game-q' }, item.meaning[0].toUpperCase() + item.meaning.slice(1) + '.'),
      h('p', { class: 'game-sub' }, `${item.word.length} letters`),
      h('div', { id: 'scrambleBox' }),
      h('div', { class: 'game-actions', id: 'scrambleActions' },
        h('button', { class: 'ghost-btn', type: 'button', onclick: () => {
          round.hinted = true;
          const need = item.word[round.built.length];
          const t = round.tiles.find((x) => !x.used && x.ch === need);
          if (t) { t.used = true; round.built.push(t); draw(); if (round.built.length === item.word.length) finishScramble(item); }
        } }, '💡 Hint (next letter)'),
        h('button', { class: 'ghost-btn', type: 'button', onclick: () => { round.tiles.forEach((t) => { t.used = false; }); round.built = []; draw(); } }, 'Start again')),
      h('div', { id: 'fb' }));
    draw();
  }

  function finishScramble(item) {
    const attempt = round.built.map((t) => t.ch).join('');
    const ok = attempt === item.word;
    if (!ok) {
      toast('Not quite - tap a letter to remove it, or press Start again.');
      return;
    }
    round.answered = true;
    if (!round.hinted) round.correct += 1;
    grade(item.word, true, !round.hinted);
    $('scrambleActions').hidden = true;
    $('fb').replaceChildren(feedbackBox(item, true, round.hinted ? h('p', { class: 'game-sub' }, 'You used a hint, so this one counts as practice.') : null), nextButton());
    renderChrome();
    document.querySelectorAll('#scrambleBox button').forEach((b) => { b.disabled = true; });
  }

  function renderEnd() {
    S.rounds += 1;
    const total = round.items.length;
    const starCount = round.correct >= total ? 3 : round.correct >= total - 2 ? 2 : round.correct >= 1 ? 1 : 0;
    if (round.correct === total) S.perfect += 1;
    const fresh = BADGES.filter((b) => !S.badges.includes(b.id) && b.test(S));
    fresh.forEach((b) => S.badges.push(b.id));
    store.save();
    renderChrome();
    $('stage').replaceChildren(h('div', { class: 'round-end' },
      h('div', { class: 'round-stars', 'aria-label': `${starCount} out of 3 stars` }, stars(starCount, 3)),
      h('h2', null, round.correct === total ? 'A perfect cast!' : 'Round complete!'),
      h('p', { class: 'game-q' }, `${round.correct} of ${total} spells cast without help`),
      fresh.length ? h('p', null, '🏅 New badge: ' + fresh.map((b) => b.name).join(', ')) : null,
      h('div', { class: 'game-actions', style: 'justify-content:center' },
        h('button', { class: 'kid-button', type: 'button', onclick: newRound }, 'Cast another round'),
        h('button', { class: 'ghost-btn', type: 'button', onclick: () => setMode('book') }, 'Open my Spellbook'))));
  }

  // ----- spellbook -----
  function renderBook() {
    const box = $('bookStage');
    const badges = h('ul', { class: 'badges' }, BADGES.map((b) => {
      const got = S.badges.includes(b.id);
      return h('li', { class: 'badge' + (got ? ' got' : '') },
        h('span', { class: 'badge-emoji', 'aria-hidden': 'true' }, got ? '🏅' : '🔒'),
        h('strong', null, b.name));
    }));
    const groups = [1, 2, 3].map((l) => h('div', { class: 'game-card' },
      h('h2', null, `Level ${l} · ${CFG.levelNames[String(l)]}`),
      h('div', { class: 'opt-grid' }, byLevel(l).map((w) => {
        const r = rec(w.word);
        return h('button', {
          type: 'button', class: 'word-card' + (r.box >= 1 ? ' learned' : ''),
          onclick: () => { if (canSpeak) speak(`${w.word}. ${w.meaning}. ${w.example}`); toast(`${w.word}: ${w.meaning}`); },
        },
        h('strong', null, r.box >= 1 || r.seen ? w.word : '? ? ?' ),
        h('small', null, r.box >= 1 || r.seen ? w.meaning : 'Cast a spell to discover this word'),
        h('span', { class: 'pips', 'aria-label': `Mastery ${r.box} of 3` }, '●'.repeat(r.box) + '○'.repeat(3 - r.box)));
      }))));
    box.replaceChildren(h('div', { class: 'game-card' }, h('h2', null, 'Your badges'), badges), ...groups);
  }

  // ----- tabs -----
  function setMode(m) {
    mode = m;
    ['Quiz', 'Scramble', 'Book'].forEach((n) => $('tab' + n).setAttribute('aria-selected', String(n.toLowerCase() === m)));
    stopSpeaking();
    if (m !== 'book') { round = null; newRound(); } else renderStage();
  }

  $('tabQuiz').addEventListener('click', () => setMode('quiz'));
  $('tabScramble').addEventListener('click', () => setMode('scramble'));
  $('tabBook').addEventListener('click', () => setMode('book'));

  renderChrome();
  newRound();
})();
