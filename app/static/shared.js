/* Small helpers shared by the TinySpark mini-apps (window.TS).
 * Everything a child does is stored in this browser only. */
window.TS = (() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

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

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* Whole days since 1970 in the child's local time: a stable daily seed. */
  function dayIndex() {
    const d = new Date();
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  }

  function createStore(key, defaults) {
    let data = Object.assign({}, defaults);
    try {
      const raw = JSON.parse(localStorage.getItem(key) || 'null');
      if (raw && typeof raw === 'object') data = Object.assign(data, raw);
    } catch (e) { /* ignore */ }
    let timer = null;
    const store = {
      data,
      save() {
        clearTimeout(timer);
        try { localStorage.setItem(key, JSON.stringify(store.data)); return true; }
        catch (e) { return false; }
      },
      saveSoon() { clearTimeout(timer); timer = setTimeout(store.save, 300); },
    };
    window.addEventListener('pagehide', store.save);
    return store;
  }

  let toastTimer = null;
  function toast(msg) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 3500);
  }

  const canSpeak = 'speechSynthesis' in window;
  function speak(text, onend) {
    if (!canSpeak) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    u.lang = 'en-GB';
    if (onend) u.onend = onend;
    window.speechSynthesis.speak(u);
  }
  function stopSpeaking() { if (canSpeak) window.speechSynthesis.cancel(); }

  function config() {
    return JSON.parse($('app-config').textContent);
  }

  function stars(n, total) {
    return '★'.repeat(n) + '☆'.repeat(Math.max(0, (total || 3) - n));
  }

  return { $, h, pick, shuffle, dayIndex, createStore, toast, speak, stopSpeaking, canSpeak, config, stars };
})();
