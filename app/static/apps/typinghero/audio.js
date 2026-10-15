/* Typing Hero audio: a tiny WebAudio synth (backing groove + pitched hits).
 * No audio files needed; art/audio can be swapped in later. */
(() => {
  'use strict';
  const TH = (window.TH = window.TH || {});
  let ctx = null;
  let master = null;
  let music = null;
  let sfx = null;
  let noise = null;
  const vol = { music: 0.5, sfx: 0.8, muted: false };
  let timer = null;
  let groove = null;

  const PENTA = [0, 2, 4, 7, 9];
  const ROOTS = [220, 233.08, 246.94, 261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99];
  const PROG = [0, 0, 5, 7];

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      music = ctx.createGain();
      sfx = ctx.createGain();
      music.connect(master);
      sfx.connect(master);
      master.connect(ctx.destination);
      const len = ctx.sampleRate * 0.5;
      noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      applyVolume();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function applyVolume() {
    if (!ctx) return;
    master.gain.value = vol.muted ? 0 : 1;
    music.gain.value = vol.music * 0.5;
    sfx.gain.value = vol.sfx;
  }

  function setVolume(next) {
    Object.assign(vol, next);
    applyVolume();
  }

  function tone(freq, when, dur, type, gainPeak, dest, endFreq) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, when);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, when + dur);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gainPeak, when + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g);
    g.connect(dest);
    o.start(when);
    o.stop(when + dur + 0.05);
  }

  function burst(when, dur, gainPeak, hp, dest) {
    const s = ctx.createBufferSource();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    s.buffer = noise;
    f.type = 'highpass';
    f.frequency.value = hp;
    g.gain.setValueAtTime(gainPeak, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    s.connect(f);
    f.connect(g);
    g.connect(dest);
    s.start(when);
    s.stop(when + dur + 0.02);
  }

  const laneFreq = (lane, world) => {
    const root = ROOTS[(world || 1) % ROOTS.length];
    return root * 2 * Math.pow(2, (PENTA[lane % 5] + 12 * Math.floor(lane / 5)) / 12);
  };

  function hit(lane, grade, world) {
    if (!ensure()) return;
    const now = ctx.currentTime;
    const f = laneFreq(lane, world);
    tone(f, now, 0.22, 'triangle', 0.4, sfx);
    if (grade === 'perfect') tone(f * 2, now, 0.3, 'sine', 0.18, sfx);
  }
  function miss() {
    if (!ensure()) return;
    tone(130, ctx.currentTime, 0.14, 'square', 0.08, sfx, 70);
  }
  function wrong() {
    if (!ensure()) return;
    tone(95, ctx.currentTime, 0.1, 'sawtooth', 0.09, sfx, 60);
  }
  function blip(up = true) {
    if (!ensure()) return;
    const n = ctx.currentTime;
    tone(up ? 523 : 392, n, 0.08, 'sine', 0.15, sfx);
  }
  function fanfare(stars) {
    if (!ensure()) return;
    const n = ctx.currentTime;
    [0, 4, 7, 12, 16].slice(0, Math.max(2, stars + 1)).forEach((s, i) => {
      tone(261.63 * Math.pow(2, s / 12), n + i * 0.12, 0.35, 'triangle', 0.3, sfx);
    });
  }
  function fail() {
    if (!ensure()) return;
    const n = ctx.currentTime;
    tone(300, n, 0.35, 'sawtooth', 0.15, sfx, 90);
  }
  function sparkOn() {
    if (!ensure()) return;
    const n = ctx.currentTime;
    [0, 7, 12].forEach((s, i) => tone(392 * Math.pow(2, s / 12), n + i * 0.06, 0.3, 'sine', 0.25, sfx));
  }

  // ----- backing groove, scheduled ahead of time on the audio clock -----
  function startBacking(opts) {
    if (!ensure()) return;
    stopBacking();
    groove = {
      next: ctx.currentTime + (opts.delayMs || 100) / 1000,
      step: 0,
      stepSec: opts.beatMs / 2000,
      root: ROOTS[(opts.world || 1) % ROOTS.length] / 2,
    };
    timer = setInterval(schedule, 30);
    schedule();
  }

  function schedule() {
    if (!ctx || !groove) return;
    while (groove.next < ctx.currentTime + 0.14) {
      const s = groove.step;
      const inBar = s % 8;
      const bar = Math.floor(s / 8);
      const t = groove.next;
      const mul = bar >= 1 ? 1 : 0; // one bar of silence-ish count-in
      if (inBar === 0 || inBar === 4) tone(110, t, 0.16, 'sine', 0.55 * (mul || 0.7), music, 45);
      if (inBar === 2 || inBar === 6) burst(t, 0.1, 0.22, 1800, music);
      if (s % 2 === 0) burst(t, 0.03, 0.07, 7000, music);
      if (inBar === 0 || inBar === 4) {
        const semis = PROG[Math.floor(bar / 1) % PROG.length];
        tone(groove.root * Math.pow(2, semis / 12), t, groove.stepSec * 3.6, 'triangle', 0.3 * mul, music);
      }
      groove.next += groove.stepSec;
      groove.step += 1;
    }
  }

  function stopBacking() {
    clearInterval(timer);
    timer = null;
    groove = null;
  }
  function suspend() { if (ctx) ctx.suspend(); }
  function resume() { if (ctx) ctx.resume(); }

  TH.audio = { ensure, setVolume, hit, miss, wrong, blip, fanfare, fail, sparkOn, startBacking, stopBacking, suspend, resume, get vol() { return vol; } };
})();
