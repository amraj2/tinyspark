/* Typing Hero UI: menu, tour map, soundcheck, play HUD, results, settings.
 * All progress lives in this browser (localStorage); no accounts. */
(() => {
  'use strict';
  const TH = window.TH;
  const C = TH.core;
  const CFG = TH.CFG;
  const $ = (id) => document.getElementById(id);

  function h(tag, props, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (v === true) e.setAttribute(k, '');
      else if (v !== false && v != null) e.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid != null) e.append(kid.nodeType ? kid : String(kid));
    return e;
  }

  // ---------- storage ----------
  const STORE_KEY = 'tinyspark-typinghero-v1';
  const defaults = () => ({
    levels: {}, keys: {},
    settings: { rock: 'chill', tempo: 'normal', keyboard: 'auto', music: true, sfx: true, musicVol: 0.5, sfxVol: 0.8, muted: false, big: false },
    totals: { hits: 0, ms: 0, sessions: 0, bestWpm: 0 },
  });
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (raw && typeof raw === 'object') {
        const d = defaults();
        return {
          levels: raw.levels || {}, keys: raw.keys || {},
          settings: Object.assign(d.settings, raw.settings || {}),
          totals: Object.assign(d.totals, raw.totals || {}),
        };
      }
    } catch (e) { /* ignore */ }
    return defaults();
  }
  let S = load();
  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };

  // ---------- curriculum helpers ----------
  const LEVELS = CFG.levels;
  const BY_ID = Object.fromEntries(LEVELS.map((l) => [l.id, l]));
  const WORLD = Object.fromEntries(CFG.worlds.map((w) => [w.id, w]));
  const PASS = 2;
  const rec = (id) => S.levels[id] || { stars: 0, best: 0, acc: 0, wpm: 0, plays: 0 };
  const passed = (l) => rec(l.id).stars >= PASS;
  const unlocked = (l) => !l.requires || passed(BY_ID[l.requires]);
  const MODE_ICON = { notes: '🎵', words: '📝', sentences: '🎤' };
  const RANKS = [
    { min: 0, name: 'Roadie' }, { min: 150, name: 'Garage Band' }, { min: 500, name: 'Local Legend' },
    { min: 1500, name: 'Headliner' }, { min: 4000, name: 'Rock Star' }, { min: 10000, name: 'Typing Hero' },
  ];
  const rankFor = (hits) => RANKS.filter((r) => hits >= r.min).pop();

  function nextUp() {
    return LEVELS.find((l) => !l.optional && !passed(l) && unlocked(l)) || LEVELS.filter((l) => !l.optional).slice(-1)[0];
  }
  function playedKeys() {
    const set = new Set();
    LEVELS.forEach((l) => { if (rec(l.id).plays > 0) l.keys.forEach((k) => set.add(k)); });
    return [...set];
  }
  const troubleNow = () => C.troubleKeys(S.keys, playedKeys());
  const fingerName = (ch) => CFG.fingerNames[C.fingerOf(ch)] || 'finger';
  const nice = (ch) => (ch === ' ' ? 'Space' : ch);

  // ---------- toast ----------
  let toastTimer = null;
  function toast(msg) {
    const t = $('thToast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 3800);
  }

  // ---------- on-screen keyboard ----------
  function buildKeyboard(container) {
    container.replaceChildren();
    const keys = {};
    const shifts = [];
    CFG.rows.forEach((row, ri) => {
      const r = h('div', { class: 'kb-row kb-r' + ri });
      if (ri === 3) {
        const s = h('div', { class: 'kb-key kb-shift f-rp', 'data-shift': 'right-hand' }, '⇧');
        shifts.push(s);
        r.append(s);
      }
      row.forEach((k) => {
        const f = C.fingerOf(k);
        const el = h('div', { class: 'kb-key f-' + f + (k === ' ' ? ' kb-space' : ''), 'data-k': k }, k === ' ' ? 'space' : k.toUpperCase());
        keys[k] = el;
        r.append(el);
      });
      if (ri === 3) {
        const s = h('div', { class: 'kb-key kb-shift f-lp', 'data-shift': 'left-hand' }, '⇧');
        shifts.push(s);
        r.append(s);
      }
      container.append(r);
    });
    const api = {
      el: container, keys,
      mode(m) {
        container.classList.toggle('kb-hints', m === 'hints');
        container.hidden = m === 'hide';
      },
      target(chars) {
        Object.values(keys).forEach((el) => el.classList.remove('kb-target'));
        shifts.forEach((el) => el.classList.remove('kb-target'));
        chars.forEach((ch) => {
          const base = keys[C.baseKey(ch)];
          if (base) base.classList.add('kb-target');
          if (C.needsShift(ch)) {
            const hand = C.handOf(ch);
            const want = hand === 'l' ? 'right-hand' : 'left-hand';
            const s = shifts.find((x) => x.getAttribute('data-shift') === want);
            if (s) s.classList.add('kb-target');
          }
        });
      },
      flash(ch, cls) {
        const el = keys[C.baseKey(ch)];
        if (!el) return;
        el.classList.add(cls);
        setTimeout(() => el.classList.remove(cls), 180);
      },
      available(chars) {
        const set = new Set(chars.map((c) => C.baseKey(c)));
        Object.entries(keys).forEach(([k, el]) => el.classList.toggle('kb-off', !set.has(k)));
      },
      heat(stats) {
        Object.entries(keys).forEach(([k, el]) => {
          el.classList.remove('heat-good', 'heat-ok', 'heat-bad', 'heat-none');
          const s = stats[k];
          const n = s ? s.hit + s.wrong + s.miss : 0;
          if (!n) { el.classList.add('heat-none'); return; }
          const a = s.hit / n;
          el.classList.add(a >= 0.9 ? 'heat-good' : a >= 0.7 ? 'heat-ok' : 'heat-bad');
        });
      },
    };
    return api;
  }

  // ---------- screen routing ----------
  let current = 'scMenu';
  let previous = 'scMenu';
  const SCREENS = ['scMenu', 'scHow', 'scMap', 'scIntro', 'scPlay', 'scResults', 'scSettings', 'scGrown'];
  function show(id) {
    if (id === 'back') id = previous === 'scSettings' ? 'scMenu' : previous;
    if (current !== 'scSettings' && id === 'scSettings') previous = current;
    if (id !== 'scPlay') stopGame();
    SCREENS.forEach((s) => { $(s).hidden = s !== id; });
    current = id;
    if (id === 'scMenu') renderMenu();
    if (id === 'scMap') renderMap();
    if (id === 'scSettings') renderSettings();
    if (id === 'scGrown') renderGrown();
    window.scrollTo(0, 0);
    const hd = $(id).querySelector('h2');
    if (hd) { hd.setAttribute('tabindex', '-1'); hd.focus({ preventScroll: true }); }
    renderTop();
  }

  function renderTop() {
    const r = rankFor(S.totals.hits);
    $('thRank').textContent = `${r.name} · ${S.totals.hits} keys`;
    const m = S.settings.muted;
    $('thMute').textContent = m ? '🔇' : '🔊';
    $('thMute').setAttribute('aria-pressed', String(m));
    document.body.classList.toggle('th-big', !!S.settings.big);
  }

  // ---------- menu ----------
  function renderMenu() {
    const n = nextUp();
    const any = LEVELS.some((l) => rec(l.id).plays > 0);
    $('btnPlay').textContent = any ? 'Continue' : 'Play';
    $('menuNext').textContent = `Up next: ${n.id} · ${n.name}`;
    const trouble = troubleNow();
    $('btnTrouble').disabled = trouble.length === 0;
    $('btnTrouble').title = trouble.length ? '' : 'Play a few songs and your trickiest keys will show up here.';
    const minutes = Math.round(S.totals.ms / 60000);
    $('menuStats').replaceChildren(
      h('span', null, `${S.totals.hits} keys typed`),
      h('span', null, `${minutes} min played`),
      h('span', null, S.totals.bestWpm ? `Best: ${S.totals.bestWpm} WPM` : 'Best WPM: play a word song!'));
    const coarse = window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(hover: hover)').matches;
    $('menuKeyboardWarn').hidden = !coarse;
  }

  // ---------- tour map ----------
  function renderMap() {
    const box = $('mapWorlds');
    box.replaceChildren(...CFG.worlds.map((w) => {
      const lvls = LEVELS.filter((l) => l.world === w.id);
      const got = lvls.reduce((n, l) => n + rec(l.id).stars, 0);
      return h('section', { class: 'th-world', style: `--wc:${w.color}` },
        h('header', null,
          h('span', { class: 'th-world-emoji', 'aria-hidden': 'true' }, w.emoji),
          h('div', null, h('h3', null, `World ${w.id}: ${w.name}`, w.optional ? h('small', null, ' (optional)') : null),
            h('p', null, w.blurb)),
          h('span', { class: 'th-world-stars' }, `★ ${got}/${lvls.length * 5}`)),
        h('div', { class: 'th-nodes' }, lvls.map((l) => {
          const r = rec(l.id);
          const open = unlocked(l);
          return h('button', {
            type: 'button', class: 'th-node' + (open ? '' : ' locked') + (passed(l) ? ' done' : '') + (l.boss ? ' boss' : ''),
            disabled: !open, onclick: () => openIntro(l),
            'aria-label': `${l.name}${open ? '' : ', locked'}${r.stars ? `, ${r.stars} stars` : ''}`,
          },
          h('span', { class: 'th-node-icon' }, open ? (l.boss ? '👑' : MODE_ICON[l.mode]) : '🔒'),
          h('span', { class: 'th-node-name' }, l.name),
          h('span', { class: 'th-node-stars' }, '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars)));
        })));
    }));
  }

  // ---------- soundcheck / intro ----------
  let sel = null;       // {level, warmed:Set}
  let introKb = null;

  function openIntro(level) {
    sel = { level, warmed: new Set() };
    renderIntro();
    show('scIntro');
  }

  function renderIntro() {
    const l = sel.level;
    $('introTitle').textContent = `${l.id === 'practice' ? '' : l.id + ' · '}${l.name}`;
    $('introBlurb').textContent = l.blurb;
    $('introTip').textContent = l.tip ? `💡 ${l.tip}` : (l.mode === 'notes' ? '💡 Match the colour: each lane is a finger.' : '💡 Eyes on the screen, not on your hands.');

    // new keys
    const focusBox = $('introFocus');
    const warm = $('introWarm');
    focusBox.replaceChildren();
    warm.replaceChildren();
    if (l.focus && l.focus.length) {
      focusBox.append(h('h3', null, 'New keys'));
      const row = h('div', { class: 'th-focus-row' });
      l.focus.forEach((k) => {
        const f = C.fingerOf(k);
        row.append(h('div', { class: 'th-focus-key f-' + f, 'data-k': k },
          h('strong', null, k === ' ' ? 'SPACE' : k),
          h('small', null, `${fingerName(k)}${C.needsShift(k) && k !== ' ' ? ' + Shift' : ''}`)));
      });
      focusBox.append(row);
      warm.append(h('p', { class: 'th-warm-hint' }, 'Warm up: press each new key once to see it light up.'));
    } else if (l.mode !== 'notes') {
      focusBox.append(h('h3', null, l.mode === 'words' ? 'Words fall slowly. Type each one, letter by letter.' : 'A line of text appears. Type it, keeping up with the pink marker.'));
    }

    // lane legend
    const legend = $('introLanes');
    legend.replaceChildren(...C.LANES.map((f) => {
      const mine = l.keys.filter((k) => C.fingerOf(k) === f && !(C.needsShift(k) && k !== k.toUpperCase() ? false : false));
      const uniq = [...new Set(mine.map((k) => (k === ' ' ? 'SPACE' : k.toUpperCase())))];
      return h('div', { class: 'th-lane f-' + f + (uniq.length ? '' : ' off') },
        h('strong', null, TH.FINGER_SHORT[f]), h('span', null, uniq.join(' ') || '-'));
    }));

    // keyboard
    introKb = buildKeyboard($('introKeyboard'));
    introKb.mode('show');
    introKb.available(l.keys);
    introKb.target(l.focus || []);

    renderOpt('optTempo', [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast']], 'tempo');
    renderOpt('optRock', [['chill', 'Chill'], ['normal', 'Normal'], ['pro', 'Pro']], 'rock');
  }

  function renderOpt(id, items, key) {
    $(id).replaceChildren(...items.map(([v, label]) => h('button', {
      type: 'button', role: 'radio', 'aria-checked': String(S.settings[key] === v),
      class: 'th-seg-btn' + (S.settings[key] === v ? ' on' : ''),
      onclick: () => { S.settings[key] = v; save(); renderOpt(id, items, key); },
    }, label)));
  }

  // ---------- play ----------
  let game = null;
  let kb = null;
  let coachTimer = null;
  let capsWarned = false;

  function keyboardMode(level) {
    const m = S.settings.keyboard;
    if (m !== 'auto') return m === 'show' ? 'show' : m === 'hints' ? 'hints' : 'hide';
    if (level.world <= 3) return 'show';
    if (level.world >= 9) return 'hints';
    return 'hints';
  }

  function say(text, ms = 3200) {
    const c = $('thCoach');
    c.textContent = text;
    clearTimeout(coachTimer);
    if (ms) coachTimer = setTimeout(() => { c.textContent = ''; }, ms);
  }

  function startLevel() {
    const level = sel.level;
    stopGame();
    capsWarned = false;
    TH.audio.ensure();
    TH.audio.setVolume({ music: S.settings.musicVol, sfx: S.settings.sfx ? S.settings.sfxVol : 0, muted: S.settings.muted });
    show('scPlay');
    kb = buildKeyboard($('thKeyboard'));
    kb.mode(keyboardMode(level));
    kb.available(level.keys);
    $('hudLevel').textContent = `${level.id === 'practice' ? '' : level.id + ' · '}${level.name}`;
    $('hudSpeedLabel').textContent = level.mode === 'notes' ? 'Keys/min' : 'WPM';
    $('thPause').hidden = true;
    $('thStage').dataset.mood = 'ok';
    $('thStage').classList.remove('spark');
    say(level.tip || 'Eyes on the stage. Home row fingers ready!', 5000);
    game = new TH.Game({
      level, canvas: $('thCanvas'), art: TH.art,
      settings: { rock: S.settings.rock, tempo: S.settings.tempo, music: S.settings.music },
      hooks: {
        hud: onHud,
        correct: (ch) => kb.flash(ch, 'kb-ok'),
        wrong: (exp, got) => {
          kb.flash(got, 'kb-bad');
          kb.flash(exp, 'kb-hint');
          say(`Oops, ${nice(got)}. ${nice(exp)} is typed with your ${fingerName(exp).toLowerCase()}.`);
        },
        spark: (on) => $('thStage').classList.toggle('spark', on),
        end: onEnd,
      },
    });
    game.start();
  }

  function onHud(g, t) {
    $('hudScore').textContent = g.score.toLocaleString();
    $('hudCombo').textContent = g.combo;
    $('hudMult').textContent = 'x' + g.mult();
    $('hudMeter').style.height = Math.max(0, Math.min(100, g.meter)) + '%';
    $('hudMeter').className = g.meter < 30 ? 'low' : g.meter < 60 ? 'mid' : 'high';
    $('hudSpark').style.height = Math.max(0, Math.min(100, g.spark)) + '%';
    $('hudSpark').classList.toggle('ready', g.spark >= 50 && !g.sparkOn);
    $('hudSparkHint').textContent = g.sparkOn ? 'ON!' : g.spark >= 50 ? 'Press Enter!' : 'Enter';
    const attempts = g.hits + g.misses + g.wrong;
    $('hudAcc').textContent = attempts ? Math.round((g.hits / attempts) * 100) + '%' : '100%';
    const total = g.chart.total || 1;
    let done = 0;
    if (g.chart.kind === 'notes') done = g.cursor;
    else if (g.chart.kind === 'words') done = g.words.filter((w) => w.state !== 0).length * (total / g.words.length);
    else done = g.chart.lines.slice(0, g.s.i).reduce((n, l) => n + l.length, 0) + g.s.idx;
    $('hudProgress').style.width = Math.min(100, (done / total) * 100) + '%';
    const active = Math.max(5000, (g.lastCorrectT || t) - (g.firstInputT || 0));
    const rate = g.hits / (active / 60000);
    $('hudSpeed').textContent = g.hits < 4 ? '-' : String(Math.round(g.chart.kind === 'notes' ? rate : rate / 5));
    $('thStage').dataset.mood = g.meter < 28 ? 'bad' : g.combo >= 20 ? 'great' : 'ok';
    if (kb) kb.target(g.nextChars(t));
  }

  function stopGame() {
    if (game) { game.destroy(); game = null; }
    clearTimeout(coachTimer);
  }

  function togglePause(force) {
    if (!game || game.ended) return;
    const wantPause = force === undefined ? !game.paused : force;
    if (wantPause && !game.paused) { game.pause(); $('thPause').hidden = false; $('pauseResume').focus(); }
    else if (!wantPause && game.paused) { game.resume(); $('thPause').hidden = true; }
  }

  // ---------- results ----------
  let lastResult = null;

  function onEnd(res) {
    const level = sel.level;
    lastResult = res;
    const before = rankFor(S.totals.hits).name;
    const wasPassed = level.id !== 'practice' && passed(level);
    // keys + totals
    Object.entries(res.keyStats).forEach(([k, s]) => {
      const o = S.keys[k] || { hit: 0, wrong: 0, miss: 0, ms: 0 };
      o.hit += s.hit; o.wrong += s.wrong; o.miss += s.miss; o.ms += s.ms;
      S.keys[k] = o;
    });
    S.totals.hits += res.hits;
    S.totals.ms += res.durationMs;
    S.totals.sessions += 1;
    if (res.wpm > S.totals.bestWpm) S.totals.bestWpm = res.wpm;
    let isBest = false;
    if (level.id !== 'practice') {
      const r = rec(level.id);
      isBest = res.score > r.best;
      S.levels[level.id] = {
        stars: Math.max(r.stars, res.stars), best: Math.max(r.best, res.score),
        acc: Math.max(r.acc, res.accuracy), wpm: Math.max(r.wpm, res.wpm), plays: r.plays + 1,
      };
    }
    save();
    if (res.failed) TH.audio.fail(); else TH.audio.fanfare(res.stars);
    renderResults(res, level, { wasPassed, isBest, rankBefore: before });
    show('scResults');
  }

  function renderResults(res, level, info) {
    $('resTitle').textContent = res.failed ? 'The crowd went home...' : 'Song complete!';
    $('resStars').replaceChildren(...[0, 1, 2, 3, 4].map((i) => h('span', { class: 'th-star' + (i < res.stars ? ' on' : '') }, '★')));
    const verdicts = [
      'Everyone starts somewhere. Slow it down and focus on accuracy first.',
      'Good start! Aim for 75% accuracy to move on.',
      'Nice typing! The next song is unlocked.',
      'Great typing! Smooth and accurate.',
      'Fantastic! Almost perfect.',
      'PERFECT! You are a Typing Hero.',
    ];
    $('resVerdict').textContent = res.failed ? 'Try again at a slower speed. Accuracy comes first, speed comes later.' : verdicts[res.stars];
    const speedLabel = level.mode === 'notes' ? 'Keys/min' : 'WPM';
    const speedVal = level.mode === 'notes' ? res.keysPerMin : res.wpm;
    const nums = [
      ['Score', res.score.toLocaleString() + (info.isBest ? ' 🏆' : '')],
      ['Accuracy', Math.round(res.accuracy * 100) + '%'],
      ['Best streak', res.maxCombo],
      [speedLabel, speedVal + (level.wpm ? ` / goal ${level.wpm}` : '')],
      ['Hits', res.hits],
      ['Wrong keys', res.wrong],
      ['Missed', res.misses],
    ];
    $('resNumbers').replaceChildren(...nums.map(([k, v]) => h('div', { class: 'th-num' }, h('small', null, k), h('strong', null, String(v)))));

    // unlock message
    const un = $('resUnlock');
    un.hidden = true;
    if (level.id !== 'practice' && !info.wasPassed && res.stars >= PASS) {
      const idx = LEVELS.indexOf(level);
      const nxt = LEVELS.slice(idx + 1).find((l) => l.requires === level.id);
      if (nxt) { un.textContent = `🔓 Unlocked: ${nxt.id} ${nxt.name}`; un.hidden = false; }
    }
    const rankNow = rankFor(S.totals.hits).name;
    if (rankNow !== info.rankBefore) toast(`New rank: ${rankNow}!`);

    // coaching
    const worst = Object.entries(res.keyStats)
      .map(([k, s]) => ({ k, bad: s.wrong + s.miss, n: s.hit + s.wrong + s.miss }))
      .filter((x) => x.bad >= 2)
      .sort((a, b) => b.bad - a.bad)
      .slice(0, 3);
    const tips = [];
    if (worst.length) tips.push(`Trickiest keys: ${worst.map((x) => `${nice(x.k)} (${fingerName(x.k).toLowerCase()})`).join(', ')}. Practise just those in Trouble spots.`);
    if (res.accuracy < 0.75) tips.push('Slow down. Pick Slow speed and aim for clean hits, not fast ones.');
    else if (res.wrong > res.misses * 1.5 && res.wrong > 3) tips.push('Look for the finger lane first, then press. Wrong keys cost more than a late one.');
    else if (res.misses > res.wrong * 1.5 && res.misses > 3) tips.push('Notes are slipping past. Press as the letter touches the pad.');
    if (!tips.length) tips.push('Clean run! Try the next song, or raise the speed for a challenge.');
    $('resCoach').replaceChildren(h('h3', null, 'Coach says'), h('ul', null, tips.map((t) => h('li', null, t))));

    // heatmap
    const hk = buildKeyboard($('resHeat'));
    hk.heat(res.keyStats);
    hk.available(level.keys);

    // buttons
    const idx = LEVELS.indexOf(level);
    const nxt = level.id === 'practice' ? null : LEVELS.slice(idx + 1).find((l) => !l.optional || l.world === level.world);
    const nextBtn = $('resNext');
    nextBtn.hidden = !nxt;
    nextBtn.disabled = !!nxt && !unlocked(nxt);
    nextBtn.textContent = nxt ? `Next: ${nxt.name}` : 'Next song';
    nextBtn.onclick = () => nxt && openIntro(nxt);
    $('resRetry').onclick = () => { renderIntro(); startLevel(); };
    $('resMap').onclick = () => show('scMap');
    const tr = troubleNow();
    $('resTrouble').hidden = tr.length === 0;
    $('resTrouble').onclick = openPractice;
  }

  function openPractice() {
    const trouble = troubleNow();
    if (!trouble.length) { toast('Play a few songs and your trickiest keys will show up here.'); return; }
    const lvl = C.practiceLevel(trouble, playedKeys());
    openIntro(lvl);
  }

  // ---------- settings ----------
  function seg(items, key, after) {
    return h('div', { class: 'th-seg', role: 'radiogroup' }, items.map(([v, label]) => h('button', {
      type: 'button', role: 'radio', 'aria-checked': String(S.settings[key] === v),
      class: 'th-seg-btn' + (S.settings[key] === v ? ' on' : ''),
      onclick: () => { S.settings[key] = v; save(); renderSettings(); if (after) after(); },
    }, label)));
  }
  function toggle(key, label) {
    return h('label', { class: 'th-toggle' }, h('input', { type: 'checkbox', checked: !!S.settings[key], onchange: (e) => { S.settings[key] = e.target.checked; save(); applyAudio(); renderTop(); } }), ' ' + label);
  }
  function slider(key, label) {
    return h('label', { class: 'th-slider' }, h('span', null, label),
      h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(S.settings[key]), oninput: (e) => { S.settings[key] = Number(e.target.value); save(); applyAudio(); } }));
  }
  function applyAudio() {
    TH.audio.setVolume({ music: S.settings.music ? S.settings.musicVol : 0, sfx: S.settings.sfx ? S.settings.sfxVol : 0, muted: S.settings.muted });
  }

  function renderSettings() {
    $('settingsBody').replaceChildren(
      h('h3', null, 'Crowd mood'),
      h('p', { class: 'th-help' }, 'Chill: no fail, generous timing. Normal: the crowd can leave. Pro: tight timing.'),
      seg([['chill', 'Chill'], ['normal', 'Normal'], ['pro', 'Pro']], 'rock'),
      h('h3', null, 'Speed'),
      seg([['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast']], 'tempo'),
      h('h3', null, 'On-screen keyboard'),
      h('p', { class: 'th-help' }, 'Auto shows the keyboard early on, then fades it so you learn without looking.'),
      seg([['auto', 'Auto'], ['show', 'Always'], ['hints', 'Hints only'], ['hide', 'Hidden']], 'keyboard'),
      h('h3', null, 'Sound'),
      toggle('music', 'Backing music'), toggle('sfx', 'Hit sounds'),
      slider('musicVol', 'Music volume'), slider('sfxVol', 'Effects volume'),
      h('h3', null, 'Reading'),
      toggle('big', 'Bigger letters and text'));
  }

  // ---------- grown-ups ----------
  function renderGrown() {
    const played = LEVELS.filter((l) => rec(l.id).plays > 0);
    const stars = LEVELS.reduce((n, l) => n + rec(l.id).stars, 0);
    const keyRows = Object.entries(S.keys)
      .map(([k, s]) => ({ k, n: s.hit + s.wrong + s.miss, acc: s.hit / Math.max(1, s.hit + s.wrong + s.miss), ms: s.hit ? s.ms / s.hit : 0 }))
      .filter((x) => x.n >= 4)
      .sort((a, b) => a.acc - b.acc);
    $('grownBody').replaceChildren(
      h('p', { class: 'th-lead' }, 'Typing Hero teaches touch typing: the right finger for every key, accuracy first, then speed.'),
      h('div', { class: 'th-numbers' }, [
        ['Songs played', S.totals.sessions], ['Time played', Math.round(S.totals.ms / 60000) + ' min'],
        ['Keys typed', S.totals.hits], ['Best WPM', S.totals.bestWpm || '-'],
        ['Levels tried', `${played.length}/${LEVELS.length}`], ['Stars', stars],
      ].map(([k, v]) => h('div', { class: 'th-num' }, h('small', null, k), h('strong', null, String(v))))),
      h('h3', null, 'Keys to practise'),
      keyRows.length
        ? h('table', { class: 'th-table' },
          h('thead', null, h('tr', null, ['Key', 'Finger', 'Accuracy', 'Attempts'].map((x) => h('th', null, x)))),
          h('tbody', null, keyRows.slice(0, 12).map((r) => h('tr', null,
            h('td', null, nice(r.k).toUpperCase()), h('td', null, fingerName(r.k)),
            h('td', null, Math.round(r.acc * 100) + '%'), h('td', null, r.n)))))
        : h('p', null, 'Play a few songs and key-by-key accuracy will appear here.'),
      h('h3', null, 'How to help'),
      h('ul', { class: 'th-how' }, [
        'Short and often beats long and rare: 10 to 15 minutes a day works well.',
        'Sit tall with feet flat, wrists floating just above the keys, eyes on the screen.',
        'Encourage "no peeking". The on-screen keyboard fades on purpose.',
        'Accuracy first. Speed follows naturally once the fingers know where to go.',
        'Use "Trouble spots" to drill the keys that are hardest right now.',
      ].map((t) => h('li', null, t))),
      h('div', { class: 'th-actions' }, h('button', {
        class: 'th-btn th-btn-ghost', type: 'button',
        onclick: () => {
          if (!window.confirm('Reset all Typing Hero progress on this device? This cannot be undone.')) return;
          S = defaults();
          save();
          applyAudio();
          show('scMenu');
          toast('Progress reset.');
        },
      }, 'Reset progress')));
  }

  // ---------- keyboard input ----------
  document.addEventListener('keydown', (ev) => {
    if (ev.isComposing || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (current === 'scPlay' && game) {
      if (ev.key === 'Escape') { ev.preventDefault(); togglePause(); return; }
      if (game.paused) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); togglePause(false); }
        return;
      }
      if (ev.key === 'Tab') return;
      ev.preventDefault();
      if (ev.repeat) return;
      if (!capsWarned && ev.getModifierState && ev.getModifierState('CapsLock')) {
        capsWarned = true;
        say('Caps Lock is on! Press Caps Lock to turn it off.', 6000);
      }
      game.handleKey(ev);
      return;
    }
    if (current === 'scIntro' && sel) {
      const tag = document.activeElement ? document.activeElement.tagName : 'BODY';
      const onControl = /^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(tag);
      if (ev.key === 'Enter' && (!onControl || document.activeElement.id === 'introStart')) {
        ev.preventDefault();
        startLevel();
        return;
      }
      if (ev.key === ' ' && !onControl) ev.preventDefault();
      if (ev.key.length === 1 && sel.level.focus && sel.level.focus.includes(ev.key)) {
        sel.warmed.add(ev.key);
        introKb.flash(ev.key, 'kb-ok');
        const el = $('introFocus').querySelector(`[data-k="${CSS.escape(ev.key)}"]`);
        if (el) el.classList.add('warmed');
        TH.audio.ensure();
        TH.audio.blip(true);
        if (sel.warmed.size === sel.level.focus.length) {
          $('introWarm').replaceChildren(h('p', { class: 'th-warm-hint ok' }, 'Warm-up done! Press Enter to start.'));
        }
      }
    }
  });

  window.addEventListener('blur', () => { if (current === 'scPlay') togglePause(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && current === 'scPlay') togglePause(true); });

  // ---------- wiring ----------
  document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => show(b.getAttribute('data-go'))));
  $('btnPlay').addEventListener('click', () => openIntro(nextUp()));
  $('btnMap').addEventListener('click', () => show('scMap'));
  $('btnTrouble').addEventListener('click', openPractice);
  $('btnHow').addEventListener('click', () => show('scHow'));
  $('btnGrown').addEventListener('click', () => show('scGrown'));
  $('introStart').addEventListener('click', startLevel);
  $('hudPause').addEventListener('click', () => togglePause(true));
  $('pauseResume').addEventListener('click', () => togglePause(false));
  $('pauseRestart').addEventListener('click', () => { startLevel(); });
  $('pauseQuit').addEventListener('click', () => show('scMap'));
  $('thSettingsBtn').addEventListener('click', () => show('scSettings'));
  $('thMute').addEventListener('click', () => {
    S.settings.muted = !S.settings.muted;
    save();
    applyAudio();
    renderTop();
  });

  TH.ui = { show, openIntro, getState: () => S, levels: LEVELS, getGame: () => game };
  TH.art.load().finally(() => {
    show('scMenu');
  });
})();
