/* Five-room expeditions. Original question bank and saved scores are retained. */
(() => {
  'use strict';
  const bank=window.QUESTION_BANK;
  const keys=Object.keys(bank), letters=['A','B','C','D'];
  const worlds=['Number Peaks','Word Woods','Cipher City','Pattern Planet'];
  const icons=['▲','✦','◇','◉'];
  let topic=keys[0],index=0,choice=null,score=0,order=[],outcomes=[],recorded=false;
  let stats={};
  try {stats=JSON.parse(localStorage.getItem('brightstep-stats')||'{}') || {};} catch {}
  const $=id=>document.getElementById(id);
  function save(){try{localStorage.setItem('brightstep-stats',JSON.stringify(stats));}catch{}}
  function deal(){
    const idx=Array.from({length:bank[topic].questions.length},(_,i)=>i);
    for(let i=idx.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]];}
    order=idx.slice(0,5);index=0;choice=null;score=0;outcomes=[];recorded=false;
  }
  function count(){$('total').textContent=Object.values(stats).reduce((n,s)=>n+(s.answered||0),0);}
  function subjects(){
    $('subjects').innerHTML=keys.map((key,i)=>`<button class="subject" aria-pressed="${key===topic}" data-topic="${i}"><span class="icon" aria-hidden="true">${icons[i] || '✦'}</span><span><strong>${worlds[i] || key}</strong><br><small>${key} · 5 rooms</small></span></button>`).join('');
    $('subjects').querySelectorAll('[data-topic]').forEach(button=>button.addEventListener('click',()=>{
      const next=keys[Number(button.dataset.topic)];
      if(next===topic)return;
      if(index>0 || choice!==null){if(!window.confirm('Start a different expedition? Your answered questions are saved, but this route will restart.'))return;}
      topic=next;deal();render();$('practice').focus();
    }));
  }
  function history(){
    $('history').innerHTML=keys.map((key,i)=>{
      const stat=stats[key]||{},rounds=stat.rounds||0;
      const rank=rounds>=5?'Trailblazer':rounds>=3?'Explorer':rounds?'Discovered':'Unexplored';
      return `<div class="passport-stamp ${rounds?'earned':''}"><span class="stamp-icon" aria-hidden="true">${icons[i] || '✦'}</span><div><strong>${key}</strong><small>${rank} · ${rounds} ${rounds===1?'expedition':'expeditions'}</small>${stat.best===undefined?'':`<small>Best: ${stat.best}/5</small>`}</div></div>`;
    }).join('');
  }
  function map(){return `<ol class="room-map" aria-label="Expedition route">${Array.from({length:5},(_,i)=>`<li class="${i<index?'visited':i===index?'current':''}" ${i===index?'aria-current="step"':''}><span>${i<index?'✦':i+1}</span><small>${i<index?'Explored':i===index?'You are here':'Room '+(i+1)}</small></li>`).join('')}</ol>`;}
  function focusNext(){const next=$('next') || $('again');if(next)next.focus();}
  function render(){
    subjects();history();count();const el=$('practice');
    if(index===5){
      if(!recorded){recorded=true;stats[topic]??={answered:0,best:0};stats[topic].rounds=(stats[topic].rounds||0)+1;stats[topic].best=Math.max(stats[topic].best||0,score);save();history();}
      el.innerHTML=`<div class="complete"><div class="reward-seal" aria-hidden="true">${icons[keys.indexOf(topic)] || '✦'}</div><p class="eyebrow">EXPEDITION COMPLETE · STAMP EARNED</p><h2>${worlds[keys.indexOf(topic)] || topic} discovered!</h2><p>You solved <strong>${score} out of 5</strong> on this journey. ${score===5?'A brilliant discovery!':'The explanations you explored are part of your progress.'}</p><div class="result-route" aria-label="Answers from this expedition">${outcomes.map((ok,i)=>`<span>${i+1} · ${ok?'Solved':'Explored'}</span>`).join('')}</div><p class="rest-note">Your passport is saved. Explore again, try another subject, or take a break.</p><button class="next" id="again">Explore a new route</button><a class="exit-route" href="/">Back to Adventure HQ</a></div>`;
      $('again').onclick=()=>{deal();render();el.focus();};return;
    }
    const q=bank[topic].questions[order[index]],answered=choice!==null;
    el.innerHTML=`${map()}<div class="card-head"><span class="pill">${topic}</span><span>Room ${index+1} / 5</span></div><h2 class="question">${q[0]}</h2><div class="options">${q[1].map((value,i)=>`<button class="option ${answered?(i===q[2]?'correct':i===choice?'wrong':''):''}" data-answer="${i}" ${answered?'disabled':''}><span class="letter">${letters[i]}</span>${value}</button>`).join('')}</div>${answered?`<div class="feedback ${choice===q[2]?'':'wrong'}" role="status"><strong>${choice===q[2]?'Discovery made!':'A new thing to discover. The answer is '+q[1][q[2]]+'.'}</strong>${q[3]}</div><button class="next" id="next">${index===4?'Collect my expedition stamp':'Explore room '+(index+2)}</button>`:''}`;
    if(answered){$('next').onclick=()=>{index++;choice=null;render();if(index===5)focusNext();else el.focus();};}
    else el.querySelectorAll('[data-answer]').forEach(button=>button.onclick=()=>{
      if(choice!==null)return;choice=Number(button.dataset.answer);const ok=choice===q[2];if(ok)score++;outcomes.push(ok);
      stats[topic]??={answered:0,best:0};stats[topic].answered++;save();render();focusNext();
    });
  }
  $('practice').setAttribute('tabindex','-1');
  deal();render();
})();
