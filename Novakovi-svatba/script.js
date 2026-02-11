// Jednoduchý ohňostroj a heslový dialog
const PASSWORD = 'novákovi';
const overlay = document.getElementById('pw-overlay');
const pwForm = document.getElementById('pw-form');
const pwInput = document.getElementById('pw-input');

// Normalize: remove diacritics and compare case-insensitive
function normalize(s){
  return s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
}

if (overlay && pwForm && pwInput) {
  pwForm.addEventListener('submit', e=>{
    e.preventDefault();
    const val = pwInput.value.trim();
    if(normalize(val) === normalize(PASSWORD)){
      unlock();
    } else {
      // shake and clear
      pwInput.classList.remove('shake');
      void pwInput.offsetWidth;
      pwInput.classList.add('shake');
      pwInput.value = '';
    }
  });

  function unlock(){
    overlay.style.display = 'none';
    // povolit scroll (pokud bude potřeba)
    document.body.style.overflow = '';
    startFireworks();
  }

  // Pokud chcete, můžete povolit vstup Enter i bez submit tlačítka
  pwInput.addEventListener('keydown', e=>{
    if(e.key === 'Enter'){pwForm.requestSubmit();}
  });

  // focus input on show
  pwInput.focus();

  // Prevent page interaction while dialog is visible
  document.addEventListener('touchmove', function(e){ if(overlay.style.display !== 'none') e.preventDefault(); }, {passive:false});
} else {
  // Password modal disabled for now (zakomentováno)
  // Auto start fireworks for preview
  setTimeout(startFireworks, 400);
}

// --- Fireworks (jednoduchá implementace) ---
const canvas = document.getElementById('fireworks-canvas');
const ctx = canvas.getContext('2d');
// cap DPR to avoid huge canvases on high-density screens
const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
let cw, ch, fireworks = [], particles = [];
// Paleta pro ohňostroj: zelená, světle zelená, olivová, béžová
const FIREWORK_COLORS = ['#6AA96A', '#9FB89F', '#7C8B4F', '#F6F0E6'];
// Performance caps
const MAX_PARTICLES = 220;
const MAX_FIREWORKS = 10;
// Timed launch settings
let lastLaunch = 0;
const launchIntervalMin = 700, launchIntervalMax = 1600;
let launchInterval = launchIntervalMin + Math.random() * (launchIntervalMax - launchIntervalMin);
// Color cache to avoid repeated canvas operations
const colorCache = new Map();
function colorToRgbStr(color){
  if(colorCache.has(color)) return colorCache.get(color);
  const cvs = document.createElement('canvas'); cvs.width=cvs.height=1; const cctx = cvs.getContext('2d');
  cctx.fillStyle = color; cctx.fillRect(0,0,1,1);
  const d = cctx.getImageData(0,0,1,1).data; const s = `${d[0]},${d[1]},${d[2]}`;
  colorCache.set(color, s); return s;
} 

