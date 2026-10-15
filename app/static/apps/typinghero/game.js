/* Typing Hero game engine: plays one level (notes / words / sentences).
 * Gameplay runs on performance.now(); audio is decoration only. */
(() => {
  'use strict';
  const TH = (window.TH = window.TH || {});
  const C = TH.core;

  const W = 960;
  const H = 540;
  const TOP_Y = 34;
  const STRIKE_Y = 440;
  const LANE_W = 78;
  const CENTER = W / 2;
  const APPROACH_MS = 2100;
  const MIN_SCALE = 0.42;

  const FCOLOR = {
    lp: '#b197fc', lr: '#4dabf7', lm: '#69db7c', li: '#ffd43b', th: '#ff8787',
    ri: '#ffd43b', rm: '#69db7c', rr: '#4dabf7', rp: '#b197fc',
  };
  TH.FCOLOR = FCOLOR;
  const GRADE_COLOR = { perfect: '#ffe066', great: '#8ce99a', good: '#74c0fc', miss: '#ff6b6b', wrong: '#ff6b6b' };

  const laneX = (lane, scale) => CENTER + (lane - 4) * LANE_W * scale;

  class Game {
    constructor(opts) {
      this.level = opts.level;
      this.settings = opts.settings;           // {rock, tempo, sparkKey ...}
      this.canvas = opts.canvas;
      this.hooks = opts.hooks || {};
      this.art = opts.art || { get: () => null };
      this.audio = TH.audio;
      this.ctx = this.canvas.getContext('2d');
      this.tempo = { slow: 0.85, normal: 1, fast: 1.2 }[opts.settings.tempo] || 1;
      this.rock = opts.settings.rock || 'chill';
      this.win = C.WINDOWS[this.rock];
      this.meterCfg = C.METER[this.rock];
      this.chart = C.buildChart(this.level, this.tempo);

      this.score = 0;
      this.combo = 0;
      this.maxCombo = 0;
      this.meter = 50;
      this.spark = 0;
      this.sparkOn = false;
      this.hits = 0;
      this.misses = 0;
      this.wrong = 0;
      this.keyStats = {};
      this.fx = [];
      this.pops = [];
      this.padFlash = {};
      this.lastWrong = null;
      this.startPerf = 0;
      this.pausedTotal = 0;
      this.pausedAt = 0;
      this.paused = false;
      this.ended = false;
      this.firstInputT = null;
      this.lastCorrectT = null;
      this.lastHudAt = 0;
      this.raf = 0;
      this.lastT = 0;
      this.toast = null;

      if (this.chart.kind === 'notes') {
        this.pending = this.chart.notes.map((n) => Object.assign({ state: 0 }, n));
        this.cursor = 0;
      } else if (this.chart.kind === 'words') {
        this.words = this.chart.words.map((w) => Object.assign({ idx: 0, state: 0, wrongs: 0 }, w));
      } else {
        this.s = { i: 0, idx: 0, start: 2600, wrongs: 0, done: false, doneAt: 0, gapUntil: 0 };
      }

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.canvas.width = W * dpr;
      this.canvas.height = H * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.frame = this.frame.bind(this);
    }

    // ---------- lifecycle ----------
    start() {
      this.startPerf = performance.now() + 150;
      if (this.settings.music !== false) {
        this.audio.startBacking({
          delayMs: 150,
          beatMs: this.chart.beatMs || 60000 / (this.level.bpm * this.tempo),
          world: this.level.world,
        });
      }
      this.raf = requestAnimationFrame(this.frame);
    }

    time() { return performance.now() - this.startPerf - this.pausedTotal; }

    pause() {
      if (this.paused || this.ended) return;
      this.paused = true;
      this.pausedAt = performance.now();
      this.audio.suspend();
    }

    resume() {
      if (!this.paused) return;
      this.pausedTotal += performance.now() - this.pausedAt;
      this.paused = false;
      this.audio.resume();
    }

    destroy() {
      this.ended = true;
      cancelAnimationFrame(this.raf);
      this.audio.stopBacking();
    }

    // ---------- main loop ----------
    frame() {
      if (this.ended) return;
      this.raf = requestAnimationFrame(this.frame);
      if (this.paused) return;
      const t = this.time();
      const dt = Math.max(0, t - this.lastT);
      this.lastT = t;
      this.update(t, dt);
      this.draw(t);
      const now = performance.now();
      if (this.hooks.hud && now - this.lastHudAt > 60) {
        this.lastHudAt = now;
        this.hooks.hud(this, t);
      }
    }

    update(t, dt) {
      if (this.sparkOn) {
        this.spark -= (100 / 14000) * dt;
        if (this.spark <= 0) { this.spark = 0; this.sparkOn = false; if (this.hooks.spark) this.hooks.spark(false); }
      }
      this.pops = this.pops.filter((p) => t - p.t0 < 800);
      this.fx = this.fx.filter((p) => p.life > 0);
      this.fx.forEach((p) => { p.x += p.vx * dt / 16; p.y += p.vy * dt / 16; p.vy += 0.05 * dt / 16; p.life -= dt; });

      if (this.chart.kind === 'notes') this.updateNotes(t);
      else if (this.chart.kind === 'words') this.updateWords(t);
      else this.updateSentences(t, dt);

      if (!this.ended && this.meter <= 0 && this.rock !== 'chill') this.finish(true);
    }

    // ---------- shared scoring helpers ----------
    stat(k) {
      return (this.keyStats[k] = this.keyStats[k] || { hit: 0, wrong: 0, miss: 0, ms: 0 });
    }

    addMeter(v) {
      this.meter = Math.max(this.meterCfg.floor, Math.min(100, this.meter + v));
    }

    mult() { return C.multiplier(this.combo) * (this.sparkOn ? 2 : 1); }

    gain(points) {
      this.score += Math.round(points * this.mult());
    }

    onCorrect(ch, t, grade, ms, gold) {
      if (this.firstInputT === null) this.firstInputT = t;
      this.lastCorrectT = t;
      this.hits++;
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      const s = this.stat(ch);
      s.hit++;
      s.ms += ms || 0;
      this.addMeter(grade === 'perfect' ? this.meterCfg.perfect : this.meterCfg.hit);
      if (gold) this.addSpark(6.25);
      if (this.hooks.correct) this.hooks.correct(ch, grade);
    }

    addSpark(v) {
      this.spark = Math.min(100, this.spark + v * (this.sparkOn ? 0.5 : 1));
    }

    onWrong(expected, pressed, t) {
      if (this.firstInputT === null) this.firstInputT = t;
      this.wrong++;
      this.combo = 0;
      this.stat(expected).wrong++;
      this.addMeter(this.meterCfg.wrong);
      this.lastWrong = { expected, pressed, t };
      this.audio.wrong();
      if (this.hooks.wrong) this.hooks.wrong(expected, pressed);
      this.say(`${C.keyLabel(pressed)}? Try ${C.keyLabel(expected)}`, 'wrong', t);
    }

    say(text, kind, t, x, y) {
      this.pops.push({ text, kind, t0: t, x: x == null ? CENTER : x, y: y == null ? STRIKE_Y - 70 : y });
    }

    burst(x, y, color, n = 10) {
      if(this.settings.reducedMotion)return;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 1 + Math.random() * 3.2;
        this.fx.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.2, life: 420 + Math.random() * 260, color });
      }
    }

    // ---------- input ----------
    handleKey(ev) {
      if (this.ended || this.paused) return false;
      if (ev.key === 'Enter') { this.activateSpark(); return true; }
      if (ev.key.length !== 1) return false;
      const t = this.time();
      if (t < 0) return true;
      const ch = ev.key;
      if (this.chart.kind === 'notes') this.pressNote(ch, t);
      else if (this.chart.kind === 'words') this.pressWord(ch, t);
      else this.pressSentence(ch, t);
      return true;
    }

    activateSpark() {
      if (this.sparkOn || this.spark < 50) {
        if (!this.sparkOn) this.say('Fill the Spark meter first!', 'good', this.time());
        return;
      }
      this.sparkOn = true;
      this.audio.sparkOn();
      if (this.hooks.spark) this.hooks.spark(true);
      this.say('SPARK POWER!', 'perfect', this.time());
    }

    // ---------- notes mode ----------
    updateNotes(t) {
      const notes = this.pending;
      while (this.cursor < notes.length && notes[this.cursor].state !== 0) this.cursor++;
      for (let i = this.cursor; i < notes.length; i++) {
        const n = notes[i];
        if (n.t > t + this.win) break;
        if (n.state === 0 && t - n.t > this.win) {
          n.state = 2;
          // A note already answered with a wrong key was counted as a
          // mistake then; do not punish the same slip twice.
          if (!n.wrongTried) {
            this.misses++;
            this.combo = 0;
            this.stat(n.ch).miss++;
            this.addMeter(this.meterCfg.miss);
            this.audio.miss();
            this.say('MISS', 'miss', t, laneX(n.lane, 1), STRIKE_Y - 36);
            if (this.hooks.miss) this.hooks.miss(n.ch);
          }
        }
      }
      if (!this.ended && this.cursor >= notes.length && t > notes[notes.length - 1].t + 500) this.finish(false);
    }

    pressNote(ch, t) {
      const notes = this.pending;
      let best = null;
      let bd = Infinity;
      let nearest = null;
      let nd = Infinity;
      for (let i = this.cursor; i < notes.length; i++) {
        const n = notes[i];
        if (n.t > t + this.win * 2.6) break;
        if (n.state !== 0) continue;
        const d = Math.abs(t - n.t);
        if (n.ch === ch && d <= this.win && d < bd) { best = n; bd = d; }
        if (d < nd) { nearest = n; nd = d; }
      }
      if (best) {
        best.state = 1;
        const grade = C.judge(t - best.t, this.win);
        this.gain(C.POINTS[grade]);
        this.onCorrect(ch, t, grade, Math.abs(t - best.t), best.gold);
        this.audio.hit(best.lane, grade, this.level.world);
        this.padFlash[best.lane] = { t0: t, color: GRADE_COLOR[grade] };
        const sc = 1;
        this.burst(laneX(best.lane, sc), STRIKE_Y, FCOLOR[C.fingerOf(ch)] || '#fff', grade === 'perfect' ? 16 : 9);
        this.say(grade.toUpperCase(), grade, t, laneX(best.lane, sc), STRIKE_Y - 60);
        return;
      }
      // Right key, wrong moment: gentle nudge, no penalty.
      for (let i = this.cursor; i < notes.length; i++) {
        const n = notes[i];
        if (n.t > t + this.win * 2.6) break;
        if (n.state === 0 && n.ch === ch) {
          this.say(n.t > t ? 'A bit early!' : 'A bit late!', 'good', t, laneX(n.lane, 1), STRIKE_Y - 60);
          return;
        }
      }
      // Wrong key while a note is due: that is a typing mistake.
      if (nearest && nd <= this.win * 1.6) {
        this.padFlash[nearest.lane] = { t0: t, color: GRADE_COLOR.wrong };
        nearest.wrongTried = true;
        this.onWrong(nearest.ch, ch, t);
      }
    }

    // ---------- words mode ----------
    currentWord(t) {
      return this.words.find((w) => w.state === 0 && w.spawn <= t);
    }

    updateWords(t) {
      let open = 0;
      this.words.forEach((w) => {
        if (w.state !== 0) return;
        open++;
        if (t - w.spawn >= w.fall) {
          w.state = 2;
          const left = w.text.length - w.idx;
          this.misses += left;
          for (let i = w.idx; i < w.text.length; i++) this.stat(w.text[i]).miss++;
          this.combo = 0;
          this.addMeter(this.meterCfg.miss);
          this.audio.miss();
          this.say('MISSED IT', 'miss', t, CENTER, STRIKE_Y - 36);
        }
      });
      if (!this.ended && open === 0) this.finish(false);
    }

    pressWord(ch, t) {
      const w = this.currentWord(t);
      if (!w) return;
      const expected = w.text[w.idx];
      if (ch === expected) {
        w.idx++;
        this.gain(20);
        this.onCorrect(expected, t, 'great', 0, false);
        const lane = C.laneOf(expected);
        this.audio.hit(lane < 0 ? 4 : lane, 'great', this.level.world);
        this.padFlash[lane] = { t0: t, color: GRADE_COLOR.great };
        if (w.idx >= w.text.length) {
          w.state = 1;
          const elapsed = t - w.spawn;
          const fast = w.dur > 0 && elapsed - 2400 <= w.dur * 0.8;
          this.gain(50 + 10 * w.text.length);
          this.addMeter(this.meterCfg.hit * 2);
          if (w.gold && w.wrongs === 0) this.addSpark(25);
          this.burst(CENTER, this.wordY(w, t), '#ffe066', 18);
          this.say(w.wrongs === 0 ? (fast ? 'PERFECT!' : 'CLEAN!') : 'NICE!', w.wrongs === 0 ? 'perfect' : 'good', t, CENTER, this.wordY(w, t) - 40);
        }
      } else {
        w.wrongs++;
        this.onWrong(expected, ch, t);
      }
    }

    wordY(w, t) {
      const p = Math.min(1.1, Math.max(0, (t - w.spawn) / w.fall));
      return TOP_Y + 10 + p * (STRIKE_Y - TOP_Y - 20);
    }

    // ---------- sentences mode ----------
    paceIdx(t) {
      const s = this.s;
      return Math.max(0, ((t - (s.start + 1200)) / 1000) * this.chart.cps);
    }

    updateSentences(t, dt) {
      const s = this.s;
      const text = this.chart.lines[s.i];
      if (s.done) {
        if (t >= s.gapUntil) {
          s.i++;
          s.idx = 0;
          s.wrongs = 0;
          s.done = false;
          s.start = t + 400;
          if (s.i >= this.chart.lines.length) { this.finish(false); }
        }
        return;
      }
      if (t < s.start) return;
      const behind = this.paceIdx(t) - s.idx;
      if (behind > 8) {
        this.addMeter(-(4 * dt) / 1000);
        this.behind = true;
      } else this.behind = false;
      if (s.idx >= text.length) {
        s.done = true;
        s.gapUntil = t + 1000;
        this.gain(60 + text.length);
        this.addMeter(this.meterCfg.hit * 3);
        if (s.wrongs <= 1) this.addSpark(33);
        this.say(s.wrongs === 0 ? 'FLAWLESS!' : 'LINE COMPLETE!', s.wrongs === 0 ? 'perfect' : 'good', t, CENTER, 150);
        this.audio.fanfare(2);
      }
    }

    pressSentence(ch, t) {
      const s = this.s;
      if (s.done || t < s.start) return;
      const text = this.chart.lines[s.i];
      const expected = text[s.idx];
      if (ch === expected) {
        s.idx++;
        this.gain(15);
        this.onCorrect(expected === ' ' ? ' ' : expected, t, 'great', 0, false);
        const lane = C.laneOf(expected);
        this.audio.hit(lane < 0 ? 4 : lane, 'great', this.level.world);
        this.padFlash[lane] = { t0: t, color: GRADE_COLOR.great };
      } else {
        s.wrongs++;
        this.onWrong(expected, ch, t);
      }
    }

    // ---------- finish ----------
    finish(failed) {
      if (this.ended) return;
      this.ended = true;
      cancelAnimationFrame(this.raf);
      this.audio.stopBacking();
      const attempts = this.hits + this.misses + this.wrong;
      const acc = attempts ? this.hits / attempts : 0;
      const t = this.lastT;
      const activeMs = Math.max(5000, (this.lastCorrectT || t) - (this.firstInputT || 0));
      const perMin = this.hits / (activeMs / 60000);
      const wpm = this.chart.kind === 'notes' ? 0 : Math.round(perMin / 5);
      const stars = failed ? 0 : C.starsFor(acc, this.level.wpm, wpm);
      const result = {
        levelId: this.level.id, failed, score: this.score, accuracy: acc, hits: this.hits,
        misses: this.misses, wrong: this.wrong, maxCombo: this.maxCombo, wpm,
        keysPerMin: Math.round(perMin), stars, keyStats: this.keyStats,
        total: this.chart.total, durationMs: t,
      };
      if (this.hooks.end) this.hooks.end(result);
    }

    // ---------- drawing ----------
    draw(t) {
      const g = this.ctx;
      g.clearRect(0, 0, W, H);
      this.drawBackdrop(g, t);
      if (this.chart.kind === 'notes') this.drawHighway(g, t);
      else if (this.chart.kind === 'words') this.drawWords(g, t);
      else this.drawSentences(g, t);
      this.drawPads(g, t);
      this.drawFx(g, t);
      this.drawCountIn(g, t);
    }

    drawBackdrop(g, t) {
      const bg = this.art.get('stage');
      if (bg) {
        // The stage fills the viewport behind the transparent performance canvas.
        const hero=this.art.get('hero');
        if(hero){const bob=this.settings.reducedMotion?0:Math.sin(t/(this.chart.beatMs||600)*Math.PI*2)*3;const h=330;g.drawImage(hero,-48,185+bob,h*hero.width/hero.height,h);}
        return;
      }
      const grad = g.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, this.sparkOn ? '#3b0f6e' : '#120b2e');
      grad.addColorStop(1, '#271657');
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
      // stage lights
      g.globalAlpha = 0.12;
      for (let i = 0; i < 5; i++) {
        g.fillStyle = ['#ff6bd6', '#74c0fc', '#ffe066', '#8ce99a', '#b197fc'][i];
        g.beginPath();
        g.moveTo(120 + i * 180, 0);
        g.lineTo(60 + i * 180, H);
        g.lineTo(220 + i * 180, H);
        g.closePath();
        g.fill();
      }
      g.globalAlpha = 1;
    }

    drawHighway(g, t) {
      const topL = laneX(0, MIN_SCALE) - LANE_W * MIN_SCALE / 2;
      const topR = laneX(8, MIN_SCALE) + LANE_W * MIN_SCALE / 2;
      const botL = laneX(0, 1) - LANE_W / 2;
      const botR = laneX(8, 1) + LANE_W / 2;
      const road = this.art.get('highway');
      g.save();
      g.beginPath();
      g.moveTo(topL, TOP_Y);
      g.lineTo(topR, TOP_Y);
      g.lineTo(botR, STRIKE_Y + 30);
      g.lineTo(botL, STRIKE_Y + 30);
      g.closePath();
      g.clip();
      if (road) g.drawImage(road, 0, TOP_Y, W, STRIKE_Y + 30 - TOP_Y);
      else {
        const board=g.createLinearGradient(0,TOP_Y,0,STRIKE_Y+30);board.addColorStop(0,'#131321');board.addColorStop(.6,'#201d2a');board.addColorStop(1,this.sparkOn?'#153d53':'#302733');g.fillStyle=board;g.fillRect(0,0,W,H);
      }
      // lane tints (only lanes in use are bright)
      const used = this.usedLanes();
      for (let l = 0; l < 9; l++) {
        const f = C.LANES[l];
        g.fillStyle = FCOLOR[f];
        g.globalAlpha = used.has(l) ? 0.09 : 0.02;
        g.beginPath();
        g.moveTo(laneX(l, MIN_SCALE) - LANE_W * MIN_SCALE / 2, TOP_Y);
        g.lineTo(laneX(l, MIN_SCALE) + LANE_W * MIN_SCALE / 2, TOP_Y);
        g.lineTo(laneX(l, 1) + LANE_W / 2, STRIKE_Y + 30);
        g.lineTo(laneX(l, 1) - LANE_W / 2, STRIKE_Y + 30);
        g.closePath();
        g.fill();
      }
      g.globalAlpha = 1;
      // beat lines
      const beatMs = this.chart.beatMs;
      const first = Math.floor((t - 400) / beatMs);
      for (let b = first; b < first + Math.ceil(APPROACH_MS / beatMs) + 3; b++) {
        const p = 1 - (b * beatMs - t) / APPROACH_MS;
        if (p < 0 || p > 1.05) continue;
        const y = TOP_Y + p * (STRIKE_Y - TOP_Y);
        const sc = MIN_SCALE + (1 - MIN_SCALE) * p;
        g.strokeStyle = b % 4 === 0 ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.1)';
        g.lineWidth = b % 4 === 0 ? 2 : 1;
        g.beginPath();
        g.moveTo(laneX(0, sc) - LANE_W * sc / 2, y);
        g.lineTo(laneX(8, sc) + LANE_W * sc / 2, y);
        g.stroke();
      }
      g.restore();
      // Metal rails frame the fretboard and keep it readable against the band.
      g.strokeStyle=this.sparkOn?'#70e9ff':'#b6a6ad';g.lineWidth=5;
      for(const side of [-1,1]){g.beginPath();g.moveTo(CENTER+side*4.5*LANE_W*MIN_SCALE,TOP_Y);g.lineTo(CENTER+side*4.5*LANE_W,STRIKE_Y+30);g.stroke();}
      // lane dividers
      g.strokeStyle = 'rgba(255,255,255,0.12)';
      g.lineWidth = 1;
      for (let l = 0; l <= 9; l++) {
        const xTop = CENTER + (l - 4.5) * LANE_W * MIN_SCALE;
        const xBot = CENTER + (l - 4.5) * LANE_W;
        g.beginPath();
        g.moveTo(xTop, TOP_Y);
        g.lineTo(xBot, STRIKE_Y + 30);
        g.stroke();
      }
      // strike line
      g.strokeStyle = this.sparkOn ? '#ffe066' : 'rgba(255,255,255,0.75)';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(botL - 8, STRIKE_Y);
      g.lineTo(botR + 8, STRIKE_Y);
      g.stroke();

      // notes (far to near)
      const notes = this.pending;
      for (let i = notes.length - 1; i >= this.cursor; i--) {
        const n = notes[i];
        if (n.state === 1) continue;
        const p = 1 - (n.t - t) / APPROACH_MS;
        if (p < 0) continue;
        if (p > 1.1) continue;
        this.drawNote(g, n, p, t);
      }
    }

    usedLanes() {
      if (!this._used) {
        this._used = new Set();
        this.level.keys.forEach((k) => { const l = C.laneOf(k); if (l >= 0) this._used.add(l); });
      }
      return this._used;
    }

    drawNote(g, n, p, t) {
      const sc = MIN_SCALE + (1 - MIN_SCALE) * Math.min(1, p);
      const x = laneX(n.lane, sc);
      const y = TOP_Y + p * (STRIKE_Y - TOP_Y);
      const size = 58 * sc;
      const f = C.fingerOf(n.ch);
      const missed = n.state === 2;
      g.save();
      g.globalAlpha = missed ? 0.25 : 1;
      const sprite = this.art.get('note-' + f);
      if (n.gold) {
        g.shadowColor = '#ffe066';
        g.shadowBlur = 16 * sc;
      }
      if (sprite) {
        g.drawImage(sprite, x - size / 2, y - size / 2, size, size);
      } else {
        const fill=g.createLinearGradient(x,y-size/2,x,y+size/2);
        fill.addColorStop(0,'#fff');fill.addColorStop(.2,FCOLOR[f]);fill.addColorStop(.72,FCOLOR[f]);fill.addColorStop(1,'#262033');
        g.fillStyle=fill;g.strokeStyle=n.gold?'#fff3bf':'#18121e';g.lineWidth=3*sc;
        g.beginPath();g.ellipse(x,y,size*.55,size*.42,0,0,Math.PI*2);g.fill();g.stroke();
        g.strokeStyle=n.gold?'#fff5a0':'#ffffff88';g.lineWidth=2*sc;g.beginPath();g.ellipse(x,y-size*.06,size*.41,size*.23,0,Math.PI,Math.PI*2);g.stroke();
      }
      g.shadowBlur = 0;
      g.fillStyle = '#16122b';
      g.font = `800 ${Math.round(30 * sc)}px 'Trebuchet MS', system-ui, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const label = n.ch === ' ' ? '␣' : n.ch;
      g.fillText(label, x, y + 1);
      if (C.needsShift(n.ch) && n.ch !== ' ') {
        g.font = `700 ${Math.round(12 * sc)}px system-ui`;
        g.fillStyle = '#16122b';
        g.fillText('⇧', x - size / 2 + 9 * sc, y - size / 2 + 9 * sc);
      }
      g.restore();
    }

    drawPads(g, t) {
      const y = this.chart.kind === 'notes' ? STRIKE_Y : 486;
      const next = this.nextTarget(t);
      const used = this.usedLanes();
      for (let l = 0; l < 9; l++) {
        const f = C.LANES[l];
        const x = laneX(l, 1);
        const flash = this.padFlash[l];
        const lit = next && next.lanes.has(l);
        const on = used.has(l) || this.chart.kind !== 'notes';
        g.save();
        g.globalAlpha = on ? 1 : 0.28;
        const pad = this.art.get('pad-' + f);
        const w = f === 'th' ? 70 : 64;
        if (pad) g.drawImage(pad, x - w / 2, y - 18, w, 36);
        else {
          g.fillStyle='#13121b';g.strokeStyle=FCOLOR[f];g.lineWidth=lit?4:2;
          g.shadowColor=FCOLOR[f];g.shadowBlur=lit?12:0;
          g.beginPath();g.ellipse(x,y,w/2,17,0,0,Math.PI*2);g.fill();g.stroke();g.shadowBlur=0;
          g.globalAlpha=on?1:.28;g.fillStyle=FCOLOR[f];g.beginPath();g.ellipse(x,y,w/2-8,9,0,0,Math.PI*2);g.fill();
        }
        if (flash && t - flash.t0 < 220) {
          g.globalAlpha = 1 - (t - flash.t0) / 220;
          g.fillStyle = flash.color;
          g.beginPath();
          g.arc(x, y, 34, 0, Math.PI * 2);
          g.fill();
        }
        g.restore();
        // finger label
        g.fillStyle = on ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.25)';
        g.font = '700 11px system-ui, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(FINGER_SHORT[f], x, y + 28);
      }
    }

    nextTarget(t) {
      const lanes = new Set();
      if (this.chart.kind === 'notes') {
        for (let i = this.cursor; i < this.pending.length; i++) {
          const n = this.pending[i];
          if (n.t > t + 650) break;
          if (n.state === 0) lanes.add(n.lane);
        }
      } else if (this.chart.kind === 'words') {
        const w = this.currentWord(t);
        if (w) lanes.add(C.laneOf(w.text[w.idx]));
      } else if (!this.s.done && t >= this.s.start) {
        const ch = this.chart.lines[this.s.i][this.s.idx];
        if (ch) lanes.add(C.laneOf(ch));
      }
      lanes.delete(-1);
      return lanes.size ? { lanes } : null;
    }

    /* Characters the player should type next (for the on-screen keyboard). */
    nextChars(t) {
      const out = [];
      if (this.chart.kind === 'notes') {
        for (let i = this.cursor; i < this.pending.length && out.length < 3; i++) {
          const n = this.pending[i];
          if (n.t > t + 650) break;
          if (n.state === 0) out.push(n.ch);
        }
      } else if (this.chart.kind === 'words') {
        const w = this.currentWord(t);
        if (w && w.text[w.idx]) out.push(w.text[w.idx]);
      } else if (!this.s.done && t >= this.s.start) {
        const ch = this.chart.lines[this.s.i][this.s.idx];
        if (ch) out.push(ch);
      }
      return out;
    }

    drawWords(g, t) {
      const cur = this.currentWord(t);
      // danger line
      g.strokeStyle = 'rgba(255,107,107,0.8)';
      g.lineWidth = 3;
      g.setLineDash([12, 8]);
      g.beginPath();
      g.moveTo(CENTER - 330, STRIKE_Y);
      g.lineTo(CENTER + 330, STRIKE_Y);
      g.stroke();
      g.setLineDash([]);
      this.words.forEach((w) => {
        if (w.state !== 0 || w.spawn > t) return;
        const y = this.wordY(w, t);
        const isCur = cur === w;
        const size = isCur ? 44 : 36;
        g.font = `800 ${size}px ui-monospace, Menlo, Consolas, monospace`;
        const tw = g.measureText(w.text).width;
        const pad = 22;
        g.save();
        g.globalAlpha = isCur ? 1 : 0.7;
        const cap = this.art.get('word-capsule');
        if (cap) g.drawImage(cap, CENTER - tw / 2 - pad, y - size, tw + pad * 2, size * 1.6);
        else {
          g.fillStyle = w.gold ? '#fff3bf' : isCur ? '#2b2160' : '#1d1642';
          g.strokeStyle = w.gold ? '#f59f00' : isCur ? '#b197fc' : '#5f3dc4';
          g.lineWidth = isCur ? 4 : 2;
          roundRect(g, CENTER - tw / 2 - pad, y - size * 0.75, tw + pad * 2, size * 1.5, 18);
          g.fill();
          g.stroke();
        }
        g.textBaseline = 'middle';
        g.textAlign = 'left';
        let x = CENTER - tw / 2;
        for (let i = 0; i < w.text.length; i++) {
          const chW = g.measureText(w.text[i]).width;
          if (i < w.idx) g.fillStyle = '#69db7c';
          else if (isCur && i === w.idx) g.fillStyle = FCOLOR[C.fingerOf(w.text[i])] || '#fff';
          else g.fillStyle = w.gold ? '#7a5500' : '#f1f3f5';
          g.fillText(w.text[i], x, y);
          if (isCur && i === w.idx) {
            g.fillRect(x, y + size * 0.45, chW, 4);
          }
          x += chW;
        }
        g.restore();
      });
    }

    drawSentences(g, t) {
      const s = this.s;
      const text = this.chart.lines[s.i] || '';
      const font = "700 34px ui-monospace, Menlo, Consolas, monospace";
      g.font = font;
      const maxW = 820;
      const lines = [];
      let cur = '';
      let start = 0;
      text.split(' ').forEach((word, wi, arr) => {
        const test = cur ? cur + ' ' + word : word;
        if (g.measureText(test).width > maxW && cur) {
          lines.push({ text: cur, start });
          start += cur.length + 1;
          cur = word;
        } else cur = test;
        if (wi === arr.length - 1) lines.push({ text: cur, start });
      });
      const lh = 62;
      const y0 = 200 - ((lines.length - 1) * lh) / 2;
      const pace = this.paceIdx(t);
      g.textBaseline = 'middle';
      g.textAlign = 'left';
      lines.forEach((ln, li) => {
        const y = y0 + li * lh;
        const w = g.measureText(ln.text).width;
        let x = CENTER - w / 2;
        for (let i = 0; i < ln.text.length; i++) {
          const gi = ln.start + i;
          const ch = ln.text[i];
          const cw = g.measureText(ch).width;
          if (gi < s.idx) g.fillStyle = '#69db7c';
          else if (gi === s.idx) {
            g.fillStyle = 'rgba(255,255,255,0.18)';
            g.fillRect(x - 1, y - 26, cw + 2, 52);
            g.fillStyle = '#fff';
          } else g.fillStyle = '#ced4da';
          g.fillText(ch === ' ' && gi === s.idx ? '␣' : ch, x, y);
          // pace marker: a thin underline where the "band" is
          if (t >= s.start && gi === Math.floor(pace) && gi >= s.idx) {
            g.fillStyle = '#ff6bd6';
            g.fillRect(x, y + 28, cw, 4);
          }
          x += cw;
        }
      });
      // progress: line number
      g.fillStyle = 'rgba(255,255,255,0.7)';
      g.font = '700 14px system-ui, sans-serif';
      g.textAlign = 'center';
      g.fillText(`Line ${Math.min(s.i + 1, this.chart.lines.length)} of ${this.chart.lines.length}`, CENTER, 60);
      if (this.behind) {
        g.fillStyle = '#ffa8a8';
        g.font = '800 22px system-ui, sans-serif';
        g.fillText('Catch up with the beat!', CENTER, 360);
      }
    }

    drawFx(g, t) {
      this.fx.forEach((p) => {
        g.globalAlpha = Math.max(0, Math.min(1, p.life / 400));
        g.fillStyle = p.color;
        g.beginPath();
        g.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
        g.fill();
      });
      g.globalAlpha = 1;
      this.pops.forEach((p) => {
        const age = (t - p.t0) / 800;
        g.globalAlpha = 1 - age;
        g.fillStyle = GRADE_COLOR[p.kind] || '#fff';
        g.font = '900 26px system-ui, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.strokeStyle = 'rgba(0,0,0,0.6)';
        g.lineWidth = 4;
        const y = p.y - age * 34;
        g.strokeText(p.text, p.x, y);
        g.fillText(p.text, p.x, y);
      });
      g.globalAlpha = 1;
    }

    drawCountIn(g, t) {
      const lead = this.chart.leadMs || 3000;
      if (t >= lead - 200 || t < -100) return;
      const left = lead - t;
      const unit = lead / (this.chart.kind === 'notes' ? 4 : 3);
      const n = Math.ceil(left / unit);
      if (n < 1 || n > 4) return;
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#fff';
      g.font = '900 150px system-ui, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(n), CENTER, 230);
    }
  }

  const FINGER_SHORT = { lp: 'L pinky', lr: 'L ring', lm: 'L middle', li: 'L index', th: 'thumbs', ri: 'R index', rm: 'R middle', rr: 'R ring', rp: 'R pinky' };
  TH.FINGER_SHORT = FINGER_SHORT;

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  TH.Game = Game;
  TH.GAME_SIZE = { W, H };
})();
