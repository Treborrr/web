if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

// Button plasma flash — triggers global filament flare on button clicks (not nav)
// For external links (target="_blank" or off-site), delays navigation until effect fades (~800ms)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('a, button');
  if (!btn || btn.closest('nav') || btn.closest('.sp-rail')) return;
  if (typeof window.plasmaButtonFlash === 'function') window.plasmaButtonFlash();

  const href = btn.getAttribute('href');
  const isExternal = href && !href.startsWith('#') && btn.target === '_blank';
  if (!isExternal) return;

  e.preventDefault();
  setTimeout(() => window.open(href, '_blank', 'noopener,noreferrer'), 820);
});

// Contact form — AJAX submit with success state
(() => {
  const form    = document.getElementById('cta-form');
  const btn     = document.getElementById('cta-submit');
  const success = document.getElementById('cta-success');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btn.disabled = true;
    btn.style.opacity = '0.6';
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        form.hidden = true;
        success.hidden = false;
      } else {
        btn.disabled = false;
        btn.style.opacity = '';
      }
    } catch {
      btn.disabled = false;
      btn.style.opacity = '';
    }
  });
})();

document.addEventListener('DOMContentLoaded', () => {
  // 1. Dynamic Extension Animation
  const extEl = document.getElementById('ext-hero');
  if (extEl) {
    // Stack-based extensions
    const exts = ['ts', 'tsx', 'sql', 'py', 'aws', 'cpp'];
    const colors = [
      'var(--green)',   // ts
      'var(--red)',     // tsx
      'var(--cyan)',    // sql
      'var(--yellow)',  // py
      'var(--orange)',  // aws
      'var(--purple)'   // cpp
    ];

    let idx = 0;
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    async function typeReplace(next, color) {
      extEl.style.color = color;
      extEl.textContent = '';
      for (let i = 1; i <= next.length; i++) {
        extEl.textContent = next.slice(0, i);
        await sleep(100);
      }
    }

    async function eraseCurrent() {
      const current = extEl.textContent;
      for (let i = current.length; i > 0; i--) {
        extEl.textContent = current.slice(0, i - 1);
        await sleep(60);
      }
    }

    async function loop() {
      while (true) {
        await sleep(2500); // Wait longer to read the extension
        await eraseCurrent();
        idx = (idx + 1) % exts.length;
        await typeReplace(exts[idx], colors[idx]);
      }
    }

    extEl.textContent = exts[0];
    extEl.style.color = colors[0];
    loop();
  }

  // 2. Auto-update year
  const yearEl = document.getElementById('y');
  if (yearEl) { yearEl.textContent = new Date().getFullYear(); }

  // 3. Scroll Reveal Animation
  function reveal() {
    var reveals = document.querySelectorAll(".reveal");
    for (var i = 0; i < reveals.length; i++) {
      var windowHeight = window.innerHeight;
      var elementTop = reveals[i].getBoundingClientRect().top;
      var elementVisible = 100;
      if (elementTop < windowHeight - elementVisible) {
        reveals[i].classList.add("active");
      }
    }
  }
  window.addEventListener("scroll", reveal);
  reveal(); // Trigger on load

  // 4. Holographic Profile Card Tilt Effect
  const holoCard = document.getElementById('holo-card');
  if (holoCard) {
    const holoWrapper = holoCard.querySelector('.holo-wrapper');
    const holoShine = holoCard.querySelector('.holo-shine');
    const holoGlare = holoCard.querySelector('.holo-glare');
    const profileGlow = holoCard.querySelector('.profile-glow');

    const holoWrapperRect = holoWrapper.getBoundingClientRect();

    const clamp = (val, min = 0, max = 100) => Math.min(Math.max(val, min), max);
    const adjust = (val, fromM, fromMax, toM, toMax) => toM + ((toMax - toM) * (val - fromM)) / (fromMax - fromM);

    const updateCardTransform = (x, y, width, height) => {
      const percentX = clamp((100 / width) * x);
      const percentY = clamp((100 / height) * y);

      const centerX = percentX - 50;
      const centerY = percentY - 50;

      const rotateX = -(centerX / 5);
      const rotateY = (centerY / 4);

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
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      updateCardTransform(x, y, rect.width, rect.height);
    });

    holoCard.addEventListener('mouseleave', () => {
      // Return to base state, centered pointers, no tilt, opacity 0
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
    });

    // Gyroscope tilt effect for mobile
    if (typeof DeviceOrientationEvent !== 'undefined') {
      let betaOrigin = null;
      let gammaOrigin = null;
      let gyroActive = false;
      let gyroListening = false;

      function applyGyroTilt(e) {
        if (!gyroActive) return;
        const beta = e.beta ?? 0;
        const gamma = e.gamma ?? 0;

        if (betaOrigin === null) {
          betaOrigin = beta;
          gammaOrigin = gamma;
        }

        const rect = holoWrapper.getBoundingClientRect();

        // Use identical scaling as React hook:
        // beta controls X axis (up/down), gamma controls Y axis (left/right)
        // + values of beta mean device is flipped forward, gamma positive means tilted right
        const mobileTiltSensitivity = 2; // Sensitivity coefficient

        // We simulate a mouse cursor position `x` and `y` generated by the phone tilt
        const simulatedX = rect.width / 2 + gamma * mobileTiltSensitivity * 2;
        const simulatedY = rect.height / 2 + (beta - 40) * mobileTiltSensitivity * 2;

        updateCardTransform(simulatedX, simulatedY, rect.width, rect.height);
      }

      function attachGyro() {
        if (gyroListening) return;
        gyroListening = true;
        window.addEventListener('deviceorientation', applyGyroTilt);
      }

      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS 13+: requestPermission() must be called from a button click
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
            .then(state => {
              if (state === 'granted') {
                attachGyro();
                iosBtn.remove();
              } else {
                iosBtn.textContent = '✗ denegado';
                iosBtn.title = 'Ajustes → Safari → Movimiento y orientación';
              }
            })
            .catch(() => {
              iosBtn.textContent = '✗ denegado';
              iosBtn.title = 'Ajustes → Safari → Movimiento y orientación';
            });
        });
      } else {
        // Android / browsers without requestPermission: attach immediately
        attachGyro();
      }

      // IntersectionObserver: activate/deactivate and recalibrate
      new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          gyroActive = entry.isIntersecting;
          if (entry.isIntersecting) {
            betaOrigin = null;
            gammaOrigin = null;
          }
        });
      }, { threshold: 0.3 }).observe(holoCard);
    }
  }
});

