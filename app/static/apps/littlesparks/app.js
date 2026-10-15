/* Little Sparks shell: game picker, sticker book, grown-ups panel. */
(() => {
  'use strict';
  const LS = window.LS;
  const CFG = LS.CFG;
  const $ = (id) => document.getElementById(id);
  const store = LS.store;

  function h(tag, props, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (v != null && v !== false) e.setAttribute(k, v === true ? '' : v);
    }
    kids.flat().forEach((c) => { if (c != null) e.append(c.nodeType ? c : String(c)); });
    return e;
  }

  const stage = new LS.Stage($('lsCanvas'));
  let currentId = null;
  let currentGame = null;

  // art-or-emoji for DOM tiles
  function artSpan(name, fallback, cls) {
    const file = (CFG.art || {})[name];
    if (file) return h('img', { class: cls, src: CFG.artBase + file, alt: '' });
    return h('span', { class: cls }, fallback);
  }

  // ---------- screens ----------
  function show(name) {
    stage.stop();
    currentGame = null;
    LS.voice.stop();
    document.body.dataset.screen=name;
    $('lsPauseLayer').hidden=true;
    $('lsPauseButton').hidden=name!=='play';
    $('lsHub').hidden = name !== 'hub';
    $('lsPlay').hidden = name !== 'play';
    $('lsBookScreen').hidden = name !== 'book';
    $('lsHome').hidden = name === 'hub';
    $('lsDone').hidden = true;
    $('lsTitle').textContent = name === 'play' ? (CFG.games.find((g) => g.id === currentId) || {}).title || '' : name === 'book' ? 'My stickers' : 'Little Sparks';
    if (name === 'hub') renderHub();
    if (name === 'book') renderBook();
    renderCounts();
  }

  function stickersFor(gameId) {
    return CFG.stickers.filter((s) => s.game === gameId);
  }

  function renderHub() {
    $('lsTiles').replaceChildren(...CFG.games.map((g) => {
      const mine = stickersFor(g.id);
      const got = mine.filter((s) => LS.hasSticker(s.id)).length;
      return h('li', null, h('button', {
        type: 'button', class: 'ls-tile', style: `--tile:${g.color}`,
        'aria-label': g.title, onclick: () => play(g.id),
      },
      artSpan(`game-${g.id}`, g.emoji, 'ls-tile-art'),
      h('span', { class: 'ls-tile-name' }, g.title),
      h('span', { class: 'ls-tile-stars' }, '★'.repeat(got) + '☆'.repeat(mine.length - got))));
    }));
  }

  function renderCounts() {
    $('lsStickerCount').textContent = String(store.data.stickers.length);
    const on = store.data.settings.sound || store.data.settings.voice;
    $('lsSound').textContent = on ? '🔊' : '🔇';
    $('lsSound').setAttribute('aria-pressed', String(!on));
  }

  function renderBook() {
    $('lsStickers').replaceChildren(...CFG.stickers.map((s) => {
      const got = LS.hasSticker(s.id);
      const game = CFG.games.find((g) => g.id === s.game);
      return h('li', { class: 'ls-sticker' + (got ? ' got' : '') },
        got ? artSpan(`sticker-${s.id}`, s.emoji, 'ls-sticker-art') : h('span', { class: 'ls-sticker-art' }, '❓'),
        h('span', { class: 'ls-sticker-name' }, got ? s.name : (game ? game.emoji : '')));
    }));
  }

  // ---------- play ----------
  function play(id) {
    currentId = id;
    show('play');
    $('lsTitle').textContent = CFG.games.find((g) => g.id === id).title;
    document.body.dataset.game=id;document.title=$('lsTitle').textContent+' · TinySpark';
    $('lsCanvas').setAttribute('aria-label',$('lsTitle').textContent+' game board');
    LS.sfx.ensure();
    stage.resize();
    const api = {
      stage,
      say: (t) => { $('lsCaption').textContent=t;LS.voice.say(t); },
      after:(fn,ms)=>stage.after(fn,ms),
      finish(opts) { endCard(opts); },
    };
    const game = LS.games[id](api);
    currentGame = game;
    stage.run(game);
    game.start();
  }

  function endCard(opts) {
    stage.tasks=[];stage.paused=true;
    $('lsCaption').textContent=opts.title;
    LS.sfx.yay();
    stage.burst(LS.W / 2, LS.H / 2, { n: 30 });
    $('lsDoneEmoji').replaceChildren(artSpan(`game-${currentId}`, opts.emoji, 'ls-card-art'));
    $('lsDoneTitle').textContent = opts.title;
    $('lsDone').hidden = false;
    $('lsAgain').focus({preventScroll:true});
    LS.voice.say(`${LS.praise()} ${opts.title}`);
  }

  // ---------- stickers ----------
  let stickerTimer = null;
  LS.onSticker = (s) => {
    $('lsStickerEmoji').replaceChildren(artSpan(`sticker-${s.id}`, s.emoji, 'ls-card-art'));
    $('lsStickerName').textContent = `New sticker! ${s.name}`;
    $('lsSticker').hidden = false;
    LS.sfx.yay();
    clearTimeout(stickerTimer);
    stickerTimer = setTimeout(() => { $('lsSticker').hidden = true; }, 3200);
    renderCounts();
  };

  // ---------- grown-ups (press and hold) ----------
  let holdTimer = null;
  const parentBtn = $('lsParent');
  const startHold = () => { holdTimer = setTimeout(openParent, 1000); };
  const endHold = () => clearTimeout(holdTimer);
  parentBtn.addEventListener('pointerdown', startHold);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => parentBtn.addEventListener(ev, endHold));
  parentBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter') openParent(); });

  function openParent() {
    if(currentGame)pause(true);
    $('optVoice').checked = !!store.data.settings.voice;
    $('optSound').checked = !!store.data.settings.sound;
    $('lsLearns').replaceChildren(...CFG.games.map((g) => h('li', null,
      h('strong', null, `${g.emoji} ${g.title}`),
      h('span', null, ` (${g.style})`),
      h('div', null, `Learns: ${g.learns}`),
      h('div', { class: 'ls-small' }, `Try asking: ${g.talk}`))));
    const d = $('lsParentDialog');
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
  }
  $('lsParentClose').addEventListener('click', () => $('lsParentDialog').close());
  $('optVoice').addEventListener('change', (e) => { store.data.settings.voice = e.target.checked; store.save(); renderCounts(); });
  $('optSound').addEventListener('change', (e) => { store.data.settings.sound = e.target.checked; store.save(); renderCounts(); });
  $('lsReset').addEventListener('click', () => {
    if (!window.confirm('Reset all stickers and progress on this device?')) return;
    store.data.stickers = [];
    store.data.stats = {};
    store.save();
    $('lsParentDialog').close();
    show('hub');
  });

  function pause(on){
    if(!stage.game||!$('lsDone').hidden)return;
    stage.paused=on;stage.pointer.down=false;stage.pointer.moved=false;stage.keys.clear();
    $('lsPauseLayer').hidden=!on;$('lsPauseButton').setAttribute('aria-pressed',String(on));
    if(on){LS.voice.stop();$('lsResume').focus({preventScroll:true});}
  }
  $('lsPauseButton').onclick=()=>pause(!stage.paused);
  $('lsResume').onclick=()=>pause(false);
  $('lsRestart').onclick=()=>play(currentId);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&stage.game&&!document.querySelector('dialog[open]')){e.preventDefault();pause(!stage.paused);}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
  // ---------- wiring ----------
  // Entered from the main menu: home goes back there. The picker stays one
  // tap away via the "more games" button.
  const goMenu = () => { window.location.href = CFG.menuUrl; };
  $('lsHome').addEventListener('click', () => (CFG.startGame || currentId ? goMenu() : show('hub')));
  $('lsDoneHome').addEventListener('click', goMenu);
  $('lsMore').addEventListener('click', () => show('hub'));
  $('lsAgain').addEventListener('click', () => play(currentId));
  $('lsBook').addEventListener('click', () => show('book'));
  $('lsSound').addEventListener('click', () => {
    const on = !(store.data.settings.sound || store.data.settings.voice);
    store.data.settings.sound = on;
    store.data.settings.voice = on;
    store.save();
    if (!on) LS.voice.stop();
    renderCounts();
  });
  $('lsSticker').addEventListener('click', () => { $('lsSticker').hidden = true; });
  window.addEventListener('blur', () => LS.voice.stop());

  LS.art.load().finally(() => {
    if (CFG.startGame && LS.games[CFG.startGame]) play(CFG.startGame);
    else show('hub');
  });
  LS.app = { show, play, stage };
})();
