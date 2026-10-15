/* Roly Poly: a Katamari-style roller. Roll over things that are smaller
 * than you, grow, and roll up bigger and bigger things.
 * Learning by play: big/small comparison, counting, cause and effect. */
(() => {
  'use strict';
  const LS = window.LS;
  const U = LS.U;
  const WORLD_W = 3600;
  const WORLD_H = 2600;
  const START_R = 26;
  const FIT = 0.92;           // an item is pick-up-able when r <= ball.r * FIT
  const GROWTH = 0.6;         // how much of an item's area the ball absorbs

  LS.register('roly', (api) => {
    const TIERS = LS.CFG.roly;
    let ball;
    let items;
    let stuck;
    let zoom;
    let count;
    let goalR;
    let bumpCool;
    let saidTooBig;
    let milestone;
    let done;

    function reset() {
      ball = { x: WORLD_W / 2, y: WORLD_H / 2, r: START_R, vx: 0, vy: 0, rot: 0, face: 1 };
      items = [];
      stuck = [];
      count = 0;
      zoom = 1;
      bumpCool = 0;
      saidTooBig = false;
      milestone = 0;
      done = false;
      const rnd = U.seeded((Math.random() * 1e9) | 0);
      TIERS.forEach((tier) => {
        for (let i = 0; i < tier.n; i++) {
          let x;
          let y;
          let tries = 0;
          do {
            // plenty of little things close to the start so the first
            // seconds are rewarding
            const near = tier.r <= 16 && rnd() < 0.7;
            const spread = near ? 700 : 1,
              ox = near ? (rnd() - 0.5) * 2 * spread : 0,
              oy = near ? (rnd() - 0.5) * 2 * spread : 0;
            x = near ? ball.x + ox : 120 + rnd() * (WORLD_W - 240);
            y = near ? ball.y + oy : 120 + rnd() * (WORLD_H - 240);
            tries++;
          } while (U.dist(x, y, ball.x, ball.y) < 110 + tier.r && tries < 30);
          items.push({
            e: tier.e, r: tier.r, x, y, goal: !!tier.goal, wiggle: 0,
            drift: tier.r >= 9 && tier.r <= 30 ? U.rand(8, 22) : 0, ang: rnd() * 6.28,
          });
        }
      });
      goalR = TIERS.find((t) => t.goal).r / FIT + 4;
    }

    function worldPointer() {
      const p = api.stage.pointer;
      return { x: ball.x + (p.x - LS.W / 2) / zoom, y: ball.y + (p.y - LS.H / 2) / zoom };
    }

    function collect(item) {
      item.gone = true;
      count++;
      const before = ball.r;
      ball.r = Math.sqrt(ball.r * ball.r + GROWTH * item.r * item.r);
      stuck.push({ e: item.e, r: item.r, a: U.rand(0, 6.28), d: U.rand(0.15, 0.7) });
      if (stuck.length > 70) stuck.shift();
      LS.sfx.chime(Math.min(5, Math.floor(item.r / 14)));
      const sx = LS.W / 2 + (item.x - ball.x) * zoom;
      const sy = LS.H / 2 + (item.y - ball.y) * zoom;
      api.stage.burst(sx, sy, { n: item.r > 30 ? 16 : 6 });
      if (count === 10) { api.say('Ten things! You are getting bigger!'); LS.award('roly-ant'); }
      if (item.e === '🐄') LS.award('roly-cow');
      if (count === 80) LS.award('roly-lots');
      // announce growth steps so "bigger" is felt
      const steps = [45, 75, 110, 150];
      if (milestone < steps.length && ball.r >= steps[milestone] && before < steps[milestone]) {
        milestone++;
        api.say(U.pick(['Bigger!', 'Wow, you are growing!', 'Now you are really big!']));
        api.stage.burst(LS.W / 2, LS.H / 2, { n: 20 });
        LS.sfx.yay();
      }
      if (item.goal && !done) {
        done = true;
        LS.award('roly-house');
        LS.bumpStat('roly', 'houses');
        api.after(() => api.finish({ title: 'You rolled up a house!', emoji: '🏠' }), 900);
      }
    }

    return {
      keyboardMove:true,
      start() {
        reset();
        api.say('Roll over the little things to grow! Drag to steer.');
      },
      stop() { LS.voice.stop(); },
      debug() { return { count, r: ball.r, items: items.length, done, ball, zoom, items_ref: items }; },

      update(dt) {
        if (done) return;
        const p = api.stage.pointer;
        const keys=api.stage.keys;
        const kx=(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0),ky=(keys.has('ArrowDown')?1:0)-(keys.has('ArrowUp')?1:0);
        const active = kx||ky||p.down || (p.type === 'mouse' && p.moved);
        if (active) {
          const w = kx||ky?{x:ball.x+kx*180,y:ball.y+ky*180}:worldPointer();
          const dx = w.x - ball.x;
          const dy = w.y - ball.y;
          const d = Math.hypot(dx, dy);
          const max = 230 + ball.r * 2.2;
          const sp = Math.min(max, d * 3.2);
          const tx = d > 4 ? (dx / d) * sp : 0;
          const ty = d > 4 ? (dy / d) * sp : 0;
          ball.vx += (tx - ball.vx) * Math.min(1, dt * 7);
          ball.vy += (ty - ball.vy) * Math.min(1, dt * 7);
          if (Math.abs(dx) > 8) ball.face = dx > 0 ? 1 : -1;
        } else {
          ball.vx *= 1 - Math.min(1, dt * 4);
          ball.vy *= 1 - Math.min(1, dt * 4);
        }
        ball.x = U.clamp(ball.x + ball.vx * dt, ball.r, WORLD_W - ball.r);
        ball.y = U.clamp(ball.y + ball.vy * dt, ball.r, WORLD_H - ball.r);
        ball.rot += (Math.hypot(ball.vx, ball.vy) * dt) / ball.r;
        bumpCool -= dt;

        const targetZoom = Math.min(1, 62 / ball.r);
        zoom += (targetZoom - zoom) * Math.min(1, dt * 2.5);

        for (const it of items) {
          if (it.gone) continue;
          if (it.drift) {
            it.ang += dt * 0.6;
            it.x += Math.cos(it.ang) * it.drift * dt;
            it.y += Math.sin(it.ang * 1.3) * it.drift * dt;
          }
          if (it.wiggle > 0) it.wiggle -= dt;
          const d = U.dist(ball.x, ball.y, it.x, it.y);
          if (d < ball.r + it.r * 0.35) {
            if (it.r <= ball.r * FIT) collect(it);
            else if (d < ball.r + it.r * 0.8) {
              // too big: a friendly bounce, never a penalty
              const nx = (ball.x - it.x) / (d || 1);
              const ny = (ball.y - it.y) / (d || 1);
              ball.x += nx * 6;
              ball.y += ny * 6;
              ball.vx = nx * 140;
              ball.vy = ny * 140;
              it.wiggle = 0.6;
              if (bumpCool <= 0) {
                bumpCool = 0.8;
                LS.sfx.boing();
                if (!saidTooBig) {
                  saidTooBig = true;
                  api.say('Too big for now! Roll up lots of little things first.');
                }
              }
            }
          }
        }
        items = items.filter((i) => !i.gone);
      },

      draw(g) {
        const W = LS.W;
        const H = LS.H;
        const t = api.stage.t;
        g.fillStyle='#9fce6a';g.fillRect(0,0,W,H);
        if (!LS.sprite(g, 'bg-roly', W/2-ball.x*zoom, H/2-ball.y*zoom, WORLD_W*zoom,WORLD_H*zoom)) {
          g.fillStyle = '#9be28a';
          g.fillRect(0, 0, W, H);
          // grass tufts that scroll with the world
          const tile = 170 * zoom;
          const ox = ((-ball.x * zoom) % tile + tile) % tile;
          const oy = ((-ball.y * zoom) % tile + tile) % tile;
          g.fillStyle = 'rgba(40,120,50,0.18)';
          for (let x = -tile + ox; x < W + tile; x += tile) {
            for (let y = -tile + oy; y < H + tile; y += tile) {
              g.beginPath();
              g.ellipse(x + 40, y + 60, 28 * zoom, 12 * zoom, 0, 0, 6.28);
              g.fill();
            }
          }
        }
        const sx = (x) => W / 2 + (x - ball.x) * zoom;
        const sy = (y) => H / 2 + (y - ball.y) * zoom;

        // world edge
        g.strokeStyle = '#2f7d32';
        g.lineWidth = 18 * zoom;
        g.strokeRect(sx(0), sy(0), WORLD_W * zoom, WORLD_H * zoom);

        // items (pick-up-able ones glow green: "you can roll me up!")
        for (const it of items) {
          const x = sx(it.x);
          const y = sy(it.y);
          const rr = it.r * zoom;
          if (x < -rr * 2 || x > W + rr * 2 || y < -rr * 2 || y > H + rr * 2) continue;
          const can = it.r <= ball.r * FIT;
          if (can) {
            g.strokeStyle = `rgba(255,255,255,${0.55 + 0.35 * Math.sin(t * 4 + it.x)})`;
            g.lineWidth = Math.max(2, 3 * zoom);
            g.beginPath();
            g.arc(x, y, Math.max(rr * 1.15, 6), 0, 6.28);
            g.stroke();
          }
          LS.shadow(g,x,y+rr*.65,rr*.8);
          const wob = it.wiggle > 0 ? Math.sin(t * 40) * 0.25 : 0;
          LS.icon(g, it.e, x, y, Math.max(8, it.r * 2.3 * zoom), wob);
        }

        // the ball
        const bx = W / 2;
        const by = H / 2;
        const br = ball.r * zoom;
        LS.shadow(g,bx,by+br*.85,br);
        if (!LS.sprite(g, 'roly-ball', bx - br, by - br, br * 2, br * 2)) {
          const grad = g.createRadialGradient(bx - br * 0.3, by - br * 0.3, br * 0.1, bx, by, br);
          grad.addColorStop(0, '#ffc2d9');
          grad.addColorStop(1, '#f06595');
          g.fillStyle = grad;
          g.beginPath();
          g.arc(bx, by, br, 0, 6.28);
          g.fill();
        }
        // things stuck to the ball (they roll with it)
        stuck.forEach((s) => {
          const a = s.a + ball.rot;
          const d = s.d * br;
          LS.icon(g, s.e, bx + Math.cos(a) * d, by + Math.sin(a) * d, Math.max(10, s.r * 2.1 * zoom), a);
        });
        // face
        g.fillStyle = '#3b1d2c';
        const ex = br * 0.28 * ball.face;
        g.beginPath();
        g.arc(bx - br * 0.22 + ex * 0.3, by - br * 0.1, br * 0.07, 0, 6.28);
        g.arc(bx + br * 0.22 + ex * 0.3, by - br * 0.1, br * 0.07, 0, 6.28);
        g.fill();
        g.strokeStyle = '#3b1d2c';
        g.lineWidth = Math.max(2, br * 0.05);
        g.beginPath();
        g.arc(bx + ex * 0.3, by + br * 0.05, br * 0.2, 0.15 * Math.PI, 0.85 * Math.PI);
        g.stroke();

        const goal=items.find(it=>it.goal&&it.r<=ball.r*FIT);
        const target=goal||items.filter(it=>it.r<=ball.r*FIT).sort((a,b)=>U.dist(ball.x,ball.y,a.x,a.y)-U.dist(ball.x,ball.y,b.x,b.y))[0];
        if(target){const angle=Math.atan2(target.y-ball.y,target.x-ball.x),cx=880,cy=52;
          LS.panel(g,800,15,180,72,'#fff3be','#5b7554');LS.icon(g,target.e,832,50,39);
          g.save();g.translate(cx+35,cy);g.rotate(angle);g.fillStyle='#4f9250';g.beginPath();g.moveTo(20,0);g.lineTo(-9,-13);g.lineTo(-5,0);g.lineTo(-9,13);g.closePath();g.fill();g.restore();
        }
        // HUD: counter and grow-meter
        g.fillStyle = 'rgba(255,255,255,0.85)';
        g.beginPath();
        g.roundRect ? g.roundRect(18, 16, 180, 64, 20) : g.rect(18, 16, 180, 64);
        g.fill();
        LS.icon(g, '🌼', 54, 48, 40);
        g.fillStyle = '#2b2b2b';
        g.font = '800 36px "Trebuchet MS",system-ui,sans-serif';
        g.textAlign = 'left';
        g.textBaseline = 'middle';
        g.fillText(`${count}`, 90, 50);

        const mx = 300;
        const mw = 400;
        g.fillStyle = 'rgba(255,255,255,0.8)';
        g.fillRect(mx, 36, mw, 22);
        const prog = U.clamp((ball.r - START_R) / (goalR - START_R), 0, 1);
        g.fillStyle = '#51cf66';
        g.fillRect(mx, 36, mw * prog, 22);
        g.strokeStyle = '#2b2b2b';
        g.lineWidth = 3;
        g.strokeRect(mx, 36, mw, 22);
        LS.icon(g, '⚽', mx - 22, 47, 32);
        LS.icon(g, '🏠', mx + mw + 26, 47, 44);
      },

      down() {}, move() {}, up() {},
    };
  });
})();
