/* Stable Glass & Case frame renderer. 60 compressed frames preload, only one
   decoded frame is drawn at a time. The underlying poster never disappears. */
(() => {
  'use strict';
  const story = document.querySelector('.gg-scroll-story');
  const canvas = document.getElementById('gg-animation');
  const poster = document.getElementById('gg-poster');
  if (!story || !canvas || !poster) return;
  const context = canvas.getContext('2d', { alpha:false });
  if (!context) return; // visible poster is still the fallback
  const TOTAL = 60;
  const resources = Array(TOTAL).fill(null);
  const errors = Array(TOTAL).fill(false);
  const loaded = Array(TOTAL).fill(false);
  const progressBar = document.getElementById('gg-progress');
  const progressRail = document.querySelector('.gg-progress-rail');
  const count = document.getElementById('gg-count');
  const details = [...story.querySelectorAll('.gg-detail')];
  const loader = document.getElementById('gg-frame-loader');
  const loaderCount = document.getElementById('gg-frame-loader-count');
  let completed = 0;
  let wanted = 0;
  let shown = -1;
  let drawing = false;
  let raf = 0;
  let lastBitmap = null;
  const frameUrl = i => 'frames/' + String(i).padStart(3, '0') + '.jpg';
  const clamp = x => Math.max(0, Math.min(1, x));

  function ratio() {
    const r = story.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - window.innerHeight));
  }
  function sync(p) {
    if (progressBar) progressBar.style.width = (p * 100).toFixed(2) + '%';
    progressRail?.setAttribute('aria-valuenow', String(Math.round(p * 100)));
    if (count) count.textContent = p < .26 ? '01' : p < .52 ? '02' : p < .77 ? '03' : '04';
    const phase = p < .52 ? 0 : 1;
    details.forEach(el => {
      const on = Number(el.dataset.phase) === phase;
      el.classList.toggle('is-visible', on);
      el.setAttribute('aria-hidden', String(!on));
    });
  }
  function updatedLoader() {
    if (loaderCount) loaderCount.textContent = completed + ' / ' + TOTAL;
    if (completed >= TOTAL) {
      loader?.classList.remove('is-loading');
      loader?.classList.add('is-complete');
      loader?.setAttribute('aria-busy', 'false');
    }
  }
  function attemptRender() {
    if (drawing || wanted === shown || !loaded[wanted]) return;
    const target = wanted;
    const res = resources[target];
    if (!res) return;
    drawing = true;
    // One decoded bitmap at a time means ~8MB active frame memory instead of
    // keeping all sixty 1080p images decoded (~480MB) in a mobile browser.
    const paint = image => {
      if (target !== wanted) return;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      shown = target;
      canvas.classList.add('has-frame');
    };
    const done = () => {
      drawing = false;
      if (wanted !== shown && loaded[wanted]) requestAnimationFrame(attemptRender);
    };
    if (res instanceof Blob && typeof createImageBitmap === 'function') {
      createImageBitmap(res).then(bmp => {
        paint(bmp);
        bmp.close?.();
      }).catch(() => loadSingleImage(target).then(paint).catch(() => {})).finally(done);
    } else if (res instanceof Blob) {
      loadSingleImage(target).then(paint).catch(() => {}).finally(done);
    } else {
      // Local file previews cannot use fetch in some browsers; decoded Image
      // elements provide a working fallback without blanking the stage.
      (res.decode ? res.decode().catch(() => {}) : Promise.resolve()).then(() => {
        if (res.naturalWidth) paint(res);
      }).finally(done);
    }
  }
  function loadSingleImage(index) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = frameUrl(index);
    });
  }
  function render() {
    raf = 0;
    const p = ratio();
    sync(p);
    wanted = Math.round(p * (TOTAL - 1));
    attemptRender();
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(render); }
  window.addEventListener('scroll', schedule, { passive:true });
  window.addEventListener('resize', schedule, { passive:true });
  window.addEventListener('pageshow', schedule);
  // The visible poster needs no JS or loader in order to appear.
  if (poster.complete && poster.naturalWidth) {
    loaded[0] = true;
  }

  async function preloadHTTP() {
    let cursor = 0;
    async function worker() {
      while (cursor < TOTAL) {
        const idx = cursor++;
        try {
          const response = await fetch(frameUrl(idx), { cache:'force-cache' });
          if (!response.ok) throw new Error(String(response.status));
          resources[idx] = await response.blob();
          loaded[idx] = true;
          if (idx === wanted) attemptRender();
        } catch (_) { errors[idx] = true; }
        completed++; updatedLoader();
      }
    }
    await Promise.all(Array.from({length:6}, worker));
  }
  async function preloadLocal() {
    let cursor = 0;
    async function worker() {
      while (cursor < TOTAL) {
        const idx = cursor++;
        try {
          resources[idx] = await loadSingleImage(idx);
          loaded[idx] = true;
          if (idx === wanted) attemptRender();
        } catch (_) { errors[idx] = true; }
        completed++; updatedLoader();
      }
    }
    await Promise.all(Array.from({length:6}, worker));
  }
  if (location.protocol === 'http:' || location.protocol === 'https:') {
    preloadHTTP().then(() => {
      // If an unusual hosting setup blocks fetch but serves images,
      // retry missing frames as HTML Image assets.
      const bad = errors.map((x,i)=>x?i:-1).filter(x=>x>=0);
      bad.forEach(i=>loadSingleImage(i).then(img=>{
        resources[i]=img;loaded[i]=true;errors[i]=false;
        if(i===wanted)attemptRender();
      }).catch(()=>{}));
    });
  } else {
    preloadLocal();
  }
  render();
})();

