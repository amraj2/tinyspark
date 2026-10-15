(() => {
  'use strict';
  const intro=document.getElementById('media-boot'),load=document.getElementById('boot-load'),menu=document.querySelector('.game-screen');
  if(!intro||!menu)return;
  const media=[
    {id:'cd',name:'CD',player:'disc player',verb:'Slide in the CD'},
    {id:'cartridge',name:'game cartridge',player:'game console',verb:'Plug in the cartridge'},
    {id:'cassette',name:'audio cassette',player:'cassette deck',verb:'Pop in the cassette'},
    {id:'vhs',name:'VHS tape',player:'VHS player',verb:'Slide in the VHS'},
    {id:'vinyl',name:'vinyl record',player:'record player',verb:'Drop the needle'}
  ];
  // Pick anew on every homepage load; avoid an immediate repeat when storage is available.
  let last;try{last=sessionStorage.getItem('tinyspark-last-media');}catch{}
  const choices=media.filter(m=>m.id!==last),choice=choices[Math.floor(Math.random()*choices.length)];
  try{sessionStorage.setItem('tinyspark-last-media',choice.id);}catch{}
  intro.dataset.media=choice.id;
  document.getElementById('boot-instruction').textContent=choice.verb;
  load.setAttribute('aria-label',`Load the TinySpark ${choice.name} into the ${choice.player}`);
  intro.querySelector('.player-display').textContent=choice.id==='vinyl'?'33 RPM':'READY';
  intro.hidden=false;menu.inert=true;document.body.classList.add('boot-active');
  let loading=false,finishTimer,revealTimer,crtFrame=0,crtCanvas=null;
  function finish(){
    clearTimeout(finishTimer);clearTimeout(revealTimer);cancelAnimationFrame(crtFrame);crtCanvas?.remove();crtCanvas=null;intro.hidden=true;menu.inert=false;
    document.body.classList.remove('boot-active','boot-revealing');
    menu.querySelector('.game-option:not([hidden])')?.focus({preventScroll:true});
  }
  function warmCRT(){
    crtCanvas=document.createElement('canvas');crtCanvas.className='crt-phosphor';crtCanvas.setAttribute('aria-hidden','true');document.body.append(crtCanvas);
    const canvas=crtCanvas,g=canvas.getContext('2d');if(!g)return;
    const w=canvas.width=Math.min(innerWidth,1440),h=canvas.height=Math.round(w*innerHeight/innerWidth);
    const grain=document.createElement('canvas');grain.width=160;grain.height=90;
    const ng=grain.getContext('2d');if(!ng)return;
    const noise=ng.createImageData(160,90),start=performance.now();let lastGrain=-100;
    function frame(now){
      if(crtCanvas!==canvas)return;
      const elapsed=now-start,p=Math.min(1,elapsed/1000);g.clearRect(0,0,w,h);
      // The electron beam starts as a dot, widens, then establishes vertical deflection.
      if(p<.28){
        g.fillStyle='#05090e';g.fillRect(0,0,w,h);
        const spread=p<.1?Math.max(4,w*p*.13):w*Math.min(.93,(p-.1)/.15);
        g.save();g.shadowColor='#b0dbe3';g.shadowBlur=18;g.fillStyle='#c1d6ce';
        g.beginPath();g.ellipse(w/2,h/2,Math.max(2,spread/2),p<.1?2:1.3,0,0,Math.PI*2);g.fill();g.restore();
      }
      const fade=Math.max(0,1-p),signal=Math.max(0,1-(p-.25)/.5);
      if(p>.2){
        if(elapsed-lastGrain>65){
          for(let i=0;i<noise.data.length;i+=4){const v=Math.random()*170;noise.data[i]=v*.85;noise.data[i+1]=v;noise.data[i+2]=v*.95;noise.data[i+3]=30;}
          ng.putImageData(noise,0,0);lastGrain=elapsed;
        }
        g.globalAlpha=signal*.6;g.drawImage(grain,0,0,w,h);g.globalAlpha=1;
        // A single broad rolling retrace band, rather than repeated screen flashes.
        const y=((p-.2)/.8)*h*1.3-h*.15,band=g.createLinearGradient(0,y-h*.1,0,y+h*.1);
        band.addColorStop(0,'transparent');band.addColorStop(.45,`rgba(164,205,188,${fade*.13})`);band.addColorStop(.52,`rgba(0,8,14,${fade*.3})`);band.addColorStop(1,'transparent');g.fillStyle=band;g.fillRect(0,y-h*.1,w,h*.2);
        g.fillStyle=`rgba(0,6,12,${fade*.28})`;for(let line=0;line<h;line+=3)g.fillRect(0,line,w,1);
        const vignette=g.createRadialGradient(w/2,h/2,h*.2,w/2,h/2,w*.65);vignette.addColorStop(0,'transparent');vignette.addColorStop(1,`rgba(0,5,10,${fade*.8})`);g.fillStyle=vignette;g.fillRect(0,0,w,h);
      }
      if(p<1)crtFrame=requestAnimationFrame(frame);else{canvas.remove();crtCanvas=null;}
    }
    crtFrame=requestAnimationFrame(frame);
  }
  function insertMedia(){
    const piece=intro.querySelector('.boot-media');
    const target=intro.querySelector(choice.id==='vinyl'?'.player-top':'.player-slot');
    const from=piece.getBoundingClientRect(),to=target.getBoundingClientRect();
    const scene=intro.querySelector('.boot-scene');
    const sceneScale=(scene.getBoundingClientRect().width/scene.offsetWidth)*(parseFloat(getComputedStyle(piece).scale)||1);
    const dx=(to.left+to.width/2-from.left-from.width/2)/sceneScale;
    const dy=(to.top+to.height/2-from.top-from.height/2)/sceneScale;
    const scale=choice.id==='cartridge'?.76:choice.id==='cassette'?.8:choice.id==='vinyl'?.68:.82;
    const tilt=choice.id==='cartridge'||choice.id==='cassette'?0:65;
    const aligned=`translateX(calc(-50% + ${dx}px)) translateY(${dy}px) rotate(0deg) rotateX(${tilt}deg) scale(${scale})`;
    piece.animate([
      {transform:getComputedStyle(piece).transform,opacity:1,offset:0},
      {transform:aligned,opacity:1,offset:.74},
      {transform:aligned,opacity:0,offset:1}
    ],{duration:560,easing:'cubic-bezier(.3,0,.2,1)',fill:'forwards'});
  }
  load.addEventListener('click',()=>{
    if(loading)return;loading=true;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    intro.classList.toggle('boot-reduced',reduced);intro.classList.add('boot-loading');load.setAttribute('aria-disabled','true');
    intro.querySelector('.player-display').textContent='PLAY';
    document.getElementById('boot-status').textContent='Let’s play.';
    if(!reduced){try{insertMedia();}catch{/* The menu remains reachable if animation is unavailable. */}}
    revealTimer=setTimeout(()=>{
      intro.hidden=true;document.body.classList.remove('boot-active');
      if(!reduced){document.body.classList.add('boot-revealing');try{warmCRT();}catch{/* Startup still completes without canvas effects. */}}
    },reduced?80:580);
    finishTimer=setTimeout(finish,reduced?120:1640);
  });
  document.addEventListener('keydown',event=>{
    if(loading&&menu.inert){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  // Going back from a game restores the menu rather than interrupting play again.
  window.addEventListener('pageshow',event=>{if(event.persisted)finish();});
  intro.querySelector('.boot-action').textContent='TAP TO LOAD · ENTER TO PLAY';
  load.focus({preventScroll:true});
})();
