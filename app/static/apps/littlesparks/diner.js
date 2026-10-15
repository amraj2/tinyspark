/* Little Diner: a busy-restaurant game. Animals order food shown as
 * pictures; tap food from the shelf to build the plate. Serve it when
 * the plate matches. Learning by play: counting objects, matching
 * quantities, one-to-one correspondence. */
(() => {
  'use strict';
  const LS = window.LS;
  const U = LS.U;
  const GOAL = 12;
  const SLOTS = [{ x: 270 }, { x: 730 }];
  const SHELF_Y = 575;
  const PLATE = { x: 500, y: 420 };

  LS.register('diner', (api) => {
    const FOODS = LS.CFG.diner.foods;
    const ANIMALS = LS.CFG.diner.customers;
    let customers;
    let plate;
    let served;
    let foodsServed;
    let idle;
    let coins;
    let locked;
    let hintSay;
    let lastAnimal;

    function orderFor(n) {
      const types = n < 6 ? 1 : n < 9 ? 2 : 3;
      const maxQty = n < 3 ? 2 : n < 9 ? 3 : 3;
      const order = {};
      const picks = U.shuffle(FOODS.map((_, i) => i)).slice(0, types);
      let total = 0;
      picks.forEach((fi, idx) => {
        const remainingTypes = picks.length - 1 - idx;
        const cap = Math.min(maxQty, 5 - total - remainingTypes);
        const qty = U.clamp(1 + Math.floor(Math.random() * cap), 1, Math.max(1, cap));
        order[fi] = qty;
        total += qty;
      });
      return order;
    }

    function describe(c) {
      const parts = Object.entries(c.order).map(([fi, q]) => {
        const f = FOODS[fi];
        return `${LS.numberWord(q)} ${q === 1 ? f.one : f.many}`;
      });
      const txt = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
      return `${c.animal.name} would like ${txt}, please.`;
    }

    function arrive(slot) {
      let a;
      do { a = U.pick(ANIMALS); } while (a === lastAnimal);
      lastAnimal = a;
      const c = { slot, animal: a, order: orderFor(served), state: 'wait', t: 0, bounce: 0, slotX: SLOTS[slot].x };
      customers[slot] = c;
      api.say(describe(c));
    }

    function counts() {
      const m = {};
      plate.forEach((fi) => { m[fi] = (m[fi] || 0) + 1; });
      return m;
    }

    function matches(c, m) {
      const keys = new Set([...Object.keys(c.order), ...Object.keys(m)]);
      for (const k of keys) if ((c.order[k] || 0) !== (m[k] || 0)) return false;
      return true;
    }

    function serve(c) {
      if (c.state !== 'wait') return;
      c.state = 'happy';
      c.t = 0;
      locked = true;
      served++;
      Object.keys(c.order).forEach((fi) => foodsServed.add(fi));
      LS.sfx.yay();
      api.stage.burst(c.slotX, 160, { n: 14, chars: ['🪙', '⭐', '✨'] });
      api.say(U.pick([`Yum yum! Thank you!`, LS.praise()]));
      coins += 1;
      if (served === 1) LS.award('diner-first');
      if (served === 5) LS.award('diner-five');
      if (served === 10) LS.award('diner-ten');
      if (foodsServed.size >= FOODS.length) LS.award('diner-all');
      api.after(() => {
        plate = [];
        locked = false;
        if (served >= GOAL) {
          api.finish({ title: 'The diner is a hit!', emoji: '🍽️' });
        } else arrive(c.slot);
      }, 1400);
    }

    function checkAuto() {
      if (locked) return;
      const m = counts();
      const c = customers.find((x) => x && x.state === 'wait' && matches(x, m));
      if (c) api.after(() => { if (!locked && customers.includes(c) && matches(c, counts())) serve(c); }, 450);
    }

    function shelfX(i) { return 130 + i * 148; }

    return {
      start() {
        customers = [null, null];
        plate = [];
        served = 0;
        foodsServed = new Set();
        idle = 0;
        coins = 0;
        locked = false;
        hintSay = 0;
        lastAnimal = null;
        SLOTS.forEach((s, i) => { api.after(() => arrive(i), i * 700); });
      },
      stop() { LS.voice.stop(); },
      debug() { return { served, plate, customers, locked }; },

      update(dt) {
        idle += dt;
        customers.forEach((c, i) => {
          if (!c) return;
          c.slotX = SLOTS[i].x;
          c.t += dt;
          c.bounce = c.state === 'happy' ? Math.abs(Math.sin(c.t * 9)) * 22 : 0;
        });
      },

      draw(g) {
        const W = LS.W;
        const H = LS.H;
        if (!LS.sprite(g, 'bg-diner', 0, 0, W, H)) {
          g.fillStyle = '#ffe8cc';
          g.fillRect(0, 0, W, H);
          g.fillStyle = '#ffd8a8';
          g.fillRect(0, 300, W, H - 300);
          g.fillStyle = '#a5d8ff';
          g.fillRect(40, 30, 920, 70);
          g.fillStyle = 'rgba(0,0,0,0.12)';
          g.fillRect(0, 300, W, 8);
        }
        LS.panel(g,280,32,440,55,'#ffe8ac','#8e5044');
        LS.label(g,'LITTLE DINER',110,48,18);
        LS.label(g,`★ ${coins}`,910,48,24);
        const counter=g.createLinearGradient(0,365,0,510);counter.addColorStop(0,'#d6e4da');counter.addColorStop(.09,'#91b1ac');counter.addColorStop(.1,'#356d6b');counter.addColorStop(1,'#234e56');g.fillStyle=counter;g.fillRect(0,365,W,150);g.fillStyle='#fff3db';g.fillRect(0,365,W,8);
        // counter progress: served plates
        for (let i = 0; i < GOAL; i++) {
          g.fillStyle = i < served ? '#fcc419' : 'rgba(0,0,0,0.18)';
          g.beginPath();
          g.arc(W / 2 - (GOAL - 1) * 15 + i * 30, 66, 10, 0, 6.28);
          g.fill();
        }

        const m = counts();
        customers.forEach((c, i) => {
          if (!c) return;
          const x = SLOTS[i].x;
          LS.shadow(g,x,245,70);
          LS.icon(g, c.animal.e, x, 190 - c.bounce, 132);
          // speech bubble with the order as pictures
          const types = Object.keys(c.order);
          const bw = Math.max(210, types.length * 150);
          g.fillStyle = 'rgba(255,255,255,0.95)';
          g.strokeStyle = '#adb5bd';
          g.lineWidth = 4;
          g.beginPath();
          g.roundRect ? g.roundRect(x - bw / 2, 262, bw, 100, 24) : g.rect(x - bw / 2, 262, bw, 100);
          g.fill();
          g.stroke();
          types.forEach((fi, k) => {
            const qty = c.order[fi];
            const have = m[fi] || 0;
            const gx = x - bw / 2 + 24 + k * 150;
            for (let q = 0; q < qty; q++) {
              const ix = gx + 22 + q * 40;
              LS.icon(g, FOODS[fi].e, ix, 306, 46, 0, q < have ? 1 : 0.55);
              if (q < have) {
                g.fillStyle = '#2f9e44';
                g.font = '800 22px system-ui,sans-serif';
                g.textAlign = 'center';
                g.fillText('✓', ix + 12, 336);
              }
            }
            g.fillStyle = '#868e96';
            g.font = '800 26px "Trebuchet MS",system-ui,sans-serif';
            g.textAlign = 'center';
            g.fillText(String(qty), gx + 22 + ((qty - 1) * 40) / 2, 356);
          });
        });

        // plate
        if (!LS.sprite(g, 'plate', PLATE.x - 230, PLATE.y - 50, 460, 120)) {
          g.fillStyle = '#f8f9fa';
          g.strokeStyle = '#ced4da';
          g.lineWidth = 6;
          g.beginPath();
          g.ellipse(PLATE.x, PLATE.y + 8, 230, 58, 0, 0, 6.28);
          g.fill();
          g.stroke();
        }
        const startX = PLATE.x - ((plate.length - 1) * 70) / 2;
        plate.forEach((fi, k) => LS.icon(g, FOODS[fi].e, startX + k * 70, PLATE.y - 4, 66));

        // buttons: clear + serve
        g.fillStyle = '#ff8787';
        g.beginPath();
        g.arc(110, 430, 46, 0, 6.28);
        g.fill();
        g.fillStyle = '#fff';
        g.font = '800 46px system-ui,sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('✖', 110, 432);
        const ready=customers.some(c=>c&&c.state==='wait'&&matches(c,m));
        g.fillStyle = ready?'#59d578':'#729d78';
        g.shadowColor=ready?'#fbea9f':'transparent';g.shadowBlur=ready?18:0;
        g.beginPath();
        g.arc(890, 430, 46, 0, 6.28);
        g.fill();
        g.fillStyle = '#fff';
        g.fillText('✔', 890, 432);g.shadowBlur=0;
        LS.label(g,'SERVE',890,490,15);LS.label(g,'CLEAR',110,490,15);

        // shelf
        LS.panel(g,12,SHELF_Y-62,W-24,118,'#dfbc88','#754b41');
        FOODS.forEach((f, i) => {
          LS.panel(g,shelfX(i)-58,SHELF_Y-53,116,105,'#fff1cd','#9e7555');
          if (!LS.sprite(g, `food-${f.one}`, shelfX(i) - 50, SHELF_Y - 50, 100, 100)) LS.icon(g, f.e, shelfX(i), SHELF_Y, 88);
        });

        if (idle > 7 && !locked) {
          const c = customers.find((x) => x && x.state === 'wait');
          if (c) {
            const need = Object.keys(c.order).find((fi) => (m[fi] || 0) < c.order[fi]);
            if (need != null) LS.drawHint(g, shelfX(Number(need)), SHELF_Y - 20, api.stage.t);
          }
        }
      },

      down(x, y) {
        idle = 0;
        if (locked) return;
        // shelf
        if (y > SHELF_Y - 70) {
          const i = Math.round((x - 130) / 148);
          if (i >= 0 && i < FOODS.length && Math.abs(x - shelfX(i)) < 70) {
            if (plate.length >= 6) { LS.sfx.boing(); return; }
            plate.push(i);
            const n = counts()[i];
            LS.sfx.pop();
            LS.voice.say(LS.numberWord(n));
            // The player serves the completed plate with the green bell.
          }
          return;
        }
        // clear
        if (U.dist(x, y, 110, 430) < 60) { plate = []; LS.sfx.whoosh(); return; }
        // serve button
        if (U.dist(x, y, 890, 430) < 60) {
          const m = counts();
          const c = customers.find((cu) => cu && cu.state === 'wait' && matches(cu, m));
          if (c) { serve(c); return; }
          const target = customers.find((cu) => cu && cu.state === 'wait');
          LS.sfx.boing();
          if (target) api.say(`Almost! ${describe(target).replace(' would like', ' wants').replace(', please.', '.')}`);
          return;
        }
        // tap a plate item to take it off
        const startX = PLATE.x - ((plate.length - 1) * 70) / 2;
        for (let k = 0; k < plate.length; k++) {
          if (U.dist(x, y, startX + k * 70, PLATE.y) < 40) { plate.splice(k, 1); LS.sfx.whoosh(); return; }
        }
        // tap a customer to hear the order again
        customers.forEach((c, i) => {
          if (c && c.state === 'wait' && Math.abs(x - SLOTS[i].x) < 120 && y < 380) api.say(describe(c));
        });
      },
      move() {}, up() {},
    };
  });
})();
