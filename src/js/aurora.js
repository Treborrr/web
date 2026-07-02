/**
 * V5-A: Synaptic Network
 * ======================
 * Dim nodes connected by faint lines; light pulses travel along the
 * connections like nerve impulses. The network "wakes up" near the cursor.
 * Particles/lines fade out near text so content stays readable.
 */

const CFG = {
  N:            90,
  SPEED:        0.25,
  LINK_R:       150,      // max link distance
  LINK_ALPHA:   0.14,     // base line opacity
  NODE_ALPHA:   0.55,
  R_MIN:        1.0,
  R_MAX:        2.2,

  PULSE_RATE:   0.03,     // chance per frame to spawn a pulse
  PULSE_SPEED:  0.02,     // fraction of edge per frame
  PULSE_MAX:    14,

  MOUSE_R:      220,      // cursor activation radius
  TEXT_FADE_R:  80,
  TEXT_SOLID_R: 20,
};

const PALETTE = ['#8be9fd', '#bd93f9', '#6af0ff'];

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
Object.assign(canvas.style, {
  position: 'fixed', top: '0', left: '0',
  width: '100vw', height: '100vh',
  zIndex: '-2', pointerEvents: 'none',
});
document.body.appendChild(canvas);

let W = 0, H = 0;
const mouse = { x: -9999, y: -9999, active: false };

let bgGrad = null;
function buildBg() {
  bgGrad = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.hypot(W, H) * 0.7);
  bgGrad.addColorStop(0, '#0f1020');
  bgGrad.addColorStop(0.5, '#090a14');
  bgGrad.addColorStop(1, '#050508');
}

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
  buildBg();
  updateProtectedRects();
}
window.addEventListener('resize', resize);
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; });
window.addEventListener('mouseleave', () => { mouse.active = false; });

let protectedRects = [];
function updateProtectedRects() {
  const els = document.querySelectorAll(
    '.glass-card, .stack-category, .terminal-window, .profile-container, ' +
    '.hero-text, .section-header, h1, h2, h3, p, .btn'
  );
  protectedRects = Array.from(els).map(el => {
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });
}
setInterval(updateProtectedRects, 800);

function textVisibility(x, y) {
  let minD = Infinity;
  for (const rc of protectedRects) {
    const nx = Math.max(rc.x, Math.min(x, rc.x + rc.w));
    const ny = Math.max(rc.y, Math.min(y, rc.y + rc.h));
    const dx = x - nx, dy = y - ny;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < minD) minD = d;
    if (minD <= CFG.TEXT_SOLID_R) return 0;
  }
  if (minD >= CFG.TEXT_FADE_R) return 1;
  return (minD - CFG.TEXT_SOLID_R) / (CFG.TEXT_FADE_R - CFG.TEXT_SOLID_R);
}

class Node {
  constructor() {
    this.x = Math.random() * W;
    this.y = Math.random() * H;
    const a = Math.random() * Math.PI * 2;
    this.vx = Math.cos(a) * CFG.SPEED * (0.5 + Math.random());
    this.vy = Math.sin(a) * CFG.SPEED * (0.5 + Math.random());
    this.r = CFG.R_MIN + Math.random() * (CFG.R_MAX - CFG.R_MIN);
    this.color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    this.vis = 1;
    this.heat = 0; // cursor activation 0..1
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 0 || this.x > W) this.vx *= -1;
    if (this.y < 0 || this.y > H) this.vy *= -1;
    this.vis = textVisibility(this.x, this.y);
    if (mouse.active) {
      const d = Math.hypot(this.x - mouse.x, this.y - mouse.y);
      this.heat = d < CFG.MOUSE_R ? 1 - d / CFG.MOUSE_R : 0;
    } else this.heat = 0;
  }
}

const nodes = [];
const pulses = []; // { a, b, t, color }

function frame() {
  requestAnimationFrame(frame);
  ctx.fillStyle = bgGrad || '#080810';
  ctx.fillRect(0, 0, W, H);

  for (const n of nodes) n.update();

  // Links + pulse spawning
  const links = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const dx = a.x - b.x, dy = a.y - b.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > CFG.LINK_R * CFG.LINK_R) continue;
      const d = Math.sqrt(d2);
      const vis = Math.min(a.vis, b.vis);
      if (vis <= 0) continue;
      const heat = Math.max(a.heat, b.heat);
      const alpha = (1 - d / CFG.LINK_R) * (CFG.LINK_ALPHA + heat * 0.35) * vis;
      ctx.strokeStyle = heat > 0.15 ? a.color : '#8be9fd';
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 0.7 + heat * 0.8;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      links.push([a, b, heat]);
    }
  }

  // Spawn pulses (more where the cursor is)
  if (links.length && pulses.length < CFG.PULSE_MAX) {
    const [a, b, heat] = links[Math.floor(Math.random() * links.length)];
    if (Math.random() < CFG.PULSE_RATE + heat * 0.25) {
      pulses.push({ a, b, t: 0, color: a.color });
    }
  }

  // Draw pulses
  for (let i = pulses.length - 1; i >= 0; i--) {
    const p = pulses[i];
    p.t += CFG.PULSE_SPEED * (1 + Math.max(p.a.heat, p.b.heat) * 1.5);
    if (p.t >= 1) { pulses.splice(i, 1); continue; }
    const x = p.a.x + (p.b.x - p.a.x) * p.t;
    const y = p.a.y + (p.b.y - p.a.y) * p.t;
    const vis = textVisibility(x, y);
    if (vis <= 0) continue;
    ctx.globalAlpha = Math.sin(p.t * Math.PI) * 0.9 * vis;
    ctx.shadowBlur = 8;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Draw nodes
  for (const n of nodes) {
    if (n.vis <= 0) continue;
    ctx.globalAlpha = CFG.NODE_ALPHA * n.vis * (1 + n.heat * 0.6);
    if (n.heat > 0.3) { ctx.shadowBlur = 6; ctx.shadowColor = n.color; }
    ctx.fillStyle = n.color;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r * (1 + n.heat * 0.4), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
}

resize();
for (let i = 0; i < CFG.N; i++) nodes.push(new Node());

let running = true;
document.addEventListener('visibilitychange', () => {
  running = document.visibilityState === 'visible';
  if (running) requestAnimationFrame(frame);
});
frame();
