if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const IS_EN = document.documentElement.lang === 'en';
const isEnPath = (pathname) => /^\/en(\/|$)/.test(pathname);

/* ============================================================
   PAGE-SCOPED INIT
   Everything that binds to the current page's DOM lives here and is
   re-run after each SPA swap. An AbortController tears down all
   window/document listeners from the previous page so nothing leaks.
   ============================================================ */
let pageCtl = null;

function initPage() {
  if (pageCtl) pageCtl.abort();
  pageCtl = new AbortController();
  const signal = pageCtl.signal;

  initYear();
  initExtTyping(signal);
  initReveal(signal);
  initForm();
  initHolo(signal);
  initGrade();
  initScrollytelling(signal);
  initScrollspy(signal);
  initServiceTimeline(signal);
}

// Etalonaje de llegada: las páginas de servicio tiñen la luz del plasma con
// su acento; el resto vuelve a la respiración nativa (el scrollspy ajusta
// después escena por escena).
function initGrade() {
  const accent = document.body.classList.contains('svc-page')
    ? getComputedStyle(document.body).getPropertyValue('--svc-accent').trim() || null
    : null;
  // en la primera carga aurora.js (module) aún no definió el hook:
  // se deja el valor pendiente y aurora lo aplica al arrancar
  if (typeof window.plasmaGrade === 'function') window.plasmaGrade(accent);
  else window.__gradeWanted = accent;
}

function initYear() {
  const yearEl = document.getElementById('y');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

// Dynamic file-extension typing animation in the hero
function initExtTyping(signal) {
  const extEl = document.getElementById('ext-hero');
  if (!extEl) return;

  const exts = ['ts', 'tsx', 'sql', 'py', 'aws', 'cpp'];
  const colors = ['var(--green)', 'var(--red)', 'var(--cyan)', 'var(--yellow)', 'var(--orange)', 'var(--purple)'];
  let idx = 0;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function typeReplace(next, color) {
    extEl.style.color = color;
    extEl.textContent = '';
    for (let i = 1; i <= next.length; i++) {
      if (signal.aborted) return;
      extEl.textContent = next.slice(0, i);
      await sleep(100);
    }
  }
  async function eraseCurrent() {
    const current = extEl.textContent;
    for (let i = current.length; i > 0; i--) {
      if (signal.aborted) return;
      extEl.textContent = current.slice(0, i - 1);
      await sleep(60);
    }
  }
  async function loop() {
    while (!signal.aborted) {
      await sleep(2500);
      if (signal.aborted) return;
      await eraseCurrent();
      idx = (idx + 1) % exts.length;
      await typeReplace(exts[idx], colors[idx]);
    }
  }

  extEl.textContent = exts[0];
  extEl.style.color = colors[0];
  loop();
}

// Scroll-reveal animation — IntersectionObserver, one-shot per element.
// Siblings that cross the threshold in the same frame (e.g. a row of bento
// cards) get an automatic incremental stagger; elements that already carry
// an explicit .reveal-d1..d4 class keep their hand-picked delay instead.
function initReveal(signal) {
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;

  if (prefersReduced() || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('active'));
    return;
  }

  const hasExplicitDelay = (el) =>
    el.classList.contains('reveal-d1') || el.classList.contains('reveal-d2') ||
    el.classList.contains('reveal-d3') || el.classList.contains('reveal-d4');

  const io = new IntersectionObserver((entries) => {
    const batchIdx = new Map(); // parent -> siblings seen so far in this batch
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      if (!hasExplicitDelay(el)) {
        const idx = batchIdx.get(el.parentElement) || 0;
        batchIdx.set(el.parentElement, idx + 1);
        if (idx > 0) el.style.transitionDelay = `${Math.min(idx, 5) * 70}ms`;
      }
      el.classList.add('active');
      // numbered sections give the plasma a slow breath as they arrive
      if (el.classList.contains('svc-sec') && typeof window.plasmaBreathe === 'function') {
        window.plasmaBreathe();
      }
      io.unobserve(el);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -80px 0px' });

  reveals.forEach((el) => io.observe(el));
  signal.addEventListener('abort', () => io.disconnect());
}

// Service page — vertical timeline fill scrubs with scroll progress,
// mirroring the portfolio rail's scroll-linked scaleX math.
function initServiceTimeline(signal) {
  const flow = document.querySelector('.svc-flow');
  const fill = document.querySelector('.svc-flow-fill');
  if (!flow || !fill) return;

  if (prefersReduced()) { fill.style.transform = 'scaleY(1)'; return; }

  const update = () => {
    const rect = flow.getBoundingClientRect();
    const readingLine = window.innerHeight * 0.62;
    const progress = Math.min(1, Math.max(0, (readingLine - rect.top) / rect.height));
    fill.style.transform = `scaleY(${progress})`;
  };

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => { update(); ticking = false; });
    }
  }, { passive: true, signal });
  window.addEventListener('resize', update, { signal });
  update();
}

