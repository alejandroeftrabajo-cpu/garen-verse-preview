/* GAREN VERSE 1.7 — Sonic Universe. No external dependencies. */
(() => {
  'use strict';
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass || document.querySelector('#garen-sound-toggle')) return;
  const KEY = 'garen-sound-enabled';
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ctx, master, ambientNodes = [], heartbeatTimer = null, heartbeatStart = 0;
  let enabled = false, lastOrbit = 0, lastSelection = 0, activeId = null;
  const toggle = document.createElement('button');
  toggle.id = 'garen-sound-toggle'; toggle.type = 'button';
  toggle.setAttribute('aria-label', 'Activar sonido');
  toggle.setAttribute('aria-pressed', 'false');
  toggle.textContent = 'SOUND OFF';
  document.body.append(toggle);
  function init() {
    if (!ctx) {
      ctx = new AudioContextClass(); master = ctx.createGain();
      master.gain.value = 0.19; master.connect(ctx.destination);
    }
    
if (ctx.state === 'suspended') {
  ctx.resume()
    .then(() => {
      if (enabled) {
        effects.select();
        syncSections();
      }
    })
    .catch(error => {
      console.error('GAREN Audio:', error);
    });
} else if (ctx.state === 'running' && enabled) {
  effects.select();
  syncSections();
}
  }
  function tone(freq, at, length, volume = .08, type = 'sine', endFreq = null) {
    if (!enabled || !ctx || ctx.state !== 'running') return;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(Math.max(1,freq),at);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1,endFreq),at+length);
    gain.gain.setValueAtTime(.0001,at);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),at+Math.min(.025,length/3));
    gain.gain.exponentialRampToValueAtTime(.0001,at+length);
    osc.connect(gain).connect(master); osc.start(at); osc.stop(at+length+.015);
  }
  function noise(at, length, volume, cutoff = 700) {
    if (!enabled || !ctx || ctx.state !== 'running') return;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate*length),ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1);
    const src=ctx.createBufferSource(), filter=ctx.createBiquadFilter(), gain=ctx.createGain();
    src.buffer=buffer;filter.type='lowpass';filter.frequency.value=cutoff;
    gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume,at+.015);
    gain.gain.exponentialRampToValueAtTime(.0001,at+length);
    src.connect(filter).connect(gain).connect(master);src.start(at);src.stop(at+length);
  }
  const now = () => ctx ? ctx.currentTime+.008 : 0;
  const effects = {
    orbit(){const t=now();tone(240,t,.18,.045,'triangle',420);tone(470,t+.065,.16,.024,'sine',360);},
    select(){const t=now();tone(660,t,.11,.055);tone(990,t+.055,.16,.045);},
    home(){const t=now();tone(180,t,.3,.08,'sawtooth',440);noise(t+.17,.42,.11,1100);tone(100,t+.2,.55,.15,'triangle',48);},
    explore(){const t=now();tone(300,t,.13,.075,'triangle',550);tone(190,t+.1,.35,.1,'sawtooth',65);noise(t+.12,.24,.065,850);},
    portal(){const t=now();tone(330,t,.18,.09,'triangle',880);tone(660,t+.09,.23,.075,'sine',1200);noise(t+.12,.2,.05,1800);},
    beat1(){const t=now();tone(83,t,.19,.2,'sine',48);tone(130,t,.1,.065,'triangle',75);},
    beat2(){const t=now();tone(70,t,.16,.13,'sine',44);tone(115,t,.09,.035,'triangle',68);}
  };
  function play(name) {if (enabled && !reduce() && document.visibilityState==='visible') effects[name]?.();}
  function stopAmbient() {ambientNodes.forEach(n=>{try{n.stop()}catch{}});ambientNodes=[];}
  function ambient() {
    stopAmbient(); if (!enabled || !ctx || ctx.state!=='running' || reduce() || document.visibilityState!=='visible')return;
    if (!document.querySelector('#home')?.getBoundingClientRect) return;
    const rect=document.querySelector('#home').getBoundingClientRect();
    if(rect.bottom<innerHeight*.4 || rect.top>innerHeight*.6 || !document.querySelector('#world')?.hidden)return;
    [55,82.41,110].forEach((f,i)=>{
      const osc=ctx.createOscillator(), gain=ctx.createGain();osc.type='sine';osc.frequency.value=f;
      gain.gain.value=[.016,.009,.006][i];osc.connect(gain).connect(master);osc.start();ambientNodes.push(osc);
    });
  }
  function stopBeats(){if(heartbeatTimer!==null){clearInterval(heartbeatTimer);heartbeatTimer=null;}}
  function beats(){
    stopBeats();if(!enabled || reduce() || document.visibilityState!=='visible')return;
    const el=document.querySelector('#about .heartbeat-primary');if(!el)return;
    const r=el.getBoundingClientRect();if(r.top>innerHeight || r.bottom<0)return;
    // CSS keyframes: first accent at 18% and second at 34% of the 3.4s cycle.
    // Align the audio clock to the CSS animation timeline (document timeline).
    const duration=3400, origin=performance.now();
    const tick=()=>{
      const time=performance.now();
      const phase=((time-origin)%duration+duration)%duration;
      const within=(target)=>Math.abs(phase-target)<85;
      const cycle=Math.floor((time-origin)/duration);
      if(within(612)&&heartbeatStart!==cycle*10+1){heartbeatStart=cycle*10+1;play('beat1')}
      if(within(1156)&&heartbeatStart!==cycle*10+2){heartbeatStart=cycle*10+2;play('beat2')}
    };
    heartbeatTimer=setInterval(tick,40);
  }
  function syncSections(){ambient();beats();}
  toggle.addEventListener('click',()=>{
    enabled=!enabled;
    if(enabled)init();else{stopAmbient();stopBeats();}
    toggle.textContent=enabled?'SOUND ON':'SOUND OFF';
    toggle.setAttribute('aria-pressed',String(enabled));
    toggle.setAttribute('aria-label',enabled?'Silenciar sonido':'Activar sonido');
    try{sessionStorage.setItem(KEY,String(enabled))}catch{}
    syncSections();
  });
  // Delegated capture listener: sound only, never intercepts existing clicks.
  document.addEventListener('click',event=>{
    if(!enabled)return;
    const target=event.target.closest('[data-world], .portal-active, #orbit-prev, #orbit-next');
    if(!target)return;
    if(target.matches('#orbit-prev,#orbit-next')){lastOrbit=performance.now();play('orbit');setTimeout(()=>play('select'),610);return;}
    if(target.matches('.portal-active')){play('portal');return;}
    if(target.matches('[data-world]')){
      if(target.closest('.hotspots')){play('home');return;}
      if(target.closest('.orbit-cards')){
        const centered=target.getAttribute('data-orbit-position')==='0';
        const grid=!!target.closest('.is-grid');
        if(centered||grid)play('explore');
        else {lastSelection=performance.now();play('orbit');setTimeout(()=>{if(performance.now()-lastSelection>=580)play('select')},620)}
      }
    }
  },true);
  // Touch carousel gestures, without altering existing pointer handlers.
  let start=null;
  document.querySelector('#cards')?.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY}}, {passive:true});
  document.querySelector('#cards')?.addEventListener('pointerup',e=>{
    if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;
    if(Math.abs(dx)>42 && Math.abs(dx)>Math.abs(dy)*1.2){play('orbit');setTimeout(()=>play('select'),610)}
  },{passive:true});
  document.querySelector('#cards')?.addEventListener('pointercancel',()=>{start=null});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stopAmbient();stopBeats()}else syncSections()});
  window.addEventListener('pagehide',()=>{stopAmbient();stopBeats()});
  window.addEventListener('pageshow',syncSections);
  window.addEventListener('scroll',()=>{clearTimeout(window.__garenAudioScroll);window.__garenAudioScroll=setTimeout(syncSections,120)},{passive:true});
  window.addEventListener('hashchange',()=>setTimeout(syncSections,200));
  document.querySelector('#back')?.addEventListener('click',()=>setTimeout(syncSections,100));
  const worldObserver=new MutationObserver(()=>setTimeout(syncSections,100));
  const world=document.querySelector('#world');if(world)worldObserver.observe(world,{attributes:true,attributeFilter:['hidden']});
  // Explicit opt-in on every new visit: avoids Safari autoplay restrictions.
})();
