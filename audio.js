/* GAREN VERSE 1.8 — Cinematic Sound Engine · HTML5 Audio · isolated from app.js */
(() => {
  'use strict';
  if (document.getElementById('garen-sound-toggle')) return;
  const sounds = ['ambient','orbit','select','home','explore','portal','beat1','beat2','nav-explore','nav-about','nav-top'];
  const urls = Object.fromEntries(sounds.map(n => [n, `assets/audio/${n}.wav?v=180`]));
  const cache = new Map();
  const volumes = {ambient:.19,orbit:.54,select:.46,home:.58,explore:.55,portal:.48,beat1:.57,beat2:.47,'nav-explore':.42,'nav-about':.42,'nav-top':.42};
  let enabled=false, ambient=null, lastRotation=0, lastSelectToken=0, gesture=null;
  let beatFrame=0, beatCycle=-1, lastBeatA=-1, lastBeatB=-1, lastAbout=false;
  let scrollTimer=0;
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const active=()=>enabled&&!document.hidden&&!reduced();
  const toggle=document.createElement('button');
  toggle.id='garen-sound-toggle'; toggle.type='button';
  toggle.textContent='SOUND OFF'; toggle.setAttribute('aria-label','Activar sonido');
  toggle.setAttribute('aria-pressed','false'); document.body.append(toggle);
  function media(name) {
    if(!cache.has(name)){
      const el=new Audio(urls[name]); el.preload='auto'; el.volume=volumes[name]??.5;
      cache.set(name,el);
    }
    return cache.get(name);
  }
  function play(name,{restart=true}={}) {
    if(!active())return;
    const el=media(name);
    if(restart&&!el.paused){el.pause();try{el.currentTime=0}catch{}}
    else if(el.paused){try{el.currentTime=0}catch{}}
    const result=el.play();
    if(result?.catch)result.catch(e=>console.warn('[GAREN AUDIO]',name,e.name));
  }
  function stop(name){const el=cache.get(name);if(el&&!el.paused){el.pause();try{el.currentTime=0}catch{}}}
  function visible(selector){
    if(!document.querySelector('#world')?.hidden)return false;
    const el=document.querySelector(selector);if(!el)return false;
    const r=el.getBoundingClientRect();return r.top<innerHeight*.8&&r.bottom>innerHeight*.2;
  }
  function syncAmbient(){
    if(active()&&visible('#home')){
      if(!ambient){ambient=media('ambient');ambient.loop=true;ambient.play().catch(()=>{});}
    }else if(ambient){ambient.pause();ambient=null;}
  }
  // Read the actual CSS animation phase. This avoids independent audio/CSS clocks.
  // Media-element playback latency is device-dependent; the lead can be tuned after recording.
  const BEAT_LEAD_MS=65;
  function beatLoop(){
    beatFrame=0;
    if(!active()||!visible('#about')){lastAbout=false;return;}
    const el=document.querySelector('#about .heartbeat-primary');
    const animation=el?.getAnimations().find(a=>a.animationName==='garen-heartbeat-primary');
    const duration=3400;
    const time=animation?.currentTime;
    if(typeof time==='number'&&Number.isFinite(time)){
      const cycle=Math.floor(time/duration),phase=((time%duration)+duration)%duration;
      if(!lastAbout){beatCycle=cycle;lastBeatA=-1;lastBeatB=-1;lastAbout=true;}
      if(cycle!==beatCycle){beatCycle=cycle;lastBeatA=-1;lastBeatB=-1;}
      const first=612-BEAT_LEAD_MS,second=1156-BEAT_LEAD_MS;
      // Do not fire stale beats if ABOUT appears halfway through a pulse.
      if(phase>=first&&phase<first+110&&lastBeatA!==cycle){lastBeatA=cycle;play('beat1');}
      if(phase>=second&&phase<second+110&&lastBeatB!==cycle){lastBeatB=cycle;play('beat2');}
    }
    beatFrame=requestAnimationFrame(beatLoop);
  }
  function sync(){syncAmbient();if(active()&&visible('#about')){if(!beatFrame)beatFrame=requestAnimationFrame(beatLoop);}else{cancelAnimationFrame(beatFrame);beatFrame=0;lastAbout=false;}}
  function selectionAfterRotation(){const token=++lastSelectToken;setTimeout(()=>{if(token===lastSelectToken&&active())play('select');},620);}
  function rotate(){if(!active())return;const now=performance.now();if(now-lastRotation<90)return;lastRotation=now;play('orbit');selectionAfterRotation();}
  toggle.addEventListener('click',()=>{
    enabled=!enabled;
    toggle.textContent=enabled?'SOUND ON':'SOUND OFF';
    toggle.setAttribute('aria-pressed',String(enabled));
    toggle.setAttribute('aria-label',enabled?'Silenciar sonido':'Activar sonido');
    if(enabled){for(const name of sounds)media(name);play('select');sync();}
    else{lastSelectToken++;for(const name of sounds)stop(name);ambient=null;cancelAnimationFrame(beatFrame);beatFrame=0;lastAbout=false;}
  });
  document.addEventListener('click',event=>{
    if(!active())return;
    const el=event.target.closest('a[href],button[data-world],button#orbit-prev,button#orbit-next');
    if(!el)return;
    if(el.matches('a.portal-active')){play('portal');return;}
    if(el.matches('#orbit-prev,#orbit-next')){rotate();return;}
    if(el.matches('button[data-world]')){
      if(el.closest('.hotspots')){play('home');return;}
      if(el.closest('.orbit-cards')){
        const centered=el.dataset.orbitPosition==='0'||!!el.closest('.is-grid');
        if(centered){lastSelectToken++;play('explore');}else rotate();
        return;
      }
    }
    if(el.matches('a[href]')){
      const href=el.getAttribute('href');
      if(href==='#explore'){play('nav-explore');return;}
      if(href==='#about'){play('nav-about');return;}
      if(href==='#home'){play('nav-top');return;}
    }
  },true);
  const cards=document.querySelector('#cards');
  cards?.addEventListener('pointerdown',e=>{gesture={x:e.clientX,y:e.clientY,id:e.pointerId};},{passive:true});
  cards?.addEventListener('pointerup',e=>{
    if(!gesture||gesture.id!==e.pointerId)return;
    const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;gesture=null;
    if(Math.abs(dx)>42&&Math.abs(dx)>Math.abs(dy)*1.2)rotate();
  },{passive:true});
  cards?.addEventListener('pointercancel',()=>gesture=null);
  window.addEventListener('scroll',()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(sync,110);},{passive:true});
  window.addEventListener('hashchange',()=>setTimeout(sync,140));
  window.addEventListener('pageshow',sync);
  window.addEventListener('pagehide',()=>{for(const n of sounds)stop(n);ambient=null;cancelAnimationFrame(beatFrame);beatFrame=0;lastAbout=false;});
  document.addEventListener('visibilitychange',sync);
  document.querySelector('#back')?.addEventListener('click',()=>setTimeout(sync,100));
  const world=document.querySelector('#world');
  if(world)new MutationObserver(()=>setTimeout(sync,100)).observe(world,{attributes:true,attributeFilter:['hidden']});
})();