// Contact form — AJAX submit with success state
function initForm() {
  const form = document.getElementById('cta-form');
  if (!form) return;
  const btn = document.getElementById('cta-submit');
  const success = document.getElementById('cta-success');
  const errorEl = document.getElementById('cta-error');

  const fail = () => {
    btn.disabled = false;
    btn.style.opacity = '';
    if (errorEl) errorEl.hidden = false;
  };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btn.disabled = true;
    btn.style.opacity = '0.6';
    if (errorEl) errorEl.hidden = true;
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        form.hidden = true;
        success.hidden = false;
      } else fail();
    } catch {
      fail();
    }
  });
}

// Holographic profile card tilt
function initHolo(signal) {
  const holoCard = document.getElementById('holo-card');
  if (!holoCard) return;
  const holoWrapper = holoCard.querySelector('.holo-wrapper');

  const clamp = (val, min = 0, max = 100) => Math.min(Math.max(val, min), max);
  const adjust = (val, fromM, fromMax, toM, toMax) => toM + ((toMax - toM) * (val - fromM)) / (fromMax - fromM);

  const updateCardTransform = (x, y, width, height) => {
    const percentX = clamp((100 / width) * x);
    const percentY = clamp((100 / height) * y);
    const centerX = percentX - 50;
    const centerY = percentY - 50;
    const rotateX = -(centerX / 5);
    const rotateY = centerY / 4;
    const bgX = adjust(percentX, 0, 100, 35, 65);
    const bgY = adjust(percentY, 0, 100, 35, 65);
    const distCenter = clamp(Math.hypot(percentY - 50, percentX - 50) / 50, 0, 1);

    holoWrapper.style.setProperty('--pointer-x', `${percentX}%`);
    holoWrapper.style.setProperty('--pointer-y', `${percentY}%`);
    holoWrapper.style.setProperty('--background-x', `${bgX}%`);
    holoWrapper.style.setProperty('--background-y', `${bgY}%`);
    holoWrapper.style.setProperty('--pointer-from-center', distCenter);
    holoWrapper.style.setProperty('--pointer-from-top', percentY / 100);
    holoWrapper.style.setProperty('--pointer-from-left', percentX / 100);
    holoWrapper.style.setProperty('--rotate-x', `${rotateX}deg`);
    holoWrapper.style.setProperty('--rotate-y', `${rotateY}deg`);
    holoWrapper.style.setProperty('--card-opacity', 1);
  };

  holoCard.addEventListener('mousemove', (e) => {
    const rect = holoWrapper.getBoundingClientRect();
    updateCardTransform(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
  }, { signal });

  holoCard.addEventListener('mouseleave', () => {
    holoWrapper.style.setProperty('--pointer-x', `50%`);
    holoWrapper.style.setProperty('--pointer-y', `50%`);
    holoWrapper.style.setProperty('--background-x', `50%`);
    holoWrapper.style.setProperty('--background-y', `50%`);
    holoWrapper.style.setProperty('--pointer-from-center', 0);
    holoWrapper.style.setProperty('--pointer-from-top', 0.5);
    holoWrapper.style.setProperty('--pointer-from-left', 0.5);
    holoWrapper.style.setProperty('--rotate-x', `0deg`);
    holoWrapper.style.setProperty('--rotate-y', `0deg`);
    holoWrapper.style.setProperty('--card-opacity', 0);
  }, { signal });

  if (typeof DeviceOrientationEvent !== 'undefined') {
    let betaOrigin = null;
    let gyroActive = false;
    let gyroListening = false;

    function applyGyroTilt(e) {
      if (!gyroActive) return;
      const beta = e.beta ?? 0;
      const gamma = e.gamma ?? 0;
      if (betaOrigin === null) betaOrigin = beta;
      const rect = holoWrapper.getBoundingClientRect();
      const s = 2;
      const simulatedX = rect.width / 2 + gamma * s * 2;
      const simulatedY = rect.height / 2 + (beta - 40) * s * 2;
      updateCardTransform(simulatedX, simulatedY, rect.width, rect.height);
    }
    function attachGyro() {
      if (gyroListening) return;
      gyroListening = true;
      window.addEventListener('deviceorientation', applyGyroTilt, { signal });
    }

    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      const iosBtn = document.createElement('button');
      iosBtn.textContent = '⟳ 3D';
      iosBtn.setAttribute('aria-label', IS_EN ? 'Enable 3D gyroscope effect' : 'Activar efecto 3D con giroscopio');
      Object.assign(iosBtn.style, {
        position: 'absolute', bottom: '10px', right: '10px', zIndex: '10',
        background: 'rgba(189,147,249,0.15)', border: '1px solid rgba(189,147,249,0.5)',
        color: '#bd93f9', borderRadius: '20px', padding: '4px 10px',
        fontSize: '11px', cursor: 'pointer', backdropFilter: 'blur(4px)',
        fontFamily: 'Fira Code, monospace', letterSpacing: '0.05em',
      });
      holoCard.style.position = 'relative';
      holoCard.appendChild(iosBtn);
      iosBtn.addEventListener('click', () => {
        DeviceOrientationEvent.requestPermission()
          .then((state) => {
            if (state === 'granted') { attachGyro(); iosBtn.remove(); }
            else {
              iosBtn.textContent = IS_EN ? '✗ denied' : '✗ denegado';
              iosBtn.title = IS_EN ? 'Settings → Safari → Motion & Orientation' : 'Ajustes → Safari → Movimiento y orientación';
            }
          })
          .catch(() => {
            iosBtn.textContent = IS_EN ? '✗ denied' : '✗ denegado';
            iosBtn.title = IS_EN ? 'Settings → Safari → Motion & Orientation' : 'Ajustes → Safari → Movimiento y orientación';
          });
      }, { signal });
    } else {
      attachGyro();
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        gyroActive = entry.isIntersecting;
        if (entry.isIntersecting) betaOrigin = null;
      });
    }, { threshold: 0.3 });
    io.observe(holoCard);
    signal.addEventListener('abort', () => io.disconnect());
  }
}

