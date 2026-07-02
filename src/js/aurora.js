/**
 * V3: Bioluminescent Swarm
 * ========================
 * A high-performance Boids flocking system with:
 *  - Cursor attraction (swarm hunts the mouse)
 *  - UI card repulsion (particles flow *around* elements)
 *  - Spatial grid for O(n) neighbor queries
 *  - Bioluminescent Dracula palette with per-particle glow
 */

// ── Config ────────────────────────────────────────────────────────────────────
const CFG = {
  N:           2400,     // particle count
  SPEED_BASE:  0.55,     // base drift speed
  SPEED_MAX:   3.8,      // max speed
  FRICTION:    0.965,    // velocity damping

  // Boids weights
  SEP_R:       28,       // separation radius
  SEP_W:       1.8,      // separation weight
  ALI_R:       55,       // alignment radius
  ALI_W:       0.22,
  COH_R:       55,       // cohesion radius
  COH_W:       0.012,

  // Cursor attraction
  MOUSE_R:     210,      // attraction radius
  MOUSE_W:     0.048,    // pull weight
  MOUSE_CLOSE: 48,       // inner dead-zone (prevents clustering on cursor)

  // Card repulsion
  CARD_R:      52,       // repulsion start distance (px from edge)
  CARD_W:      2.8,      // repulsion weight

  // Visual
  R_MIN:       0.7,
  R_MAX:       2.2,
  GLOW_PROB:   0.18,     // fraction that emit a halo

  // Grid cell size (px) — should be >= ALI_R
  CELL:        60,
};

const PALETTE = [
  '#8be9fd',  // cyan
  '#bd93f9',  // purple
  '#ffb86c',  // orange
  '#caa9fa',  // soft purple
  '#6af0ff',  // bright cyan
];

// ── Canvas setup ─────────────────────────────────────────────────────────────
const canvas = document.createElement('canvas');
const ctx    = canvas.getContext('2d');

Object.assign(canvas.style, {
  position:      'fixed',
  top:           '0',
  left:          '0',
  width:         '100vw',
  height:        '100vh',
  zIndex:        '-2',
  pointerEvents: 'none',
});
document.body.appendChild(canvas);

let W = 0, H = 0;
const mouse = { x: -9999, y: -9999, active: false };

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
  buildBg();
  updateCards();
}
window.addEventListener('resize', resize);

window.addEventListener('mousemove', e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  mouse.active = true;
});
window.addEventListener('mouseleave', () => { mouse.active = false; });

// ── Card repulsion rects ──────────────────────────────────────────────────────
let cardRects = [];

function updateCards() {
  const els = document.querySelectorAll(
    '.glass-card, .stack-category, .terminal-window, .profile-container'
  );
  cardRects = Array.from(els).map(el => {
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });
}

// Refresh bounding boxes every 800 ms (cheap)
setInterval(updateCards, 800);

// ── Background gradient ────────────────────────────────────────────────────────
let bgGrad = null;

function buildBg() {
  if (!W) return;
  bgGrad = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.hypot(W, H) * 0.7);
  bgGrad.addColorStop(0,   '#0f1020');
  bgGrad.addColorStop(0.5, '#090a14');
  bgGrad.addColorStop(1,   '#050508');
}

// ── Spatial grid ──────────────────────────────────────────────────────────────
let grid = new Map();

function cellKey(cx, cy) { return (cx << 16) | (cy & 0xffff); }

function buildGrid(particles) {
  grid.clear();
  const cs = CFG.CELL;
  for (let i = 0; i < particles.length; i++) {
    const p  = particles[i];
    const cx = Math.floor(p.x / cs);
    const cy = Math.floor(p.y / cs);
    const k  = cellKey(cx, cy);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(i);
  }
}

function getNeighbors(particles, idx, radius) {
  const p  = particles[idx];
  const cs = CFG.CELL;
  const span = Math.ceil(radius / cs);
  const cx0 = Math.floor(p.x / cs);
  const cy0 = Math.floor(p.y / cs);
  const r2  = radius * radius;
  const out = [];

  for (let dx = -span; dx <= span; dx++) {
    for (let dy = -span; dy <= span; dy++) {
      const k = cellKey(cx0 + dx, cy0 + dy);
      const cell = grid.get(k);
      if (!cell) continue;
      for (let j = 0; j < cell.length; j++) {
        const jj = cell[j];
        if (jj === idx) continue;
        const q  = particles[jj];
        const ex = p.x - q.x;
        const ey = p.y - q.y;
        if (ex * ex + ey * ey < r2) out.push(jj);
      }
    }
  }
  return out;
}

// ── Particle class ────────────────────────────────────────────────────────────
class Particle {
  constructor() {
    this.x     = Math.random() * (W || window.innerWidth);
    this.y     = Math.random() * (H || window.innerHeight);
    const spd  = CFG.SPEED_BASE * (0.6 + Math.random() * 0.8);
    const ang  = Math.random() * Math.PI * 2;
    this.vx    = Math.cos(ang) * spd;
    this.vy    = Math.sin(ang) * spd;
    this.r     = CFG.R_MIN + Math.random() * (CFG.R_MAX - CFG.R_MIN);
    this.color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    this.glow  = Math.random() < CFG.GLOW_PROB;
    this.alpha = 0.55 + Math.random() * 0.45;
  }

