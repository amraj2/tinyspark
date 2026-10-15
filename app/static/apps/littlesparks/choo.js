/* Choo-Choo Express: a track-switching puzzler in the spirit of
 * Chu Chu Rocket. Tap the junctions to choose the way, then press GO.
 * Dead ends just send the train back to try again.
 * Learning by play: cause and effect, planning ahead, left and right. */
(() => {
  'use strict';
  const LS = window.LS;
  const U = LS.U;
  const SPEED = 190;
  const GO = { x: 900, y: 560, r: 54 };

  LS.register('choo', (api) => {
    const LEVELS = LS.CFG.choo;
    let lvl;
    let out;
    let sel;
    let train;
    let mode;          // 'plan' | 'run' | 'win' | 'oops'
    let riders;
    let levelNo;
    let timer;
    let idle;
    let allFriends;

    function load(n) {
      levelNo = n;
      lvl = LEVELS[n];
      out = {};
      Object.keys(lvl.nodes).forEach((k) => { out[k] = []; });
      lvl.edges.forEach(([a, b]) => out[a].push(b));
      sel = {};
      Object.keys(out).forEach((k) => { if (out[k].length > 1) sel[k] = 0; });
      riders = [];
      allFriends = Object.keys(lvl.friends || {}).length;
      resetTrain();
      mode = 'plan';
      idle = 0;
      api.say(n === 0
        ? 'Tap the signal to choose the way. Then press go!'
        : 'Which way should the train go?');
    }

    function resetTrain() {
      const p = lvl.nodes[lvl.start];
      train = { from: lvl.start, to: out[lvl.start][0], t: 0, x: p[0], y: p[1], ang: 0 };
      riders = [];
      mode = 'plan';
      collected = new Set();
    }
    let collected = new Set();

    function nodePos(id) { const p = lvl.nodes[id]; return { x: p[0], y: p[1] }; }

    function edgeLen(a, b) {
      const p = nodePos(a);
      const q = nodePos(b);
      return U.dist(p.x, p.y, q.x, q.y);
    }

    function go() {
      if (mode !== 'plan') return;
      resetTrain();
      mode = 'run';
      LS.sfx.toot();
      api.say('Choo choo!');
    }

    function arrive(node) {
      const f = lvl.friends && lvl.friends[node];
      if (f && !collected.has(node)) {
        collected.add(node);
        riders.push(f);
        LS.sfx.chime(riders.length);
        api.stage.burst(nodePos(node).x, nodePos(node).y, { n: 8 });
        LS.voice.say(LS.numberWord(riders.length));
      }
      const outs = out[node];
      if (!outs.length) {
        if (lvl.stations.includes(node)) win();
        else oops();
        return;
      }
      const next = outs.length > 1 ? outs[sel[node] || 0] : outs[0];
      train.from = node;
      train.to = next;
      train.t = 0;
    }

    function win() {
      mode = 'win';
      timer = 0;
      LS.sfx.yay();
      api.stage.burst(nodePos(train.from).x, nodePos(train.from).y, { n: 24 });
      api.say(LS.praise());
      LS.award('choo-first');
      const total = LS.bumpStat('choo', 'wins');
      if (total >= 3) LS.award('choo-three');
      if (allFriends && riders.length === allFriends) LS.award('choo-friends');
      if (levelNo === LEVELS.length - 1) LS.award('choo-all');
    }

    function oops() {
      mode = 'oops';
      timer = 0;
      LS.sfx.boing();
      api.say('Oh no, a dead end! Let us try a different way.');
    }

    return {
      start() { load(0); },
      stop() { LS.voice.stop(); },
      debug() { return { mode, levelNo, riders, sel, train }; },

      update(dt) {
        idle += dt;
        if (mode === 'run') {
          const len = edgeLen(train.from, train.to);
          train.t += (SPEED * dt) / len;
          const a = nodePos(train.from);
          const b = nodePos(train.to);
          const k = Math.min(1, train.t);
          train.x = a.x + (b.x - a.x) * k;
          train.y = a.y + (b.y - a.y) * k;
          train.ang = Math.atan2(b.y - a.y, b.x - a.x);
          if (train.t >= 1) arrive(train.to);
        } else if (mode === 'win') {
          timer += dt;
          if (timer > 2.2) {
            if (levelNo + 1 >= LEVELS.length) { mode = 'done'; api.finish({ title: 'All aboard! You are a train driver!', emoji: '🚂' }); }
            else load(levelNo + 1);
          }
        } else if (mode === 'oops') {
          timer += dt;
          if (timer > 1.8) { resetTrain(); mode = 'plan'; idle = 0; }
        }
      },

      draw(g) {
        const W = LS.W;
        const H = LS.H;
        if (!LS.sprite(g, 'bg-choo', 0, 0, W, H)) {
          const sky = g.createLinearGradient(0, 0, 0, H);
          sky.addColorStop(0, '#c5f6fa');
          sky.addColorStop(1, '#b2f2bb');
          g.fillStyle = sky;
          g.fillRect(0, 0, W, H);
          g.fillStyle = 'rgba(47,158,68,0.2)';
          g.beginPath();
          g.ellipse(250, 640, 420, 130, 0, 0, 6.28);
          g.ellipse(800, 650, 380, 110, 0, 0, 6.28);
          g.fill();
        }
        LS.panel(g,15,10,245,50,'#f9edb2','#487b83');
        LS.label(g,lvl.name,500,36,25);
        LS.label(g,mode==='run'?'ALL ABOARD!':mode==='plan'?'SET THE SWITCHES':mode==='oops'?'TRY ANOTHER ROUTE':'NEXT STOP!',500,77,16);
        // tracks: the branch not currently selected is dimmed
        lvl.edges.forEach(([a, b]) => {
          const p = nodePos(a);
          const q = nodePos(b);
          const isJ = out[a].length > 1;
          const active = !isJ || out[a][sel[a] || 0] === b;
          g.globalAlpha = active ? 1 : 0.35;
          const len=Math.hypot(q.x-p.x,q.y-p.y),ux=(q.x-p.x)/len,uy=(q.y-p.y)/len,nx=-uy,ny=ux;
          g.lineCap='round';g.strokeStyle='#6a4938';g.lineWidth=7;
          for(let d=0;d<=len;d+=22){const x=p.x+ux*d,y=p.y+uy*d;g.beginPath();g.moveTo(x-nx*17,y-ny*17);g.lineTo(x+nx*17,y+ny*17);g.stroke();}
          for(const side of [-1,1]){g.strokeStyle='#3d4d57';g.lineWidth=7;g.beginPath();g.moveTo(p.x+nx*side*8,p.y+ny*side*8);g.lineTo(q.x+nx*side*8,q.y+ny*side*8);g.stroke();g.strokeStyle='#c9d9d8';g.lineWidth=3;g.stroke();}
          g.globalAlpha = 1;
        });
        // nodes: stations, dead ends, signals, friends
        Object.keys(lvl.nodes).forEach((id) => {
          const p = nodePos(id);
          if (lvl.stations.includes(id)) LS.icon(g, '🚉', p.x, p.y - 8, 110);
          else if (!out[id].length) LS.icon(g, '🚧', p.x, p.y - 4, 70);
          if (out[id].length > 1) this.signal(g, id, p);
          const f = lvl.friends && lvl.friends[id];
          if (f && !collected.has(id)) {
            LS.icon(g, f, p.x, p.y - 44 + Math.sin(api.stage.t * 3 + p.x) * 5, 60);
          }
        });

        // train and riders
        LS.shadow(g,train.x,train.y+24,38);
        g.save();g.translate(train.x,train.y-6);if(Math.cos(train.ang)<0)g.scale(-1,1);LS.icon(g,'🚂',0,0,95);g.restore();
        if(mode==='run'){for(let k=0;k<3;k++){const puff=(api.stage.t*1.7+k*.33)%1;g.fillStyle=`rgba(255,255,255,${(1-puff)*.65})`;g.beginPath();g.arc(train.x-10-puff*35,train.y-35-puff*55,8+puff*15,0,6.28);g.fill();}}
        riders.forEach((r, i) => LS.icon(g, r, train.x - 26 + i * 22, train.y - 56, 34));

        // GO button
        if (mode === 'plan') {
          g.fillStyle = '#51cf66';
          g.beginPath();
          g.arc(GO.x, GO.y, GO.r + Math.sin(api.stage.t * 5) * 3, 0, 6.28);
          g.fill();
          g.fillStyle = '#fff';
          g.beginPath();
          g.moveTo(GO.x - 18, GO.y - 28);
          g.lineTo(GO.x + 30, GO.y);
          g.lineTo(GO.x - 18, GO.y + 28);
          g.closePath();
          g.fill();
        }
        // level dots
        LEVELS.forEach((_, i) => {
          g.fillStyle = i < levelNo ? '#fcc419' : i === levelNo ? '#fff' : 'rgba(0,0,0,0.2)';
          g.beginPath();
          g.arc(40 + i * 30, 36, 11, 0, 6.28);
          g.fill();
        });
        if (mode === 'plan' && idle > 8) {
          const jn = Object.keys(sel)[0];
          if (jn) { const p = nodePos(jn); LS.drawHint(g, p.x, p.y, api.stage.t); }
          else LS.drawHint(g, GO.x, GO.y - 30, api.stage.t);
        }
      },

      signal(g, id, p) {
        const next = out[id][sel[id] || 0];
        const q = nodePos(next);
        const ang = Math.atan2(q.y - p.y, q.x - p.x);
        g.fillStyle = '#fff';
        g.strokeStyle = '#e03131';
        g.lineWidth = 6;
        g.beginPath();
        g.arc(p.x, p.y, 36, 0, 6.28);
        g.fill();
        g.stroke();
        g.save();
        g.translate(p.x, p.y);
        g.rotate(ang);
        g.fillStyle = '#e03131';
        g.beginPath();
        g.moveTo(-18, -9); g.lineTo(4, -9); g.lineTo(4, -20); g.lineTo(24, 0);
        g.lineTo(4, 20); g.lineTo(4, 9); g.lineTo(-18, 9);
        g.closePath();
        g.fill();
        g.restore();
      },

      down(x, y) {
        idle = 0;
        if (mode !== 'plan' && mode !== 'run') return;
        if (U.dist(x, y, GO.x, GO.y) < GO.r + 16) { go(); return; }
        for (const id of Object.keys(sel)) {
          const p = nodePos(id);
          if (U.dist(x, y, p.x, p.y) < 56) {
            sel[id] = (sel[id] + 1) % out[id].length;
            LS.sfx.pop();
            return;
          }
        }
      },
      key(k){if(k===' '||k==='Enter'){go();return true;}return false;},
      move() {}, up() {},
    };
  });
})();