// Portfolio — spotlight scrollytelling
function initScrollytelling(signal) {
  const root = document.getElementById('sp-scroller');
  if (!root) return;

  const PROJECTS_ES = [
    { title: 'Casa Hospedaje Burgos', tag: 'Turismo', accent: '#ffb86c', glow: 'rgba(255, 184, 108, 0.4)',
      desc: 'Sitio bilingüe con sistema de reservas, galería de habitaciones y guía de lugares turísticos de Chachapoyas.',
      url: 'https://burgosweb.treborrr.workers.dev/' },
    { title: 'ABAWA', tag: 'Experiencia Sensorial', accent: '#bd93f9', glow: 'rgba(189, 147, 249, 0.4)',
      desc: 'El QR del empaque abre una cata sensorial guiada (modo principiante o catador) que arma en vivo la rueda de sabor del consumidor.',
      url: 'https://abawa.up.railway.app/cata' },
    { title: 'BMS', tag: 'Retail & POS', accent: '#8be9fd', glow: 'rgba(139, 233, 253, 0.35)',
      desc: 'Punto de venta integral con autoservicio, facturación electrónica SUNAT y panel de auditoría en tiempo real.' },
    { title: 'SCCE', tag: 'Agroindustrial', accent: '#50fa7b', glow: 'rgba(80, 250, 123, 0.35)',
      desc: 'Trazabilidad digital de lotes de cacao especial: fermentación, secado y exportación sin una sola hoja de papel.' },
  ];

  const PROJECTS_EN = [
    { title: 'Casa Hospedaje Burgos', tag: 'Tourism', accent: '#ffb86c', glow: 'rgba(255, 184, 108, 0.4)',
      desc: 'Bilingual site with a booking system, a room gallery, and a guide to tourist spots around Chachapoyas.',
      url: 'https://burgosweb.treborrr.workers.dev/' },
    { title: 'ABAWA', tag: 'Sensory Experience', accent: '#bd93f9', glow: 'rgba(189, 147, 249, 0.4)',
      desc: 'The QR on the packaging opens a guided sensory tasting (novice or expert mode) that builds the consumer’s live flavor wheel.',
      url: 'https://abawa.up.railway.app/cata' },
    { title: 'BMS', tag: 'Retail & POS', accent: '#8be9fd', glow: 'rgba(139, 233, 253, 0.35)',
      desc: 'Full point-of-sale system with self-service, SUNAT e-invoicing (Peru’s tax authority), and a real-time audit panel.' },
    { title: 'SCCE', tag: 'Agribusiness', accent: '#50fa7b', glow: 'rgba(80, 250, 123, 0.35)',
      desc: 'Digital traceability for specialty cacao batches: fermentation, drying, and export without a single sheet of paper.' },
  ];

  const PROJECTS = IS_EN ? PROJECTS_EN : PROJECTS_ES;

  const N = PROJECTS.length;
  const textBox = document.getElementById('sp-text');
  const idxEl = document.getElementById('sp-index');
  const tagEl = document.getElementById('sp-tag');
  const titleEl = document.getElementById('sp-title');
  const descEl = document.getElementById('sp-desc');
  const shots = [...root.querySelectorAll('.sp-shot')];
  const railItems = [...root.querySelectorAll('.sp-rail-item')];
  const fills = [...root.querySelectorAll('.sp-rail-fill')];
  const linkEl = document.getElementById('sp-link');
  let cur = 0;
  let swapTimer = null;

  const renderText = (i) => {
    const p = PROJECTS[i];
    idxEl.textContent = String(i + 1).padStart(2, '0');
    tagEl.textContent = p.tag;
    titleEl.textContent = p.title;
    descEl.textContent = p.desc;
    if (linkEl) {
      if (p.url) { linkEl.href = p.url; linkEl.hidden = false; }
      else linkEl.hidden = true;
    }
  };

  const setProject = (i) => {
    if (i === cur) return;
    cur = i;
    const p = PROJECTS[i];
    root.style.setProperty('--pj-accent', p.accent);
    root.style.setProperty('--pj-glow', p.glow);
    shots.forEach((s, j) => s.classList.toggle('active', j === i));
    railItems.forEach((r, j) => {
      r.classList.toggle('active', j === i);
      r.setAttribute('aria-selected', j === i ? 'true' : 'false');
    });
    clearTimeout(swapTimer);
    textBox.classList.add('is-swapping');
    swapTimer = setTimeout(() => {
      renderText(i);
      textBox.classList.remove('is-swapping');
    }, 210); // corta a mitad del fade de 220ms del .sp-text
  };

  const travel = () => root.offsetHeight - window.innerHeight;
  const shotsWrap = root.querySelector('.sp-shots');
  const reduce = prefersReduced();
  let lastPlasma = null;
  const onScroll = () => {
    const top = root.getBoundingClientRect().top;
    const prog = Math.min(1, Math.max(0, -top / travel()));
    const seg = Math.min(prog * N, N - 0.0001);
    setProject(Math.floor(seg));
    // etalonaje del set: la luz acompaña al proyecto, pero SOLO mientras el
    // scroller está de verdad en escena (fuera de rango manda el scrollspy)
    if (typeof window.plasmaGrade === 'function') {
      if (prog > 0.02 && prog < 0.98) {
        const acc = PROJECTS[Math.floor(seg)].accent;
        if (acc !== lastPlasma) { lastPlasma = acc; window.plasmaGrade(acc); }
      } else {
        lastPlasma = null;
      }
    }
    fills.forEach((f, j) => {
      f.style.transform = `scaleX(${Math.min(1, Math.max(0, seg - j))})`;
    });
    // dolly-in con scrub: push-in de hasta +3% que sigue la rueda; la curva
    // seno garantiza que cada corte arranca y termina en scale(1) exacto
    if (!reduce && shotsWrap) {
      const segProg = seg - Math.floor(seg);
      shotsWrap.style.transform = `scale(${(1 + 0.03 * Math.sin(Math.PI * segProg)).toFixed(4)})`;
    }
  };

  railItems.forEach((btn) => {
    btn.addEventListener('click', () => {
      const j = +btn.dataset.index;
      const rootTop = root.getBoundingClientRect().top + window.scrollY;
      scrollToY(rootTop + ((j + 0.05) / N) * travel());
    }, { signal });
  });

  window.addEventListener('scroll', onScroll, { passive: true, signal });
  window.addEventListener('resize', onScroll, { signal });
  onScroll();

  const screen = root.querySelector('.sp-screen');
  const visual = root.querySelector('.sp-visual');
  if (screen && visual) {
    const MAX_TILT = 12;
    let targetX = 0, targetY = 0, currentX = 0, currentY = 0, active = false, raf = null;

    const tick = () => {
      currentX += (targetX - currentX) * 0.1;
      currentY += (targetY - currentY) * 0.1;
      screen.style.transform = `perspective(1200px) rotateX(${currentX}deg) rotateY(${currentY}deg)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', (e) => {
      const rect = visual.getBoundingClientRect();
      const inside = e.clientX >= rect.left && e.clientX <= rect.right &&
                     e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (inside) {
        if (!active) { active = true; if (!raf) raf = requestAnimationFrame(tick); }
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        targetY = (px - 0.5) * 2 * MAX_TILT;
        targetX = -(py - 0.5) * 2 * MAX_TILT;
      } else if (active) {
        active = false;
        targetX = 0;
        targetY = 0;
        setTimeout(() => { cancelAnimationFrame(raf); raf = null; screen.style.transform = ''; }, 700);
      }
    }, { passive: true, signal });

    signal.addEventListener('abort', () => { if (raf) cancelAnimationFrame(raf); });
  }
}

// Immersive scroll — progress bar + nav scrollspy
function initScrollspy(signal) {
  const bar = document.getElementById('scroll-progress');
  const navLinks = document.querySelectorAll('nav a[href^="#"]');
  const sections = [...navLinks].map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  let lastGraded;

  const update = () => {
    if (bar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    }
    let current = null;
    sections.forEach((s) => {
      if (s.getBoundingClientRect().top <= window.innerHeight * 0.4) current = s.id;
    });
    navLinks.forEach((a) =>
      a.classList.toggle('nav-active', a.getAttribute('href') === `#${current}`));

    // etalonaje por escena: secciones con data-grade tiñen la luz del set;
    // dentro de #proyectos manda setProject; sin sección (hero) → luz nativa
    if (sections.length && current !== lastGraded) {
      lastGraded = current;
      if (current !== 'proyectos' && current !== 'projects' && typeof window.plasmaGrade === 'function') {
        window.plasmaGrade(current ? (document.getElementById(current)?.dataset.grade || null) : null);
      }
    }
  };

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => { update(); ticking = false; });
    }
  }, { passive: true, signal });
  update();
}

