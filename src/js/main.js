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
    });