/* TinySpark Story Starter: pick a picture, write a story, keep your work.
 * Everything a child writes stays in this browser (localStorage). */
(() => {
  'use strict';

  const CFG = JSON.parse(document.getElementById('story-config').textContent);
  const $ = (id) => document.getElementById(id);
  const KEY = 'tinyspark-story-v1';
  const STARTER_WORLD = {
    url: document.getElementById('storyApp').dataset.starterUrl,
    prompt:'A mysterious glowing portal has appeared on a floating island. Where does it lead?',
    themes:['magic'],
    questions:['Who found the portal first?','What could be waiting on the other side?','What would you bring on this adventure?'],
    words:[{word:'glimmer',meaning:'a small, soft light'},{word:'mysterious',meaning:'strange and full of secrets'},{word:'courage',meaning:'being brave when something feels difficult'}]
  };
  const NEW_EVERY = 4;            // every Nth spark also makes a brand-new picture
  const SPIN_MS = 2200;
  const TIMER_SECS = 300;
  const MAX_DRAFTS = 30;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const LEVELS = {
    1: {
      name: 'Level 1', hint: 'One sentence', target: 6,
      steps: [{ id: 'one', prefix: '', label: 'Write one sentence about the picture', ph: 'The dragon is...' }],
    },
    2: {
      name: 'Level 2', hint: 'Three parts', target: 25,
      steps: [
        { id: 'once', prefix: 'Once upon a time', label: 'Once upon a time...', ph: 'there was a...' },
        { id: 'until', prefix: 'Until one day', label: 'Until one day...', ph: 'something surprising happened...' },
        { id: 'end', prefix: 'In the end', label: 'In the end...', ph: 'everything...' },
      ],
    },
    3: {
      name: 'Level 3', hint: 'Full story', target: 60,
      steps: [
        { id: 'once', prefix: 'Once upon a time', label: 'Once upon a time...', ph: 'there was a...' },
        { id: 'every', prefix: 'Every day', label: 'Every day...', ph: 'they would...' },
        { id: 'until', prefix: 'Until one day', label: 'Until one day...', ph: 'something surprising happened...' },
        { id: 'because1', prefix: 'Because of that', label: 'Because of that...', ph: 'this happened...' },
        { id: 'because2', prefix: 'Because of that', label: 'Because of that (again)...', ph: 'and then...' },
        { id: 'finally', prefix: 'Until finally', label: 'Until finally...', ph: 'at last...' },
      ],
    },
  };

  const TWISTS = [
    'Suddenly, a stranger arrived with a secret.',
    'Then everything went completely quiet.',
    'But the map turned out to be upside down.',
    'Out of nowhere, a very small voice said hello.',
    'Just then, the ground began to rumble.',
    'But something important had gone missing.',
    'Then a mysterious light appeared in the distance.',
    'Nobody noticed that someone was watching.',
  ];

  const BADGES = [
    { id: 'first', emoji: '✍️', name: 'First story', desc: 'Save your first story', test: (s) => s.stories.length >= 1 },
    { id: 'three', emoji: '📚', name: 'Story maker', desc: 'Save 3 stories', test: (s) => s.stories.length >= 3 },
    { id: 'ten', emoji: '🏆', name: 'Story master', desc: 'Save 10 stories', test: (s) => s.stories.length >= 10 },
    { id: 'words', emoji: '💯', name: '100 words', desc: 'Write 100 words in total', test: (s) => totalWords(s) >= 100 },
    { id: 'power', emoji: '💎', name: 'Word collector', desc: 'Use 5 different power words', test: (s) => s.wordsUsed.length >= 5 },
    { id: 'levels', emoji: '🧭', name: 'Level explorer', desc: 'Save a story at every level', test: (s) => new Set(s.stories.map((x) => x.level)).size >= 3 },
  ];

  // ---------- storage ----------
  const defaults = () => ({
    settings: { level: 2, theme: 'all' },
    drafts: {}, stories: [], favourites: [], wordsUsed: [], badges: [],
  });

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (s && typeof s === 'object') {
        const d = Object.assign(defaults(), s);
        d.settings = Object.assign(defaults().settings, s.settings || {});
        return d;
      }
    } catch (e) { /* ignore */ }
    return defaults();
  }

  let store = load();
  let persistTimer = null;

  function persist() {
    clearTimeout(persistTimer);
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* ignore */ }
  }

  function schedulePersist() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(persist, 300);
  }

  function totalWords(s) {
    return s.stories.reduce((n, x) => n + (x.wordCount || 0), 0);
  }

  // ---------- state ----------
  const state = {
    current: null, pool: [], rollCount: 0, busy: false,
    pendingNew: null, generating: false, lastFocused: null,
    spinTimeout: null, timer: { left: TIMER_SECS, id: null },
  };

  // ---------- helpers ----------
  function h(tag, props, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (v === true) e.setAttribute(k, '');
      else if (v !== false && v != null) e.setAttribute(k, v);
    }
    for (const kid of kids.flat()) {
      if (kid != null) e.append(kid.nodeType ? kid : String(kid));
    }
    return e;
  }

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const countWords = (t) => (t.trim().match(/\S+/g) || []).length;
  const level = () => LEVELS[store.settings.level] || LEVELS[2];

  function setStatus(msg) { $('status').textContent = msg || ''; }

  let toastTimer = null;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 4000);
  }

  function preload(url) {
    return new Promise((resolve, reject) => {
      const probe = new Image();
      probe.onload = () => resolve();
      probe.onerror = () => reject(new Error('Image failed to load'));
      probe.src = url;
    });
  }

  async function api(path, opts) {
    const res = await fetch(path, opts);
    if (!res.ok) throw new Error('Request failed: ' + res.status);
    return res.json();
  }

  // ---------- controls ----------
  function renderLevels() {
    const box = $('levelPicker');
    box.replaceChildren(...[1, 2, 3].map((n) => {
      const L = LEVELS[n];
      const on = store.settings.level === n;
      return h('button', {
        type: 'button', role: 'radio', 'aria-checked': String(on),
        class: 'seg-btn' + (on ? ' on' : ''),
        onclick: () => {
          store.settings.level = n;
          persist();
          renderLevels();
          renderSteps();
        },
      }, h('strong', null, L.name), h('small', null, L.hint));
    }));
  }

  function renderThemes() {
    const items = [{ id: 'all', label: 'Surprise me', emoji: '🎲' }, ...CFG.themes];
    $('themeChips').replaceChildren(...items.map((t) => {
      const on = store.settings.theme === t.id;
      return h('button', {
        type: 'button', role: 'radio', 'aria-checked': String(on),
        class: 'chip' + (on ? ' on' : ''),
        onclick: async () => {
          store.settings.theme = t.id;
          persist();
          renderThemes();
          await loadPool();
          setStatus(state.pool.length ? '' : 'No pictures for that theme yet - a new one will be made.');
        },
      }, `${t.emoji} ${t.label}`);
    }));
  }

  async function loadPool() {
    const theme = store.settings.theme;
    const q = '/api/existing-images?limit=24' + (theme !== 'all' ? '&theme=' + encodeURIComponent(theme) : '');
    try {
      const data = await api(q);
      state.pool = data.images || [];
      state.pool.forEach((i) => { new Image().src = i.url; });
    } catch (e) {
      console.error(e);
      state.pool = [];
    }
  }

  // ---------- picture ----------
  function showPicture(item, spinning) {
    const img = $('image');
    img.src = item.url;
    img.alt = item.prompt;
    img.hidden = false;
    img.classList.toggle('roulette-spinning', !!spinning);
    $('placeholder').hidden = true;
    $('promptBox').textContent = item.prompt;
    $('promptBox').hidden = false;
  }

  function spinTo(target) {
    return new Promise((resolve) => {
      if (reducedMotion || state.pool.length < 2) {
        showPicture(target, false);
        resolve();
        return;
      }
      const start = Date.now();
      let delay = 60;
      setStatus('Spinning...');
      const step = () => {
        if (Date.now() - start >= SPIN_MS) {
          showPicture(target, false);
          resolve();
          return;
        }
        showPicture(pick(state.pool), true);
        delay = Math.min(delay + 18, 280);
        state.spinTimeout = setTimeout(step, delay);
      };
      step();
    });
  }

  function isFav(url) { return store.favourites.some((f) => f.url === url); }

  function renderFavBtn() {
    const b = $('favBtn');
    const on = state.current && isFav(state.current.url);
    b.hidden = !state.current;
    b.setAttribute('aria-pressed', String(!!on));
    b.textContent = on ? '♥' : '♡';
    b.setAttribute('aria-label', on ? 'Remove from favourites' : 'Save this picture to favourites');
  }

  function snapshot(item) {
    return {
      url: item.url, prompt: item.prompt, themes: item.themes || [],
      questions: item.questions || [], words: item.words || [],
    };
  }

  function setCurrent(item, opts) {
    state.current = snapshot(item);
    store.last = state.current;
    schedulePersist();
    showPicture(state.current, false);
    $('dailyBadge').hidden = !(opts && opts.daily);
    $('writeCard').hidden = false;
    $('savedPanel').hidden = true;
    $('checkPanel').hidden = true;
    stopReading();
    renderFavBtn();
    renderIdeas();
    renderWords();
    renderSteps();
    setStatus('');
  }

  function renderIdeas() {
    $('ideas').replaceChildren(...state.current.questions.map((q) => h('li', null, q)));
  }

  // ---------- writing ----------
  function draft() {
    const url = state.current.url;
    if (!store.drafts[url]) store.drafts[url] = { text: {}, twist: null, savedId: null, updated: Date.now() };
    return store.drafts[url];
  }

  function pruneDrafts() {
    const entries = Object.entries(store.drafts);
    if (entries.length <= MAX_DRAFTS) return;
    entries.sort((a, b) => (b[1].updated || 0) - (a[1].updated || 0));
    store.drafts = Object.fromEntries(entries.slice(0, MAX_DRAFTS));
  }

  function currentSteps() {
    const steps = level().steps.slice();
    const d = draft();
    if (d.twist) {
      const twist = { id: 'twist', prefix: d.twist, label: d.twist, ph: 'then...' };
      steps.splice(Math.max(steps.length - 1, 1), 0, twist);
    }
    return steps;
  }

  function renderSteps() {
    if (!state.current) return;
    const d = draft();
    const box = $('steps');
    box.replaceChildren(...currentSteps().map((s, i) => {
      const id = 'step-' + s.id;
      const ta = h('textarea', {
        id, rows: '3', placeholder: s.ph, 'data-step': s.id,
        'aria-describedby': 'wordCount', maxlength: '1200',
      });
      ta.value = d.text[s.id] || '';
      ta.addEventListener('focus', () => { state.lastFocused = ta; });
      ta.addEventListener('input', () => {
        d.text[s.id] = ta.value;
        d.updated = Date.now();
        pruneDrafts();
        schedulePersist();
        updateCount();
        $('draftNote').textContent = '✓ draft saved';
      });
      return h('div', { class: 'step' },
        h('label', { for: id }, h('span', { class: 'step-num' }, String(i + 1)), s.label),
        ta);
    }));
    updateCount();
  }

  function rawTexts() {
    const d = draft();
    return currentSteps().map((s) => ({ step: s, text: (d.text[s.id] || '').trim() }));
  }

  function composed() {
    return rawTexts().filter((x) => x.text)
      .map((x) => (x.step.prefix ? x.step.prefix + ' ' : '') + x.text);
  }

  function usedWords() {
    const all = rawTexts().map((x) => x.text).join(' ').toLowerCase();
    return state.current.words.filter((w) => {
      const stem = w.word.toLowerCase().replace(/[^a-z]/g, '');
      return stem && new RegExp('\\b' + stem + '\\b').test(all);
    });
  }

  function updateCount() {
    const words = countWords(rawTexts().map((x) => x.text).join(' '));
    $('wordCount').textContent = words === 1 ? '1 word' : words + ' words';
    renderWords();
    renderQuest();
  }

  function renderWords() {
    if (!state.current) return;
    const used = new Set(usedWords().map((w) => w.word));
    $('words').replaceChildren(...state.current.words.map((w) => h('button', {
      type: 'button',
      class: 'chip word' + (used.has(w.word) ? ' used' : ''),
      title: w.meaning,
      onclick: () => insertWord(w.word),
    }, h('strong', null, w.word + (used.has(w.word) ? ' ✓' : '')), h('small', null, w.meaning))));
  }

  function insertWord(word) {
    let ta = state.lastFocused;
    if (!ta || !document.body.contains(ta)) ta = $('steps').querySelector('textarea');
    if (!ta) return;
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? start;
    const before = ta.value.slice(0, start);
    const pad = before && !/\s$/.test(before) ? ' ' : '';
    ta.value = before + pad + word + ' ' + ta.value.slice(end);
    const pos = (before + pad + word + ' ').length;
    ta.focus();
    ta.setSelectionRange(pos, pos);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function addTwist() {
    const d = draft();
    let t = pick(TWISTS);
    if (TWISTS.length > 1) while (t === d.twist) t = pick(TWISTS);
    d.twist = t;
    d.updated = Date.now();
    schedulePersist();
    renderSteps();
    const ta = $('step-twist');
    if (ta) ta.focus();
    toast('Plot twist added - where does it take your story?');
  }

  // ---------- checklist / read aloud ----------
  function runCheck() {
    const parts = composed();
    const text = parts.join(' ');
    const words = countWords(rawTexts().map((x) => x.text).join(' '));
    if (!text) { toast('Write a little first, then check it.'); return; }

    const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
    const caps = sentences.every((s) => /^[^a-z]*[A-Z0-9]/.test(s) || !/[a-z]/i.test(s));
    const stops = parts.every((p) => /[.!?]["'”]?$/.test(p));
    const long = words >= level().target;
    const power = usedWords().length > 0;

    const auto = [
      [caps, 'Every sentence starts with a capital letter', 'Check your capital letters.'],
      [stops, 'Every part ends with a full stop, ! or ?', 'Add a full stop, ! or ? at the end of each part.'],
      [long, `You wrote ${words} words - great length`, `Try to write about ${level().target} words (you have ${words}).`],
      [power, 'You used a power word', 'Try using one of the power words.'],
    ];
    const items = auto.map(([ok, yes, no]) => h('li', { class: ok ? 'ok' : 'try' },
      h('span', { 'aria-hidden': 'true' }, ok ? '✅' : '⭕'), ' ', ok ? yes : no));
    ['I described where my story happens', 'I read my story out loud'].forEach((label, i) => {
      items.push(h('li', null, h('label', null, h('input', { type: 'checkbox', id: 'manual' + i }), ' ' + label)));
    });
    $('checkList').replaceChildren(...items);
    $('checkPanel').hidden = false;
  }

  function stopReading() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    $('readBtn').textContent = '🔊 Read it to me';
  }

  function toggleReading() {
    if (!('speechSynthesis' in window)) return;
    if (window.speechSynthesis.speaking) { stopReading(); return; }
    const text = composed().join(' ');
    if (!text) { toast('Write something first and I will read it back.'); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    u.lang = 'en-GB';
    u.onend = () => { $('readBtn').textContent = '🔊 Read it to me'; };
    $('readBtn').textContent = '⏹ Stop reading';
    window.speechSynthesis.speak(u);
  }

  // ---------- saving, shelf, badges ----------
  function saveStory() {
    const parts = composed();
    if (!parts.length) { toast('Write a little first, then save your story.'); return; }
    const d = draft();
    const cur = state.current;
    const words = countWords(rawTexts().map((x) => x.text).join(' '));
    const record = Object.assign(snapshot(cur), {
      id: d.savedId || 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      level: store.settings.level,
      text: Object.assign({}, d.text), twist: d.twist,
      composed: parts, wordCount: words, savedAt: Date.now(),
    });
    const idx = store.stories.findIndex((s) => s.id === record.id);
    if (idx >= 0) store.stories[idx] = record; else store.stories.push(record);
    d.savedId = record.id;

    usedWords().forEach((w) => {
      if (!store.wordsUsed.includes(w.word)) store.wordsUsed.push(w.word);
    });

    const fresh = BADGES.filter((b) => !store.badges.includes(b.id) && b.test(store));
    fresh.forEach((b) => store.badges.push(b.id));
    persist();

    $('savedMsg').textContent = fresh.length
      ? 'New badge: ' + fresh.map((b) => b.emoji + ' ' + b.name).join(', ') + '. Add a plot twist and keep going, or spark a new picture!'
      : 'Nice writing! Add a plot twist and keep going, or spark a new picture.';
    $('savedPanel').hidden = false;
    renderLibrary();
    renderProgress();
    renderQuest();
    if (fresh.length) toast('Badge unlocked: ' + fresh[0].name + '!');
  }

  function openStory(s) {
    store.settings.level = s.level;
    state.current = snapshot(s);
    const d = draft();
    d.text = Object.assign({}, s.text);
    d.twist = s.twist || null;
    d.savedId = s.id;
    renderLevels();
    setCurrent(s);
    $('writeCard').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }

  function deleteStory(s) {
    if (!window.confirm('Delete this story? This cannot be undone.')) return;
    store.stories = store.stories.filter((x) => x.id !== s.id);
    Object.values(store.drafts).forEach((d) => { if (d.savedId === s.id) d.savedId = null; });
    persist();
    renderLibrary();
    renderProgress();
  }

  function renderLibrary() {
    $('storyCount').textContent = String(store.stories.length);
    $('favCount').textContent = String(store.favourites.length);

    const stories = store.stories.slice().sort((a, b) => b.savedAt - a.savedAt);
    $('panelStories').replaceChildren(stories.length
      ? h('ul', { class: 'shelf' }, stories.map((s) => h('li', { class: 'shelf-item' },
        h('img', { src: s.url, alt: '', loading: 'lazy' }),
        h('div', { class: 'shelf-body' },
          h('strong', null, (s.composed[0] || '').slice(0, 70) + ((s.composed[0] || '').length > 70 ? '...' : '')),
          h('small', null, `${LEVELS[s.level] ? LEVELS[s.level].name : 'Level'} · ${s.wordCount} words · ${new Date(s.savedAt).toLocaleDateString()}`),
          h('div', { class: 'shelf-actions' },
            h('button', { type: 'button', class: 'ghost-btn', onclick: () => openStory(s) }, 'Open'),
            h('button', { type: 'button', class: 'ghost-btn danger', onclick: () => deleteStory(s) }, 'Delete'))))))
      : h('p', { class: 'empty' }, 'Your saved stories will live here. Write one and press “Save my story”.'));

    $('panelFavs').replaceChildren(store.favourites.length
      ? h('ul', { class: 'shelf' }, store.favourites.map((f) => h('li', { class: 'shelf-item' },
        h('img', { src: f.url, alt: '', loading: 'lazy' }),
        h('div', { class: 'shelf-body' },
          h('strong', null, f.prompt),
          h('div', { class: 'shelf-actions' },
            h('button', { type: 'button', class: 'ghost-btn', onclick: () => { setCurrent(f); $('writeCard').scrollIntoView({ behavior: 'smooth' }); } }, 'Write about this'),
            h('button', { type: 'button', class: 'ghost-btn danger', onclick: () => toggleFav(f) }, 'Remove'))))))
      : h('p', { class: 'empty' }, 'Tap the heart on a picture you love to keep it here.'));

    $('panelBadges').replaceChildren(
      h('p', { class: 'badge-stats' }, `${store.stories.length} stories · ${totalWords(store)} words · ${store.wordsUsed.length} power words used`),
      h('ul', { class: 'badges' }, BADGES.map((b) => {
        const got = store.badges.includes(b.id);
        return h('li', { class: 'badge' + (got ? ' got' : '') },
          h('span', { class: 'badge-emoji', 'aria-hidden': 'true' }, got ? b.emoji : '🔒'),
          h('strong', null, b.name), h('small', null, b.desc));
      })));
  }

  function renderQuest() {
    const picked = !!state.current;
    const d = picked ? draft() : null;
    const written = picked && rawTexts().some(part => part.text.length > 0);
    const record = d && store.stories.find(story => story.id === d.savedId);
    const saved = !!record && JSON.stringify(record.text) === JSON.stringify(d.text);
    [['storyPickStep', picked], ['storyWriteStep', written], ['storySaveStep', saved]].forEach(([id, done]) => {$(id)?.classList.toggle('done', done);$(id)?.setAttribute('aria-label',$(id).textContent+(done?' · complete':' · not complete'));});
    const n = store.stories.length;
    const target = [1,3,10].find(target => target > n);
    $('storyQuestGoal').textContent = saved ? 'Adventure kept! Revisit it in your story atlas below.' : target ? `${n} / ${target} stories · ${target === 1 ? 'Bring home your first story' : target === 3 ? 'Become a Story Maker' : 'Become a Story Master'}` : `${n} stories in your atlas · Which world will you explore next?`;
  }

  function renderProgress() {
    renderQuest();
    const n = store.stories.length;
    $('progressChip').textContent = n
      ? `✍️ ${n} ${n === 1 ? 'story' : 'stories'} · ${totalWords(store)} words written`
      : 'Pick a picture, then write your story';
  }

  function toggleFav(item) {
    const url = item.url;
    if (isFav(url)) store.favourites = store.favourites.filter((f) => f.url !== url);
    else store.favourites.push(snapshot(item));
    persist();
    renderFavBtn();
    renderLibrary();
  }

  function selectTab(name) {
    const map = { stories: ['tabStories', 'panelStories'], favs: ['tabFavs', 'panelFavs'], badges: ['tabBadges', 'panelBadges'] };
    Object.entries(map).forEach(([k, [tab, panel]]) => {
      $(tab).setAttribute('aria-selected', String(k === name));
      $(panel).hidden = k !== name;
    });
  }

  // ---------- picture sources ----------
  async function generateFirst() {
    setStatus('Making your very first picture... this can take half a minute.');
    const data = await api('/api/random-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generate_new: true }),
    });
    await preload(data.url);
    state.pool = [data];
    setCurrent(data);
  }

  async function generateInBackground() {
    if (state.generating || state.pendingNew) return;
    state.generating = true;
    try {
      const theme = store.settings.theme;
      const data = await api('/api/random-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generate_new: true, theme: theme !== 'all' ? theme : undefined }),
      });
      if (!data.generated) return;      // limit reached: quietly keep what we have
      await preload(data.url);
      state.pendingNew = data;
      $('newReady').hidden = false;
    } catch (e) {
      console.error(e);
    } finally {
      state.generating = false;
    }
  }

  async function spark() {
    if (state.busy) return;
    state.busy = true;
    $('sparkBtn').disabled = true;
    clearTimeout(state.spinTimeout);
    $('pick3').hidden = true;
    try {
      state.rollCount++;
      if (!state.pool.length) await loadPool();
      if (state.rollCount % NEW_EVERY === 0) generateInBackground();
      if (!state.pool.length) {
        await generateFirst();
      } else {
        const others = state.pool.filter((i) => !state.current || i.url !== state.current.url);
        const target = pick(others.length ? others : state.pool);
        await spinTo(target);
        setCurrent(target);
      }
    } catch (e) {
      console.error(e);
      setStatus('Something went wrong - please try again');
    } finally {
      state.busy = false;
      $('sparkBtn').disabled = false;
    }
  }

  async function choose3() {
    const theme = store.settings.theme;
    try {
      const data = await api('/api/existing-images?limit=3' + (theme !== 'all' ? '&theme=' + encodeURIComponent(theme) : ''));
      const items = data.images || [];
      if (!items.length) { setStatus('No pictures yet - press Spark to make one.'); return; }
      $('pick3Grid').replaceChildren(...items.map((it) => h('button', {
        type: 'button', class: 'pick-card',
        onclick: () => { $('pick3').hidden = true; setCurrent(it); $('image').scrollIntoView({ block: 'center' }); },
      }, h('img', { src: it.url, alt: '' }), h('span', null, it.prompt))));
      $('pick3').hidden = false;
      $('pick3').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
    } catch (e) {
      console.error(e);
      setStatus('Could not load pictures - please try again');
    }
  }

  async function daily(quiet) {
    try {
      const data = await api('/api/daily');
      setCurrent(data, { daily: true });
      return true;
    } catch (e) {
      if (!quiet) setStatus('No Today’s Spark yet - press Spark to make a picture.');
      return false;
    }
  }

  // ---------- classroom mode ----------
  function fmt(s) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

  function setClassroom(on) {
    document.body.classList.toggle('classroom', on);
    $('classroomBtn').setAttribute('aria-pressed', String(on));
    $('classTimer').hidden = !on;
    if (!on) stopTimer(true);
  }

  function stopTimer(reset) {
    clearInterval(state.timer.id);
    state.timer.id = null;
    $('timerToggle').textContent = 'Start';
    if (reset) { state.timer.left = TIMER_SECS; $('timerText').textContent = fmt(TIMER_SECS); }
  }

  function toggleTimer() {
    if (state.timer.id) { stopTimer(false); return; }
    $('timerToggle').textContent = 'Pause';
    state.timer.id = setInterval(() => {
      state.timer.left -= 1;
      $('timerText').textContent = fmt(Math.max(state.timer.left, 0));
      if (state.timer.left <= 0) {
        stopTimer(false);
        toast('Time is up - pencils down. Great writing, everyone!');
      }
    }, 1000);
  }

  // ---------- print ----------
  function printStory() {
    const parts = composed();
    if (!parts.length) { toast('Write a little first, then print.'); return; }
    $('printSheet').replaceChildren(
      h('h1', null, 'My TinySpark story'),
      h('img', { src: state.current.url, alt: state.current.prompt }),
      h('p', { class: 'print-prompt' }, state.current.prompt),
      ...parts.map((p) => h('p', { class: 'print-text' }, p)),
      h('p', { class: 'print-foot' }, 'Written with TinySpark Story Starter'));
    window.print();
  }

  // ---------- wiring ----------
  function init() {
    renderLevels();
    renderThemes();
    renderLibrary();
    renderProgress();
    $('elevenplusLink').href = CFG.elevenplusUrl;
    if (!('speechSynthesis' in window)) $('readBtn').hidden = true;
    else $('readBtn').hidden = false;
    $('timerText').textContent = fmt(TIMER_SECS);

    $('starterBtn').addEventListener('click', () => {setCurrent(STARTER_WORLD);$('steps').querySelector('textarea')?.focus();});
    $('sparkBtn').addEventListener('click', spark);
    $('pick3Btn').addEventListener('click', choose3);
    $('dailyBtn').addEventListener('click', () => daily(false));
    $('classroomBtn').addEventListener('click', () => setClassroom(!document.body.classList.contains('classroom')));
    $('timerToggle').addEventListener('click', toggleTimer);
    $('timerReset').addEventListener('click', () => stopTimer(true));
    $('seeNewBtn').addEventListener('click', () => {
      const d = state.pendingNew;
      state.pendingNew = null;
      $('newReady').hidden = true;
      if (d) { state.pool.unshift(d); setCurrent(d); }
    });
    $('favBtn').addEventListener('click', () => { if (state.current) toggleFav(state.current); });
    $('twistBtn').addEventListener('click', addTwist);
    $('readBtn').addEventListener('click', toggleReading);
    $('checkBtn').addEventListener('click', runCheck);
    $('printBtn').addEventListener('click', printStory);
    $('saveBtn').addEventListener('click', saveStory);

    [['tabStories', 'stories'], ['tabFavs', 'favs'], ['tabBadges', 'badges']]
      .forEach(([id, name]) => $(id).addEventListener('click', () => selectTab(name)));

    window.addEventListener('beforeunload', persist);
    window.addEventListener('pagehide', stopReading);

    // First impression: show today's picture straight away.
    // Returning writers pick up where they left off.
    const last = store.last;
    const d = last && store.drafts[last.url];
    const hasDraft = d && Object.values(d.text || {}).some((t) => (t || '').trim());
    if (hasDraft) {
      setCurrent(last);
      toast('Welcome back - your story is waiting for you.');
    }
    loadPool().then(async () => {
      if (hasDraft) return;
      if (!(await daily(true))) setCurrent(state.pool.length ? pick(state.pool) : STARTER_WORLD);
    });
  }

  init();
})();