/* ============================================================
   ONE-TIME GLOBAL: steadicam + plasma flash + SPA router
   ============================================================ */

/* Steadicam — inercia de rueda + travelling programático.
   Scrollea con window.scrollTo real cada frame, así window.scrollY sigue
   siendo la verdad: el scrub del portafolio, el scrollspy y el timeline de
   servicios se alimentan de los eventos scroll nativos sin tocarlos.
   Solo puntero fino (touch/iOS quedan 100% nativos) y sin reduced-motion.
   Killswitch: SMOOTH_WHEEL = false deja el sitio exactamente como antes. */
const SMOOTH_WHEEL = true;
window.__scroll = (() => {
  if (!SMOOTH_WHEEL) return null;
  const CFG = { lerpWheel: 0.14, mult: 1.0 };
  const fineQ = window.matchMedia('(pointer: fine)');
  const reduceQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  const st = {
    target: 0, current: 0, lastWrite: -1, vel: 0,
    raf: 0, lastT: 0, tween: null, max: 0, lerp: CFG.lerpWheel,
  };
  let engaged = false;

  const measure = () => {
    st.max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  };
  const clampY = (y) => Math.min(st.max, Math.max(0, y));
  const easeInOutExpo = (t) =>
    t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;

  const stop = () => {
    if (st.raf) cancelAnimationFrame(st.raf);
    st.raf = 0; st.lastT = 0; st.vel = 0;
  };

  const frame = (now) => {
    st.raf = 0;
    const dt = st.lastT ? Math.min(64, now - st.lastT) : 16.7;
    st.lastT = now;

    // adopt-on-mismatch: alguien más scrolleó (teclado, barra, find-in-page,
    // focus, router) → el motor adopta esa posición y cede el control
    if (st.lastWrite >= 0 && Math.abs(window.scrollY - st.lastWrite) > 1) {
      st.current = st.target = clampY(window.scrollY);
      st.tween = null;
      stop();
      return;
    }

    let next;
    if (st.tween) {
      const tw = st.tween;
      const t = Math.min(1, (now - tw.t0) / tw.dur);
      next = tw.from + (tw.to - tw.from) * easeInOutExpo(t);
      if (t >= 1) { st.tween = null; st.target = tw.to; next = tw.to; }
    } else {
      // lerp independiente de framerate (crítico en pantallas 120Hz)
      const alpha = 1 - Math.pow(1 - st.lerp, dt / 16.7);
      next = st.current + (st.target - st.current) * alpha;
      if (Math.abs(st.target - next) < 0.5) next = st.target;
    }

    st.vel = (next - st.current) / Math.max(1, dt);
    st.current = next;
    window.scrollTo({ top: next, behavior: 'instant' });
    st.lastWrite = window.scrollY;

    if (st.tween || st.current !== st.target) {
      st.raf = requestAnimationFrame(frame);
    } else {
      stop();
    }
  };
  const start = () => { if (!st.raf) { st.lastT = 0; st.raf = requestAnimationFrame(frame); } };

  const onWheel = (e) => {
    if (e.ctrlKey || e.metaKey || e.defaultPrevented) return;        // pinch-zoom
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;             // scroll horizontal
    if (e.target instanceof Element && e.target.closest('textarea')) return; // scroll propio

    // Trackpad: se deja 100% nativo. macOS ya trae su propia inercia y
    // rebote elástico — pelear frame a frame contra su fase de momentum
    // (que en Safari llega en eventos no cancelables: nuestro preventDefault
    // no hace nada y el navegador sigue moviendo el scroll por su cuenta a
    // la vez que nuestro motor también lo mueve) es justo lo que dejaba el
    // trackpad trabado tras bajar y subir varias veces. El suavizado propio
    // solo aporta con la rueda de muescas clásica, que nativamente scrollea
    // a saltos.
    if (e.deltaMode === 0 && (Math.abs(e.deltaY) < 40 || !Number.isInteger(e.deltaY))) return;

    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 16;
    else if (e.deltaMode === 2) dy *= window.innerHeight;

    measure();
    if (Math.abs(window.scrollY - st.lastWrite) > 1) st.current = st.target = clampY(window.scrollY);

    e.preventDefault();
    st.tween = null; // el usuario siempre gana sobre un travelling en curso
    st.target = clampY(st.target + dy * CFG.mult);
    start();
  };

  const engage = () => {
    if (engaged) return;
    engaged = true;
    document.documentElement.classList.add('has-steadicam');
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', measure);
    measure();
    st.current = st.target = window.scrollY;
    st.lastWrite = -1;
  };
  const disengage = () => {
    if (!engaged) return;
    engaged = false;
    document.documentElement.classList.remove('has-steadicam');
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('resize', measure);
    st.tween = null;
    stop();
  };
  const evalGate = () => { (fineQ.matches && !reduceQ.matches) ? engage() : disengage(); };
  fineQ.addEventListener?.('change', evalGate);
  reduceQ.addEventListener?.('change', evalGate);
  evalGate();

  return {
    get vel() { return st.vel; },
    get engaged() { return engaged; },
    // travelling dirigido: duración escalada por distancia, llegada en seda
    to(y) {
      measure();
      const to = clampY(y);
      if (!engaged) { window.scrollTo({ top: to, behavior: 'smooth' }); return; }
      if (Math.abs(window.scrollY - st.lastWrite) > 1) st.current = window.scrollY;
      st.target = to;
      const dist = Math.abs(to - st.current);
      st.tween = { from: st.current, to, t0: performance.now(), dur: Math.min(1200, Math.max(550, dist / 2.2)) };
      st.lastWrite = window.scrollY;
      start();
    },
    // corte seco: resets del router, popstate
    jump(y) {
      st.tween = null;
      stop();
      window.scrollTo({ top: y, behavior: 'instant' });
      st.lastWrite = window.scrollY;
      st.current = st.target = st.lastWrite;
    },
  };
})();

