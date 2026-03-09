document.addEventListener('DOMContentLoaded', () => {
  // 0. Custom Cursor Logic
  const cursorDot = document.getElementById('cursor-dot');

  if (cursorDot) {
    let lastSparkTime = 0;
    const colors = ['#8be9fd', '#bd93f9', '#ff79c6', '#50fa7b']; // Cyan, Purple, Pink, Green

    window.addEventListener('mousemove', (e) => {
      const posX = e.clientX;
      const posY = e.clientY;

      cursorDot.style.left = `${posX}px`;
      cursorDot.style.top = `${posY}px`;

      // Spawn stardust
      const now = Date.now();
      if (now - lastSparkTime > 15) { // Faster spawn rate
        // Generate 2 particles at a time for a denser effect
        for (let i = 0; i < 2; i++) {
          const spark = document.createElement('div');
          spark.className = 'stardust-particle';

          // Randomizing properties
          const size = Math.random() * 4 + 2; // 2px to 6px
          const color = colors[Math.floor(Math.random() * colors.length)];
          const tx = (Math.random() - 0.5) * 80 + 'px'; // slightly wider drift
          const ty = (Math.random() - 0.5) * 80 + 20 + 'px'; // mostly downwards drift

          spark.style.width = `${size}px`;
          spark.style.height = `${size}px`;
          spark.style.backgroundColor = color;
          spark.style.boxShadow = `0 0 ${size * 2}px ${color}`;

          // Add slight initial offset so they don't spawn exactly on top of each other
          const offsetX = (Math.random() - 0.5) * 10;
          const offsetY = (Math.random() - 0.5) * 10;

          spark.style.left = `${posX + offsetX}px`;
          spark.style.top = `${posY + offsetY}px`;
          spark.style.setProperty('--tx', tx);
          spark.style.setProperty('--ty', ty);

          document.body.appendChild(spark);

          // Clean up particle after animation
          setTimeout(() => {
            spark.remove();
          }, 1000);
        }
        lastSparkTime = now;
      }
    });

    // Hide/Show custom cursor when mouse leaves/enters window
    document.addEventListener('mouseleave', () => {
      cursorDot.style.opacity = '0';
    });

    document.addEventListener('mouseenter', () => {
      cursorDot.style.opacity = '1';
    });
  }

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

  // 4. Experience View Toggle
  const toggleInputs = document.querySelectorAll('input[name="exp-view"]');
  const views = document.querySelectorAll('.exp-view');

  if (toggleInputs.length > 0 && views.length > 0) {
    toggleInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        const targetViewId = `view-${e.target.value}`;

        views.forEach(view => {
          if (view.id === targetViewId) {
            view.classList.add('active');
          } else {
            view.classList.remove('active');
          }
        });
      });
    });
  }

  // 5. Holographic Profile Card Tilt Effect
  const holoCard = document.getElementById('holo-card');
  if (holoCard) {
    const holoWrapper = holoCard.querySelector('.holo-wrapper');
    const holoShine = holoCard.querySelector('.holo-shine');
    const holoGlare = holoCard.querySelector('.holo-glare');

    holoCard.addEventListener('mousemove', (e) => {
      const rect = holoCard.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -15; // Max 15deg tilt
      const rotateY = ((x - centerX) / centerX) * 15;

      holoWrapper.style.setProperty('--rotate-x', `${rotateX}deg`);
      holoWrapper.style.setProperty('--rotate-y', `${rotateY}deg`);

      const pointerX = (x / rect.width) * 100;
      const pointerY = (y / rect.height) * 100;

      holoShine.style.setProperty('--pointer-x', `${pointerX}%`);
      holoShine.style.setProperty('--pointer-y', `${pointerY}%`);

      if (holoGlare) {
        holoGlare.style.setProperty('--pointer-x', `${pointerX}%`);
        holoGlare.style.setProperty('--pointer-y', `${pointerY}%`);
      }
    });

    holoCard.addEventListener('mouseleave', () => {
      holoWrapper.style.setProperty('--rotate-x', `0deg`);
      holoWrapper.style.setProperty('--rotate-y', `0deg`);
      holoShine.style.setProperty('--pointer-x', `50%`);
      holoShine.style.setProperty('--pointer-y', `50%`);

      if (holoGlare) {
        holoGlare.style.setProperty('--pointer-x', `50%`);
        holoGlare.style.setProperty('--pointer-y', `50%`);
      }
      // Add slight transition when returning to flat
      holoWrapper.style.transition = 'transform 0.5s ease';
      setTimeout(() => {
        holoWrapper.style.transition = 'transform 0.1s ease';
      }, 500);
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

        const MAX = 15;
        const rotateX = Math.max(-MAX, Math.min(MAX, ((beta - betaOrigin) / 30) * MAX));
        const rotateY = Math.max(-MAX, Math.min(MAX, ((gamma - gammaOrigin) / 30) * MAX));

        holoWrapper.style.setProperty('--rotate-x', `${rotateX}deg`);
        holoWrapper.style.setProperty('--rotate-y', `${rotateY}deg`);

        const pointerX = ((rotateY / MAX) * 0.5 + 0.5) * 100;
        const pointerY = ((rotateX / MAX) * -0.5 + 0.5) * 100;

        holoShine.style.setProperty('--pointer-x', `${pointerX}%`);
        holoShine.style.setProperty('--pointer-y', `${pointerY}%`);
        if (holoGlare) {
          holoGlare.style.setProperty('--pointer-x', `${pointerX}%`);
          holoGlare.style.setProperty('--pointer-y', `${pointerY}%`);
        }
      }

      function attachGyro() {
        if (gyroListening) return;
        gyroListening = true;
        window.addEventListener('deviceorientation', applyGyroTilt);
      }

      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS 13+: needs user gesture to request permission
        holoCard.addEventListener('touchstart', () => {
          DeviceOrientationEvent.requestPermission()
            .then(state => { if (state === 'granted') attachGyro(); })
            .catch(() => {});
        }, { once: true });
      } else {
        // Android and other browsers: attach immediately
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