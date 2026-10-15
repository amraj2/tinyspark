/* Sprout Garden: a gentle farm-life game. Pick a seed, plant it, give it a
 * drink, wait for it to grow, then pick it. Plants never die.
 * Learning by play: the life cycle, sequencing, patience, caring routines. */
(() => {
  'use strict';
  const LS = window.LS;
  const U = LS.U;
  const POTS = [200, 400, 600, 800];
  const POT_Y = 430;
  const SEED_X = [110, 250, 390, 530];
  const TOOL_Y = 570;
  const WATER = { x: 730, y: TOOL_Y };
  const GOAL = 8;
  const GROW_SECS = 3.5;

  LS.register('garden', (api) => {
    const PLANTS = LS.CFG.garden;
    let pots;
    let tool;          // {type:'seed', i} | {type:'water'} | null
    let basket;
    let harvests;
    let kinds;
    let rain;
    let idle;
    let done;

    const STAGE_SAY = ['Seed planted! Now give it a drink.', 'A little sprout!', 'Look, leaves!', 'It is ready! Tap to pick it.'];

    function potAt(x, y) {
      for (let i = 0; i < POTS.length; i++) {
        if (Math.abs(x - POTS[i]) < 90 && y > POT_Y - 190 && y < POT_Y + 70) return i;
      }
      return -1;
    }

    return {
      start() {
        pots = POTS.map(() => ({ plant: null, stage: 0, thirsty: false, grow: 0, pop: 0 }));
        tool = { type: 'seed', i: 0 };
        basket = PLANTS.map(() => 0);
        harvests = 0;
        kinds = new Set();
        rain = [];
        idle = 0;
        done = false;
        api.say('Plant a seed in a garden plot!');
      },
      stop() { LS.voice.stop(); },
      debug() { return { pots, harvests, tool, basket }; },

      update(dt) {
        idle += dt;
        pots.forEach((p) => {
          if (p.pop > 0) p.pop -= dt;
          if (p.plant == null || p.stage >= 3 || p.thirsty) return;
          p.grow += dt;
          if (p.grow >= GROW_SECS) {
            p.grow = 0;
            p.stage++;
            p.pop = 0.5;
            LS.sfx.chime(p.stage);
            api.say(STAGE_SAY[p.stage]);
            if (p.stage < 3) p.thirsty = true;
            else api.stage.burst(POTS[pots.indexOf(p)], POT_Y - 110, { n: 10 });
          }
        });
        rain.forEach((r) => { r.y += 420 * dt; r.life -= dt; });
        rain = rain.filter((r) => r.life > 0);
      },

      draw(g) {
        const W = LS.W;
        const H = LS.H;
        const t = api.stage.t;
        if (!LS.sprite(g, 'bg-garden', 0, 0, W, H)) {
          const sky = g.createLinearGradient(0, 0, 0, H);
          sky.addColorStop(0, '#a5d8ff');
          sky.addColorStop(0.6, '#e3fafc');
          sky.addColorStop(0.61, '#8ce99a');
          sky.addColorStop(1, '#51cf66');
          g.fillStyle = sky;
          g.fillRect(0, 0, W, H);
          LS.icon(g, '☀️', 90, 90, 100, Math.sin(t) * 0.1);
        }
        // pots + plants
        pots.forEach((p, i) => {
          const x = POTS[i];
          LS.shadow(g,x,POT_Y+40,85);
          LS.panel(g,x-83,POT_Y-7,166,65,'#714530','#a17347');
          g.strokeStyle='#4d3024';g.lineWidth=3;for(let row=0;row<3;row++){g.beginPath();g.moveTo(x-68,POT_Y+10+row*15);g.lineTo(x+68,POT_Y+10+row*15);g.stroke();}
          if(p.plant==null){g.fillStyle='#3e2b22';g.beginPath();g.ellipse(x,POT_Y+7,23,9,0,0,Math.PI*2);g.fill();}
          if (p.plant != null) {
            const e = PLANTS[p.plant].stages[p.stage];
            const base = 60 + p.stage * 26;
            const bounce = p.pop > 0 ? Math.sin(p.pop * 14) * 10 : 0;
            const sway = p.stage === 3 ? Math.sin(t * 3 + i) * 0.08 : 0;
            LS.icon(g, e, x, POT_Y - 20 - base / 2 - bounce, base + (p.stage === 3 ? 30 : 0), sway);
            if (p.thirsty) LS.icon(g, '💧', x + 56, POT_Y - 100 + Math.sin(t * 5) * 6, 46);
            else if (p.stage < 3) {
              g.fillStyle = 'rgba(255,255,255,0.8)';
              g.fillRect(x - 40, POT_Y + 82, 80, 10);
              g.fillStyle = '#fab005';
              g.fillRect(x - 40, POT_Y + 82, 80 * (p.grow / GROW_SECS), 10);
            }
          }
        });
        rain.forEach((r) => LS.icon(g, '💧', r.x, r.y, 26, 0, Math.min(1, r.life * 3)));

        // toolbar
        LS.panel(g,15,TOOL_Y-65,W-30,124,'#b98d55','#674935');
        PLANTS.forEach((pl, i) => {
          const on = tool && tool.type === 'seed' && tool.i === i;
          g.fillStyle = on ? '#ffe066' : '#fff';
          g.strokeStyle = on ? '#f08c00' : '#ced4da';
          g.lineWidth = 5;
          g.beginPath();
          g.roundRect ? g.roundRect(SEED_X[i] - 56, TOOL_Y - 52, 112, 104, 22) : g.rect(SEED_X[i] - 56, TOOL_Y - 52, 112, 104);
          g.fill();
          g.stroke();
          g.fillStyle='#fff8dc';g.fillRect(SEED_X[i]-39,TOOL_Y-42,78,78);LS.icon(g, pl.seed, SEED_X[i], TOOL_Y - 6, 65);
        });
        const wOn = tool && tool.type === 'water';
        g.fillStyle = wOn ? '#a5d8ff' : '#fff';
        g.strokeStyle = wOn ? '#1c7ed6' : '#ced4da';
        g.beginPath();
        g.roundRect ? g.roundRect(WATER.x - 56, TOOL_Y - 52, 112, 104, 22) : g.rect(WATER.x - 56, TOOL_Y - 52, 112, 104);
        g.fill();
        g.stroke();
        LS.icon(g, '💧', WATER.x, TOOL_Y - 4, 72);

        // basket
        LS.panel(g,W-250,12,238,64,'#eac886','#855c37');
        LS.label(g,'HARVEST BASKET',870,28,13);
        let bx = W - 232;
        basket.forEach((n, i) => {
          if (n > 0) {
            LS.icon(g, PLANTS[i].stages[3], bx + 16, 44, 40);
            g.fillStyle = '#2b2b2b';
            g.font = '800 24px "Trebuchet MS",system-ui,sans-serif';
            g.textAlign = 'left';
            g.fillText(String(n), bx + 40, 52);
            bx += 62;
          }
        });
        for (let i = 0; i < GOAL; i++) {
          g.fillStyle = i < harvests ? '#fcc419' : 'rgba(0,0,0,0.2)';
          g.beginPath();
          g.arc(W / 2 - (GOAL - 1) * 13 + i * 26, 30, 8, 0, 6.28);
          g.fill();
        }

        if (idle > 6 && !done) {
          const ripe = pots.findIndex((p) => p.stage === 3);
          const dry = pots.findIndex((p) => p.plant != null && p.thirsty);
          const empty = pots.findIndex((p) => p.plant == null);
          if (ripe >= 0) LS.drawHint(g, POTS[ripe], POT_Y - 120, t);
          else if (dry >= 0) {
            if (tool && tool.type === 'water') LS.drawHint(g, POTS[dry], POT_Y - 100, t);
            else LS.drawHint(g, WATER.x, TOOL_Y - 40, t);
          } else if (empty >= 0) {
            if (tool && tool.type === 'seed') LS.drawHint(g, POTS[empty], POT_Y - 60, t);
            else LS.drawHint(g, SEED_X[0], TOOL_Y - 40, t);
          }
        }
      },

      down(x, y) {
        idle = 0;
        if (done) return;
        // toolbar
        if (y > TOOL_Y - 66) {
          const si = SEED_X.findIndex((sx) => Math.abs(x - sx) < 60);
          if (si >= 0) { tool = { type: 'seed', i: si }; LS.sfx.pop(); return; }
          if (Math.abs(x - WATER.x) < 60) { tool = { type: 'water' }; LS.sfx.pop(); api.say('Tap a thirsty plant!'); return; }
          return;
        }
        const i = potAt(x, y);
        if (i < 0) return;
        const p = pots[i];
        if (p.plant != null && p.stage === 3) {
          // harvest
          basket[p.plant]++;
          harvests++;
          kinds.add(p.plant);
          api.stage.burst(POTS[i], POT_Y - 100, { n: 14 });
          LS.sfx.yay();
          api.say(LS.praise());
          if (harvests === 1) LS.award('garden-first');
          if (harvests === 4) LS.award('garden-four');
          if (kinds.size >= PLANTS.length) LS.award('garden-all');
          pots[i] = { plant: null, stage: 0, thirsty: false, grow: 0, pop: 0 };
          if (harvests >= GOAL) {
            done = true;
            LS.award('garden-ten');
            api.after(() => api.finish({ title: 'What a lovely garden!', emoji: '🌻' }), 900);
          }
          return;
        }
        if (p.plant == null) {
          if (tool && tool.type === 'seed') {
            p.plant = tool.i;
            p.stage = 0;
            p.thirsty = true;
            p.grow = 0;
            p.pop = 0.4;
            LS.sfx.pop();
            api.say(STAGE_SAY[0]);
          } else api.say('Pick a seed first!');
          return;
        }
        if (p.thirsty) {
          if (tool && tool.type === 'water') {
            p.thirsty = false;
            p.grow = 0;
            for (let k = 0; k < 9; k++) rain.push({ x: POTS[i] + U.rand(-50, 50), y: POT_Y - 230 + U.rand(0, 60), life: 0.7 });
            LS.sfx.whoosh();
            api.say('Glug glug! Now we wait.');
          } else api.say('It is thirsty! Tap the water drop.');
        }
      },
      move() {}, up() {},
    };
  });
})();