const scrollToY = (y) =>
  window.__scroll ? window.__scroll.to(y) : window.scrollTo({ top: y, behavior: 'smooth' });
const jumpToY = (y) =>
  window.__scroll ? window.__scroll.jump(y) : window.scrollTo({ top: y, behavior: 'instant' });
// posición de layout del elemento — ignora transforms (un .reveal aún no
// activado está corrido 24px por su translateY y ensuciaría el aterrizaje)
const layoutTop = (el) => {
  let y = 0;
  for (; el; el = el.offsetParent) y += el.offsetTop;
  return y;
};

// Plasma flare on any button/link click (except in-page nav and portfolio rail)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('a, button');
  if (btn && !btn.closest('nav') && !btn.closest('.sp-rail')) {
    if (typeof window.plasmaButtonFlash === 'function') window.plasmaButtonFlash();
  }

  const a = e.target.closest('a');
  if (!a) return;
  const href = a.getAttribute('href');
  if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) return;
  if (a.target === '_blank') return;

  const url = new URL(href, location.href);
  if (url.origin !== location.origin) return;          // external → let default
  if (url.pathname === renderedPath) {
    // ancla in-page: con el steadicam activo el travelling es nuestro,
    // con la misma curva que el rail (en touch/reduced sigue el nativo)
    const target = url.hash && document.querySelector(url.hash);
    if (target && window.__scroll?.engaged) {
      e.preventDefault();
      history.pushState({}, '', url.pathname + url.hash);
      window.__scroll.to(layoutTop(target));
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
    return;
  }
  if (!url.pathname.endsWith('.html')) return;          // not a page we own
  if (isEnPath(url.pathname) !== isEnPath(location.pathname)) return; // crossing languages → full reload

  e.preventDefault();
  navigate(url.pathname + url.hash, true);
});

