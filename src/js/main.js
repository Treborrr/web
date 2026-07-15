if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  initScrollytelling(signal);
  initScrollspy(signal);
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

// Scroll-reveal animation
function initReveal(signal) {
  const reveal = () => {
    const reveals = document.querySelectorAll('.reveal');
    const windowHeight = window.innerHeight;
    for (let i = 0; i < reveals.length; i++) {
      const elementTop = reveals[i].getBoundingClientRect().top;
      if (elementTop < windowHeight - 100) reveals[i].classList.add('active');
    }
  };
  window.addEventListener('scroll', reveal, { signal });
  reveal();
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
      iosBtn.setAttribute('aria-label', 'Activar efecto 3D con giroscopio');
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
            else { iosBtn.textContent = '✗ denegado'; iosBtn.title = 'Ajustes → Safari → Movimiento y orientación'; }
          })
          .catch(() => { iosBtn.textContent = '✗ denegado'; iosBtn.title = 'Ajustes → Safari → Movimiento y orientación'; });
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

  const PROJECTS = [
    { title: 'Casa Hospedaje Burgos', tag: 'Turismo', accent: '#ffb86c', glow: 'rgba(255, 184, 108, 0.4)',
      desc: 'Sitio bilingüe con sistema de reservas, galería de habitaciones y guía de lugares turísticos de Chachapoyas.',
      url: 'https://hospedajeburgos.up.railway.app/' },
    { title: 'ABAWA', tag: 'Gestión Empresarial', accent: '#bd93f9', glow: 'rgba(189, 147, 249, 0.4)',
      desc: 'Plataforma de gestión a medida con dashboard ejecutivo y control centralizado de la operación.',
      url: 'https://abawa.up.railway.app/cata' },
    { title: 'BMS', tag: 'Retail & POS', accent: '#8be9fd', glow: 'rgba(139, 233, 253, 0.35)',
      desc: 'Punto de venta integral con autoservicio, facturación electrónica SUNAT y panel de auditoría en tiempo real.' },
    { title: 'SCCE', tag: 'Agroindustrial', accent: '#50fa7b', glow: 'rgba(80, 250, 123, 0.35)',
      desc: 'Trazabilidad digital de lotes de cacao especial — fermentación, secado y exportación sin una sola hoja de papel.' },
  ];

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
    }, 170);
  };

  const travel = () => root.offsetHeight - window.innerHeight;
  const onScroll = () => {
    const top = root.getBoundingClientRect().top;
    const prog = Math.min(1, Math.max(0, -top / travel()));
    const seg = Math.min(prog * N, N - 0.0001);
    setProject(Math.floor(seg));
    fills.forEach((f, j) => {
      f.style.transform = `scaleX(${Math.min(1, Math.max(0, seg - j))})`;
    });
  };

  railItems.forEach((btn) => {
    btn.addEventListener('click', () => {
      const j = +btn.dataset.index;
      const rootTop = root.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: rootTop + ((j + 0.05) / N) * travel(), behavior: 'smooth' });
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
   ONE-TIME GLOBAL: plasma flash + SPA router
   ============================================================ */

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
  if (url.pathname === location.pathname) return;       // same page hash → native smooth scroll
  if (!url.pathname.endsWith('.html')) return;          // not a page we own

  e.preventDefault();
  navigate(url.pathname + url.hash, true);
});

let navigating = false;

async function navigate(dest, push) {
  const url = new URL(dest, location.href);

  if (url.pathname === location.pathname) {
    if (url.hash) document.querySelector(url.hash)?.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  if (navigating) return;
  navigating = true;

  const page = document.getElementById('page');
  let html;
  try {
    const res = await fetch(url.pathname);
    if (!res.ok) throw new Error(res.status);
    html = await res.text();
  } catch {
    location.href = dest;   // hard-navigation fallback
    return;
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const newPage = doc.getElementById('page');
  if (!newPage) { location.href = dest; return; }

  const toLight = doc.body.classList.contains('plasma-light');
  const reduce = prefersReduced();

  // Recolor the (persistent) plasma toward the destination theme
  if (typeof window.__plasmaSetLight === 'function') window.__plasmaSetLight(toLight);

  // Crossfade the content only — the canvas keeps running underneath
  page.classList.add('is-leaving');
  await wait(reduce ? 0 : 230);

  page.innerHTML = newPage.innerHTML;
  document.body.className = doc.body.className;
  const st = doc.body.getAttribute('style');
  if (st) document.body.setAttribute('style', st); else document.body.removeAttribute('style');
  document.title = doc.title;
  if (push) history.pushState({}, '', url.pathname + url.hash);

  if (url.hash) {
    const target = document.querySelector(url.hash);
    if (target) target.scrollIntoView(); else window.scrollTo(0, 0);
  } else {
    window.scrollTo(0, 0);
  }

  initPage();
  requestAnimationFrame(() => page.classList.remove('is-leaving'));
  await wait(reduce ? 0 : 260);
  navigating = false;
}

window.addEventListener('popstate', () => navigate(location.pathname + location.hash, false));

// First load
initPage();