/* Scroll-triggered cinematic reveal and viewport-based playback.
   Native scrolling stays fully responsive; only visuals are interpolated. */
(() => {
  'use strict';
  const sections = [...document.querySelectorAll('.gg-video-hero, .case-collection, .glass-impact-section, .gc-everyday, .gc-reviews')];
  if (!sections.length) return;
  document.documentElement.classList.add('gc-scroll-motion');

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const playStates = new WeakMap();
  const tryPlay = video => {
    if (!video || document.hidden) return;
    const promise = video.play();
    if (promise && typeof promise.catch === 'function') promise.catch(() => {});
  };

  for (const section of sections) {
    const video = section.querySelector('video');
    if (!video) continue;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.pause();
    video.preload = section.classList.contains('gg-video-hero') ? 'metadata' : 'none';
    playStates.set(section, false);
  }

  const videoObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const section = entry.target;
      const video = section.querySelector('video');
      if (!video) continue;
      // A section may be taller than a viewport. Intersection ratio alone
      // would make it impossible to trigger on some mobile devices.
      const active = entry.isIntersecting && entry.intersectionRect.height >= Math.min(100, innerHeight * .14);
      if (active) {
        if (!playStates.get(section)) {
          playStates.set(section, true);
          try { video.currentTime = 0; } catch (_) {}
          tryPlay(video);
        }
      } else {
        playStates.set(section, false);
        video.pause();
      }
    }
  }, { rootMargin: '-10% 0px -10% 0px', threshold: [0, .01, .1, .2, .35, .5, .75, 1] });

  for (const section of sections) videoObserver.observe(section);

  const revealObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('gc-revealed');
        revealObserver.unobserve(entry.target);
      }
    }
  }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });
  for (const section of sections) revealObserver.observe(section);

  document.addEventListener('visibilitychange', () => {
    for (const section of sections) {
      const video = section.querySelector('video');
      if (!video) continue;
      if (document.hidden) video.pause();
      else if (playStates.get(section)) tryPlay(video);
    }
  });

  // Smooth, lightweight parallax updated with animation frames and no
  // scroll locking or wheel-event interception.
  if (!reduced.matches) {
    let scheduled = false;
    const update = () => {
      scheduled = false;
      const vh = innerHeight || 1;
      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > vh) continue;
        const progress = Math.max(-1, Math.min(1, (rect.top + rect.height / 2 - vh / 2) / vh));
        section.style.setProperty('--gc-drift', `${(-progress * 11).toFixed(2)}px`);
      }
    };
    const schedule = () => {
      if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
    };
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule, { passive: true });
    schedule();
  }
})();

// Accessible native accordion: only one FAQ answer remains open at a time.
(() => {
  const items = [...document.querySelectorAll('.gc-faq-item')];
  items.forEach(item => item.addEventListener('toggle', () => {
    if (!item.open) return;
    items.forEach(other => { if (other !== item && other.open) other.open = false; });
  }));
})();

(()=>{const y=document.getElementById('gc-footer-year');if(y)y.textContent=new Date().getFullYear();})();

// Featured section reveal independent of media playback.
(()=>{const el=document.querySelector('.gc-featured');if(!el)return;if(!('IntersectionObserver' in window)){el.classList.add('gc-revealed');return;}const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){el.classList.add('gc-revealed');io.disconnect()}},{threshold:.08});io.observe(el)})();

/* Centered cyclic testimonials carousel. Slides only while visible. */
(()=>{
 const section=document.querySelector('.gc-reviews');if(!section)return;
 const track=section.querySelector('.gc-review-track');
 const cards=[...track.querySelectorAll('.gc-review-card')];
 const prev=section.querySelector('.gc-review-prev');const next=section.querySelector('.gc-review-next');
 const counter=section.querySelector('#gc-review-counter');const toggle=section.querySelector('#gc-review-toggle');
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 let active=0,visible=false,paused=false,timer=null;
 const redraw=()=>{
  cards.forEach((el,i)=>{el.classList.toggle('is-active',i===active);el.setAttribute('aria-current',i===active?'true':'false')});
  const center=cards[active].offsetLeft+cards[active].offsetWidth/2;
  track.style.transform=`translate3d(${Math.round(section.querySelector('.gc-review-shell').clientWidth/2-center)}px,0,0)`;
  counter.textContent=String(active+1).padStart(2,'0')+' / '+String(cards.length).padStart(2,'0');
 };
 const stop=()=>{if(timer){clearInterval(timer);timer=null}};
 const start=()=>{stop();if(visible&&!paused&&!reduced.matches&&!document.hidden)timer=setInterval(()=>{active=(active+1)%cards.length;redraw()},4200)};
 const jump=d=>{active=(active+d+cards.length)%cards.length;redraw();start()};
 prev.addEventListener('click',()=>jump(-1));next.addEventListener('click',()=>jump(1));
 toggle.addEventListener('click',()=>{if(reduced.matches){jump(1);return}paused=!paused;toggle.textContent=paused?'Resume autoplay':'Pause autoplay';toggle.setAttribute('aria-label',paused?'Resume automatic testimonials':'Pause automatic testimonials');start()});
 section.addEventListener('mouseenter',()=>{stop()});section.addEventListener('mouseleave',start);
 section.addEventListener('focusin',stop);section.addEventListener('focusout',e=>{if(!section.contains(e.relatedTarget))start()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else start()});
 new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible)start();else stop()},{threshold:.15}).observe(section);
 window.addEventListener('resize',()=>requestAnimationFrame(redraw),{passive:true});
 if(reduced.matches){toggle.textContent='Next review';toggle.setAttribute('aria-label','Next review');void 0}
 requestAnimationFrame(redraw);
})();
