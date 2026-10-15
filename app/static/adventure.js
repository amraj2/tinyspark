(() => {
  const screen = document.querySelector('.game-screen');
  const options = [...document.querySelectorAll('.game-option')];
  const stage = document.querySelector('.world-stage');
  const words = {create:'CREATE!',challenge:'SOLVE!',race:'GO! GO!'};
  const stamps = {create:'IDEAS<br>HAVE SUPERPOWERS.',challenge:'SMALL STEPS.<br>BIG BRAIN ENERGY.',race:'ON YOUR MARKS.<br>CHASE THAT CROWN!'};
  function select(option) {
    if (option.classList.contains('selected')) return;
    options.forEach(item => {item.classList.toggle('selected',item === option); item.removeAttribute('aria-describedby');});
    option.setAttribute('aria-describedby','mission-description');
    screen.dataset.world = option.dataset.world;
    document.querySelector('#mission-title').textContent = option.dataset.title;
    document.querySelector('#mission-description').textContent = option.dataset.description;
    document.querySelector('#mission-age').textContent = option.dataset.age;
    document.querySelector('.stage-word').textContent = words[option.dataset.world];
    document.querySelector('.stage-stamp').innerHTML = stamps[option.dataset.world];
    stage.classList.remove('reveal');
    requestAnimationFrame(() => stage.classList.add('reveal'));
  }
  const visibleOptions = () => options.filter(option => !option.hidden);
  const ageFilter = document.querySelector('#age-filter');
  function filterByAge() {
    const age = ageFilter.value;
    options.forEach(option => {
      option.hidden = age !== 'all' && (Number(age) < Number(option.dataset.minAge) || Number(age) > Number(option.dataset.maxAge));
    });
    const visible = visibleOptions();
    const current = document.querySelector('.game-option.selected');
    if (visible.length && (!current || current.hidden)) select(visible[0]);
    document.querySelector('#age-results').textContent = `${visible.length} ${visible.length === 1 ? 'adventure' : 'adventures'} available${age === 'all' ? '' : ` for age ${age}`}`;
  }
  ageFilter.addEventListener('change', filterByAge);
  // Reapply the filter when browser back navigation restores the form value.
  window.addEventListener('pageshow', filterByAge);
  filterByAge();
  options.forEach(option => {
    option.addEventListener('pointerenter',event => {if(event.pointerType !== 'touch') select(option);});
    option.addEventListener('focus',() => select(option));
    option.addEventListener('keydown',event => {
      const visible = visibleOptions();
      const index = visible.indexOf(option);
      let next;
      if(event.key === 'ArrowDown') next = (index+1)%visible.length;
      if(event.key === 'ArrowUp') next = (index+visible.length-1)%visible.length;
      if(event.key === 'Home') next = 0;
      if(event.key === 'End') next = visible.length-1;
      if(next !== undefined) {event.preventDefault(); visible[next].focus();}
    });
  });
  document.addEventListener('keydown',event => {
    if(document.querySelector('dialog[open]') || /INPUT|TEXTAREA|SELECT|BUTTON|A/.test(document.activeElement.tagName)) return;
    if(event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter') {
      event.preventDefault();
      const selected = document.querySelector('.game-option.selected');
      if(event.key === 'Enter') selected.click(); else selected.focus();
    }
  });
  const motion = document.querySelector('#motion-toggle');
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let motionOff = media.matches;
  function updateMotion() {document.body.classList.toggle('motion-off',motionOff);motion.setAttribute('aria-pressed',String(motionOff));motion.textContent = motionOff ? 'Motion: off' : 'Motion: on';}
  updateMotion();
  motion.addEventListener('click',() => {motionOff=!motionOff;updateMotion();});
  const dialog = document.querySelector('#help-dialog');
  document.querySelector('#help-open').addEventListener('click',() => dialog.showModal());
  document.querySelector('.close-dialog').addEventListener('click',() => dialog.close());
})();
