/* Typing Hero art slots.
 *
 * Every visual has a built-in fallback, so the game works with no images.
 * Drop PNG/WebP files named after the keys below into
 * app/static/apps/typinghero/art/ and they are picked up automatically
 * (see ART.md for sizes and prompts). */
(() => {
  'use strict';
  const TH = (window.TH = window.TH || {});
  const CFG = TH.CFG;
  const cache = {};

  function get(key) {
    return cache[key] || null;
  }

  function load() {
    const names = CFG.art || {};
    const jobs = Object.entries(names).map(([key, file]) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { cache[key] = img; resolve(); };
      img.onerror = () => resolve();
      img.src = CFG.artBase + file;
    }));
    return Promise.all(jobs).then(() => {
      // DOM slots: [data-art="key"] get the image as a background.
      document.querySelectorAll('[data-art]').forEach((el) => {
        const key = el.getAttribute('data-art');
        if (names[key]) {
          el.style.backgroundImage = `url("${CFG.artBase}${names[key]}")`;
          el.classList.add('has-art');
          if (el.parentElement) el.parentElement.classList.add('has-art-child');
        }
      });
    });
  }

  TH.art = { get, load, has: (k) => !!cache[k] };
})();
