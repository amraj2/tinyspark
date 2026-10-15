/* Rhyme Time: rhyme finder, rhyme-match game and a poem maker. */
(() => {
  'use strict';
  const { $, h, createStore, toast, speak, stopSpeaking, canSpeak, stars } = window.TS;

  const FORMS = [
    { id: 'couplet', name: 'Silly couplet', hint: '2 lines that rhyme', lines: ['', ''], rhymePairs: [[0, 1]] },
    { id: 'aabb', name: 'Four-line rhyme', hint: 'Lines 1+2 and 3+4 rhyme', lines: ['', '', '', ''], rhymePairs: [[0, 1], [2, 3]] },
    { id: 'roses', name: 'Roses are red', hint: 'Lines 2 and 4 rhyme', lines: ['Roses are red,', '', 'Sugar is sweet,', ''], rhymePairs: [[1, 3]] },
  ];

  const store = createStore('tinyspark-rhyme-v1', { poems: [], best: 0, rounds: 0, matched: 0 });
  const S = store.data;

  const lastWord = (t) => {
    const m = (t || '').toLowerCase().match(/[a-z]+/g);
    return m ? m[m.length - 1] : '';
  };

  async function api(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error('Request failed');
    return res.json();
  }

  // ----- tabs -----
  const PANELS = { find: 'panelFind', game: 'panelGame', poem: 'panelPoem', mine: 'panelMine' };
  function show(name) {
    Object.entries(PANELS).forEach(([k, id]) => { $(id).hidden = k !== name; });
    [['find', 'tabFind'], ['game', 'tabGame'], ['poem', 'tabPoem'], ['mine', 'tabMine']]
      .forEach(([k, id]) => $(id).setAttribute('aria-selected', String(k === name)));
    stopSpeaking();
    if (name === 'game') startRound();
    if (name === 'mine') renderMine();
  }
  [['tabFind', 'find'], ['tabGame', 'game'], ['tabPoem', 'poem'], ['tabMine', 'mine']]
    .forEach(([id, name]) => $(id).addEventListener('click', () => show(name)));

  // ----- rhyme finder -----
  function wordChip(w, onclick) {
    return h('button', { type: 'button', class: 'chip', onclick }, w);
  }

  async function findRhymes(word) {
    const w = word.trim();
    if (!w) { $('findMsg').textContent = 'Type a word first.'; return; }
    try {
      const data = await api('/rhyme-time/api/rhymes?word=' + encodeURIComponent(w));
      if (!data.rhymes.length) {
        $('findMsg').textContent = `Hmm, I don't know rhymes for "${w}" yet. Try a simpler word!`;
        $('findResults').replaceChildren();
        return;
      }
      $('findMsg').textContent = data.known
        ? `Words that rhyme with "${w}":`
        : `I'm not sure about "${w}", but words that end like it include:`;
      $('findResults').replaceChildren(...data.rhymes.map((r) => wordChip(r, () => {
        $('findInput').value = r;
        findRhymes(r);
      })));
    } catch (e) {
      $('findMsg').textContent = 'Could not look that up - please try again.';
    }
  }

  $('findForm').addEventListener('submit', (ev) => { ev.preventDefault(); findRhymes($('findInput').value); });

  // ----- rhyme match game -----
  const ROUND = 5;
  let game = null;

  async function startRound() {
    game = { i: 0, correct: 0, q: null, done: false };
    await nextQuestion();
  }

  async function nextQuestion() {
    const box = $('panelGame');
    try {
      game.q = await api('/rhyme-time/api/quiz');
    } catch (e) {
      box.replaceChildren(h('p', null, 'Could not load a question - please try again.'));
      return;
    }
    game.answered = false;
    renderQuestion();
  }

  function renderQuestion() {
    const q = game.q;
    $('panelGame').replaceChildren(
      h('div', { class: 'game-bar' },
        h('span', { class: 'game-sub' }, `Question ${game.i + 1} of ${ROUND}`),
        h('div', { class: 'progress-bar', style: 'flex:1;min-width:120px' },
          h('span', { style: `width:${(game.i / ROUND) * 100}%` }))),
      h('h2', null, 'Which word rhymes with…'),
      h('p', { class: 'game-q' }, q.target),
      h('div', { class: 'opt-grid' }, q.options.map((o) => h('button', {
        type: 'button', class: 'opt-btn',
        onclick: (ev) => answer(o, ev.currentTarget.parentNode),
      }, o))),
      h('div', { id: 'gameFb' }));
  }

  function answer(word, grid) {
    if (game.answered) return;
    game.answered = true;
    const ok = word === game.q.answer;
    if (ok) { game.correct += 1; S.matched += 1; }
    store.saveSoon();
    grid.querySelectorAll('button').forEach((b) => {
      b.disabled = true;
      if (b.textContent === game.q.answer) b.classList.add('correct');
      else if (b.textContent === word) b.classList.add('wrong');
    });
    const last = game.i === ROUND - 1;
    $('gameFb').replaceChildren(
      h('div', { class: 'feedback ' + (ok ? 'good' : 'bad'), role: 'status' },
        h('strong', null, ok ? 'Yes! ' : 'Not quite. '),
        `${game.q.target} rhymes with ${game.q.answer}.`),
      h('div', { class: 'game-actions' },
        h('button', { class: 'kid-button', type: 'button', onclick: () => {
          game.i += 1;
          if (game.i >= ROUND) finishRound(); else nextQuestion();
        } }, last ? 'See my result' : 'Next word')));
  }

  function finishRound() {
    S.rounds += 1;
    S.best = Math.max(S.best, game.correct);
    store.save();
    const n = game.correct >= ROUND ? 3 : game.correct >= ROUND - 2 ? 2 : game.correct >= 1 ? 1 : 0;
    $('panelGame').replaceChildren(h('div', { class: 'round-end' },
      h('div', { class: 'round-stars', 'aria-label': `${n} out of 3 stars` }, stars(n, 3)),
      h('h2', null, game.correct === ROUND ? 'Rhyme master!' : 'Round complete!'),
      h('p', { class: 'game-q' }, `${game.correct} of ${ROUND} rhymes found`),
      h('div', { class: 'game-actions', style: 'justify-content:center' },
        h('button', { class: 'kid-button', type: 'button', onclick: startRound }, 'Play again'),
        h('button', { class: 'ghost-btn', type: 'button', onclick: () => show('poem') }, 'Make a poem'))));
    renderChip();
  }

  // ----- poem maker -----
  let form = FORMS[0];
  let lines = form.lines.slice();
  let focusIdx = 0;
  let checkTimer = null;

  function renderForms() {
    $('formPicker').replaceChildren(...FORMS.map((f) => h('button', {
      type: 'button', role: 'radio', 'aria-checked': String(f.id === form.id),
      class: 'seg-btn' + (f.id === form.id ? ' on' : ''),
      onclick: () => { form = f; lines = f.lines.slice(); focusIdx = 0; renderForms(); renderLines(); refreshIdeas(); },
    }, h('strong', null, f.name), h('small', null, f.hint))));
  }

  function renderLines() {
    $('poemLines').replaceChildren(...lines.map((text, i) => {
      const id = 'poemLine' + i;
      const input = h('input', {
        id, class: 'field-input', type: 'text', maxlength: '120', style: 'width:100%',
        placeholder: i === 0 ? 'Write the first line...' : 'Write line ' + (i + 1) + '...',
      });
      input.value = text;
      input.addEventListener('focus', () => { focusIdx = i; refreshIdeas(); });
      input.addEventListener('input', () => {
        lines[i] = input.value;
        clearTimeout(checkTimer);
        checkTimer = setTimeout(() => { updateStatus(); refreshIdeas(); }, 400);
      });
      return h('div', { class: 'step' },
        h('label', { for: id }, h('span', { class: 'step-num' }, String(i + 1)), 'Line ' + (i + 1)),
        input, h('small', { id: 'poemStatus' + i, class: 'game-sub', 'aria-live': 'polite' }));
    }));
    updateStatus();
  }

  async function updateStatus() {
    for (const [a, b] of form.rhymePairs) {
      const wa = lastWord(lines[a]);
      const wb = lastWord(lines[b]);
      const el = $('poemStatus' + b);
      if (!el) continue;
      if (!wa || !wb) { el.textContent = ''; continue; }
      try {
        const r = await api(`/rhyme-time/api/check?a=${encodeURIComponent(wa)}&b=${encodeURIComponent(wb)}`);
        el.textContent = r.rhymes
          ? `✅ "${wb}" rhymes with "${wa}" in line ${a + 1}`
          : `⭕ Try ending line ${b + 1} with a word that rhymes with "${wa}"`;
      } catch (e) { el.textContent = ''; }
    }
  }

  async function refreshIdeas() {
    // Suggest rhymes for the partner line's last word (or this line's own).
    const pair = form.rhymePairs.find((p) => p.includes(focusIdx));
    let src = '';
    if (pair) {
      const partner = pair[0] === focusIdx ? pair[1] : pair[0];
      src = lastWord(lines[partner]);
    }
    if (!src) src = lastWord(lines[focusIdx]);
    if (!src) { $('poemIdeas').replaceChildren(h('span', { class: 'game-sub' }, 'Write a line and I will suggest rhymes.')); return; }
    try {
      const data = await api('/rhyme-time/api/rhymes?word=' + encodeURIComponent(src));
      $('poemIdeas').replaceChildren(...(data.rhymes.slice(0, 14).map((w) => wordChip(w, () => addWord(w)))));
    } catch (e) { /* ignore */ }
  }

  function addWord(w) {
    const input = $('poemLine' + focusIdx);
    if (!input) return;
    const v = input.value.replace(/\s+$/, '').replace(/[.,!?]+$/, '');
    input.value = (v ? v + ' ' : '') + w;
    lines[focusIdx] = input.value;
    input.focus();
    updateStatus();
  }

  $('poemRead').addEventListener('click', () => {
    const text = lines.filter((l) => l.trim()).join('. ');
    if (!text) { toast('Write a line first.'); return; }
    if (!canSpeak) { toast('Reading aloud is not available in this browser.'); return; }
    speak(text);
  });

  $('poemSave').addEventListener('click', () => {
    const body = lines.map((l) => l.trim()).filter(Boolean);
    if (body.length < 2) { toast('Write at least two lines, then save.'); return; }
    S.poems.push({
      id: 'p' + Date.now().toString(36),
      title: $('poemTitle').value.trim() || 'My poem',
      form: form.id, lines: body, at: Date.now(),
    });
    store.save();
    $('poemTitle').value = '';
    renderChip();
    toast('Poem saved to "My poems"!');
  });

  // ----- my poems -----
  function renderMine() {
    const poems = S.poems.slice().reverse();
    $('panelMine').replaceChildren(poems.length
      ? h('ul', { class: 'shelf' }, poems.map((p) => h('li', { class: 'shelf-item', style: 'flex-direction:column' },
        h('strong', null, p.title),
        h('div', null, p.lines.map((l) => h('div', null, l))),
        h('small', null, new Date(p.at).toLocaleDateString()),
        h('div', { class: 'shelf-actions' },
          canSpeak ? h('button', { type: 'button', class: 'ghost-btn', onclick: () => speak(p.lines.join('. ')) }, '🔊 Read') : null,
          h('button', { type: 'button', class: 'ghost-btn danger', onclick: () => {
            if (!window.confirm('Delete this poem?')) return;
            S.poems = S.poems.filter((x) => x.id !== p.id);
            store.save();
            renderMine();
            renderChip();
          } }, 'Delete')))))
      : h('p', { class: 'empty' }, 'Your saved poems will live here.'));
  }

  function renderChip() {
    $('poemCount').textContent = String(S.poems.length);
    const n = S.poems.length;
    $('progressChip').textContent = n || S.matched
      ? `🎵 ${n} ${n === 1 ? 'poem' : 'poems'} · ${S.matched} rhymes matched`
      : 'Find rhymes and make silly poems';
  }

  renderForms();
  renderLines();
  refreshIdeas();
  renderChip();
})();
