'use strict';
// Destinos editables: dejar null hasta disponer de la URL real.
const DESTINATIONS = Object.freeze({
  arlin: null,
  asunaah: 'asunaah-portfolio.html',
  erik: 'https://erikgaren.com/',
  alerik: null
});
const CHARACTERS = [
  {id:'arlin',name:'ARLIN',tag:'CREATE · EXPLORE · INSPIRE',color:'#ff91c0',description:'Un universo de ilustración, arte y expresión creativa.'},
  {id:'asunaah',name:'ASUNAAH',tag:'IMAGINE · DESIGN · EVOLVE',color:'#f4be66',description:'Tatuaje, diseño, imaginación y creación visual.'},
  {id:'erik',name:'ERIK',tag:'CODE · SIMULATE · TAKE OFF',color:'#ff6676',description:'Ingeniería de software, helicópteros, drones y simulación.'},
  {id:'alerik',name:'ALERIK',tag:'MOVE · EXPLORE · CREATE',color:'#60d5ff',description:'Música, tecnología, exploración y creatividad.'}
];
const byId = id => CHARACTERS.find(character => character.id === id);
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const cards = document.querySelector('#cards');
const world = document.querySelector('#world');
const flash = document.querySelector('#flash');
const hero = document.querySelector('.hero');
const portalSlot = document.querySelector('#world-portal-slot');
const back = document.querySelector('#back');
const positions = {arlin:[13,59],asunaah:[38,58],erik:[62,58],alerik:[87,58]};
let busy = false;
let transitionTimer;
let focusReturn = null;

cards.innerHTML = CHARACTERS.map((character,index) => `
  <button type="button" class="card" data-world="${character.id}" style="--accent:${character.color}">
    <img src="assets/${character.id}.jpg" alt="Astronauta ${character.name}" loading="lazy">
    <span class="card-text"><small>0${index+1} / 04 <b aria-hidden="true">↗</b></small><strong class="card-name">${character.name}</strong><span class="card-tag">${character.tag}</span></span>
  </button>`).join('');

function portalMarkup(character) {
  const destination = DESTINATIONS[character.id];
  const image = `<span class="portal-visual"><img src="assets/portal-${character.id}.webp?v=160" alt="" width="200" height="200"></span>`;
  const destinationLabel = destination ? (new URL(destination, window.location.href).hostname === window.location.hostname ? 'VIEW PORTFOLIO ↗' : new URL(destination, window.location.href).hostname + ' ↗') : 'DESTINO PENDIENTE';
  const copy = `<span class="portal-copy"><strong>ENTER ${character.name}’S WORLD</strong><span>${destinationLabel}</span></span>`;
  if (!destination) return `<div class="portal-entry portal-pending" aria-label="Portal de ${character.name}. Destino pendiente de confirmar">${image}${copy}</div>`;
  return `<a class="portal-entry portal-active" href="${destination}" aria-label="Entrar en el portfolio de ${character.name}: ${destinationLabel}">${image}${copy}</a>`;
}

function showFlash(color, action, duration=350) {
  window.clearTimeout(transitionTimer);
  flash.style.background = color;
  flash.classList.add('on');
  transitionTimer = window.setTimeout(() => {
    flash.classList.remove('on');
    action();
  }, reduced() ? 0 : duration);
}

function populateWorld(id) {
  const character = byId(id);
  if (!character) return;
  document.querySelector('#world-name').textContent = character.name;
  document.querySelector('#world-tag').textContent = character.tag;
  document.querySelector('#world-desc').textContent = character.description;
  const image = document.querySelector('#world-img');
  image.src = `assets/${id}.jpg`;
  image.alt = `Astronauta ${character.name}`;
  world.style.setProperty('--accent', character.color);
  portalSlot.innerHTML = portalMarkup(character);
  world.hidden = false;
  document.body.classList.add('world-open');
  back.focus({preventScroll:true});
}

function openWorld(id, push=true) {
  const character = byId(id);
  if (!character) return;
  focusReturn = document.activeElement;
  showFlash(character.color, () => {
    populateWorld(id);
    if (push) history.pushState({world:id},'',`#world-${id}`);
  });
}