  update(particles, idx) {
    let ax = 0, ay = 0;

    // ── Boids ─────────────────────────────────────────────────────────────────
    // Separation
    const sepNbrs = getNeighbors(particles, idx, CFG.SEP_R);
    for (const j of sepNbrs) {
      const q  = particles[j];
      const dx = this.x - q.x;
      const dy = this.y - q.y;
      const d  = Math.sqrt(dx * dx + dy * dy) || 0.001;
      ax += (dx / d) * (CFG.SEP_R - d) / CFG.SEP_R * CFG.SEP_W;
      ay += (dy / d) * (CFG.SEP_R - d) / CFG.SEP_R * CFG.SEP_W;
    }

    // Alignment + Cohesion (shared neighbor query)
    const flkNbrs = getNeighbors(particles, idx, CFG.ALI_R);
    if (flkNbrs.length) {
      let avgVx = 0, avgVy = 0, cx = 0, cy = 0;
      for (const j of flkNbrs) {
        const q = particles[j];
        avgVx += q.vx;
        avgVy += q.vy;
        cx    += q.x;
        cy    += q.y;
      }
      const n = flkNbrs.length;
      ax += (avgVx / n - this.vx) * CFG.ALI_W;
      ay += (avgVy / n - this.vy) * CFG.ALI_W;
      ax += (cx / n - this.x) * CFG.COH_W;
      ay += (cy / n - this.y) * CFG.COH_W;
    }

    // ── Cursor attraction ─────────────────────────────────────────────────────
    if (mouse.active) {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const d2 = dx * dx + dy * dy;
      const d  = Math.sqrt(d2);
      if (d < CFG.MOUSE_R && d > CFG.MOUSE_CLOSE) {
        const t = 1 - d / CFG.MOUSE_R;
        ax += (dx / d) * t * CFG.MOUSE_W * (d / CFG.MOUSE_R * 4);
        ay += (dy / d) * t * CFG.MOUSE_W * (d / CFG.MOUSE_R * 4);
      } else if (d <= CFG.MOUSE_CLOSE) {
        // Slight orbit swirl in the dead-zone
        ax += -dy / (d + 1) * 0.04;
        ay +=  dx / (d + 1) * 0.04;
      }
    }

    // ── Card repulsion ────────────────────────────────────────────────────────
    for (const rc of cardRects) {
      // Clamp particle to nearest point on card rect
      const nx = Math.max(rc.x, Math.min(this.x, rc.x + rc.w));
      const ny = Math.max(rc.y, Math.min(this.y, rc.y + rc.h));
      const dx = this.x - nx;
      const dy = this.y - ny;
      const d2 = dx * dx + dy * dy;
      if (d2 < CFG.CARD_R * CFG.CARD_R && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const f = (1 - d / CFG.CARD_R) * CFG.CARD_W;
        ax += (dx / d) * f;
        ay += (dy / d) * f;
      }
    }

    // ── Integrate ─────────────────────────────────────────────────────────────
    this.vx = (this.vx + ax) * CFG.FRICTION;
    this.vy = (this.vy + ay) * CFG.FRICTION;

    // Speed cap
    const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (spd > CFG.SPEED_MAX) {
      this.vx = (this.vx / spd) * CFG.SPEED_MAX;
      this.vy = (this.vy / spd) * CFG.SPEED_MAX;
    }

    this.x += this.vx;
    this.y += this.vy;

    // Wrap at edges
    if (this.x < -10)   this.x = W + 10;
    if (this.x > W + 10) this.x = -10;
    if (this.y < -10)   this.y = H + 10;
    if (this.y > H + 10) this.y = -10;
  }

  draw() {
    ctx.globalAlpha = this.alpha;
    if (this.glow) {
      ctx.shadowBlur  = 10;
      ctx.shadowColor = this.color;
    }
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    if (this.glow) ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}

// ── Mouse halo ────────────────────────────────────────────────────────────────
function drawMouseHalo() {
  if (!mouse.active) return;
  const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 120);
  g.addColorStop(0,   'rgba(139,233,253,0.09)');
  g.addColorStop(0.4, 'rgba(189,147,249,0.05)');
  g.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// ── Boot ──────────────────────────────────────────────────────────────────────
resize(); // sets W, H, bgGrad

const particles = Array.from({ length: CFG.N }, () => new Particle());

function frame() {
  requestAnimationFrame(frame);

  // Background
  ctx.fillStyle = bgGrad || '#080810';
  ctx.fillRect(0, 0, W, H);

  drawMouseHalo();

  buildGrid(particles);
  for (let i = 0; i < CFG.N; i++) particles[i].update(particles, i);
  for (const p of particles)       p.draw();
}

frame();
