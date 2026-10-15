/* Doodle Quest: draw a daily challenge, keep a gallery on this device. */
(() => {
  'use strict';
  const { $, h, pick, dayIndex, createStore, toast, config } = window.TS;
  const CFG = config();
  const COLORS = ['#1b1b1b', '#e03131', '#f08c00', '#fcc419', '#2f9e44', '#1c7ed6', '#7048e8', '#e64980', '#8b5a2b', '#ffffff'];
  const SIZES = [{ n: 3, label: 'Fine' }, { n: 8, label: 'Medium' }, { n: 18, label: 'Chunky' }];
  const MAX_GALLERY = 12;
  const MAX_UNDO = 15;
  const TIMER_SECS = 300;

  const store = createStore('tinyspark-doodle-v1', { gallery: [], made: 0 });
  const S = store.data;

  const canvas = $('dqCanvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let color = COLORS[0];
  let size = SIZES[1].n;
  let erasing = false;
  let drawing = false;
  let last = null;
  let undoStack = [];
  let challenge = null;
  let timer = { left: TIMER_SECS, id: null };

  // ----- canvas -----
  function blank() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function snapshot() {
    undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (undoStack.length > MAX_UNDO) undoStack.shift();
  }

  function pos(ev) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((ev.clientX - r.left) / r.width) * canvas.width,
      y: ((ev.clientY - r.top) / r.height) * canvas.height,
    };
  }

  function stroke(a, b) {
    ctx.strokeStyle = erasing ? '#ffffff' : color;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  canvas.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    canvas.setPointerCapture(ev.pointerId);
    snapshot();
    drawing = true;
    last = pos(ev);
    stroke(last, last);       // a dot for a simple tap
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!drawing) return;
    const p = pos(ev);
    stroke(last, p);
    last = p;
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => canvas.addEventListener(t, () => { drawing = false; }));

  // ----- tools -----
  function renderTools() {
    $('dqColors').replaceChildren(...COLORS.map((c) => h('button', {
      type: 'button', role: 'radio', 'aria-checked': String(!erasing && color === c),
      'aria-label': 'Colour ' + c, class: 'swatch' + (!erasing && color === c ? ' on' : ''),
      style: 'background:' + c,
      onclick: () => { color = c; erasing = false; renderTools(); },
    })));
    $('dqSizes').replaceChildren(...SIZES.map((s) => h('button', {
      type: 'button', role: 'radio', 'aria-checked': String(size === s.n),
      class: 'chip' + (size === s.n ? ' on' : ''),
      onclick: () => { size = s.n; renderTools(); },
    }, s.label)));
    $('dqEraser').setAttribute('aria-pressed', String(erasing));
    $('dqEraser').classList.toggle('on', erasing);
  }

  $('dqEraser').addEventListener('click', () => { erasing = !erasing; renderTools(); });
  $('dqUndo').addEventListener('click', () => {
    const img = undoStack.pop();
    if (img) ctx.putImageData(img, 0, 0); else toast('Nothing to undo yet.');
  });
  $('dqClear').addEventListener('click', () => {
    if (!window.confirm('Clear your drawing and start again?')) return;
    snapshot();
    blank();
  });

  // ----- challenge -----
  function setChallenge(prompt, twist) {
    challenge = { prompt, twist };
    $('dqPrompt').textContent = 'Draw ' + prompt + '.';
    $('dqTwist').textContent = 'Twist: ' + twist;
  }

  function today() {
    const d = dayIndex();
    setChallenge(CFG.prompts[d % CFG.prompts.length], CFG.twists[(d * 7) % CFG.twists.length]);
  }

  $('dqToday').addEventListener('click', today);
  $('dqNew').addEventListener('click', () => setChallenge(pick(CFG.prompts), pick(CFG.twists)));

  // ----- timer -----
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  function stopTimer() {
    clearInterval(timer.id);
    timer = { left: TIMER_SECS, id: null };
    $('dqTimer').textContent = '';
    $('dqTimerBtn').textContent = '⏱ Start 5 min timer';
  }
  $('dqTimerBtn').addEventListener('click', () => {
    if (timer.id) { stopTimer(); return; }
    $('dqTimerBtn').textContent = 'Stop timer';
    $('dqTimer').textContent = fmt(timer.left);
    timer.id = setInterval(() => {
      timer.left -= 1;
      $('dqTimer').textContent = fmt(Math.max(timer.left, 0));
      if (timer.left <= 0) { stopTimer(); toast('Time is up - finish your last line and save it!'); }
    }, 1000);
  });

  // ----- gallery -----
  function thumb() {
    return canvas.toDataURL('image/jpeg', 0.8);
  }

  function renderGallery() {
    $('dqCount').textContent = String(S.gallery.length);
    $('dqEmpty').hidden = S.gallery.length > 0;
    $('progressChip').textContent = S.made
      ? `🎨 ${S.made} ${S.made === 1 ? 'doodle' : 'doodles'} drawn`
      : 'A new drawing challenge every day';
    $('dqGallery').replaceChildren(...S.gallery.slice().reverse().map((g) => h('li', { class: 'shelf-item' },
      h('img', { src: g.data, alt: g.title || 'A saved doodle', loading: 'lazy' }),
      h('div', { class: 'shelf-body' },
        h('strong', null, g.title || 'Untitled doodle'),
        h('small', null, g.prompt),
        h('div', { class: 'shelf-actions' },
          h('button', { type: 'button', class: 'ghost-btn', onclick: () => {
            const img = new Image();
            img.onload = () => { snapshot(); ctx.drawImage(img, 0, 0, canvas.width, canvas.height); toast('Doodle opened - keep drawing!'); };
            img.src = g.data;
          } }, 'Keep drawing'),
          h('button', { type: 'button', class: 'ghost-btn danger', onclick: () => {
            if (!window.confirm('Delete this doodle?')) return;
            S.gallery = S.gallery.filter((x) => x.id !== g.id);
            store.save();
            renderGallery();
          } }, 'Delete'))))));
  }

  $('dqSave').addEventListener('click', () => {
    const item = {
      id: 'd' + Date.now().toString(36),
      title: $('dqTitleInput').value.trim(),
      prompt: challenge.prompt,
      data: thumb(),
      at: Date.now(),
    };
    S.gallery.push(item);
    S.made += 1;
    while (S.gallery.length > MAX_GALLERY) S.gallery.shift();
    // If storage is full, drop the oldest until it fits.
    while (!store.save() && S.gallery.length > 1) S.gallery.shift();
    $('dqTitleInput').value = '';
    renderGallery();
    toast('Saved to your gallery!');
  });

  $('dqDownload').addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = 'tinyspark-doodle.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  });

  blank();
  renderTools();
  today();
  renderGallery();
})();