function closeWorld(push=true) {
  window.clearTimeout(transitionTimer);
  flash.classList.remove('on');
  world.hidden = true;
  document.body.classList.remove('world-open');
  if (push) history.pushState(null,'','#home');
  if (focusReturn && focusReturn.isConnected) focusReturn.focus({preventScroll:true});
}

function selectFromStage(id) {
  if (busy) return;
  const character = byId(id);
  if (!character) return;
  busy = true;
  const [x,y] = positions[id];
  hero.style.setProperty('--accent',character.color);
  hero.style.setProperty('--fx',`${x}%`);
  hero.style.setProperty('--fy',`${y}%`);
  flash.style.setProperty('--lx',`${x}%`);
  flash.style.setProperty('--ly',`${y}%`);
  hero.classList.add('target');
  window.setTimeout(() => {
    hero.classList.add('launch');
    window.setTimeout(() => {
      openWorld(id);
      hero.classList.remove('target','launch');
      busy = false;
    },reduced()?0:540);
  },reduced()?0:310);
}

document.addEventListener('click',event => {
  const selector = event.target.closest('[data-world]');
  if (selector) {
    if (selector.closest('.hotspots')) selectFromStage(selector.dataset.world);
    else if (selector.closest('.orbit-cards') && !orbitChoose(selector.dataset.world)) return;
    else openWorld(selector.dataset.world);
    return;
  }
  const portal = event.target.closest('a.portal-active');
  if (!portal || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  if (busy || reduced()) return;
  const destination = portal.href;
  if (!destination) return;
  event.preventDefault();
  busy = true;
  portal.classList.add('portal-activating');
  const color = CHARACTERS.find(item => item.name === document.querySelector('#world-name').textContent)?.color || '#ff6676';
  flash.style.setProperty('--lx','50%');
  flash.style.setProperty('--ly','50%');
  flash.style.background = color;
  window.setTimeout(() => {
    flash.classList.add('on');
    window.setTimeout(() => window.location.assign(destination),220);
  },130);
});

back.addEventListener('click',()=>closeWorld());
document.addEventListener('keydown',event => {
  if (event.key==='Escape' && !world.hidden) closeWorld();
  if (event.key==='Tab' && !world.hidden) {
    const controls = [...world.querySelectorAll('button:not([disabled]),a[href]')].filter(el => el.getClientRects().length);
    if (!controls.length) return;
    if (event.shiftKey && document.activeElement===controls[0]) {event.preventDefault();controls.at(-1).focus();}
    else if (!event.shiftKey && document.activeElement===controls.at(-1)) {event.preventDefault();controls[0].focus();}
  }
});
function route() {
  const id = location.hash.startsWith('#world-') ? location.hash.slice(7) : null;
  if (byId(id)) populateWorld(id);
  else if (!world.hidden) closeWorld(false);
}
window.addEventListener('popstate',route);
window.addEventListener('hashchange',route);
route();

// Safari/iPadOS may restore a page from BFCache with the cinematic overlay still active.
function resetNavigationEffects() {
  window.clearTimeout(transitionTimer);
  flash.classList.remove('on');
  flash.style.removeProperty('background');
  document.querySelectorAll('.portal-activating').forEach(el => el.classList.remove('portal-activating'));
  hero.classList.remove('target','launch');
  busy = false;
}
window.addEventListener('pageshow', () => {
  resetNavigationEffects();
  route();
});
window.addEventListener('pagehide', resetNavigationEffects);


// GAREN VERSE 1.6 — Orbital selector. The existing openWorld and flash transitions are reused.
const orbitShell = document.querySelector('#orbit-shell');
const orbitCards = document.querySelector('#cards');
const orbitItems = [...orbitCards.querySelectorAll('.card')];
const orbitStatus = document.querySelector('#orbit-status');
let orbitIndex = 0;
let orbitGrid = false;
let orbitGesture = null;
let orbitSuppressClickUntil = 0;
const orbitIds = CHARACTERS.map(c => c.id);
function orbitRender() {
  if (orbitGrid) return;
  const spread = Math.min(orbitCards.clientWidth * .265, 345);
  orbitItems.forEach((el, index) => {
    let offset = (index - orbitIndex + orbitItems.length) % orbitItems.length;
    if (offset === 3) offset = -1;
    // One character is in front, two on the sides, one behind the constellation.
    const center = offset === 0;
    const rear = offset === 2;
    const x = offset === -1 ? -spread : offset === 1 ? spread : rear ? spread * 1.64 : 0;
    const y = rear ? -22 : center ? 0 : 14;
    el.style.setProperty('--orbit-x', `${x}px`);
    el.style.setProperty('--orbit-y', `${y}px`);
    el.style.setProperty('--orbit-scale', center ? '1' : rear ? '.62' : '.79');
    el.style.setProperty('--orbit-angle', center ? '0deg' : offset === -1 ? '24deg' : offset === 1 ? '-24deg' : '0deg');
    el.style.setProperty('--orbit-opacity', center ? '1' : rear ? '.46' : '.83');
    el.style.setProperty('--orbit-brightness', center ? '1' : rear ? '.46' : '.7');
    el.style.setProperty('--orbit-z', center ? '4' : rear ? '1' : '2');
    el.dataset.orbitPosition = String(offset);
    el.setAttribute('aria-label', `${CHARACTERS[index].name}${center ? ', seleccionado. Entrar en su universo' : ', seleccionar personaje'}`);
    el.setAttribute('aria-pressed', String(center));
  });
  const active = CHARACTERS[orbitIndex];
  orbitShell.style.setProperty('--orbit-accent', active.color);
  orbitStatus.textContent = `${String(orbitIndex+1).padStart(2,'0')} / 04 · ${active.name}`;
}
function orbitMove(delta) {
  if (orbitGrid || busy || !world.hidden) return;
  orbitIndex = (orbitIndex + delta + orbitItems.length) % orbitItems.length;
  orbitRender();
}
function orbitChoose(id) {
  if (orbitGrid) return true;
  if (performance.now() < orbitSuppressClickUntil) return false;
  const index = orbitIds.indexOf(id);
  if (index < 0) return false;
  if (index !== orbitIndex) {
    orbitIndex = index;
    orbitRender();
    return false; // Side characters only rotate into focus. A second tap enters.
  }
  return true; // Preserve the existing card -> flash -> internal page transition.
}
document.querySelector('#orbit-prev').addEventListener('click', () => orbitMove(-1));
document.querySelector('#orbit-next').addEventListener('click', () => orbitMove(1));
document.querySelector('#orbit-layout').addEventListener('click', event => {
  orbitGrid = !orbitGrid;
  orbitShell.classList.toggle('is-grid', orbitGrid);
  event.currentTarget.setAttribute('aria-pressed', String(orbitGrid));
  event.currentTarget.textContent = orbitGrid ? 'VOLVER A LA ÓRBITA' : 'VER LAS CUATRO TARJETAS';
  if (!orbitGrid) orbitRender();
});
orbitCards.addEventListener('pointerdown', event => {
  if (orbitGrid || event.button !== 0) return;
  orbitGesture = {x:event.clientX,y:event.clientY,id:event.pointerId};
});
orbitCards.addEventListener('pointerup', event => {
  if (!orbitGesture || orbitGesture.id !== event.pointerId || orbitGrid) return;
  const dx = event.clientX - orbitGesture.x;
  const dy = event.clientY - orbitGesture.y;
  orbitGesture = null;
  if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy)*1.2) {
    orbitSuppressClickUntil = performance.now() + 420;
    orbitMove(dx < 0 ? 1 : -1);
  }
});
orbitCards.addEventListener('pointercancel', () => {orbitGesture=null;});
orbitCards.addEventListener('dragstart', event => event.preventDefault());
orbitShell.addEventListener('keydown', event => {
  if (orbitGrid || !world.hidden || !['ArrowLeft','ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  orbitMove(event.key === 'ArrowRight' ? 1 : -1);
  orbitItems[orbitIndex].focus({preventScroll:true});
});
window.addEventListener('resize', orbitRender, {passive:true});
orbitRender();
