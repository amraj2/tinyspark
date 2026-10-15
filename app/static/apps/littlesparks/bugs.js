/* Bug Net: a creature-catching hunt. A mission shows what to catch and how
 * many; sweep the net over the right critters. Counting aloud to five,
 * matching, noticing details. Wrong critters just giggle away. */
(() => {
  'use strict';
  const LS = window.LS;
  const U = LS.U;
  const NET_R = 46;
  const MISSIONS = 10;
  const AREA = { x0: 60, x1: 940, y0: 150, y1: 590 };

  LS.register('bugs', (api) => {
    const TYPES = LS.CFG.bugs;
    let critters;
    let mission;
    let missionNo;
    let flying;
    let sayCool;
    let done;
    let idle;
    let totalCaught;

    function makeMission() {
      const need = U.clamp(1 + Math.floor(missionNo / 2), 1, 5);
      const typeCount = U.clamp(2 + Math.floor(missionNo / 2), 2, TYPES.length);
      const types = TYPES.slice(0, typeCount);
      const type = U.pick(types);
      mission = { type, need, got: 0, pool: types };
      // always at least `need` of the target type on screen
      critters = [];
      for (let i = 0; i < need + 1; i++) critters.push(makeCritter(type));
      const extras = 5 + Math.min(4, missionNo);
      for (let i = 0; i < extras; i++) critters.push(makeCritter(U.pick(types)));
      flying = [];
      const name = need === 1 ? `a ${type.one}` : `${LS.numberWord(need)} ${type.many}`;
      api.say(`Catch ${name}!`);
    }

    function makeCritter(type) {
      return {
        type, x: U.rand(AREA.x0, AREA.x1), y: U.rand(AREA.y0, AREA.y1),
        a: U.rand(0, 6.28), sp: type.e === '🐌' || type.e === '🐛' ? U.rand(25, 45) : U.rand(60, 110),
        turn: U.rand(0.5, 2), phase: U.rand(0, 6), dodge: 0, caught: false,
      };
    }

    function nameCritter(c) {
      if (sayCool > 0) return;
      sayCool = 3.5;
      api.say(`That is a ${c.type.one}!`);
    }

    function catchIt(c) {
      c.caught = true;
      mission.got++;
      const slot = slotPos(mission.got - 1);
      flying.push({ type: c.type, x: c.x, y: c.y, tx: slot.x, ty: slot.y, t: 0 });
      LS.sfx.chime(mission.got - 1);
      api.say(LS.numberWord(mission.got) + '!');
      totalCaught++;
      if (totalCaught === 1) LS.award('bugs-one');
      // replace so the meadow stays busy
      critters.push(makeCritter(U.pick(mission.pool)));
      // keep enough of the target type around
      const left = critters.filter((x) => !x.caught && x.type === mission.type).length;
      if (left < mission.need - mission.got) critters.push(makeCritter(mission.type));
      if (mission.got >= mission.need) {
        const need = mission.need;
        api.after(() => {
          api.stage.burst(LS.W / 2, 90, { n: 22 });
          LS.sfx.yay();
          api.say(LS.praise());
          if (need >= 3) LS.award('bugs-three');
          if (need >= 5) LS.award('bugs-five');
          missionNo++;
          if (missionNo >= MISSIONS) {
            done = true;
            LS.award('bugs-ten');
            api.after(() => api.finish({ title: 'You caught them all!', emoji: '🦋' }), 600);
          } else {
            api.after(makeMission, 1100);
          }
        }, 700);
      }
    }

    function slotPos(i) {
      const n = mission.need;
      const gap = 84;
      const x0 = LS.W / 2 - ((n - 1) * gap) / 2;
      return { x: x0 + i * gap, y: 78 };
    }

    return {
      start() {
        missionNo = 0;
        totalCaught = 0;
        sayCool = 0;
        done = false;
        idle = 0;
        makeMission();
      },
      stop() { LS.voice.stop(); },
      debug() { return { mission, missionNo, critters, totalCaught, done }; },

      update(dt) {
        sayCool -= dt;
        idle += dt;
        const p = api.stage.pointer;
        if (p.down || p.moved) idle = 0;
        const netOn = p.down;
        critters.forEach((c) => {
          if (c.caught) return;
          c.phase += dt * 4;
          c.turn -= dt;
          if (c.turn <= 0) { c.a += U.rand(-1.4, 1.4); c.turn = U.rand(0.6, 2.2); }
          let sp = c.sp;
          if (c.dodge > 0) { c.dodge -= dt; sp *= 2.6; }
          c.x += Math.cos(c.a) * sp * dt;
          c.y += Math.sin(c.a) * sp * dt;
          if (c.x < AREA.x0) { c.x = AREA.x0; c.a = Math.PI - c.a; }
          if (c.x > AREA.x1) { c.x = AREA.x1; c.a = Math.PI - c.a; }
          if (c.y < AREA.y0) { c.y = AREA.y0; c.a = -c.a; }
          if (c.y > AREA.y1) { c.y = AREA.y1; c.a = -c.a; }
          if (netOn && U.dist(c.x, c.y, p.x, p.y) < NET_R + 26) {
            if (c.type === mission.type && mission.got < mission.need) {
              catchIt(c);
            } else if (c.dodge <= 0) {
              c.dodge = 0.7;
              c.a = Math.atan2(c.y - p.y, c.x - p.x);
              LS.sfx.pop();
              nameCritter(c);
            }
          }
        });
        critters = critters.filter((c) => !c.caught);
        flying.forEach((f) => { f.t += dt * 2.2; });
        flying = flying.filter((f) => f.t < 1);
      },

      draw(g) {
        const W = LS.W;
        if (!LS.sprite(g, 'bg-bugs', 0, 0, W, LS.H)) {
          const sky = g.createLinearGradient(0, 0, 0, LS.H);
          sky.addColorStop(0, '#bfe9ff');
          sky.addColorStop(0.35, '#d8f5c4');
          sky.addColorStop(1, '#7fcf6b');
          g.fillStyle = sky;
          g.fillRect(0, 0, W, LS.H);
        }
        // mission bar
        LS.panel(g,270,14,460,119,'#f5edc9','#507553');
        LS.label(g,'CATCH THE MATCHING CRITTERS',500,25,14);
        LS.panel(g,15,14,255,42,'#badcc2','#507553');
        for (let i = 0; i < mission.need; i++) {
          const s = slotPos(i);
          const filled = i < mission.got;
          LS.icon(g, mission.type.e, s.x, s.y, 66, 0, 1);
          if(filled){g.strokeStyle='#51ad60';g.lineWidth=4;g.beginPath();g.arc(s.x,s.y,37,0,Math.PI*2);g.stroke();}
          g.fillStyle = filled ? '#2f9e44' : '#868e96';
          g.font = '800 26px "Trebuchet MS",system-ui,sans-serif';
          g.textAlign = 'center';
          g.fillText(String(i + 1), s.x, 124);
        }
        // progress: missions done
        for (let i = 0; i < MISSIONS; i++) {
          g.fillStyle = i < missionNo ? '#fcc419' : 'rgba(0,0,0,0.15)';
          g.beginPath();
          g.arc(40 + i * 24, 30, 8, 0, 6.28);
          g.fill();
        }

        critters.forEach((c) => {
          LS.shadow(g,c.x,c.y+26,23);
          const wob = Math.sin(c.phase) * 0.2;
          const bob = c.type.e === '🦋' || c.type.e === '🐝' ? Math.sin(c.phase * 1.4) * 8 : 0;
          const flip = Math.cos(c.a) < 0;
          g.save();
          g.translate(c.x, c.y + bob);
          if (flip) g.scale(-1, 1);
          LS.icon(g, c.type.e, 0, 0, 62, wob + (c.dodge > 0 ? Math.sin(api.stage.t * 40) * 0.3 : 0));
          g.restore();
        });
        flying.forEach((f) => {
          const k = f.t;
          const x = f.x + (f.tx - f.x) * k;
          const y = f.y + (f.ty - f.y) * k - Math.sin(k * Math.PI) * 90;
          LS.icon(g, f.type.e, x, y, 62 - k * 6);
        });

        // the net
        const p = api.stage.pointer;
        if (p.down || p.type === 'mouse') {
          if (!LS.sprite(g, 'net', p.x-NET_R*1.2,p.y-NET_R*1.2,NET_R*2.4,NET_R*2.4)) {
            g.strokeStyle = 'rgba(255,255,255,0.95)';
            g.fillStyle = 'rgba(255,255,255,0.22)';
            g.lineWidth = 6;
            g.beginPath();
            g.arc(p.x, p.y, NET_R, 0, 6.28);
            g.fill();
            g.stroke();
          }
        }
        if (idle > 6) {
          const target = critters.find((c) => c.type === mission.type);
          if (target) LS.drawHint(g, target.x, target.y, api.stage.t);
        }
      },

      down(){api.stage.burst(api.stage.pointer.x,api.stage.pointer.y,{n:4});}, move() {}, up() {},
    };
  });
})();
