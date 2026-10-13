/* GAREN VERSE 1.7.1 — HTML5 Audio fallback for Safari iPad. */
(() => {
  'use strict';
  if (document.querySelector('#garen-sound-toggle')) return;
  const names=['ambient','orbit','select','home','explore','portal','beat1','beat2'];
  const sources=Object.fromEntries(names.map(name=>[name,`assets/audio/${name}.wav?v=171`]));
  const pool={};
  const toggle=document.createElement('button');
  toggle.id='garen-sound-toggle'; toggle.type='button';
  toggle.textContent='SOUND OFF';toggle.setAttribute('aria-label','Activar sonido');
  toggle.setAttribute('aria-pressed','false');document.body.append(toggle);
  let enabled=false,ambient=null,beatTimer=null,lastBeat=-1,beatEpoch=0,lastSelection=0,gesture=null;
  const reduce=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const audible=()=>enabled && !document.hidden && !reduce();
  function get(name){
    if(!pool[name]){
      const el=new Audio(sources[name]);el.preload='auto';el.volume=name==='ambient'?.20:name.startsWith('beat')?.65:.58;
      pool[name]=el;
    }
    return pool[name];
  }
  function play(name){
    if(!audible())return;
    const original=get(name);
    // Short effects may overlap: use a separate HTMLMediaElement when already playing.
    const el=original.paused?original:original.cloneNode(true);
    if(el!==original)el.volume=original.volume;
    try{el.currentTime=0;}catch{}
    const promise=el.play();
    if(promise?.catch)promise.catch(err=>console.warn('[GAREN AUDIO] '+name,err.name,err.message));
  }
  function stopAmbient(){if(ambient){ambient.pause();ambient=null;}}
  function stopBeats(){if(beatTimer!==null){clearInterval(beatTimer);beatTimer=null;}lastBeat=-1;}
  function homeVisible(){const el=document.querySelector('#home'),world=document.querySelector('#world');if(!el||!world?.hidden)return false;const r=el.getBoundingClientRect();return r.top<innerHeight*.6&&r.bottom>innerHeight*.4;}
  function aboutVisible(){const el=document.querySelector('#about .heartbeat-primary'),world=document.querySelector('#world');if(!el||!world?.hidden)return false;const r=el.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0;}
  function sync(){
    if(!audible()){stopAmbient();stopBeats();return;}
    if(homeVisible()){
      if(!ambient){ambient=get('ambient');ambient.loop=true;ambient.play().catch(err=>console.warn('[GAREN AUDIO] ambient',err.name));}
    }else stopAmbient();
    if(aboutVisible()){
      if(beatTimer===null){beatEpoch=performance.now();lastBeat=-1;beatTimer=setInterval(()=>{
        if(!audible()||!aboutVisible()){stopBeats();return;}
        const time=performance.now()-beatEpoch,cycle=Math.floor(time/3400),phase=time%3400;
        if(phase>=612&&phase<760&&lastBeat!==cycle*2){lastBeat=cycle*2;play('beat1');}
        if(phase>=1156&&phase<1304&&lastBeat!==cycle*2+1){lastBeat=cycle*2+1;play('beat2');}
      },35);}
    }else stopBeats();
  }
  toggle.addEventListener('click',()=>{
    enabled=!enabled;
    toggle.textContent=enabled?'SOUND ON':'SOUND OFF';
    toggle.setAttribute('aria-pressed',String(enabled));
    toggle.setAttribute('aria-label',enabled?'Silenciar sonido':'Activar sonido');
    if(enabled){play('select');sync();}else{stopAmbient();stopBeats();}
  });
  document.addEventListener('click',event=>{
    if(!audible())return;
    const target=event.target.closest('[data-world],a.portal-active,#orbit-prev,#orbit-next');
    if(!target)return;
    if(target.matches('#orbit-prev,#orbit-next')){play('orbit');setTimeout(()=>play('select'),610);return;}
    if(target.matches('a.portal-active')){play('portal');return;}
    if(target.closest('.hotspots')){play('home');return;}
    if(target.closest('.orbit-cards')){
      const centered=target.getAttribute('data-orbit-position')==='0',grid=!!target.closest('.is-grid');
      if(centered||grid)play('explore');
      else{lastSelection=performance.now();play('orbit');setTimeout(()=>{if(performance.now()-lastSelection>=580)play('select');},620);}
    }
  },true);
  const cards=document.querySelector('#cards');
  cards?.addEventListener('pointerdown',e=>{gesture={x:e.clientX,y:e.clientY};},{passive:true});
  cards?.addEventListener('pointerup',e=>{
    if(!gesture)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;gesture=null;
    if(Math.abs(dx)>42&&Math.abs(dx)>Math.abs(dy)*1.2){play('orbit');setTimeout(()=>play('select'),610);}
  },{passive:true});
  cards?.addEventListener('pointercancel',()=>gesture=null);
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('pagehide',()=>{stopAmbient();stopBeats();});
  window.addEventListener('pageshow',sync);
  window.addEventListener('scroll',()=>{clearTimeout(window.__garenAudioScroll);window.__garenAudioScroll=setTimeout(sync,120);},{passive:true});
  window.addEventListener('hashchange',()=>setTimeout(sync,200));
  document.querySelector('#back')?.addEventListener('click',()=>setTimeout(sync,100));
  const world=document.querySelector('#world');if(world)new MutationObserver(()=>setTimeout(sync,100)).observe(world,{attributes:true,attributeFilter:['hidden']});
})();