function resize(){
  const w = window.innerWidth;
  const h = window.innerHeight;
  cw = w; ch = h;
  const pw = Math.max(1, Math.floor(w * DPR));
  const ph = Math.max(1, Math.floor(h * DPR));
  if(canvas.width !== pw || canvas.height !== ph){
    canvas.width = pw; canvas.height = ph;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    // Reset transform and scale once for DPR
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
}
window.addEventListener('resize', resize);
resize();

class Firework{constructor(x,y,tx,ty){this.x=x;this.y=y;this.tx=tx;this.ty=ty;this.distance=Math.hypot(tx-x,ty-y);this.speed=2+Math.random()*3;this.angle=Math.atan2(ty-y,tx-x);this.trail=[];}}
class Particle{constructor(x,y,colour){
    this.x = x; this.y = y;
    this.vx = (Math.random()-0.5) * 3.5;
    this.vy = (Math.random()-0.9) * 3.5;
    this.alpha = 1;
    this.decay = 0.01 + Math.random()*0.02;
    this.rgb = colorToRgbStr(colour);
    this.size = 1 + Math.random()*2.4;
  }} 

function launch(){
  if(fireworks.length >= MAX_FIREWORKS) return;
  const x = Math.random()*cw;
  const tx = Math.random()*cw;
  fireworks.push(new Firework(x, ch, tx, Math.random()*ch*0.6));
} 

function explode(fw){
  // fewer particles per explosion for performance
  const count = 8 + Math.floor(Math.random()*12);
  for(let i=0;i<count;i++){
    if(particles.length >= MAX_PARTICLES) break;
    const color = FIREWORK_COLORS[Math.floor(Math.random()*FIREWORK_COLORS.length)];
    particles.push(new Particle(fw.tx, fw.ty, color));
  }
} 

function update(){
  // fireworks
  for(let i=fireworks.length-1;i>=0;i--){
    const f = fireworks[i];
    // move toward target
    f.x += Math.cos(f.angle)*f.speed;
    f.y += Math.sin(f.angle)*f.speed;
    f.trail.push({x:f.x,y:f.y});
    if(f.trail.length>10) f.trail.shift();
    if(Math.hypot(f.tx-f.x,f.ty-f.y) < 6){
      explode(f);
      fireworks.splice(i,1);
    }
  }
  // particles
  for(let i=particles.length-1;i>=0;i--){
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.03; // gravity
    p.alpha -= p.decay;
    if(p.alpha <= 0) particles.splice(i,1);
  }
}

function draw(){
  ctx.clearRect(0,0,cw,ch);
  // drawing trails
  fireworks.forEach(f=>{
    ctx.beginPath();
    // zelenkavá stopa pro lepší kontrast na světlém pozadí
    ctx.strokeStyle = 'rgba(90,130,90,0.95)';
    ctx.lineWidth = 2;
    if(f.trail.length>1){
      ctx.moveTo(f.trail[0].x,f.trail[0].y);
      for(let i=1;i<f.trail.length;i++) ctx.lineTo(f.trail[i].x,f.trail[i].y);
      ctx.stroke();
    }
  });
  // particles (optimized loops)
  for(let i=0;i<particles.length;i++){
    const p = particles[i];
    ctx.beginPath();
    ctx.fillStyle = `rgba(${p.rgb}, ${p.alpha})`;
    ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
    ctx.fill();
  }
}

// helper: convert hsl string to rgb-ish for alpha use (approx)
function hexToRgb(hsl){
  // hsl(120 80% 60%) -> compute rgb quickly (not precise) -> use canvas temporary
  const cvs = document.createElement('canvas');
  cvs.width=cvs.height=1;const cctx=cvs.getContext('2d');
  cctx.fillStyle = hsl; cctx.fillRect(0,0,1,1);
  const d = cctx.getImageData(0,0,1,1).data; return `${d[0]},${d[1]},${d[2]}`;
}

let rafId;
function loop(now){
  update(); draw();
  // timed launches (less jitter and more predictable CPU usage)
  const t = performance.now();
  if(t - lastLaunch > launchInterval){
    launch();
    lastLaunch = t;
    launchInterval = launchIntervalMin + Math.random() * (launchIntervalMax - launchIntervalMin);
  }
  rafId = requestAnimationFrame(loop);
} 

function startFireworks(){
  if(rafId) return; loop();
  // drobné dekorace: plovoucí srdíčka
  spawnHearts();
}

// Plovoucí srdíčka (jednoduché CSS-based)
function spawnHearts(){
  const card = document.querySelector('.card');
  for(let i=0;i<2;i++){
    const el = document.createElement('div');
    el.className = 'heart';
    el.style.position='absolute';
    el.style.left = `${20 + Math.random()*60}%`;
    el.style.top = `${80 + Math.random()*10}%`;
    el.style.width = `${10 + Math.random()*12}px`;
    el.style.height = el.style.width;
    el.style.pointerEvents='none';
    el.style.opacity = 0.9;
    el.style.background = 'transparent';
    el.style.zIndex=50;
    el.innerHTML = '<svg viewBox="0 0 32 29" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><path d="M23.6 0c-2.8 0-5 1.9-6 3C16.4 1.9 14.2 0 11.4 0 5.1 0 0 4.9 0 11c0 7.7 12.6 15.1 16 18 3.4-2.9 16-10.3 16-18 0-6.1-5.1-11-8.4-11z" fill="#ffd1dc"/></svg>';
    document.body.appendChild(el);
    // animate
    const dur = 6000 + Math.random()*4000;
    el.animate([
      {transform:`translateY(0) scale(0.9)`, opacity:1},
      {transform:`translateY(-120vh) scale(1.2)`, opacity:0}
    ], {duration: dur, easing:'ease-out'}).onfinish = ()=>el.remove();
  }
  // spawn again later (less often)
  setTimeout(spawnHearts, 8000 + Math.random()*4000);
} 

// --- Click-triggered larger hearts (zelené + růžové) ---
function spawnClickHearts(x, y){
  const colors = [getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#6AA96A', '#ffd1dc'];
  const count = 3 + Math.floor(Math.random()*2);
  for(let i=0;i<count;i++){
    const el = document.createElement('div');
    el.className = 'click-heart';
    const size = 28 + Math.random()*56;
    el.style.width = el.style.height = size + 'px';
    // slight random offset so hearts spread
    el.style.left = (x + (Math.random()-0.5)*60) + 'px';
    el.style.top = (y + (Math.random()-0.5)*20) + 'px';
    const color = colors[Math.random() < 0.5 ? 0 : 1];
    el.innerHTML = `<svg viewBox="0 0 32 29" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><path d="M23.6 0c-2.8 0-5 1.9-6 3C16.4 1.9 14.2 0 11.4 0 5.1 0 0 4.9 0 11c0 7.7 12.6 15.1 16 18 3.4-2.9 16-10.3 16-18 0-6.1-5.1-11-8.4-11z" fill="${color}"/></svg>`;
    document.body.appendChild(el);
    // add subtle horizontal drift and rotation
    const driftX = (Math.random()-0.5)*120;
    const dur = 800 + Math.random()*600;
    el.animate([
      {transform:`translate(-50%,-50%) translateX(0px) translateY(0px) scale(0.9) rotate(${(Math.random()-0.5)*20}deg)`, opacity:1},
      {transform:`translate(-50%,-50%) translateX(${driftX}px) translateY(-140px) scale(1.15) rotate(${(Math.random()-0.5)*40}deg)`, opacity:0}
    ], {duration:dur, easing:'cubic-bezier(.2,.9,.3,1)'}).onfinish = ()=>el.remove();
  }
}

// Attach to invite image (click + touch) and track clicks
const inviteEl = document.getElementById('invite');

// Instead of hiding the original invite, we insert a second (attached) image after 5 seconds.
// This keeps the original visible immediately and only shows the added image later.
// Insert a draggable image after delay with nice drag effects
function insertDraggableImage(filename, idName = 'pozvanka-oslava'){
  const card = document.querySelector('.card') || document.body;
  if(!card) return;
  card.style.position = card.style.position || 'relative';
  const img = document.createElement('img');
  img.className = 'delayed-insert draggable';
  img.alt = 'Pozvánka oslavy';
  img.id = idName;
  img.src = filename;
  img.style.pointerEvents = 'auto';
  // initial center using percent; will convert to px on load
  img.style.left = '50%'; img.style.top = '50%'; img.style.transform = 'translate(-50%,-50%)';
  card.appendChild(img);

  img.addEventListener('load', ()=>{
    // ensure visible then enable dragging
    requestAnimationFrame(()=> requestAnimationFrame(()=> img.classList.add('visible')));
    makeDraggable(img);
  });
  img.addEventListener('error', ()=>{
    img.remove();
    console.warn('Delayed image not found:', filename);
  });
}

function makeDraggable(el){
  const parent = el.parentElement || document.body;
  const parentRect = parent.getBoundingClientRect();
  // convert centered percent position into px coordinates
  el.style.transform = 'none';
  const w = el.offsetWidth, h = el.offsetHeight;
  const startLeft = Math.max(0, Math.round((parentRect.width - w) / 2));
  const startTop = Math.max(0, Math.round((parentRect.height - h) / 2));
  el.style.left = startLeft + 'px';
  el.style.top = startTop + 'px';
  el.style.position = 'absolute';
  el.style.willChange = 'left, top, transform';

  let dragging = false;
  let sx=0, sy=0, ox=0, oy=0;

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  function onPointerDown(e){
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    dragging = true;
    el.classList.add('dragging');
    sx = e.clientX; sy = e.clientY;
    ox = parseFloat(el.style.left || 0); oy = parseFloat(el.style.top || 0);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp, {once:true});
  }

  function onPointerMove(e){
    if(!dragging) return;
    const dx = e.clientX - sx; const dy = e.clientY - sy;
    const nx = clamp(ox + dx, 0, parent.clientWidth - el.offsetWidth);
    const ny = clamp(oy + dy, 0, parent.clientHeight - el.offsetHeight);
    el.style.left = nx + 'px'; el.style.top = ny + 'px';
    // subtle rotation based on horizontal displacement
    const centerX = (parent.clientWidth - el.offsetWidth)/2;
    const rot = ((nx - centerX) / parent.clientWidth) * 18; 
    el.style.transform = `rotate(${rot}deg)`;
  }

  function onPointerUp(e){
    dragging = false;
    el.classList.remove('dragging');
    // smooth settle back to no rotation
    el.style.transform = 'rotate(0deg)';
    document.removeEventListener('pointermove', onPointerMove);
    try{ el.releasePointerCapture(e.pointerId); }catch(_){ }
  }

  el.addEventListener('pointerdown', onPointerDown, {passive:false});
}

// Insert the specific pozvanka after 5 seconds
setTimeout(()=>{
  const candidate = 'assets/pozvanka-oslava.png';
  insertDraggableImage(candidate, 'pozvanka-oslava');
}, 5000);
const countNumEl = document.getElementById('click-count-number');
let clickCount = parseInt(localStorage.getItem('inviteClickCount') || '0', 10) || 0;
if(countNumEl) countNumEl.textContent = clickCount;

if(inviteEl){
  function handleInviteClick(clientX, clientY){
    // update counter
    clickCount += 1;
    try{ localStorage.setItem('inviteClickCount', String(clickCount)); }catch(e){}
    if(countNumEl){
      countNumEl.textContent = clickCount;
      countNumEl.classList.remove('count-pop');
      void countNumEl.offsetWidth;
      countNumEl.classList.add('count-pop');
    }
    spawnClickHearts(clientX, clientY);
  }

  inviteEl.addEventListener('click', (ev)=>{
    const x = ev.clientX || (ev.touches && ev.touches[0] && ev.touches[0].clientX) || window.innerWidth/2;
    const y = ev.clientY || (ev.touches && ev.touches[0] && ev.touches[0].clientY) || window.innerHeight/2;
    handleInviteClick(x,y);
  });
  inviteEl.addEventListener('touchstart', (ev)=>{
    const t = ev.touches[0]; handleInviteClick(t.clientX, t.clientY);
  }, {passive:true});
}

// (modal disabled)