let navigating = false;

// Prefetch on hover/touch: by the time the user clicks, the page is cached
const prefetched = new Map();
function prefetch(pathname) {
  if (prefetched.has(pathname) || pathname === location.pathname) return;
  prefetched.set(pathname, fetch(pathname).then((r) => (r.ok ? r.text() : Promise.reject(r.status)))
    .catch(() => { prefetched.delete(pathname); }));
}
const onPreIntent = (e) => {
  const a = e.target.closest('a[href$=".html"]');
  if (!a || a.target === '_blank') return;
  const url = new URL(a.getAttribute('href'), location.href);
  if (url.origin === location.origin) prefetch(url.pathname);
};
document.addEventListener('mouseover', onPreIntent, { passive: true });
document.addEventListener('touchstart', onPreIntent, { passive: true });

// Página realmente renderizada en el DOM. En popstate location.pathname ya
// cambió antes de que podamos swapear — comparar contra location dejaría el
// DOM viejo con URL nueva (bug latente del router, ahora corregido).
let renderedPath = location.pathname;

async function navigate(dest, push) {
  const url = new URL(dest, location.href);

  if (url.pathname === renderedPath) {
    if (url.hash) {
      const t = document.querySelector(url.hash);
      if (t) scrollToY(layoutTop(t));
    }
    return;
  }
  if (navigating) return;

  // pages without the SPA wrapper (e.g. /proyectos) fall back to a full load
  const page = document.getElementById('page');
  if (!page) { location.href = dest; return; }
  navigating = true;
  let html;
  try {
    html = await (prefetched.get(url.pathname) ??
      fetch(url.pathname).then((r) => (r.ok ? r.text() : Promise.reject(r.status))));
  } catch {
    location.href = dest;   // hard-navigation fallback
    return;
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const newPage = doc.getElementById('page');
  if (!newPage) { location.href = dest; return; }

  const reduce = prefersReduced();

  // Crossfade the content only — the canvas keeps running underneath
  page.classList.add('is-leaving');
  await wait(reduce ? 0 : 230);

  page.innerHTML = newPage.innerHTML;
  document.body.className = doc.body.className;
  const st = doc.body.getAttribute('style');
  if (st) document.body.setAttribute('style', st); else document.body.removeAttribute('style');
  document.title = doc.title;
  for (const sel of ['meta[name="description"]', 'link[rel="canonical"]']) {
    const from = doc.querySelector(sel);
    const to = document.querySelector(sel);
    if (from && to) {
      if (from.hasAttribute('content')) to.setAttribute('content', from.getAttribute('content'));
      if (from.hasAttribute('href')) to.setAttribute('href', from.getAttribute('href'));
    }
  }
  renderedPath = url.pathname;
  if (push) history.pushState({}, '', url.pathname + url.hash);

  // aterrizaje siempre instantáneo: el corte de escena no se anima
  if (url.hash) {
    const target = document.querySelector(url.hash);
    jumpToY(target ? layoutTop(target) : 0);
  } else {
    jumpToY(0);
  }

  initPage();
  // move keyboard/screen-reader focus to the fresh content
  page.setAttribute('tabindex', '-1');
  page.focus({ preventScroll: true });
  // match cut en dos fases: fijar el estado de entrada (abajo, invisible)
  // sin transición, y al frame siguiente soltar el asentamiento hacia arriba
  page.classList.add('is-entering');
  void page.offsetHeight;
  page.classList.remove('is-leaving');
  requestAnimationFrame(() => page.classList.remove('is-entering'));
  await wait(reduce ? 0 : 300);
  // the view settled: filaments take a slow breath, the page feels alive
  if (!reduce && typeof window.plasmaBreathe === 'function') window.plasmaBreathe();
  navigating = false;
}

window.addEventListener('popstate', () => {
  window.__scroll?.jump(window.scrollY); // cancela cualquier travelling en curso
  navigate(location.pathname + location.hash, false);
});

// First load
initPage();