/* ============================================================
   PORTFOLIO — SPOTLIGHT SCROLLYTELLING
   ============================================================ */

(() => {
  const root = document.getElementById('sp-scroller');
  if (!root) return;

  const PROJECTS = [
    {
      title: 'Casa Hospedaje Burgos',
      tag: 'Turismo',
      accent: '#ffb86c',
      glow: 'rgba(255, 184, 108, 0.4)',
      desc: 'Sitio bilingüe con sistema de reservas, galería de habitaciones y guía de lugares turísticos de Chachapoyas.',
      url: 'https://hospedajeburgos.up.railway.app/',
    },
    {
      title: 'ABAWA',
      tag: 'Gestión Empresarial',
      accent: '#bd93f9',
      glow: 'rgba(189, 147, 249, 0.4)',
      desc: 'Plataforma de gestión a medida con dashboard ejecutivo y control centralizado de la operación.',
      url: 'https://abawa.up.railway.app/cata',
    },
    {
      title: 'BMS',
      tag: 'Retail & POS',
      accent: '#8be9fd',
      glow: 'rgba(139, 233, 253, 0.35)',
      desc: 'Punto de venta integral con autoservicio, facturación electrónica SUNAT y panel de auditoría en tiempo real.',
    },
    {
      title: 'SCCE',
      tag: 'Agroindustrial',
      accent: '#50fa7b',
      glow: 'rgba(80, 250, 123, 0.35)',
      desc: 'Trazabilidad digital de lotes de cacao especial — fermentación, secado y exportación sin una sola hoja de papel.',
    },
  ];

  const N = PROJECTS.length;
  const textBox = document.getElementById('sp-text');
  const idxEl   = document.getElementById('sp-index');
  const tagEl   = document.getElementById('sp-tag');
  const titleEl = document.getElementById('sp-title');
  const descEl  = document.getElementById('sp-desc');
  const shots     = [...root.querySelectorAll('.sp-shot')];
  const railItems = [...root.querySelectorAll('.sp-rail-item')];
  const fills     = [...root.querySelectorAll('.sp-rail-fill')];
  let cur = 0;
  let swapTimer = null;

  const linkEl = document.getElementById('sp-link');

  const renderText = (i) => {
    const p = PROJECTS[i];
    idxEl.textContent = String(i + 1).padStart(2, '0');
    tagEl.textContent = p.tag;
    titleEl.textContent = p.title;
    descEl.textContent = p.desc;
    if (linkEl) {
      if (p.url) { linkEl.href = p.url; linkEl.hidden = false; }
      else { linkEl.hidden = true; }
    }
  };

  const setProject = (i, instant = false) => {
    if (i === cur) return;
    cur = i;
    const p = PROJECTS[i];
    // Accent, screen and rail flip immediately; the text crossfades
    root.style.setProperty('--pj-accent', p.accent);
    root.style.setProperty('--pj-glow', p.glow);
    shots.forEach((s, j) => s.classList.toggle('active', j === i));
    railItems.forEach((r, j) => r.classList.toggle('active', j === i));
    if (instant) { renderText(i); return; }
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
    // Map progress to a continuous segment position in [0, N)
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
      // Land a hair inside the segment so floor() resolves to j
      window.scrollTo({ top: rootTop + ((j + 0.05) / N) * travel(), behavior: 'smooth' });
    });
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  // 3D tilt — listens on window to bypass the aurora canvas
  const screen = root.querySelector('.sp-screen');
  const visual = root.querySelector('.sp-visual');
  if (screen && visual) {
    const MAX_TILT = 12;
    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;
    let active = false;
    let raf = null;

    const tick = () => {
      currentX += (targetX - currentX) * 0.1;
      currentY += (targetY - currentY) * 0.1;
      screen.style.transform = `perspective(1200px) rotateX(${currentX}deg) rotateY(${currentY}deg)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', (e) => {
      const rect = visual.getBoundingClientRect();
      const inside = e.clientX >= rect.left && e.clientX <= rect.right &&
                     e.clientY >= rect.top  && e.clientY <= rect.bottom;

      if (inside) {
        if (!active) { active = true; if (!raf) raf = requestAnimationFrame(tick); }
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top)  / rect.height;
        targetY =  (px - 0.5) * 2 * MAX_TILT;
        targetX = -(py - 0.5) * 2 * MAX_TILT;
      } else if (active) {
        active = false;
        targetX = 0;
        targetY = 0;
        setTimeout(() => { cancelAnimationFrame(raf); raf = null; screen.style.transform = ''; }, 700);
      }
    }, { passive: true });
  }
})();

/* ============================================================
   IMMERSIVE SCROLL — progress bar + nav scrollspy
   ============================================================ */

(() => {
  const bar = document.getElementById('scroll-progress');
  const navLinks = document.querySelectorAll('nav a[href^="#"]');
  const sections = [...navLinks].map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);

  const update = () => {
    if (bar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    }
    // Scrollspy: last section whose top passed 40% of the viewport
    let current = null;
    sections.forEach(s => {
      if (s.getBoundingClientRect().top <= window.innerHeight * 0.4) current = s.id;
    });
    navLinks.forEach(a =>
      a.classList.toggle('nav-active', a.getAttribute('href') === `#${current}`));
  };

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => { update(); ticking = false; });
    }
  }, { passive: true });
  update();
})();
