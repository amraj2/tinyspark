/* Little Sparks core: stage, input, voice, sound, stickers, art slots.
 * Built for ages 3-5: big targets, a friendly voice, no fail states. */
(() => {
  'use strict';
  const LS = (window.LS = window.LS || {});
  const CFG = JSON.parse(document.getElementById('ls-config').textContent);
  LS.CFG = CFG;
  const W = 1000;
  const H = 640;
  LS.W = W;
  LS.H = H;

  // ---------- small utils ----------
  const U = {
    rand: (a, b) => a + Math.random() * (b - a),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    dist: (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by),
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    seeded(seed) {
      let a = seed >>> 0;
      return () => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
  };
  LS.U = U;

  const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  LS.numberWord = (n) => NUMBER_WORDS[n] || String(n);

  // ---------- storage ----------
  const KEY = 'tinyspark-littlesparks-v1';
  const store = (() => {
    let data = { stickers: [], stats: {}, settings: { voice: true, sound: true } };
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (raw && typeof raw === 'object') {
        data = {
          stickers: Array.isArray(raw.stickers) ? raw.stickers : [],
          stats: raw.stats || {},
          settings: Object.assign({ voice: true, sound: true }, raw.settings || {}),
        };
      }
    } catch (e) { /* ignore */ }
    return {
      data,
      save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignore */ } },
    };
  })();
  LS.store = store;

  // ---------- art slots ----------
  const art = {};
  const atlasBoxes = {"ant": [119, 3, 137, 125], "ladybird": [350, 14, 146, 114], "bee": [565, 2, 164, 126], "butterfly": [797, 1, 165, 127], "caterpillar": [1024, 26, 169, 102], "snail": [1280, 17, 159, 108], "leaf": [94, 150, 162, 106], "flower": [358, 133, 136, 123], "mushroom": [584, 137, 132, 119], "apple": [810, 135, 122, 121], "chick": [1059, 135, 114, 121], "cat": [1292, 131, 147, 125], "pumpkin": [98, 258, 153, 126], "sheep": [339, 266, 157, 118], "cow": [550, 263, 190, 121], "tree": [790, 262, 156, 122], "house": [1024, 265, 199, 119], "strawberry": [1304, 267, 126, 117], "cherries": [104, 397, 141, 115], "tomato": [347, 399, 148, 113], "banana": [575, 396, 151, 116], "lemon": [801, 401, 144, 111], "sunflower": [1051, 397, 129, 115], "star": [1293, 398, 134, 114], "whale": [87, 518, 169, 122], "cap": [323, 525, 175, 108], "drop": [604, 516, 91, 124], "blue-ball": [802, 519, 129, 121], "green-apple": [1055, 516, 124, 124], "cucumber": [1284, 529, 173, 111], "frog": [102, 649, 134, 119], "broccoli": [339, 640, 156, 126], "cookie": [574, 644, 143, 119], "carrot": [782, 640, 181, 121], "bread": [1027, 646, 191, 114], "pig": [1302, 645, 149, 123], "rabbit": [106, 768, 116, 128], "bear": [330, 768, 145, 128], "dog": [572, 768, 134, 124], "panda": [801, 768, 131, 127], "train": [1024, 768, 196, 126], "station": [1280, 772, 198, 118], "seed": [122, 915, 93, 94], "sprout": [354, 907, 113, 108], "leafy-plant": [566, 896, 148, 120], "barrier": [779, 896, 197, 119], "roly-ball": [1049, 896, 127, 124], "net": [1280, 896, 168, 120]};
  LS.art = {
    get: (name) => art[name] || null,
    load() {
      const jobs = Object.entries(CFG.art || {}).map(([name, file]) => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => { art[name] = img; resolve(); };
        img.onerror = () => resolve();
        img.src = CFG.artBase + file;
      }));
      return Promise.all(jobs).then(()=>{
        if(!art.objects)return;
        // Isolate each connected toy silhouette so neighbouring sheet fragments never leak into play.
        for(const [name,[sx,sy,w,h]] of Object.entries(atlasBoxes)){
          const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');
          ctx.drawImage(art.objects,sx,sy,w,h,0,0,w,h);const pixels=ctx.getImageData(0,0,w,h),seen=new Uint8Array(w*h);let best=[];
          for(let start=0;start<w*h;start++){
            if(seen[start]||pixels.data[start*4+3]<80)continue;
            const stack=[start],part=[];seen[start]=1;
            while(stack.length){const k=stack.pop();part.push(k);const x=k%w,y=Math.floor(k/w);for(const n of [x>0?k-1:-1,x<w-1?k+1:-1,y>0?k-w:-1,y<h-1?k+w:-1])if(n>=0&&!seen[n]&&pixels.data[n*4+3]>=80){seen[n]=1;stack.push(n);}}
            if(part.length>best.length)best=part;
          }
          const keep=new Uint8Array(w*h);for(const k of best){const x=k%w,y=Math.floor(k/w);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h)keep[(y+dy)*w+x+dx]=1;}
          for(let k=0;k<w*h;k++)if(!keep[k])pixels.data[k*4+3]=0;
          ctx.putImageData(pixels,0,0);c.isObjectSprite=true;art[name]=c;
        }
      });
    },
  };

  /* Draw an emoji, or its replacement image when art exists. */
  LS.icon = function icon(g, ch, x, y, size, rot, alpha) {
    const name = CFG.artNames[ch];
    const img = name ? art[name] : null;
    const box = !img && art.objects && atlasBoxes[name];
    g.save();
    g.translate(x, y);
    if (rot) g.rotate(rot);
    if (alpha != null) g.globalAlpha = alpha;
    if (img) {
      const k=size/Math.max(img.width,img.height);g.drawImage(img,-img.width*k/2,-img.height*k/2,img.width*k,img.height*k);
    } else if(box){
      const [sx,sy,sw,sh]=box,k=size/Math.max(sw,sh);g.drawImage(art.objects,sx,sy,sw,sh,-sw*k/2,-sh*k/2,sw*k,sh*k);
    } else {
      // Colour emoji take the alpha of the current fillStyle, so an earlier
      // translucent fill would wash them out. Always draw with an opaque one.
      g.fillStyle = '#000';
      g.font = `${Math.round(size * 0.86)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(ch, 0, size * 0.04);
    }
    g.restore();
  };

  /* Draw a named background/sprite if art exists. Returns true if drawn. */
  LS.sprite = function sprite(g, name, x, y, w, h) {
    const img = art[name];
    if (!img){
      const box=atlasBoxes[name];if(!box||!art.objects)return false;
      const [sx,sy,sw,sh]=box,k=Math.min(w/sw,h/sh);g.drawImage(art.objects,sx,sy,sw,sh,x+(w-sw*k)/2,y+(h-sh*k)/2,sw*k,sh*k);return true;
    }
    if(img.isObjectSprite){const k=Math.min(w/img.width,h/img.height);g.drawImage(img,x+(w-img.width*k)/2,y+(h-img.height*k)/2,img.width*k,img.height*k);}
    else g.drawImage(img, x, y, w, h);
    return true;
  };

  LS.panel=(g,x,y,w,h,color='#fff7db',edge='#514633')=>{
    g.save();g.fillStyle='#0003';g.beginPath();g.roundRect(x+3,y+5,w,h,15);g.fill();
    const fill=g.createLinearGradient(x,y,x,y+h);fill.addColorStop(0,color);fill.addColorStop(1,color);g.fillStyle=fill;g.strokeStyle=edge;g.lineWidth=3;g.beginPath();g.roundRect(x,y,w,h,15);g.fill();g.stroke();g.restore();
  };
  LS.label=(g,text,x,y,size=20,color='#fff9e7')=>{g.save();g.font=`900 ${size}px 'Trebuchet MS',sans-serif`;g.textAlign='center';g.textBaseline='middle';g.strokeStyle='#273241';g.lineWidth=4;g.strokeText(text,x,y);g.fillStyle=color;g.fillText(text,x,y);g.restore();};
  LS.shadow=(g,x,y,r)=>{g.save();g.fillStyle='#172b292b';g.beginPath();g.ellipse(x,y,r,r*.23,0,0,Math.PI*2);g.fill();g.restore();};
  LS.band=(g,i,x,y,w,h)=>{if(!art.band)return false;const cw=art.band.width/4,ch=art.band.height,k=Math.min(w/cw,h/ch);g.drawImage(art.band,i*cw,0,cw,ch,x+(w-cw*k)/2,y+(h-ch*k)/2,cw*k,ch*k);return true;};

  // ---------- voice ----------
  const Voice = {
    voice: null,
    get on() { return store.data.settings.voice; },
    say(text) {
      if (!this.on || !('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-GB';
        u.rate = 0.82;
        u.pitch = 1.2;
        window.speechSynthesis.speak(u);
      } catch (e) { /* ignore */ }
    },
    stop() { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); },
  };
  LS.voice = Voice;
  const PRAISE = ['Well done!', 'Brilliant!', 'You did it!', 'Hooray!', 'Super!', 'Fantastic!', 'Great job!'];
  LS.praise = () => U.pick(PRAISE);

  // ---------- sound ----------
  const Sfx = (() => {
    let ctx = null;
    let master = null;
    function ensure() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function tone(freq, dur, type = 'sine', vol = 0.25, delay = 0, endFreq = null) {
      if (!store.data.settings.sound || !ensure()) return;
      const t = ctx.currentTime + delay;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
    const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
    return {
      ensure, tone,
      pop() { tone(520, 0.1, 'sine', 0.28, 0, 900); },
      chime(i = 0) { tone(SCALE[i % SCALE.length], 0.4, 'triangle', 0.28); },
      boing() { tone(320, 0.28, 'sine', 0.28, 0, 130); },
      whoosh() { tone(180, 0.22, 'triangle', 0.14, 0, 700); },
      toot() { tone(392, 0.18, 'square', 0.1); tone(523, 0.26, 'square', 0.1, 0.16); },
      yay() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.32, 'triangle', 0.28, i * 0.1)); },
      note(freq) { tone(freq, 0.45, 'triangle', 0.32); },
    };
  })();
  LS.sfx = Sfx;

  // ---------- stage ----------
  class Stage {
    constructor(canvas) {
      this.canvas = canvas;
      this.g = canvas.getContext('2d');
      this.game = null;
      this.parts = [];
      this.pointer = { x: W / 2, y: H / 2, down: false, type: 'mouse', moved: false };
      this.idle = 0;
      this.last = 0;
      this.raf = 0;
      this.t = 0;
      this.paused=false;this.tasks=[];this.keys=new Set();
      this.frame = this.frame.bind(this);
      this.bind();
      this.resize();
      window.addEventListener('resize', () => this.resize());
      document.addEventListener('keydown',e=>{if(!this.game||this.paused||document.querySelector('dialog[open]'))return;if(this.game.key&&this.game.key(e.key)){e.preventDefault();return;}if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)&&this.game.keyboardMove){this.keys.add(e.key);e.preventDefault();}});
      document.addEventListener('keyup',e=>this.keys.delete(e.key));
      window.addEventListener('blur',()=>this.keys.clear());
    }

    resize() {
      const box = this.canvas.parentElement.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      let w = box.width;
      let h = (w * H) / W;
      if (h > box.height && box.height > 0) { h = box.height; w = (h * W) / H; }
      this.canvas.style.width = `${Math.floor(w)}px`;
      this.canvas.style.height = `${Math.floor(h)}px`;
      this.canvas.width = W * dpr;
      this.canvas.height = H * dpr;
      this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    toLocal(e) {
      const r = this.canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
    }

    bind() {
      const c = this.canvas;
      c.style.touchAction = 'none';
      c.addEventListener('pointerdown', (e) => {
        if (!e.isPrimary || this.paused || !this.game) return;
        e.preventDefault();
        Sfx.ensure();
        try { c.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        const p = this.toLocal(e);
        Object.assign(this.pointer, p, { down: true, type: e.pointerType, moved: false });
        this.idle = 0;
        if (this.game && this.game.down) this.game.down(p.x, p.y);
      });
      c.addEventListener('pointermove', (e) => {
        if (!e.isPrimary || this.paused || !this.game) return;
        const p = this.toLocal(e);
        const prev = { x: this.pointer.x, y: this.pointer.y };
        Object.assign(this.pointer, p, { type: e.pointerType, moved: true });
        this.idle = 0;
        if (this.game && this.game.move) this.game.move(p.x, p.y, prev.x, prev.y, this.pointer.down);
      });
      const up = (e) => {
        if (!e.isPrimary || this.paused || !this.game) return;
        const p = this.toLocal(e);
        this.pointer.down = false;
        if (this.game && this.game.up) this.game.up(p.x, p.y);
      };
      c.addEventListener('pointerup', up);
      c.addEventListener('pointercancel',e=>{this.pointer.down=false;this.pointer.moved=false;if(this.game?.cancel)this.game.cancel();});
    }

    run(game) {
      this.stop();
      this.game = game;
      this.parts = [];
      this.paused=false;this.pointer.down=false;this.pointer.moved=false;this.keys.clear();
      this.idle = 0;
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }

    after(fn,ms){this.tasks.push({at:this.t+ms/1000,fn});}

    stop() {
      this.tasks=[];this.keys.clear();
      cancelAnimationFrame(this.raf);
      if (this.game && this.game.stop) this.game.stop();
      this.game = null;
    }

    frame(now) {
      this.raf = requestAnimationFrame(this.frame);
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      if(this.paused)return;
      this.t += dt;
      const due=this.tasks.filter(task=>task.at<=this.t);this.tasks=this.tasks.filter(task=>task.at>this.t);due.forEach(task=>task.fn());
      this.idle += dt;
      const g = this.g;
      if (this.game) {
        this.game.update(dt);
        g.clearRect(0, 0, W, H);
        this.game.draw(g);
      }
      this.updateParts(dt);
      this.drawParts(g);
    }

    // celebratory particles (emoji sparkles)
    burst(x, y, opts = {}) {
      if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
      const n = opts.n || 14;
      const chars = opts.chars || ['✨', '⭐', '🌟'];
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = U.rand(80, 320);
        this.parts.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, life: U.rand(0.7, 1.3), max: 1.3,
          ch: U.pick(chars), size: U.rand(22, 40), rot: U.rand(-1, 1), vr: U.rand(-3, 3),
        });
      }
    }

    updateParts(dt) {
      this.parts = this.parts.filter((p) => p.life > 0);
      this.parts.forEach((p) => {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 520 * dt; p.rot += p.vr * dt; p.life -= dt;
      });
    }

    drawParts(g) {
      this.parts.forEach((p) => {
        LS.icon(g, p.ch, p.x, p.y, p.size, p.rot, Math.max(0, Math.min(1, p.life / 0.5)));
      });
    }
  }
  LS.Stage = Stage;

  /* A bouncing hand hint, drawn by games after a few idle seconds. */
  LS.drawHint = function drawHint(g, x, y, t) {
    LS.icon(g, '👆', x + Math.sin(t * 5) * 6, y + 30 + Math.abs(Math.sin(t * 4)) * 14, 54, 0);
  };

  // ---------- rewards (sticker book) ----------
  LS.stickerById = (id) => CFG.stickers.find((s) => s.id === id);
  LS.hasSticker = (id) => store.data.stickers.includes(id);
  LS.onSticker = null;
  LS.award = function award(id) {
    const s = LS.stickerById(id);
    if (!s || LS.hasSticker(id)) return false;
    store.data.stickers.push(id);
    store.save();
    if (LS.onSticker) LS.onSticker(s);
    return true;
  };

  LS.bumpStat = function bumpStat(game, key, by = 1) {
    const g = (store.data.stats[game] = store.data.stats[game] || {});
    g[key] = (g[key] || 0) + by;
    store.save();
    return g[key];
  };

  // ---------- game registry ----------
  LS.games = {};
  LS.register = (id, factory) => { LS.games[id] = factory; };
})();
