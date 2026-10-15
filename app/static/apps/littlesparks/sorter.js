/* Rainbow Sorter: a Mario-Party-style mini-game. Things drift down; drag
 * each one into the bin where it belongs. Bins go from 2 to 4, and rounds
 * alternate colours and shapes. Items never get lost: they wait for you.
 * Learning by play: colours, shapes, sorting, hand-eye co-ordination. */
(() => {
  'use strict';
  const LS = window.LS;
  const U = LS.U;
  const FLOOR_Y = 330;
  const BIN_TOP = 430;
  const BIN_H = 170;
  const BIN_W = 190;
  const ROUNDS = [
    { mode: 'colour', bins: 2, size: 6 },
    { mode: 'colour', bins: 3, size: 8 },
    { mode: 'shape', bins: 3, size: 8 },
    { mode: 'colour', bins: 4, size: 10 },
    { mode: 'shape', bins: 4, size: 10 },
  ];

  function drawShape(g, shape, x, y, r, fill, stroke) {
    g.beginPath();
    if (shape === 'circle') g.arc(x, y, r, 0, 6.28);
    else if (shape === 'square') g.rect(x - r * 0.9, y - r * 0.9, r * 1.8, r * 1.8);
    else if (shape === 'triangle') {
      g.moveTo(x, y - r);
      g.lineTo(x + r * 1.05, y + r * 0.8);
      g.lineTo(x - r * 1.05, y + r * 0.8);
      g.closePath();
    } else {
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 ? r * 0.45 : r * 1.08;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      g.closePath();
    }
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = 5; g.stroke(); }
  }

  LS.register('sorter', (api) => {
    const COLOURS = LS.CFG.sorter.colours;
    const SHAPES = LS.CFG.sorter.shapes;
    let roundNo;
    let round;
    let bins;
    let items;
    let spawned;
    let sorted;
    let held;
    let spawnT;
    let sayCool;
    let idle;
    let betweenRounds;
    let finished;

    function startRound() {
      round = ROUNDS[Math.min(roundNo, ROUNDS.length - 1)];
      const keys = round.mode === 'colour'
        ? U.shuffle(COLOURS).slice(0, round.bins)
        : U.shuffle(SHAPES).slice(0, round.bins);
      bins = keys.map((k, i) => ({
        key: round.mode === 'colour' ? k.id : k,
        hex: round.mode === 'colour' ? k.hex : '#e9ecef',
        data: k, x: (LS.W * (i + 1)) / (keys.length + 1), count: 0, shake: 0,
      }));
      // a balanced bag so every bin gets used
      const bag = [];
      for (let i = 0; i < round.size; i++) bag.push(bins[i % bins.length]);
      items = [];
      sorted = 0;
      spawned = 0;
      held = null;
      spawnT = 0.4;
      betweenRounds = false;
      idle = 0;
      U.shuffle(bag).forEach((b) => items.push({ bin: b, state: 'queued' }));
      const first = bins[0];
      api.say(round.mode === 'colour'
        ? `Sort the colours! Put the ${first.key} things in the ${first.key} bin.`
        : 'Sort the shapes! Match each shape to its bin.');
    }

    function spawn(it) {
      const b = it.bin;
      if (round.mode === 'colour') {
        it.e = U.pick(b.data.items);
        it.colour = b.key;
      } else {
        it.shape = b.key;
        it.hex = U.pick(COLOURS).hex;
      }
      it.x = U.rand(110, LS.W - 110);
      it.y = -50;
      it.vy = 55 + roundNo * 7;
      it.state = 'fall';
      it.spin = U.rand(-0.5, 0.5);
      it.rot = 0;
    }

    function nameOf(it) { return round.mode === 'colour' ? it.colour : it.shape; }

    function binAt(x, y) {
      if (y < BIN_TOP - 50) return null;
      return bins.find((b) => Math.abs(x - b.x) < BIN_W / 2 + 20) || null;
    }

    function settle(it) {
      it.state = 'rest';
      it.y = FLOOR_Y;
      // nudge sideways so resting items do not stack exactly
      items.forEach((o) => {
        if (o !== it && o.state === 'rest' && Math.abs(o.x - it.x) < 90) it.x += 100 * (it.x < LS.W / 2 ? 1 : -1);
      });
      it.x = U.clamp(it.x, 90, LS.W - 90);
    }

    function activeCount() {
      return items.filter((i) => i.state === 'fall' || i.state === 'rest' || i.state === 'held').length;
    }

    return {
      start() {
        roundNo = 0;
        sayCool = 0;
        finished = false;
        startRound();
      },
      stop() { LS.voice.stop(); },
      debug() { return { sorted, roundNo, round, bins, items }; },

      update(dt) {
        sayCool -= dt;
        idle += dt;
        if (finished) return;
        spawnT -= dt;
        if (!betweenRounds && spawnT <= 0 && spawned < round.size && activeCount() < 3) {
          const next = items.find((i) => i.state === 'queued');
          if (next) { spawn(next); spawned++; spawnT = 1.5; }
        }
        items.forEach((it) => {
          if (it.state === 'fall') {
            it.y += it.vy * dt;
            it.rot += it.spin * dt;
            it.vy = Math.min(it.vy + 20 * dt, 140);
            if (it.y >= FLOOR_Y) settle(it);
          } else if (it.state === 'sink') {
            it.t += dt * 3;
            it.x += (it.tx - it.x) * Math.min(1, dt * 10);
            it.y += (it.ty - it.y) * Math.min(1, dt * 10);
            if (it.t >= 1) it.state = 'done';
          } else if (it.state === 'bounce') {
            it.y += it.vy * dt;
            it.vy += 700 * dt;
            if (it.y >= FLOOR_Y) { it.y = FLOOR_Y; settle(it); }
          }
        });
        bins.forEach((b) => { if (b.shake > 0) b.shake -= dt; });

        if (!betweenRounds && sorted >= round.size) {
          betweenRounds = true;
          api.stage.burst(LS.W / 2, 250, { n: 26 });
          LS.sfx.yay();
          api.say(LS.praise());
          if (round.bins >= 3 && round.mode === 'colour') LS.award('sort-round');
          if (round.mode === 'shape') LS.award('sort-shapes');
          roundNo++;
          if (roundNo >= 3) LS.award('sort-three');
          if (roundNo >= ROUNDS.length) {
            finished = true;
            api.after(() => api.finish({ title: 'All sorted!', emoji: '🌈' }), 1200);
          } else {
            api.after(startRound, 2200);
          }
        }
      },

      draw(g) {
        const W = LS.W;
        const H = LS.H;
        if (!LS.sprite(g, 'bg-sorter', 0, 0, W, H)) {
          const sky = g.createLinearGradient(0, 0, 0, H);
          sky.addColorStop(0, '#d0ebff');
          sky.addColorStop(1, '#fff3bf');
          g.fillStyle = sky;
          g.fillRect(0, 0, W, H);
          g.fillStyle = 'rgba(0,0,0,0.06)';
          g.fillRect(0, FLOOR_Y + 40, W, 6);
        }
        LS.panel(g,300,10,400,52,'#fff2b9','#4f386f');
        LS.label(g,round.mode==='colour'?'COLOUR PARTY':'SHAPE PARTY',150,35,21);
        LS.label(g,`${roundNo+1} / ${ROUNDS.length}`,875,35,22);
        // progress pips
        for (let i = 0; i < round.size; i++) {
          g.fillStyle = i < sorted ? '#fcc419' : 'rgba(0,0,0,0.15)';
          g.beginPath();
          g.arc(W / 2 - (round.size - 1) * 14 + i * 28, 30, 9, 0, 6.28);
          g.fill();
        }
        // bins
        bins.forEach((b) => {
          const sx = Math.sin(b.shake * 50) * (b.shake > 0 ? 8 : 0);
          const x = b.x - BIN_W / 2 + sx;
          const art = LS.sprite(g, `bin-${b.key}`, x, BIN_TOP, BIN_W, BIN_H);
          if (!art) {
            LS.shadow(g,b.x,BIN_TOP+BIN_H+8,BIN_W*.5);
            g.fillStyle = b.hex;
            g.strokeStyle = 'rgba(0,0,0,0.35)';
            g.lineWidth = 5;
            g.beginPath();
            g.roundRect ? g.roundRect(x, BIN_TOP, BIN_W, BIN_H, 28) : g.rect(x, BIN_TOP, BIN_W, BIN_H);
            g.fill();
            g.stroke();
            g.fillStyle='#0003';g.beginPath();g.ellipse(b.x+sx,BIN_TOP+18,BIN_W*.42,16,0,0,Math.PI*2);g.fill();
            g.strokeStyle='#fff9';g.lineWidth=5;g.beginPath();g.moveTo(x+15,BIN_TOP+40);g.lineTo(x+15,BIN_TOP+BIN_H-35);g.stroke();
            if(held&&Math.abs(held.x-b.x)<BIN_W*.6){g.strokeStyle='#fff';g.lineWidth=8;g.strokeRect(x-4,BIN_TOP-4,BIN_W+8,BIN_H+8);}
            if (round.mode === 'shape') drawShape(g, b.key, b.x + sx, BIN_TOP + 60, 36, '#ffffff', '#495057');
          }
          for (let i = 0; i < Math.min(b.count, 10); i++) {
            g.fillStyle = 'rgba(255,255,255,0.92)';
            g.beginPath();
            g.arc(x + 26 + i * 15, BIN_TOP + BIN_H - 24, 6, 0, 6.28);
            g.fill();
          }
        });
        // items
        items.forEach((it) => {
          if (it.state === 'queued' || it.state === 'done') return;
          LS.shadow(g,it.x,FLOOR_Y+35,30);
          const lift = it.state === 'held' ? 1.18 : 1;
          g.save();
          g.translate(it.x, it.y);
          g.rotate(it.rot || 0);
          g.scale(lift, lift);
          if (round.mode === 'colour') {
            LS.icon(g, it.e, 0, 0, 84);
          } else {
            const key = `shape-${it.shape}`;
            if (!LS.sprite(g, key, -40, -40, 80, 80)) drawShape(g, it.shape, 0, 0, 40, it.hex, 'rgba(0,0,0,0.4)');
          }
          g.restore();
        });
        if (idle > 6) {
          const it = items.find((i) => i.state === 'rest' || i.state === 'fall');
          if (it) LS.drawHint(g, it.x, it.y, api.stage.t);
        }
      },

      down(x, y) {
        idle = 0;
        let best = null;
        let bd = 85;
        items.forEach((it) => {
          if (it.state !== 'fall' && it.state !== 'rest') return;
          const d = U.dist(x, y, it.x, it.y);
          if (d < bd) { best = it; bd = d; }
        });
        if (best) {
          held = best;
          held.state = 'held';
          held.rot = 0;
          LS.sfx.whoosh();
        }
      },

      move(x, y) {
        if (held) { held.x = x; held.y = y; idle = 0; }
      },

      cancel(){if(held){settle(held);held=null;}},
      up(x, y) {
        if (!held) return;
        const it = held;
        held = null;
        idle = 0;
        const bin = binAt(x, y);
        if (!bin) {
          it.state = 'fall';
          it.vy = 40;
          if (it.y >= FLOOR_Y) settle(it);
          return;
        }
        if (bin === it.bin) {
          it.state = 'sink';
          it.t = 0;
          it.tx = bin.x;
          it.ty = BIN_TOP + 70;
          bin.count++;
          sorted++;
          LS.sfx.chime(bin.count - 1);
          api.stage.burst(bin.x, BIN_TOP + 20, { n: 8 });
          if (it.colour === 'red') LS.award('sort-red');
          LS.voice.say(nameOf(it) + '!');
        } else {
          bin.shake = 0.45;
          LS.sfx.boing();
          it.state = 'bounce';
          it.y = BIN_TOP - 60;
          it.vy = -380;
          it.x = U.clamp(it.x, 90, LS.W - 90);
          if (sayCool <= 0) {
            sayCool = 5;
            api.say(round.mode === 'colour' ? `That one is ${it.colour}. Try the ${it.colour} bin!` : `That is a ${it.shape}. Find the ${it.shape}!`);
          }
        }
      },
    };
  });
})();
