/* Spark Stumble - a Stumble Guys style knockout race where answering questions is the controls.
 *
 * Flow: lobby -> "finding players" -> [splash -> countdown -> race -> results] x 3 rounds -> summary
 * Race: every runner auto-runs down a course with question gates. Reach a gate, answer it.
 *       Right answer = speed boost. Wrong answer / timeout = stumble. First N across the line qualify.
 */
(() => {
  'use strict';

  /* ------------------------------------------------------------------ config */
  const BANK = window.QUESTION_BANK;
  const SUBJECTS = Object.keys(BANK);
  const SAVE_KEY = 'sparkstumble-v1';

  const ROUNDS = [
    { name: 'Qualifier',   qualify: 20, gates: 4, blurb: 'Top 20 of 32 go through' },
    { name: 'Semi-final',  qualify: 10, gates: 4, blurb: 'Top 10 of 20 go through' },
    { name: 'Grand Final', qualify: 1,  gates: 5, blurb: 'First across the line wins the crown!' },
  ];
  const STAGE_LABELS = ['–', 'Qualifier', 'Semi-final', 'Final', 'Champion'];
  const FIELD = 32;
  const GATE_SPACING = 950;     // world units between gates
  const START_PAD = 700;        // start line -> first gate
  const FINISH_PAD = 700;       // last gate -> finish line
  const SKEW = 110;             // oblique-projection shear that gives the flat track some depth
  const GATE_TIME = 22;         // seconds the player gets per gate
  const GATE_TIME_RELAXED = 45;
  const STUMBLE_TIME = 1.8;
  const MAX_PROMPT_CHARS = 420; // keep long reading passages out - they are unfair in a race

  /* The roster: 50 characters. `unlock` is free, coins (bought in the lobby), level or crowns (granted automatically
   * when reached). Each character has its own animation sheet - see static/art/README.md. */
  const PALETTE = ['#2f7bff', '#ff6b6b', '#ff9f43', '#ffd23f', '#3ddc84', '#2ec4b6', '#8a6bff', '#ff6bd6', '#b5651d', '#8e9aaf', '#e04f5f', '#4d9bff'];
  const CHARACTERS = [
    ['Pip', 'space pup'], ['Nova', 'star scout'], ['Bixby', 'robot buddy'], ['Zog', 'friendly alien'],
  ].map(([name, kind]) => ({ name, kind, unlock: { free: true } })).concat([
    ['Waffles', 'breakfast bandit', 40], ['Mochi', 'squishy sprinter', 50], ['Ziggy', 'lightning lizard', 60], ['Juno', 'moon cadet', 70],
    ['Fizz', 'fizzy fox', 80], ['Tango', 'dancing dino', 90], ['Biscuit', 'crumb captain', 100], ['Pogo', 'bouncy bunny', 110],
    ['Nimbus', 'cloud surfer', 120], ['Quill', 'speedy hedgehog', 130], ['Rusty', 'rocket raccoon', 140], ['Sprocket', 'clockwork cat', 150],
    ['Truffle', 'sniffing pig', 160], ['Wiggles', 'wavy worm', 170], ['Blip', 'pixel ghost', 180], ['Clover', 'lucky lamb', 190],
    ['Domino', 'panda pilot', 200], ['Ember', 'baby dragon', 220], ['Fudge', 'chocolate bear', 240], ['Gadget', 'inventor mouse', 260],
    ['Hazel', 'acorn acrobat', 280], ['Kiwi', 'flightless flyer', 300], ['Lumi', 'glow-worm', 320], ['Maple', 'forest fawn', 340],
    ['Nugget', 'golden chick', 360], ['Olive', 'owl navigator', 380], ['Pepper', 'spicy penguin', 400], ['Rocco', 'rock troll', 430],
    ['Sunny', 'sunbeam sprite', 460], ['Taffy', 'stretchy giraffe', 500],
  ].map(([name, kind, coins]) => ({ name, kind, unlock: { coins } }))).concat([
    ['Orion', 'hunter of the stars', 3], ['Comet', 'tail-blazing terrier', 4], ['Luna', 'moonlit wolf', 5], ['Atlas', 'planet-carrying giant', 6],
    ['Vega', 'star-bright swan', 8], ['Cosmo', 'galaxy gorilla', 10], ['Astra', 'orbit owl', 12], ['Zenith', 'sky-high stag', 15],
    ['Polaris', 'north-star narwhal', 18], ['Pulsar', 'beat-box beetle', 20],
  ].map(([name, kind, level]) => ({ name, kind, unlock: { level } }))).concat([
    ['Regal', 'lion king', 1], ['Phoenix', 'firebird', 2], ['Kraken', 'deep-sea racer', 3],
    ['Sabre', 'tiger champion', 5], ['Aurora', 'northern-lights fox', 7], ['Apex', 'legend of legends', 10],
  ].map(([name, kind, crowns]) => ({ name, kind, unlock: { crowns } })));
  CHARACTERS.forEach((c, i) => { c.id = c.name.toLowerCase(); c.color = PALETTE[i % PALETTE.length]; });
  const characterById = (id) => CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];

  /* ------------------------------------------------------------------ helpers */
  const $ = (id) => document.getElementById(id);
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const ordinal = (n) => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
  const stripTags = (html) => html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '');
  const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const today = () => new Date().toISOString().slice(0, 10);

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const mix = (c) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
    return `rgb(${mix(n >> 16)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
  }

  /* Questions that are short enough to answer inside a race, grouped by subject and difficulty level (1-3). */
  const POOLS = {};
  for (const subject of SUBJECTS) {
    POOLS[subject] = { 1: [], 2: [], 3: [] };
    BANK[subject].questions.forEach((q, i) => {
      if (stripTags(q[0]).length > MAX_PROMPT_CHARS) return;
      const level = q[4] && q[4][1] ? q[4][1] : 2;
      POOLS[subject][level].push(i);
    });
  }

  /* Chance of an easier / typical / harder question: later rounds are harder, and children who have been
   * answering well move a little further towards the hard end. */
  const LEVEL_MIX = [[0.55, 0.35, 0.10], [0.30, 0.45, 0.25], [0.15, 0.40, 0.45]];
  function levelWeights(roundIdx, rating) {
    const shift = clamp((rating - 0.5) * 0.5, -0.15, 0.2);
    const w = LEVEL_MIX[roundIdx].slice();
    w[0] = Math.max(0.05, w[0] - shift);
    w[2] = Math.max(0.05, w[2] + shift);
    const sum = w[0] + w[1] + w[2];
    return w.map((x) => x / sum);
  }
  function chooseLevel(weights) {
    let x = Math.random();
    for (let i = 0; i < 3; i++) { x -= weights[i]; if (x <= 0) return i + 1; }
    return 2;
  }
  const NO_SHUFFLE = /\b(all|none|both|neither) of (the|these)\b|above|below/i;

  /* ------------------------------------------------------------------ save data */
  const defaults = () => ({
    coins: 0, crowns: 0, xp: 0, bestStage: 0, runs: 0,
    character: 'pip', owned: [],
    sound: true, relaxed: false,
    rating: 0.5, losses: 0, lastDaily: '',
  });
  let save = defaults();
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch { /* private mode */ }
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* ignore */ } };

  function levelInfo(xp) {
    let lvl = 1, need = 100;
    while (xp >= need) { xp -= need; lvl++; need = 100 + 40 * (lvl - 1); }
    return { lvl, into: xp, need };
  }

  /* ------------------------------------------------------------------ sound */
  const sfx = (() => {
    let ctx = null;
    function tone(freq, dur, type = 'sine', vol = 0.15, at = 0, slide = 0) {
      if (!save.sound) return;
      try {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        const o = ctx.createOscillator(), g = ctx.createGain(), t0 = ctx.currentTime + at;
        o.type = type;
        o.frequency.setValueAtTime(freq, t0);
        if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t0 + dur);
        g.gain.setValueAtTime(vol, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        o.connect(g).connect(ctx.destination);
        o.start(t0); o.stop(t0 + dur + 0.02);
      } catch { /* audio unavailable */ }
    }
    return {
      unlock: () => tone(1, 0.01, 'sine', 0.001),
      click: () => tone(520, 0.06, 'square', 0.07),
      tick: () => tone(660, 0.1, 'square', 0.1),
      go: () => { tone(880, 0.5, 'square', 0.12); tone(1320, 0.5, 'triangle', 0.1); },
      correct: () => [523, 659, 784].forEach((f, i) => tone(f, 0.15, 'triangle', 0.18, i * 0.07)),
      wrong: () => tone(220, 0.35, 'sawtooth', 0.13, 0, -120),
      qualify: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'triangle', 0.17, i * 0.09)),
      win: () => [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.28, 'triangle', 0.18, i * 0.1)),
      lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.3, 'sine', 0.15, i * 0.16)),
      pop: () => tone(300, 0.08, 'sine', 0.1, 0, 300),
      ring: () => tone(1760, 0.07, 'triangle', 0.05),
    };
  })();

  /* One persistent media element keeps user-gesture playback permission across rounds. */
  const music = (() => {
    const audio = $('music');
    let unlocked = false, track = '';
    audio.volume = 0.25;
    function sync() {
      if (!unlocked || !save.sound || document.hidden) { audio.pause(); return; }
      const desired = screenName === 'game' && round ? ['hill', 'lab', 'dusk'][round.idx] : 'dusk';
      if (track !== desired) { track = desired; audio.src = audio.dataset[desired]; }
      if (audio.paused) {
        const playing = audio.play();
        if (playing) playing.catch(() => { /* Retry on the next gesture if autoplay was blocked. */ });
      }
    }
    function unlock() { unlocked = true; sync(); }
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', (e) => { if (!e.repeat) unlock(); });
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('pagehide', () => audio.pause());
    window.addEventListener('pageshow', sync);
    return { sync };
  })();

  /* ------------------------------------------------------------------ bean drawing */
  function roundRect(c, x, y, w, h, r) {
    const cut = Math.min(4, w / 4, h / 4);
    c.beginPath(); c.moveTo(x + cut, y); c.lineTo(x + w - cut, y);
    c.lineTo(x + w, y + cut); c.lineTo(x + w, y + h - cut);
    c.lineTo(x + w - cut, y + h); c.lineTo(x + cut, y + h);
    c.lineTo(x, y + h - cut); c.lineTo(x, y + cut); c.closePath();
  }

  function drawRing(c, x, y, r, spin, alpha) {
    const w = Math.max(0.2, Math.abs(Math.cos(spin))) * r;
    c.save();
    c.globalAlpha = alpha === undefined ? 1 : alpha;
    c.lineWidth = Math.max(2, r * 0.34); c.strokeStyle = '#f5a300';
    c.beginPath(); c.ellipse(x, y, w, r, 0, 0, 7); c.stroke();
    c.lineWidth = Math.max(1, r * 0.13); c.strokeStyle = '#fff1a0';
    c.beginPath(); c.ellipse(x, y, w, r, 0, -2.5, -1.1); c.stroke();
    c.restore();
  }

  // Each sheet has four running frames, then idle, thinking, stumble and celebration.
  const characterArtwork = JSON.parse(document.body.dataset.characterArtwork);
  const spriteLooks = new Map();
  let spriteReady = false;
  $('playBtn').disabled = true;

  function prepareSprites(sheet) {
    const atlas = document.createElement('canvas'); atlas.width = 480; atlas.height = 240;
    const ac = atlas.getContext('2d');
    ac.imageSmoothingEnabled = false;
    const cellW = sheet.naturalWidth / 4, cellH = sheet.naturalHeight / 2;
    for (let f = 0; f < 8; f++) {
      ac.drawImage(sheet, f % 4 * cellW, Math.floor(f / 4) * cellH, cellW, cellH,
        f % 4 * 120 + 12, Math.floor(f / 4) * 120 + 18, 96, 96);
    }
    return atlas;
  }

  Promise.all(CHARACTERS.map((character) => new Promise((resolve, reject) => {
    const sheet = new Image();
    sheet.onload = () => { spriteLooks.set(character.id, prepareSprites(sheet)); resolve(); };
    sheet.onerror = () => reject(new Error(`Artwork unavailable: ${character.name}`));
    sheet.src = characterArtwork[character.id];
  }))).then(() => {
    spriteReady = true; $('playBtn').disabled = false;
  }).catch(() => { $('playBtn').textContent = 'Artwork unavailable — reload to retry'; });

  function spritesFor(look) {
    return spriteLooks.get(look.characterId || look.id || 'pip');
  }

  function drawBean(c, x, y, s, look, pose) {
    if (!spriteReady) return;
    const frame = pose.face === 'dizzy' ? 6 : pose.face === 'think' ? 5
      : pose.arms === 'up' && !pose.boost ? 7
      : pose.arms === 'idle' ? 4 : Math.floor(pose.cycle * 2 / Math.PI) % 4;
    c.save(); c.translate(Math.round(x), Math.round(y)); c.scale(s, s);
    c.fillStyle = '#101c3a45'; c.fillRect(-21, -2, 42, 4); c.fillRect(-16, 2, 32, 3);
    c.translate(0, -Math.round(pose.lift));
    // Frame silhouettes carry the action; keep square pixels aligned instead of rotating the bitmap.
    c.imageSmoothingEnabled = false;
    if (pose.boost) {
      const flare = 10 + Math.floor((pose.t * 14) % 3) * 4;
      for (let step = 0; step < 5; step++) {
        const length = Math.round(flare * (1 - step / 6));
        c.fillStyle = step < 2 ? '#ee6545' : step < 4 ? '#ffcc65' : '#fff5be';
        c.fillRect(-32 - length, -34 + step, length + 5, Math.max(2, 10 - step * 2));
      }
    }
    c.drawImage(spritesFor(look), frame % 4 * 120, Math.floor(frame / 4) * 120, 120, 120, -60, -110, 120, 120);
    if (pose.stars) {
      c.fillStyle = '#ffe28c';
      for (let i = 0; i < 3; i++) { const a = pose.t * 6 + i * 2.1; const sx = Math.round(Math.cos(a) * 22), sy = Math.round(-79 + Math.sin(a) * 5); c.fillRect(sx - 3, sy - 1, 7, 3); c.fillRect(sx - 1, sy - 3, 3, 7); }
    }
    c.restore();
  }

  /* ------------------------------------------------------------------ game state */
  let phase = 'idle';            // idle | countdown | race | over
  let screenName = 'lobby';
  let runToken = 0;              // bumps on quit so stale async chains stop
  let run = null;                // per-run stats
  let round = null;              // current round
  let runners = [];
  let player = null;
  let currentQ = null;           // question the player is answering
  let sheetTimer = 0;            // seconds until the answered sheet hides
  let rankTimer = 0, lastRankText = '';
  let tickerTimer = 0;
  let shake = 0;
  let particles = [];
  let puffs = [];                // world-space jetpack smoke
  let ringSfxAt = 0;
  let roundResolve = null;
  let survivors = [];

  const me = () => characterById(save.character);
  const gateX = (i) => START_PAD + i * GATE_SPACING;
  const courseLen = (cfg) => START_PAD + (cfg.gates - 1) * GATE_SPACING + FINISH_PAD;

  /* Difficulty tuning (see the balance notes in the README): bots answer correctly with `skill` and think for
   * botThinkBase() + (1 - skill) * BOT_THINK_SLOPE + up to BOT_THINK_JITTER seconds. Accurate kids face faster bots;
   * a kid who keeps going out early gets a small, gentle boost. */
  const BOT_THINK_SLOPE = 13;
  const BOT_THINK_JITTER = 5;

  function botSkillMean() {
    return clamp(0.5 + 0.28 * save.rating - Math.min(0.06, 0.02 * save.losses), 0.38, 0.82);
  }

  function botThinkBase() {
    return clamp(7.5 - 4 * (save.rating - 0.5), 5, 9.5) + Math.min(1.5, 0.5 * save.losses);
  }

  function makeRunners() {
    const mean = botSkillMean();
    const others = shuffle(CHARACTERS.filter((c) => c.id !== me().id));
    const list = [];
    player = { id: 0, characterId: me().id, name: me().name, color: me().color, isPlayer: true, skill: 1, speed: 250 };
    list.push(player);
    while (list.length < FIELD) {
      const bot = others.pop();
      const skill = clamp(mean + (Math.random() + Math.random() + Math.random() - 1.5) * 0.3, 0.25, 0.95);
      list.push({ id: list.length, characterId: bot.id, name: bot.name, color: bot.color, isPlayer: false, skill, speed: rand(232, 262) });
    }
    return list;
  }

  function resetRunner(r, index, total) {
    Object.assign(r, {
      x: -rand(0, 55), state: 'wait', gate: 0, timer: 0, boost: 0, finishTime: null,
      phase: rand(0, 6.28), awaiting: false, queue: r.isPlayer ? 0 : rand(0, 110),
      lane: r.isPlayer ? 0.86 : clamp(((index + 0.5) / total) * 0.9 + rand(-0.03, 0.03) + 0.02, 0.04, 0.8),
    });
  }

  /* ------------------------------------------------------------------ screens */
  const SCREENS = ['lobby', 'finding', 'game', 'results', 'summary'];
  function show(name) {
    screenName = name;
    for (const s of SCREENS) $(s).hidden = s !== name;
    if (name === 'game') resize();
    music.sync();
  }

  /* ------------------------------------------------------------------ lobby UI */
  const preview = $('preview'), pctx = preview.getContext('2d');

  function buildLobby() {
    $('soundToggle').checked = save.sound;
    $('relaxedToggle').checked = save.relaxed;
    $('soundToggle').onchange = (e) => { save.sound = e.target.checked; persist(); $('muteBtn').textContent = save.sound ? '♪' : '×'; music.sync(); };
    $('relaxedToggle').onchange = (e) => { save.relaxed = e.target.checked; persist(); };
    refreshLobby();
  }

  function refreshLobby() {
    const info = levelInfo(save.xp);
    $('crownCount').textContent = save.crowns;
    $('coinCount').textContent = save.coins;
    $('bestRank').textContent = STAGE_LABELS[save.bestStage];
    $('levelLabel').textContent = `Level ${info.lvl}`;
    $('levelFill').style.width = `${(info.into / info.need) * 100}%`;
    const daily = $('dailyBonus');
    daily.hidden = save.lastDaily === today();
    daily.textContent = 'DAILY BONUS: +50 coins on your first race today!';
    $('muteBtn').textContent = save.sound ? '♪' : '×';

    $('characterCount').textContent = `${CHARACTERS.filter(isUnlocked).length}/${CHARACTERS.length}`;
    $('characterName').textContent = me().name;
    $('characters').innerHTML = CHARACTERS.map((c) => {
      const unlocked = isUnlocked(c), affordable = unlocked || (c.unlock.coins && save.coins >= c.unlock.coins);
      const sub = unlocked ? (save.character === c.id ? 'Selected' : 'Unlocked')
        : c.unlock.coins ? `${c.unlock.coins} coins` : c.unlock.level ? `Reach level ${c.unlock.level}`
        : `Win ${c.unlock.crowns} crown${c.unlock.crowns > 1 ? 's' : ''}`;
      return `<button class="character" data-character="${c.id}" title="${c.name} - ${c.kind}" aria-pressed="${save.character === c.id}" ${affordable ? '' : 'disabled'}><span class="character-art" aria-hidden="true" style="background-image:url('${characterArtwork[c.id]}')"></span>${c.name}<small>${sub}</small></button>`;
    }).join('');
  }

  function isUnlocked(c) {
    const u = c.unlock;
    return !!(u.free || save.owned.includes(c.id) || (u.level && levelInfo(save.xp).lvl >= u.level) || (u.crowns && save.crowns >= u.crowns));
  }

  $('characters').addEventListener('click', (e) => {
    const b = e.target.closest('[data-character]'); if (!b || b.disabled) return;
    const c = characterById(b.dataset.character);
    if (!isUnlocked(c)) { save.coins -= c.unlock.coins; save.owned.push(c.id); sfx.win(); } else sfx.click();
    save.character = c.id; persist(); refreshLobby();
  });

  /* ------------------------------------------------------------------ run flow */
  async function startRun() {
    sfx.unlock(); sfx.click();
    const token = ++runToken;
    if (save.lastDaily !== today()) { save.lastDaily = today(); save.coins += 50; run = { daily: 50 }; persist(); }
    else run = { daily: 0 };
    Object.assign(run, {
      coins: run.daily, xp: 0, answered: 0, correct: 0, streak: 0, bestStreak: 0,
      mistakes: [], stage: 0, champion: false, used: new Set(), queue: [], startLevel: levelInfo(save.xp).lvl,
    });

    await findPlayers();
    if (token !== runToken) return;

    runners = makeRunners();
    survivors = runners.slice();

    for (let i = 0; i < ROUNDS.length; i++) {
      startRound(i);
      show('game');
      await banner(`Round ${i + 1}<br>${ROUNDS[i].name}<small>${THEMES[i].name} Zone<br>${ROUNDS[i].blurb}</small>`, 2200);
      if (token !== runToken) return;
      await countdown();
      if (token !== runToken) return;
      await raceUntilOver();
      if (token !== runToken) return;
      const qualified = await showResults();
      if (token !== runToken) return;
      if (!qualified) break;
    }
    finishRun();
  }

  async function findPlayers() {
    show('finding');
    $('findCount').textContent = '1'; $('findFill').style.width = '3%';
    const steps = 22;
    for (let i = 1; i <= steps; i++) {
      const n = Math.min(FIELD, Math.round((i / steps) * FIELD));
      $('findCount').textContent = n;
      $('findFill').style.width = `${(n / FIELD) * 100}%`;
      $('findName').textContent = i < steps ? `${pick(CHARACTERS).name} joined!` : 'Get ready…';
      sfx.pop();
      await sleep(95 + Math.random() * 60);
    }
    await sleep(350);
  }

  /* Rings to grab along the player's lane (cosmetic): little arcs between the gates. */
  function makeRings(cfg) {
    const list = [], gates = Array.from({ length: cfg.gates }, (_, i) => gateX(i)), len = courseLen(cfg);
    for (let x = 260, n = 0; x < len - 160; x += 66, n++) {
      if (gates.some((g) => Math.abs(x - g) < 150)) continue;
      list.push({ x, lane: 0.86, dy: Math.sin(Math.min(n % 9, 8) / 8 * Math.PI) * 36, got: false });
    }
    return list;
  }

  function startRound(idx) {
    const cfg = ROUNDS[idx];
    round = { idx, cfg, len: courseLen(cfg), finished: [], over: false, t: 0, qualifiedPlayer: false, botThink: botThinkBase(), rings: makeRings(cfg) };
    runners = survivors.slice();
    runners.forEach((r, i) => resetRunner(r, i, runners.length));
    run.stage = Math.max(run.stage, idx + 1);
    currentQ = null;
    $('sheet').hidden = true;
    $('hudRound').textContent = cfg.name;
    $('hudSlots').textContent = cfg.qualify === 1 ? 'Win the crown!' : `${cfg.qualify} qualify`;
    $('hudStreak').hidden = true;
    lastRankText = '';
    particles = []; puffs = [];
    buildMinimap();
    phase = 'countdown';
    updateRankHud(true);
  }

  async function banner(html, ms) {
    const el = $('banner');
    el.innerHTML = html; el.hidden = false;
    await sleep(ms);
    el.hidden = true;
  }

  async function countdown() {
    for (const n of ['3', '2', '1']) { sfx.tick(); await banner(n, 750); }
    sfx.go();
    phase = 'race';
    runners.forEach((r) => { r.state = 'run'; });
    banner('GO!', 650);
  }

  function raceUntilOver() {
    return new Promise((resolve) => { roundResolve = resolve; });
  }

  /* ------------------------------------------------------------------ simulation */
  function stepRunner(r, dt) {
    if (round.over) return;
    switch (r.state) {
      case 'run': {
        const mult = r.boost > 0 ? 1.5 : 1;
        r.boost = Math.max(0, r.boost - dt);
        r.x += r.speed * mult * dt;
        if (r.gate < round.cfg.gates && r.x >= gateX(r.gate) - r.queue) {
          r.x = gateX(r.gate) - r.queue;
          arriveAtGate(r);
        } else if (r.gate >= round.cfg.gates && r.x >= round.len) {
          finishRunner(r);
        }
        break;
      }
      case 'think':
        r.timer += dt;
        if (r.isPlayer) {
          const limit = save.relaxed ? GATE_TIME_RELAXED : GATE_TIME;
          if (r.awaiting && r.timer >= limit) answer(-1);
        } else if (r.timer >= r.thinkFor) {
          resolveGate(r, Math.random() < r.skill);
        }
        break;
      case 'stumble':
        r.timer -= dt;
        if (r.timer <= 0) { r.state = 'run'; r.timer = 0; }
        break;
      default: break;
    }
  }

  function arriveAtGate(r) {
    r.state = 'think';
    r.timer = 0;
    if (r.isPlayer) openQuestion();
    else r.thinkFor = round.botThink + (1 - r.skill) * BOT_THINK_SLOPE + rand(0, BOT_THINK_JITTER);
  }

  function resolveGate(r, correct) {
    r.gate++;
    r.queue = r.isPlayer ? 0 : rand(0, 110);
    if (correct) { r.state = 'run'; r.boost = 1.1; }
    else { r.state = 'stumble'; r.timer = STUMBLE_TIME; }
  }

  function finishRunner(r) {
    if (round.finished.length >= round.cfg.qualify) return;
    r.state = 'done';
    r.finishTime = round.t;
    round.finished.push(r);
    const left = round.cfg.qualify - round.finished.length;
    if (r.isPlayer) {
      round.qualifiedPlayer = true;
      $('sheet').hidden = true;
      burst(playerScreenX(), bandTop + bandH, 60);
      sfx.qualify();
    } else if (round.cfg.qualify > 1 && (left <= 3 || round.finished.length % 4 === 0)) {
      say(left > 0 ? `🏁 ${r.name} qualified! ${left} slot${left === 1 ? '' : 's'} left` : `🏁 ${r.name} took the last slot!`);
    } else if (round.cfg.qualify === 1) {
      say(`🏁 ${r.name} crossed the line!`);
    }
    if (round.finished.length >= round.cfg.qualify) endRound();
  }

  /* Once the player is safely through (or already out), the rest of the race is played out instantly. */
  function fastForward() {
    for (let i = 0; i < 6000 && !round.over; i++) {
      round.t += 0.05;
      for (const r of runners) if (!r.isPlayer) stepRunner(r, 0.05);
    }
  }

  function endRound() {
    if (round.over) return;
    round.over = true;
    phase = 'over';
    player.awaiting = false;
    $('sheet').hidden = true;
    const won = round.qualifiedPlayer;
    const final = round.cfg.qualify === 1;
    banner(won ? (final ? 'CHAMPION!' : 'QUALIFIED!') : 'ROUND OVER!', 1600);
    if (won) { sfx[final ? 'win' : 'qualify'](); burst(playerScreenX(), bandTop, final ? 140 : 70); }
    else { sfx.lose(); shake = 0.4; }
    setTimeout(() => { if (roundResolve) { const done = roundResolve; roundResolve = null; done(); } }, 1900);
  }

  function computeStandings() {
    const fin = round.finished.slice();
    const rest = runners.filter((r) => !fin.includes(r)).sort((a, b) => b.x - a.x);
    return fin.concat(rest);
  }

  /* ------------------------------------------------------------------ questions */
  function pickQuestion() {
    if (!run.queue.length) run.queue = shuffle(SUBJECTS.slice());
    const subject = run.queue.pop();
    let level = chooseLevel(levelWeights(round.idx, save.rating));
    let pool = POOLS[subject][level];
    for (const alt of [level, 2, 1, 3]) {        // fall back to the nearest level that has questions
      pool = POOLS[subject][alt];
      if (pool.length) { level = alt; break; }
    }
    let idx, tries = 0;
    do { idx = pool[Math.floor(Math.random() * pool.length)]; tries++; } while (run.used.has(subject + idx) && tries < 60);
    run.used.add(subject + idx);
    const q = BANK[subject].questions[idx];
    const order = q[1].map((_, i) => i);
    if (!q[1].some((o) => NO_SHUFFLE.test(o)) && !NO_SHUFFLE.test(q[0])) shuffle(order);
    return { subject, q, order, gate: player.gate };
  }

  function openQuestion() {
    currentQ = pickQuestion();
    const { subject, q, order } = currentQ;
    $('sheetSubject').textContent = `${BANK[subject].icon} ${subject}`;
    $('sheetGate').textContent = `Gate ${player.gate + 1} of ${round.cfg.gates}`;
    $('qText').innerHTML = q[0];
    $('qOpts').innerHTML = order.map((orig, i) =>
      `<button class="opt" data-i="${i}"><span class="l">${'ABCD'[i]}</span><span>${q[1][orig]}</span></button>`).join('');
    $('timerFill').style.width = '100%'; $('timerFill').classList.remove('low');
    $('sheet').querySelector('.q-scroll').scrollTop = 0;
    $('sheet').hidden = false;
    sheetTimer = 0;
    player.awaiting = true;
  }

  function answer(displayIndex) {
    if (!player.awaiting || !currentQ) return;
    player.awaiting = false;
    const { q, order, subject } = currentQ;
    const correctDisplay = order.indexOf(q[2]);
    const correct = displayIndex === correctDisplay;
    const opts = $('qOpts').children;
    for (const b of opts) b.disabled = true;
    opts[correctDisplay].classList.add('right');
    if (!correct && displayIndex >= 0) opts[displayIndex].classList.add('wrong');

    run.answered++;
    if (correct) {
      run.correct++; run.streak++; run.bestStreak = Math.max(run.bestStreak, run.streak);
      earn(5, 10);
      resolveGate(player, true);
      player.boost = 1.1 + Math.min(run.streak, 5) * 0.15;
      ringBurst(playerScreenX(), bandTop + bandH * 0.6, 8 + Math.min(run.streak, 5) * 2, false);
      sfx.correct();
      toast(run.streak >= 3 ? `Streak x${run.streak}!` : 'Correct! +5 coins', 'good');
      sheetTimer = 0.7;
    } else {
      run.streak = 0;
      run.mistakes.push({
        subject, prompt: q[0], correct: q[1][q[2]], why: q[3],
        chosen: displayIndex >= 0 ? q[1][order[displayIndex]] : null,
      });
      resolveGate(player, false);
      shake = 0.35;
      ringBurst(playerScreenX(), bandTop + bandH * 0.6, 10, true);
      sfx.wrong();
      toast(displayIndex < 0 ? "Time's up!" : 'Oops! Stumble!', 'bad');
      sheetTimer = 1.7;
    }
    const streakEl = $('hudStreak');
    streakEl.hidden = run.streak < 2;
    streakEl.textContent = `STREAK ×${run.streak}`;
    currentQ = null;
  }

  $('qOpts').addEventListener('click', (e) => {
    const b = e.target.closest('.opt'); if (b && !b.disabled) answer(Number(b.dataset.i));
  });
  document.addEventListener('keydown', (e) => {
    if (screenName !== 'game') return;
    const i = '1234'.indexOf(e.key) >= 0 ? '1234'.indexOf(e.key) : 'abcd'.indexOf(e.key.toLowerCase());
    if (i >= 0 && e.key.length === 1) answer(i);
  });

  function earn(coins, xp) {
    run.coins += coins; run.xp += xp;
    save.coins += coins; save.xp += xp;
    persist();
  }

  /* ------------------------------------------------------------------ results */
  function showResults() {
    const standings = computeStandings();
    const cfg = round.cfg;
    const idx = standings.indexOf(player);
    const won = round.qualifiedPlayer;
    const final = cfg.qualify === 1;
    const rewards = [];

    if (won) {
      const c = final ? 100 : 20 + round.idx * 10;
      earn(c, final ? 60 : 25);
      rewards.push(`+${c} coins`, `+${final ? 60 : 25} XP`);
      if (final) { run.champion = true; save.crowns++; rewards.push('+1 crown'); }
      survivors = standings.slice(0, cfg.qualify);
    } else {
      earn(10, 5);
      rewards.push('+10 coins for trying', '+5 XP');
    }
    save.bestStage = Math.max(save.bestStage, run.champion ? 4 : run.stage);
    persist();

    const title = $('resTitle');
    title.className = 'results-title' + (won ? '' : ' bad');
    title.textContent = won ? (final ? 'CHAMPION!' : 'Qualified!') : 'Knocked out!';
    $('resSub').textContent = won
      ? (final ? 'You beat 31 other players. Legend!' : `You finished ${ordinal(idx + 1)} — on to the ${ROUNDS[round.idx + 1].name}!`)
      : (idx + 1 <= cfg.qualify + 3 ? `So close! You were ${ordinal(idx + 1)} — ${cfg.qualify} qualified.` : `You finished ${ordinal(idx + 1)}. Every gate you answer makes you faster!`);

    const shown = new Set([0, 1, 2, cfg.qualify - 1, cfg.qualify, idx - 1, idx, idx + 1].filter((i) => i >= 0 && i < standings.length));
    let html = '', prev = -1;
    [...shown].sort((a, b) => a - b).forEach((i) => {
      if (prev >= 0 && i > prev + 1) html += '<li><span class="pos"></span>…</li>';
      const r = standings[i];
      const cls = [r.isPlayer ? 'me' : '', i === cfg.qualify ? 'cut' : ''].join(' ');
      const st = r.finishTime !== null ? `${r.finishTime.toFixed(1)}s` : 'DNF';
      html += `<li class="${cls}"><span class="pos">${i + 1}.</span><span class="dot" style="background:${r.color}"></span>${r.isPlayer ? 'You' : r.name}<span class="st">${st}</span></li>`;
      prev = i;
    });
    $('resList').innerHTML = html;
    $('resRewards').innerHTML = rewards.map((r) => `<span class="reward">${r}</span>`).join('');
    const last = round.idx === ROUNDS.length - 1;
    $('resNext').textContent = won && !last ? `Next: ${ROUNDS[round.idx + 1].name} ▶` : 'See my summary';
    show('results');
    return new Promise((resolve) => { $('resNext').onclick = () => { sfx.click(); resolve(won && !last); }; });
  }

  function finishRun() {
    const accuracy = run.answered ? run.correct / run.answered : 0.5;
    if (run.answered >= 3) save.rating = clamp(0.75 * save.rating + 0.25 * accuracy, 0.1, 0.95);
    save.losses = run.stage >= 2 ? 0 : save.losses + 1;
    save.runs++;
    persist();

    const info = levelInfo(save.xp);
    $('sumTitle').className = 'results-title' + (run.champion ? '' : '');
    $('sumTitle').textContent = run.champion ? 'You won the crown!' : `Out in the ${STAGE_LABELS[run.stage]}`;
    const cells = [
      [`${run.correct}/${run.answered}`, 'correct answers'],
      [run.bestStreak, 'best streak'],
      [`+${run.coins}`, 'coins earned'],
      [info.lvl > run.startLevel ? `Level ${info.lvl}!` : `Level ${info.lvl}`, info.lvl > run.startLevel ? 'LEVEL UP!' : 'your level'],
    ];
    $('sumGrid').innerHTML = cells.map(([b, s]) => `<div class="sum-cell"><b>${b}</b><span>${s}</span></div>`).join('');

    $('mistakeHead').textContent = run.mistakes.length ? "Let's learn from these" : 'Perfect run!';
    $('mistakes').innerHTML = run.mistakes.length
      ? run.mistakes.map((m) => `<div class="mistake"><div class="mq">${m.prompt}</div>
          <div>${m.chosen === null ? '<span class="you">No answer (time ran out)</span>' : `You said: <span class="you">${m.chosen}</span>`} · Answer: <span class="ans">${m.correct}</span></div>
          <div class="why">TIP: ${m.why}</div></div>`).join('')
      : '<div class="none">No mistakes at all — brilliant!</div>';
    show('summary');
    refreshLobby();
  }

  function quitRun() {
    runToken++;
    phase = 'idle';
    roundResolve = null;
    $('sheet').hidden = true; $('banner').hidden = true;
    refreshLobby();
    show('lobby');
  }

  /* ------------------------------------------------------------------ HUD helpers */
  let toastTimer = 0;
  function toast(msg, cls) {
    const el = $('toast');
    el.textContent = msg; el.className = `toast ${cls || ''}`; el.hidden = false;
    // restart the pop animation
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 1100);
  }
  function say(msg) { $('ticker').textContent = msg; tickerTimer = 3; }

  function buildMinimap() {
    const map = $('minimap');
    map.querySelectorAll('.mm-dot').forEach((d) => d.remove());
    runners.forEach((r) => {
      const d = document.createElement('div');
      d.className = 'mm-dot' + (r.isPlayer ? ' me' : '');
      r.dot = d; map.appendChild(d);
    });
  }
  function updateMinimap() {
    for (const r of runners) r.dot.style.left = `${clamp(r.x / round.len, 0, 1) * 100}%`;
  }
  function updateRankHud(force) {
    const st = computeStandings();
    const rank = st.indexOf(player) + 1;
    const text = phase === 'race' || phase === 'over' ? `${ordinal(rank)} / ${runners.length}` : `– / ${runners.length}`;
    if (force || text !== lastRankText) { $('hudRank').textContent = text; lastRankText = text; }
    const left = Math.max(0, round.cfg.qualify - round.finished.length);
    if (round.cfg.qualify > 1) $('hudSlots').textContent = `${left} slot${left === 1 ? '' : 's'} left`;
  }

  $('muteBtn').onclick = () => { save.sound = !save.sound; $('soundToggle').checked = save.sound; $('muteBtn').textContent = save.sound ? '♪' : '×'; persist(); music.sync(); };
  $('quitBtn').onclick = () => { if (confirm('Leave this race?')) quitRun(); };
  $('playBtn').onclick = startRun;
  $('againBtn').onclick = startRun;
  $('lobbyBtn').onclick = () => { refreshLobby(); show('lobby'); };

  /* ------------------------------------------------------------------ particles */
  function burst(x, y, n, color) {
    const palette = color ? [color] : ['#ffc233', '#ff4d6a', '#3d8bff', '#22c56b', '#ff6bd6', '#ffffff'];
    for (let i = 0; i < n; i++) {
      const a = rand(0, 6.28), v = rand(120, 420);
      particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 180, life: rand(0.7, 1.4), age: 0, size: rand(4, 9), color: pick(palette), spin: rand(-8, 8) });
    }
  }
  /* Gold rings pop out on a right answer; a wrong answer scatters them and they bounce off the floor. */
  function ringBurst(x, y, n, scatter) {
    const floor = bandTop + bandH * 0.95;
    for (let i = 0; i < n; i++) {
      particles.push(scatter
        ? { kind: 'ring', x, y, vx: rand(-380, 380), vy: rand(-520, -200), life: rand(1.8, 2.4), age: 0, size: rand(9, 12), spin: rand(0, 6), bounce: floor }
        : { kind: 'ring', x, y, vx: rand(-220, 320), vy: rand(-560, -280), life: rand(0.9, 1.3), age: 0, size: rand(8, 11), spin: rand(0, 6) });
    }
  }
  function updateParticles(dt) {
    for (const p of particles) {
      p.age += dt; p.vy += 700 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.bounce && p.y > p.bounce && p.vy > 0) { p.y = p.bounce; p.vy *= -0.55; p.vx *= 0.85; }
    }
    particles = particles.filter((p) => p.age < p.life);
    for (const p of puffs) { p.age += dt; p.h += 34 * dt; p.x -= 20 * dt; }
    puffs = puffs.filter((p) => p.age < p.life);
  }

  /* Jetpack smoke from boosted runners, plus the player scooping up rings as they run through them. */
  function updateEffects() {
    if (phase !== 'race' || round.over) return;
    for (const r of runners) {
      if (r.state !== 'run' || r.boost <= 0 || Math.abs(r.x - cam) > 900 || puffs.length > 220 || Math.random() > 0.55) continue;
      puffs.push({ x: r.x - 30, lane: r.lane, h: 16, age: 0, life: rand(0.4, 0.7), size: rand(5, 8) });
    }
    if (player.state !== 'run') return;
    for (const g of round.rings) {
      if (g.got || g.x > player.x) continue;
      g.got = true;
      const q = proj(g.x, g.lane);
      burst(q.x, q.y - (34 + g.dy) * q.s, 5, '#ffd23f');
      if (artT - ringSfxAt > 0.09) { ringSfxAt = artT; sfx.ring(); }
    }
  }

  /* ------------------------------------------------------------------ rendering */
  const stage = $('stage'), display = stage.getContext('2d');
  const world = document.createElement('canvas'), ctx = world.getContext('2d');
  let W = 0, H = 0, zoom = 1, cam = 0;
  let bandCenter = 0, bandTop = 0, bandH = 200;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = stage.clientWidth; H = stage.clientHeight;
    if (!W || !H) return;
    stage.width = W * dpr; stage.height = H * dpr;
    // One world pixel occupies two CSS pixels; UI text stays at native resolution.
    world.width = Math.ceil(W / 2); world.height = Math.ceil(H / 2);
    ctx.setTransform(world.width / W, 0, 0, world.height / H, 0, 0);
    ctx.imageSmoothingEnabled = false;
    display.imageSmoothingEnabled = false;
    zoom = clamp(W / 820, 0.62, 1.15);
  }
  window.addEventListener('resize', resize);

  const playerScreenX = () => W * (W < 600 ? 0.3 : 0.28);
  function proj(x, lane) {
    return { x: playerScreenX() + (x - cam) * zoom + (lane - 0.5) * SKEW * zoom, y: bandTop + lane * bandH, s: zoom * (0.6 + 0.5 * lane) };
  }

  function quad(a, b, c, d) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); }

  /* ------------------------------------------------------------------ scenery */
  /* One zone per round: sunny hills (loops, palms, checkerboard soil), a jetpack lab (hazard stripes, pipes,
   * windows, ceiling lamps) and a neon dusk. */
  const THEMES = [
    { id: 'hill', name: 'Sunny Hills', floorA: '#f2b866', floorB: '#e0a04a', back: ['#43c95a', '#37b34d'], lip: '#43c95a', faceA: '#9a5524', faceB: '#b8702f', faceSz: 34, ground: ['#48cf60', '#2fa84c'] },
    { id: 'lab',  name: 'Rocket Lab',  floorA: '#8090a2', floorB: '#6f7d8e', back: ['#f5c518', '#1b1b1b'], lip: '#c3ceda', faceA: '#2b3644', faceB: '#354254', faceSz: 40, ground: ['#3a4756', '#2a3542'] },
    { id: 'dusk', name: 'Neon Dusk',   floorA: '#6a34e0', floorB: '#5427bd', back: ['#1a9fd0', '#1589b6'], lip: '#ff4fd8', faceA: '#1a0f45', faceB: '#26165f', faceSz: 34, ground: ['#2a1360', '#1a0c45'] },
  ];
  let artT = 0;

  const hash = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

  function vGradOn(c, y0, y1, stops) {
    const g = c.createLinearGradient(0, y0, 0, y1);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    return g;
  }
  const vGrad = (y0, y1, stops) => vGradOn(ctx, y0, y1, stops);

  function hazard(x, y, w, h, step) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = '#f5c518'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#1b1b1b';
    for (let k = -2; k * step < w + h; k++) { ctx.beginPath(); ctx.moveTo(x + k * step, y + h); ctx.lineTo(x + k * step + step / 2, y + h); ctx.lineTo(x + k * step + step / 2 + h, y); ctx.lineTo(x + k * step + h, y); ctx.fill(); }
    ctx.restore();
  }

  const worldSheet = new Image();
  let worldReady = false;
  worldSheet.onload = () => { worldReady = true; };
  worldSheet.src = document.body.dataset.worldSheet;

  function drawBackground() {
    const th = THEMES[round.idx], horizon = Math.max(100, bandTop - 20 * zoom);
    ctx.fillStyle = th.ground[1]; ctx.fillRect(0, 0, W, H);
    if (worldReady) {
      const sh = worldSheet.naturalHeight / 3, sw = worldSheet.naturalWidth;
      const height = Math.max(horizon, W / 3.5), width = Math.round(height * sw / sh);
      const scroll = Math.floor(cam * 0.18 * zoom), first = Math.floor(scroll / width);
      // Alternate reflected tiles so painted edges join without a hard seam.
      for (let tile = first; tile * width - scroll < W; tile++) {
        const x = tile * width - scroll;
        ctx.save(); ctx.translate(x + (tile % 2 ? width : 0), horizon - height);
        if (tile % 2) ctx.scale(-1, 1);
        ctx.drawImage(worldSheet, 0, round.idx * sh, sw, sh, 0, 0, width + 1, height); ctx.restore();
      }
    }
    // Pixel verge bridges the painted horizon and the projected track.
    ctx.fillStyle = th.ground[0]; ctx.fillRect(0, horizon, W, bandTop - horizon);
    ctx.fillStyle = th.ground[1];
    for (let x = -40; x < W + 40; x += 32) {
      const px = x - Math.floor(cam * zoom * 0.5) % 32;
      ctx.fillRect(px, horizon + 6, 12, 4); ctx.fillRect(px + 16, horizon + 16, 8, 3);
    }
  }

  function drawTrack() {
    const th = THEMES[round.idx];
    const span = playerScreenX() / zoom + 400, right = (W - playerScreenX()) / zoom + 400;
    const first = Math.floor((cam - span) / 100) * 100, last = cam + right;

    // front face of the platform
    const faceY = bandTop + bandH * 1.07, s = th.faceSz * zoom, offx = (cam * zoom) % (2 * s);
    ctx.fillStyle = th.faceA; ctx.fillRect(0, faceY, W, H - faceY + 2);
    ctx.fillStyle = th.faceB;
    for (let r = 0; faceY + r * s < H; r++) for (let c = -2; c * s < W + 2 * s; c++) if ((r + c) & 1) ctx.fillRect(c * s - offx, faceY + r * s, s, s);
    // Bevelled stone/steel tiles with deterministic pixel chips and seams.
    for (let row = 0; faceY + row * s < H; row++) for (let col = -2; col * s < W + 2 * s; col++) {
      const tx = col * s - offx, ty = faceY + row * s;
      ctx.fillStyle = th.id === 'hill' ? '#e3a96355' : '#9aabcc33';
      ctx.fillRect(tx + 3, ty + 3, s - 6, 2);
      ctx.fillStyle = '#101b363b'; ctx.fillRect(tx, ty + s - 3, s, 3); ctx.fillRect(tx + s - 2, ty, 2, s);
      if (th.id === 'hill') {
        const grain = hash(col + Math.floor(cam * zoom / (2 * s)) * 2 + row * 73);
        ctx.fillStyle = '#e8b47945'; ctx.fillRect(tx + 6 + grain * 14, ty + 10 + grain * 12, 6, 3);
        ctx.fillStyle = '#57393155'; ctx.fillRect(tx + s - 13, ty + s - 12, 5, 3);
      }
    }
    if (th.id === 'lab') {
      ctx.fillStyle = '#6b7b8e';
      for (let r = 0; faceY + r * s < H; r++) for (let c = -2; c * s < W + 2 * s; c++) { ctx.beginPath(); ctx.arc(c * s - offx + 4, faceY + r * s + 4, 1.8, 0, 7); ctx.fill(); }
    } else if (th.id === 'dusk') {
      ctx.fillStyle = '#ff4fd866'; ctx.fillRect(0, faceY + 10 * zoom, W, 2);
      ctx.fillStyle = '#22e0ff55'; ctx.fillRect(0, faceY + 26 * zoom, W, 2);
    }

    ctx.fillStyle = vGrad(faceY, Math.max(faceY + 1, H), [[0, '#17213b22'], [1, '#17213bb0']]);
    ctx.fillRect(0, faceY, W, Math.max(0, H - faceY));

    // floor tiles (3 rows deep)
    for (let x = first; x < last; x += 100) {
      const k = x / 100;
      for (let r = 0; r < 3; r++) {
        ctx.fillStyle = (k + r) & 1 ? th.floorA : th.floorB;
        quad(proj(x, r / 3), proj(x + 100, r / 3), proj(x + 100, (r + 1) / 3), proj(x, (r + 1) / 3)); ctx.fill();
        const tile = proj(x + 5, r / 3 + 0.025);
        ctx.fillStyle = th.id === 'hill' ? '#ffe2a555' : '#bce8ff44';
        ctx.fillRect(tile.x, tile.y, 78 * zoom, 2 * zoom);
        for (let d = 0; d < 4; d++) {
          const spot = proj(x + 10 + hash(k * 17 + r * 5 + d) * 75, (r + 0.15 + hash(k + d * 7) * 0.7) / 3);
          ctx.fillStyle = th.id === 'hill' ? '#875b3a38' : '#15244955';
          ctx.fillRect(spot.x, spot.y, (d % 2 ? 5 : 3) * zoom, 2 * zoom);
        }
      }
    }
    if (th.id === 'lab') {                                               // dashed lane line
      ctx.fillStyle = '#f5c518';
      for (let x = first; x < last; x += 100) quad(proj(x + 20, 0.49), proj(x + 70, 0.49), proj(x + 70, 0.51), proj(x + 20, 0.51)), ctx.fill();
    }

    // Soft directional light gives the tiled running surface depth.
    ctx.fillStyle = vGrad(bandTop, bandTop + bandH, [[0, '#15274630'], [0.35, '#ffffff18'], [1, '#ffffff00']]);
    ctx.fillRect(0, bandTop, W, bandH);
    ctx.strokeStyle = '#ffffff38'; ctx.lineWidth = 1;
    for (const lane of [1 / 3, 2 / 3]) {
      const a = proj(first, lane), b = proj(last, lane);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }

    // back kerb
    for (let x = first; x < last; x += 100) {
      const k = x / 100;
      if (th.id === 'lab') {
        for (let j = 0; j < 100; j += 50) { ctx.fillStyle = ((k * 2 + j / 50) & 1) ? '#f5c518' : '#1b1b1b'; quad(proj(x + j, -0.16), proj(x + j + 50, -0.16), proj(x + j + 70, 0), proj(x + j + 20, 0)); ctx.fill(); }
      } else {
        ctx.fillStyle = th.back[k & 1]; quad(proj(x, -0.16), proj(x + 100, -0.16), proj(x + 100, 0), proj(x, 0)); ctx.fill();
      }
    }
    if (th.id === 'dusk') { ctx.strokeStyle = '#22e0ff'; ctx.lineWidth = 3 * zoom; const a = proj(first, -0.16), b = proj(last, -0.16); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }

    // front lip
    ctx.fillStyle = th.lip; quad(proj(first, 1), proj(last, 1), proj(last, 1.07), proj(first, 1.07)); ctx.fill();
    if (th.id === 'hill') {                                              // grass tufts on the lip
      ctx.fillStyle = '#2fae4c';
      for (let x = first; x < last; x += 40) { const p = proj(x, 1.02); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 4 * zoom, p.y - 9 * zoom); ctx.lineTo(p.x + 9 * zoom, p.y); ctx.fill(); }
    } else if (th.id === 'dusk') {
      ctx.strokeStyle = '#ff4fd888'; ctx.lineWidth = 8 * zoom; const a = proj(first, 1.035), b = proj(last, 1.035); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }

    ctx.fillStyle = '#ffffffcc'; ctx.fillRect(proj(0, 0).x, bandTop, 6, bandH);   // start line
    drawGate(round.len, -1);
  }

  function zigzag(p0, p1, amp, seed) {
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y);
    const n = 9, f = Math.floor(artT * 22);
    for (let i = 1; i < n; i++) {
      const u = i / n;
      ctx.lineTo(lerp(p0.x, p1.x, u), lerp(p0.y, p1.y, u) + (hash(i * 3.7 + seed * 11 + f * 1.3) - 0.5) * 2 * amp * lerp(p0.s, p1.s, u));
    }
    ctx.lineTo(p1.x, p1.y);
  }

  function drawGoalPost(gx) {
    const p = proj(gx + 30, -0.24), h = 92 * p.s;
    ctx.strokeStyle = '#56616f'; ctx.lineWidth = 6 * p.s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - h); ctx.stroke();
    const c = Math.cos(artT * 4), w = Math.max(3, Math.abs(c) * 30 * p.s), hh = 26 * p.s;
    ctx.fillStyle = c > 0 ? '#ffd23f' : '#ff4d6a'; roundRect(ctx, p.x - w, p.y - h - hh, w * 2, hh * 1.5, 6 * p.s); ctx.fill();
    ctx.strokeStyle = '#14102e'; ctx.lineWidth = 2.5 * p.s; ctx.stroke();
    if (w > 12) { ctx.fillStyle = '#14102e'; ctx.font = `900 ${20 * p.s * Math.abs(c)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c > 0 ? '★' : '✦', p.x, p.y - h - hh * 0.25); }
  }

  /* A question gate is a row of laser zappers: armed and crackling purple while it waits, blazing gold when it
   * is your turn, and switched off (green lights) once you have answered it. */
  function drawGate(gx, gateIndex) {
    const a = proj(gx, 0), b = proj(gx, 1);
    if (a.x < -200 && b.x < -200) return;
    if (a.x > W + 200 && b.x > W + 200) return;
    const finish = gateIndex < 0;
    const ha = 150 * a.s, hb = 150 * b.s;
    const passed = !finish && player && gateIndex < player.gate;
    const active = !finish && player && player.state === 'think' && player.gate === gateIndex;
    const frame = finish ? '#14102e' : passed ? '#22c56b' : active ? '#ffc233' : '#7a4dff';
    const panel = () => quad(a, b, { x: b.x, y: b.y - hb }, { x: a.x, y: a.y - ha });

    if (finish) {                                               // chequered banner
      for (let u = 0; u < 8; u++) for (let v = 0; v < 4; v++) {
        const pt = (uu, vv) => ({ x: lerp(a.x, b.x, uu / 8), y: lerp(a.y, b.y, uu / 8) - vv / 4 * lerp(ha, hb, uu / 8) });
        ctx.fillStyle = (u + v) % 2 ? '#14102e' : '#ffffff';
        quad(pt(u, v), pt(u + 1, v), pt(u + 1, v + 1), pt(u, v + 1)); ctx.fill();
      }
      drawGoalPost(gx);
    } else if (active) {
      ctx.fillStyle = 'rgba(255,210,51,.16)'; panel(); ctx.fill();
    }

    ctx.lineCap = 'round';
    for (const p of [a, b]) {                                   // posts
      const h = 150 * p.s;
      ctx.fillStyle = '#00000033'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 16 * p.s, 5 * p.s, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#4b5665'; ctx.lineWidth = 8 * p.s; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - h); ctx.stroke();
      ctx.strokeStyle = '#9aa6b6'; ctx.lineWidth = 2.5 * p.s; ctx.beginPath(); ctx.moveTo(p.x - 2 * p.s, p.y); ctx.lineTo(p.x - 2 * p.s, p.y - h); ctx.stroke();
      if (!finish) { ctx.save(); ctx.translate(p.x - 11 * p.s, p.y - h - 10 * p.s); hazard(0, 0, 22 * p.s, 12 * p.s, 6 * p.s); ctx.restore(); }
    }
    if (!finish) {
      [0.2, 0.5, 0.8].forEach((f, bi) => {
        const p0 = { x: a.x, y: a.y - ha * f, s: a.s }, p1 = { x: b.x, y: b.y - hb * f, s: b.s };
        if (!passed) {
          const amp = active ? 8 : 4.5;
          ctx.strokeStyle = active ? '#ffc23355' : '#9b6bff44'; ctx.lineWidth = (active ? 13 : 8) * zoom; zigzag(p0, p1, amp, bi); ctx.stroke();
          ctx.strokeStyle = active ? '#fff3b0' : '#e6dcff'; ctx.lineWidth = (active ? 3.4 : 2.2) * zoom; zigzag(p0, p1, amp, bi); ctx.stroke();
        }
        for (const p of [p0, p1]) {                             // emitter nodes
          ctx.fillStyle = '#2b3340'; ctx.beginPath(); ctx.arc(p.x, p.y, 7 * p.s, 0, 7); ctx.fill();
          ctx.fillStyle = passed ? '#22c56b' : active ? '#ffe27a' : '#b58cff'; ctx.beginPath(); ctx.arc(p.x, p.y, 4 * p.s, 0, 7); ctx.fill();
        }
      });
    }

    ctx.lineWidth = 10 * zoom; ctx.strokeStyle = frame;
    ctx.beginPath(); ctx.moveTo(a.x, a.y - ha); ctx.lineTo(b.x, b.y - hb); ctx.stroke();
    const mx = (a.x + b.x) / 2, my = (a.y - ha + b.y - hb) / 2 - 18 * zoom;
    const label = finish ? 'FINISH' : passed ? '✓' : `Q${gateIndex + 1}`;
    ctx.font = `900 ${16 * zoom}px monospace`;
    const w = ctx.measureText(label).width + 18 * zoom;
    ctx.fillStyle = frame; roundRect(ctx, mx - w / 2, my - 14 * zoom, w, 26 * zoom, 9 * zoom); ctx.fill();
    ctx.fillStyle = frame === '#ffc233' ? '#14102e' : '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, mx, my - zoom);
    if (active) {
      ctx.font = `900 ${64 * zoom}px monospace`; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#14102e'; ctx.lineWidth = 6 * zoom;
      const qx = (a.x + b.x) / 2, qy = (a.y + b.y) / 2 - (ha + hb) / 4;
      ctx.strokeText('?', qx, qy); ctx.fillText('?', qx, qy);
    }
  }

  function poseFor(r, t) {
    const ph = r.phase;
    switch (r.state) {
      case 'run': {
        const boosted = r.boost > 0;
        return { cycle: t * (boosted ? 20 : 14) + ph, lift: boosted ? 10 + Math.abs(Math.sin(t * 10 + ph)) * 8 : Math.abs(Math.sin(t * 14 + ph)) * 4, rot: boosted ? 0.2 : 0.06, arms: boosted ? 'up' : 'swing', face: 'happy', boost: boosted, t };
      }
      case 'think': return { cycle: 0, lift: Math.abs(Math.sin(t * 3 + ph)) * 3, rot: 0, arms: 'idle', face: 'think', t };
      case 'stumble': {
        const e = STUMBLE_TIME - r.timer;
        const down = Math.min(1, e / 0.2), up = clamp((e - 1.1) / 0.6, 0, 1);
        return { cycle: 0, lift: 0, rot: 1.45 * down * (1 - up * up), arms: 'idle', face: 'dizzy', stars: e < 1.5, t };
      }
      case 'done': return { cycle: 0, lift: Math.abs(Math.sin(t * 6 + ph)) * 16, rot: 0, arms: 'up', face: 'happy', t };
      default: return { cycle: 0, lift: Math.abs(Math.sin(t * 4 + ph)) * 4, rot: 0, arms: 'idle', face: 'happy', t };
    }
  }

  function drawRings() {
    for (const g of round.rings) {
      if (g.got) continue;
      const p = proj(g.x, g.lane);
      if (p.x < -30 || p.x > W + 30) continue;
      drawRing(ctx, p.x, p.y - (34 + g.dy) * p.s, 11 * p.s, artT * 4 + g.x * 0.03);
    }
  }

  function drawPuffs() {
    for (const p of puffs) {
      const q = proj(p.x, p.lane), k = p.age / p.life;
      if (q.x < -40 || q.x > W + 40) continue;
      ctx.fillStyle = k < 0.18 ? `rgba(255,170,60,${0.8 * (1 - k)})` : `rgba(255,255,255,${0.5 * (1 - k)})`;
      ctx.beginPath(); ctx.arc(q.x, q.y - p.h * q.s, p.size * q.s * (0.6 + k * 1.4), 0, 7); ctx.fill();
    }
  }

  function drawSpeedLines() {
    if (!player || player.state !== 'run' || player.boost <= 0) return;
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const y = bandTop - 90 * zoom + Math.random() * (bandH + 130 * zoom), x = Math.random() * W, len = 70 + Math.random() * 130;
      ctx.lineWidth = 1.5 + Math.random() * 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - len, y); ctx.stroke();
    }
  }

  function drawRunners(t) {
    const order = runners.slice().sort((a, b) => a.lane - b.lane);
    for (const r of order) {
      const lane = r.lane + (r.isPlayer ? 0 : Math.sin(t * 0.7 + r.phase) * 0.015);
      const p = proj(r.x, lane);
      if (p.x < -80 || p.x > W + 80) continue;
      if (r.isPlayer) {
        ctx.strokeStyle = '#ffc233'; ctx.lineWidth = 4 * zoom;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, 30 * p.s, 10 * p.s, 0, 0, 7); ctx.stroke();
      }
      drawBean(ctx, p.x, p.y, p.s * 1.05, r, poseFor(r, t));
      if (r.isPlayer) {
        const bob = Math.sin(t * 6) * 4;
        ctx.fillStyle = '#ffc233'; ctx.beginPath();
        ctx.moveTo(p.x, p.y - 100 * p.s + bob); ctx.lineTo(p.x - 9, p.y - 116 * p.s + bob); ctx.lineTo(p.x + 9, p.y - 116 * p.s + bob); ctx.closePath(); ctx.fill();
        ctx.font = `900 ${13 * zoom}px system-ui`; ctx.textAlign = 'center'; ctx.fillStyle = '#14102e';
        ctx.fillText('YOU', p.x, p.y - 122 * p.s + bob);
      }
    }
  }

  function drawParticles() {
    for (const p of particles) {
      const fade = clamp(1 - p.age / p.life, 0, 1);
      if (p.kind === 'ring') {
        const blink = p.life - p.age < 0.6 && Math.floor(p.age * 22) % 2 ? 0.25 : 1;
        drawRing(ctx, p.x, p.y, p.size, p.age * 11 + p.spin, blink);
        continue;
      }
      ctx.globalAlpha = fade;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.age * p.spin);
      ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function render(dt, t) {
    if (!W || !round) return;
    const sheetOpen = !$('sheet').hidden;
    const avail = sheetOpen ? H - $('sheet').offsetHeight : H;
    const targetH = clamp(avail * 0.36, 120, 240);
    bandH = lerp(bandH, targetH, 1 - Math.pow(0.001, dt));
    const target = Math.max(avail * 0.56, 145 + bandH / 2);
    bandCenter = lerp(bandCenter || target, target, 1 - Math.pow(0.001, dt));
    bandTop = bandCenter - bandH / 2;
    cam = player ? player.x : 0;
    artT = t;

    ctx.save();
    if (shake > 0) { ctx.translate(rand(-6, 6) * shake * 2, rand(-6, 6) * shake * 2); shake = Math.max(0, shake - dt); }
    drawBackground();
    drawTrack();
    for (let i = 0; i < round.cfg.gates; i++) drawGate(gateX(i), i);
    drawRings();
    drawPuffs();
    drawRunners(t);
    drawSpeedLines();
    drawParticles();
    ctx.restore();
    display.drawImage(world, 0, 0, stage.width, stage.height);
  }

  /* ------------------------------------------------------------------ preview (lobby) */
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function renderPreview(t) {
    if (reducedMotion.matches) t = 0;
    if (preview.width !== 220) { preview.width = 220; preview.height = 220; }
    pctx.imageSmoothingEnabled = false;
    pctx.fillStyle = '#182d50'; pctx.fillRect(0, 0, 220, 220);
    if (worldReady) {
      const sh = worldSheet.naturalHeight / 3;
      pctx.drawImage(worldSheet, worldSheet.naturalWidth * 0.3, sh, sh, sh, 0, 0, 220, 220);
      pctx.fillStyle = '#13244466'; pctx.fillRect(0, 0, 220, 220);
    }
    pctx.fillStyle = '#0c1733'; pctx.fillRect(29, 190, 162, 20);
    pctx.fillStyle = '#436c98'; pctx.fillRect(25, 184, 170, 10);
    pctx.fillStyle = '#91e6dd'; pctx.fillRect(29, 182, 162, 3);
    pctx.fillStyle = '#26425e'; pctx.fillRect(36, 197, 148, 7);
    for (let i = 0; i < 8; i++) { pctx.fillStyle = i % 2 ? '#ffcc73' : '#1e2b48'; pctx.fillRect(38 + i * 18, 200, 14, 4); }
    drawRing(pctx, 30, 118 + Math.sin(t * 3) * 4, 10, t * 3);
    drawRing(pctx, 187, 92 + Math.sin(t * 3 + 1) * 4, 10, t * 3 + 1);
    drawBean(pctx, 112, 196, 1.5, me(), { cycle: t * 9, lift: 9 + Math.sin(t * 3) * 3, rot: 0.08, arms: 'up', face: 'happy', boost: true, t });
  }

  /* ------------------------------------------------------------------ main loop */
  let last = performance.now(), clock = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; clock += dt;

    if (screenName === 'lobby') { renderPreview(clock); return; }
    if (screenName !== 'game') return;

    if (phase === 'race') {
      round.t += dt;
      for (const r of runners) stepRunner(r, dt);
      if (player.state === 'done' && !round.over) fastForward();
      if (!round.over) {
        updateMinimap();
        rankTimer -= dt; if (rankTimer <= 0) { rankTimer = 0.25; updateRankHud(); }
        if (player.awaiting) {
          const limit = save.relaxed ? GATE_TIME_RELAXED : GATE_TIME;
          const left = 1 - player.timer / limit;
          $('timerFill').style.width = `${clamp(left, 0, 1) * 100}%`;
          $('timerFill').classList.toggle('low', left < 0.3);
        }
      }
    }
    if (phase !== 'idle' && round) updateMinimap();
    if (sheetTimer > 0) { sheetTimer -= dt; if (sheetTimer <= 0 && !player.awaiting) $('sheet').hidden = true; }
    if (tickerTimer > 0) { tickerTimer -= dt; if (tickerTimer <= 0) $('ticker').textContent = ''; }
    updateParticles(dt);
    if (phase === 'race' && round) updateEffects();
    render(dt, clock);
  }

  /* ------------------------------------------------------------------ boot */
  buildLobby();
  show('lobby');
  requestAnimationFrame(frame);

  // Expose a little for debugging in the console.
  window.__stumble = { get run() { return run; }, get round() { return round; }, get runners() { return runners; }, get q() { return currentQ; }, save };
})();
