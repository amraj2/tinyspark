/* Doodle Quest: draw a daily challenge, keep a gallery on this device. */
(() => {
  'use strict';
  const { $, h, pick, dayIndex, createStore, toast, config } = window.TS;
  const CFG = config();
  const COLORS = ['#1b1b1b', '#e03131', '#f08c00', '#fcc419', '#2f9e44', '#1c7ed6', '#7048e8', '#e64980', '#8b5a2b', '#ffffff'];
  const SIZES = [{ n: 3, label: 'Fine' }, { n: 8, label: 'Medium' }, { n: 18, label: 'Chunky' }];
  const MAX_UNDO = 15;
  const TIMER_SECS = 300;

  const store = createStore('tinyspark-doodle-v1', { gallery: [], made: 0, draft: null });
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
  let hasArt = false;
  let saved = false;
  let activeId = null;
  let draftTimer;
  let stampCount = 0;
  function quest() {
    $('dqDrawStep').classList.toggle('done',hasArt);
    $('dqTwistStep').classList.toggle('done',$('dqTwistDone').checked);
    $('dqSaveStep').classList.toggle('done',saved);
    [['dqDrawStep',hasArt],['dqTwistStep',$('dqTwistDone').checked],['dqSaveStep',saved]].forEach(([id,done])=>$(id).setAttribute('aria-label',$(id).textContent+(done?' · complete':' · not complete')));
    const target = [1,3,6,12].find(n => n > S.made);
    $('doodleGoal').textContent = target ? `${S.made} / ${target} creations · ${target === 1 ? 'Make your first mark' : target === 3 ? 'Become a Colour Explorer' : target === 6 ? 'Become an Imagination Maker' : 'Become an Island Artist'}` : `${S.made} creations · Island Artist`;
  }
  function persistDraft() {
    clearTimeout(draftTimer);
    S.draft={data:thumb(),challenge,title:$('dqTitleInput').value,twist:$('dqTwistDone').checked,hasArt,activeId};
    store.save();
  }
  function saveDraft() {clearTimeout(draftTimer);draftTimer=setTimeout(persistDraft,300);}
  window.addEventListener('pagehide',persistDraft);
  $('dqTitleInput').addEventListener('input',saveDraft);
  $('dqTwistDone').addEventListener('change',() => {quest();saveDraft();});
  let timer = { left: TIMER_SECS, id: null };

  // ----- canvas -----
  function blank() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function snapshot() {
    undoStack.push({image:ctx.getImageData(0, 0, canvas.width, canvas.height),hasArt,activeId,saved});
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
    hasArt = true; saved = false; quest();
    stroke(last, last);       // a dot for a simple tap
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!drawing) return;
    const p = pos(ev);
    stroke(last, p);
    last = p;
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => canvas.addEventListener(t, () => { if(drawing) saveDraft(); drawing = false; }));

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
    if (img) {ctx.putImageData(img.image, 0, 0);hasArt=img.hasArt;activeId=img.activeId;saved=img.saved;saveDraft();quest();} else toast('Nothing to undo yet.');
  });
  $('dqClear').addEventListener('click', () => {
    if (!window.confirm('Clear your drawing and start again?')) return;
    snapshot();
    blank(); hasArt=false; saved=false; activeId=null; quest();saveDraft();
  });

  // ----- challenge -----
  function setChallenge(prompt, twist) {
    challenge = { prompt, twist };
    $('dqPrompt').textContent = 'Draw ' + prompt + '.';
    $('dqTwist').textContent = 'Twist: ' + twist;
    $('dqTwistDone').checked=false;
    quest();
    saveDraft();
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
    quest();
    $('dqGallery').replaceChildren(...S.gallery.slice().reverse().map((g) => h('li', { class: 'shelf-item' },
      h('img', { src: g.data, alt: g.title || 'A saved doodle', loading: 'lazy' }),
      h('div', { class: 'shelf-body' },
        h('strong', null, g.title || 'Untitled doodle'),
        h('small', null, g.prompt),
        h('div', { class: 'shelf-actions' },
          h('button', { type: 'button', class: 'ghost-btn', onclick: () => {
            const img = new Image();
            img.onload = () => { snapshot(); ctx.drawImage(img, 0, 0, canvas.width, canvas.height); activeId=g.id;hasArt=true;saved=true;challenge={prompt:g.prompt,twist:g.twist || 'Add a tiny surprise'};$('dqPrompt').textContent='Draw '+g.prompt+'.';$('dqTwist').textContent='Twist: '+challenge.twist;$('dqTitleInput').value=g.title || '';quest();saveDraft();canvas.scrollIntoView({block:'center'}); toast('Doodle opened - keep drawing!'); };
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
    if (!hasArt) {toast('Make a mark or add a shape first. Your creation starts with you!');return;}
    const previousGallery=S.gallery.slice(),previousMade=S.made,previousId=activeId;
    const item = {
      id: activeId || 'd' + Date.now().toString(36),
      title: $('dqTitleInput').value.trim(),
      prompt: challenge.prompt,
      twist: challenge.twist,
      data: thumb(),
      at: Date.now(),
    };
    const existing = S.gallery.findIndex(g => g.id === item.id);
    if(existing >= 0) S.gallery[existing]=item; else {S.gallery.push(item);S.made += 1;}
    activeId=item.id; saved=true;
    if (!store.save()) { S.gallery=previousGallery;S.made=previousMade;activeId=previousId;saved=false;quest();toast('This device is full. Download your picture to keep it, or free space in your gallery.');return; }
    saveDraft();
    renderGallery();
    toast('Saved to your gallery!');
  });

  $('dqDownload').addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = 'tinyspark-doodle.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  });

  document.querySelectorAll('[data-stamp]').forEach(button => button.addEventListener('click',() => {
    snapshot();
    const x=100+(stampCount*131)%440, y=100+(stampCount*97)%280;
    stampCount++;
    ctx.save();ctx.translate(x,y);ctx.fillStyle=color;ctx.strokeStyle=color;ctx.lineWidth=5;
    if(button.dataset.stamp === 'star') {ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?22:48;const px=Math.cos(a)*r,py=Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fill();}
    else if(button.dataset.stamp === 'planet'){ctx.beginPath();ctx.arc(0,0,32,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(0,0,55,15,-.4,0,Math.PI*2);ctx.stroke();}
    else {for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.arc(Math.cos(a)*26,Math.sin(a)*26,19,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#ffe16b';ctx.beginPath();ctx.arc(0,0,14,0,Math.PI*2);ctx.fill();}
    ctx.restore();hasArt=true;saved=false;quest();saveDraft();
  }));
  const restored=S.draft;
  blank();
  renderTools();
  today();
  renderGallery();
  if(restored?.hasArt && restored.data) {
    const image=new Image();image.onload=()=>{ctx.drawImage(image,0,0,canvas.width,canvas.height);hasArt=true;activeId=restored.activeId || null;challenge=restored.challenge || challenge;$('dqPrompt').textContent='Draw '+challenge.prompt+'.';$('dqTwist').textContent='Twist: '+challenge.twist;$('dqTitleInput').value=restored.title || '';$('dqTwistDone').checked=!!restored.twist;quest();saveDraft();};image.src=restored.data;
  }
})();
