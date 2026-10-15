/* Beat Pals: a call-and-response rhythm game in the spirit of PaRappa.
 * Listen to the pals play a pattern, then copy it. Patterns grow from two
 * to six. Mistakes just replay the pattern; there is a free jam mode too.
 * Learning by play: listening, memory, order and patterns. */
(() => {
  'use strict';
  const LS = window.LS;
  const U = LS.U;
  const PAD=180,PAD_W=205,PAD_H=290;
  const PAD_POS=[{x:35,y:280},{x:275,y:280},{x:515,y:280},{x:755,y:280}];
  const JAM_BTN={x:925,y:100,r:43};

  LS.register('beats', (api) => {
    const PADS = LS.CFG.beats;
    let seq;
    let length;
    let mode;        // 'listen' | 'repeat' | 'cheer' | 'jam'
    let playIdx;
    let playT;
    let inputIdx;
    let glow;        // per pad 0..1
    let shake;
    let jamTaps;
    let songs;
    let idle;
    let turnVersion=0;
    function later(fn,ms){const version=turnVersion;api.after(()=>{if(version===turnVersion)fn();},ms);}

    function makeSeq(n) {
      const s = [];
      while (s.length < n) {
        const v = Math.floor(Math.random() * PADS.length);
        // avoid three identical beats in a row
        if (s.length >= 2 && s[s.length - 1] === v && s[s.length - 2] === v) continue;
        s.push(v);
      }
      return s;
    }

    function listen() {
      turnVersion++;
      mode = 'listen';
      playIdx = -1;
      playT = 0.6;
      inputIdx = 0;
      api.say('Listen!');
    }

    function hit(i, quiet) {
      glow[i] = 1;
      LS.sfx.note(PADS[i].note);
      if (!quiet) api.stage.burst(PAD_POS[i].x + PAD / 2, PAD_POS[i].y + 70, { n: 5, chars: ['🎵', '🎶'] });
    }

    return {
      start() {
        length = 2;
        glow = [0, 0, 0, 0];
        shake = [0, 0, 0, 0];
        jamTaps = 0;
        songs = 0;
        idle = 0;
        seq = makeSeq(length);
        listen();
      },
      stop() { LS.voice.stop(); },
      debug() { return { mode, seq, inputIdx, length, songs }; },

      update(dt) {
        idle += dt;
        for (let i = 0; i < 4; i++) { glow[i] = Math.max(0, glow[i] - dt * 2.2); shake[i] = Math.max(0, shake[i] - dt); }
        if (mode === 'listen') {
          playT -= dt;
          if (playT <= 0) {
            playIdx++;
            if (playIdx >= seq.length) {
              mode = 'repeat';
              inputIdx = 0;
              idle = 0;
              api.say('Your turn!');
            } else {
              hit(seq[playIdx], true);
              playT = 0.7;
            }
          }
        }
      },

      draw(g){
        if(!LS.sprite(g,'bg-beats',0,0,LS.W,LS.H)){g.fillStyle='#f0b16a';g.fillRect(0,0,LS.W,LS.H);}
        const text=mode==='listen'?'LISTEN TO THE BAND':mode==='repeat'?'YOUR TURN!':mode==='jam'?'FREESTYLE JAM':'YOU GOT THE GROOVE!';
        LS.panel(g,210,25,580,105,'#fff1c7','#513b61');LS.label(g,text,500,58,25,'#f6d275');
        if(mode!=='jam')seq.forEach((v,i)=>{
          const played=mode==='repeat'?i<inputIdx:mode==='listen'?i<=playIdx:true;
          g.fillStyle=played?PADS[v].hex:'#d1c7b5';g.strokeStyle='#513b61';g.lineWidth=2;g.beginPath();g.arc(500-(seq.length-1)*22+i*44,100,13,0,6.28);g.fill();g.stroke();
        });else LS.label(g,`${jamTaps} BEATS`,500,103,17);
        PADS.forEach((pal,i)=>{
          const pos=PAD_POS[i],gl=glow[i],sx=shake[i]>0?Math.sin(shake[i]*60)*8:0;
          LS.shadow(g,pos.x+PAD_W/2,568,95);
          g.fillStyle=pal.hex;g.strokeStyle=gl>.05?'#fff8d6':'#4b3159';g.lineWidth=gl>.05?7:4;
          g.beginPath();g.ellipse(pos.x+PAD_W/2,555,100,25,0,0,Math.PI*2);g.fill();g.stroke();
          g.save();g.translate(sx,-gl*16);g.rotate(0);
          if(!LS.band(g,i,pos.x-8,pos.y-25,PAD_W+16,PAD_H)){LS.icon(g,pal.e,pos.x+PAD_W/2,420,170);}
          g.restore();
          LS.label(g,String(i+1),pos.x+PAD_W/2,590,20);
        });
        LS.panel(g,865,45,120,110,mode==='jam'?'#ffda67':'#f9eec8','#513b61');LS.icon(g,mode==='jam'?'▶️':'🎤',JAM_BTN.x,JAM_BTN.y,45);LS.label(g,mode==='jam'?'COPY':'JAM',925,139,13);
        if(mode==='repeat'&&idle>6){const pos=PAD_POS[seq[inputIdx]];LS.drawHint(g,pos.x+PAD_W/2,pos.y+100,api.stage.t);}
      },

      down(x, y) {
        idle = 0;
        if (U.dist(x, y, JAM_BTN.x, JAM_BTN.y) < JAM_BTN.r + 12) {
          turnVersion++;
          if (mode === 'jam') { listen(); } else { mode = 'jam'; api.say('Jam time! Tap the pals!'); }
          LS.sfx.pop();
          return;
        }
        const i = PAD_POS.findIndex((p) => x > p.x && x < p.x + PAD_W && y > p.y && y < p.y + PAD_H);
        if (i < 0) return;
        if (mode === 'jam') {
          hit(i);
          jamTaps++;
          if (jamTaps === 20) { LS.award('beat-jam'); api.say('What a jam!'); }
          return;
        }
        if (mode !== 'repeat') return;
        if (i === seq[inputIdx]) {
          hit(i);
          inputIdx++;
          if (inputIdx >= seq.length) {
            mode = 'cheer';
            songs++;
            later(() => {
              api.stage.burst(LS.W / 2, 300, { n: 24 });
              LS.sfx.yay();
              api.say(LS.praise());
              if (length >= 3) LS.award('beat-three');
              if (length >= 5) LS.award('beat-five');
              if (length >= 6) LS.award('beat-six');
            }, 250);
            later(() => {
              if (length >= 6 && songs >= 4) { api.finish({ title: 'What a band!', emoji: '🥁' }); return; }
              length = length >= 6 ? 3 : length + 1;
              seq = makeSeq(length);
              listen();
            }, 2000);
          }
        } else {
          shake[i] = 0.4;
          LS.sfx.boing();
          api.say('Oops! Listen again.');
          later(listen, 900);
          mode = 'cheer';
        }
      },
      key(k){if('1234'.includes(k)&&k.length===1){const pos=PAD_POS[Number(k)-1];this.down(pos.x+PAD_W/2,pos.y+PAD_H/2);return true;}if(k===' '){listen();return true;}if(k.toLowerCase()==='j'){this.down(JAM_BTN.x,JAM_BTN.y);return true;}return false;},
      move() {}, up() {},
    };
  });
})();
