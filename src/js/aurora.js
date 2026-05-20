// Constellation particle system — replaces WebGL aurora
// Particles flee the cursor; nearby particles connect with lines.

const PALETTE   = ['#bd93f9', '#8be9fd', '#ff79c6', '#caa9fa', '#f8f8f2'];
const N         = 135;        // total particles
const LINK_DIST = 155;        // px — max distance to draw particle↔particle line
const MOUSE_LINK_DIST = 190;  // px — mouse↔particle line radius
const REPEL_R   = 125;        // px — mouse repulsion radius
const REPEL_STR = 6.5;        // repulsion impulse strength
const FRICTION  = 0.89;       // velocity damping per frame (lower = snappier return)

const canvas = document.createElement('canvas');
const ctx    = canvas.getContext('2d');

Object.assign(canvas.style, {
    position: 'fixed', top: '0', left: '0',
    width: '100vw', height: '100vh',
    zIndex: '-2', pointerEvents: 'none',
});
document.body.appendChild(canvas);

let W = 0, H = 0;
const mouse = { x: -9999, y: -9999 };

function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

document.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
document.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

// ── Particle ─────────────────────────────────────────────────────────────────

class Particle {
    constructor() {
        this.x     = Math.random() * W;
        this.y     = Math.random() * H;
        const spd  = 0.18 + Math.random() * 0.25;
        const ang  = Math.random() * Math.PI * 2;
        this.dvx   = Math.cos(ang) * spd;   // base drift velocity
        this.dvy   = Math.sin(ang) * spd;
        this.vx    = this.dvx;
        this.vy    = this.dvy;
        this.r     = 0.7 + Math.random() * 1.6;
        this.color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
        this.glow  = Math.random() > 0.80;  // 20 % are "bright stars"
    }

    update() {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const d2 = dx * dx + dy * dy;

        if (d2 < REPEL_R * REPEL_R && d2 > 0.01) {
            const d     = Math.sqrt(d2);
            const force = (1 - d / REPEL_R) * REPEL_STR;
            this.vx += (dx / d) * force;
            this.vy += (dy / d) * force;
        }

        // Damp toward base drift
        this.vx = this.vx * FRICTION + this.dvx * (1 - FRICTION);
        this.vy = this.vy * FRICTION + this.dvy * (1 - FRICTION);

        this.x += this.vx;
        this.y += this.vy;

        // Wrap at edges
        if (this.x < -8)  this.x = W + 8;
        if (this.x > W+8) this.x = -8;
        if (this.y < -8)  this.y = H + 8;
        if (this.y > H+8) this.y = -8;
    }

    draw() {
        if (this.glow) {
            ctx.shadowBlur  = 12;
            ctx.shadowColor = this.color;
        }
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        if (this.glow) ctx.shadowBlur = 0;
    }
}

const particles = Array.from({ length: N }, () => new Particle());

// ── Link drawing ─────────────────────────────────────────────────────────────

const LINK_D2       = LINK_DIST * LINK_DIST;
const MOUSE_LINK_D2 = MOUSE_LINK_DIST * MOUSE_LINK_DIST;

function drawLinks() {
    // Particle ↔ particle
    for (let i = 0; i < N - 1; i++) {
        for (let j = i + 1; j < N; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const d2 = dx * dx + dy * dy;
            if (d2 >= LINK_D2) continue;
            const alpha = (1 - Math.sqrt(d2) / LINK_DIST) * 0.45;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(189,147,249,${alpha.toFixed(3)})`;
            ctx.lineWidth   = 0.75;
            ctx.stroke();
        }
    }

    // Mouse ↔ particle (cyan lines — visible "pull" web)
    if (mouse.x < 0 || mouse.x > W) return;
    for (let i = 0; i < N; i++) {
        const dx = particles[i].x - mouse.x;
        const dy = particles[i].y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= MOUSE_LINK_D2) continue;
        const alpha = (1 - Math.sqrt(d2) / MOUSE_LINK_DIST) * 0.55;
        ctx.beginPath();
        ctx.moveTo(mouse.x, mouse.y);
        ctx.lineTo(particles[i].x, particles[i].y);
        ctx.strokeStyle = `rgba(139,233,253,${alpha.toFixed(3)})`;
        ctx.lineWidth   = 0.7;
        ctx.stroke();
    }
}

// ── Render loop ───────────────────────────────────────────────────────────────

// Pre-build the background gradient once; rebuild only on resize
let bgGrad = null;
function buildBg() {
    bgGrad = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, Math.hypot(W, H) * 0.65);
    bgGrad.addColorStop(0, '#16172a');  // slightly lighter center
    bgGrad.addColorStop(1, '#080810');  // deep near-black edge
}
buildBg();
window.addEventListener('resize', buildBg);

function frame() {
    requestAnimationFrame(frame);

    // Background
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Cursor glow halo
    if (mouse.x > 0 && mouse.x < W) {
        const halo = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 90);
        halo.addColorStop(0, 'rgba(189,147,249,0.07)');
        halo.addColorStop(1, 'rgba(189,147,249,0)');
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, W, H);
    }

    drawLinks();

    for (const p of particles) {
        p.update();
        p.draw();
    }
}

frame();
