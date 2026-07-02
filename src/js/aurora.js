/**
 * V6: Plasma Lamp (WebGL)
 * =======================
 * Electric plasma filaments rendered with a noise shader.
 *  - Filaments drift slowly and bend toward the cursor (with inertia)
 *  - Click/tap fires a discharge burst at that point, like touching the glass
 *  - Palette breathes slowly between cyan and violet
 *  - Adaptive resolution: sharp on retina, steps down if the GPU struggles
 *  - Touch support; honors prefers-reduced-motion; pauses on hidden tab
 */

const canvas = document.createElement('canvas');
Object.assign(canvas.style, {
  position: 'fixed', top: '0', left: '0',
  width: '100vw', height: '100vh',
  zIndex: '-2', pointerEvents: 'none',
});
document.body.appendChild(canvas);

const gl = canvas.getContext('webgl');

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;
uniform float uMouseOn;
uniform vec2  uClick;
uniform float uClickAge;   // seconds since last click; large = no click

// hash / noise / fbm
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x),
             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

// one plasma filament: a ridge line in warped noise space
float filament(vec2 uv, float seed, float t) {
  vec2 w = uv * 1.6 + vec2(seed * 13.7, seed * 7.3);
  float n = fbm(w + vec2(t * 0.045, -t * 0.035));
  float d = abs(n - 0.5);
  // thin electric core + faint halo
  return smoothstep(0.018, 0.0, d) + smoothstep(0.06, 0.0, d) * 0.25;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec2 m  = (uMouse - 0.5 * uRes) / uRes.y;
  m.y = -m.y;

  // bend space toward the cursor (plasma-globe attraction)
  if (uMouseOn > 0.5) {
    vec2 toM = m - uv;
    float d = length(toM);
    uv += toM * 0.35 * exp(-d * 2.2);
  }

  // click discharge: a soft glow that briefly energizes nearby filaments
  vec2 c = (uClick - 0.5 * uRes) / uRes.y;
  c.y = -c.y;
  float burst = 0.0;
  if (uClickAge < 1.2) {
    float dc = length(c - uv);
    // ease in fast, fade out slow
    float envelope = smoothstep(0.0, 0.08, uClickAge) * exp(-uClickAge * 2.5);
    burst = exp(-dc * 4.0) * envelope;
  }

  float t = uTime;
  float e = 0.0;
  e += filament(uv, 1.0, t)        * 0.8;
  e += filament(uv * 0.8, 3.0, t)  * 0.7;

  // extra energy near the cursor
  if (uMouseOn > 0.5) {
    float d = length(m - uv);
    e += exp(-d * 6.0) * 0.35;
  }

  // vignette: strongly dim the central band where content sits
  float vign = 0.12 + 0.88 * smoothstep(0.25, 0.85, abs(uv.x));
  e *= vign;
  // the burst brightens existing filaments rather than painting a flash
  e *= 1.0 + burst * 2.5;
  e += burst * 0.12;

  // breathing dracula palette: hues drift cyan <-> violet over ~90s
  float breathe = 0.5 + 0.5 * sin(t * 0.07);
  vec3 bg    = vec3(0.028, 0.03, 0.07);
  vec3 haze  = mix(vec3(0.45, 0.30, 0.85), vec3(0.30, 0.45, 0.90), breathe);
  vec3 core  = mix(vec3(0.42, 0.85, 0.98), vec3(0.75, 0.55, 1.00), breathe);
  vec3 col = bg + haze * e * 0.35 + core * pow(e, 2.0) * 0.5;

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(s));
  return s;
}

const prog = gl.createProgram();
gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
gl.linkProgram(prog);
gl.useProgram(prog);

const buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
const locP = gl.getAttribLocation(prog, 'p');
gl.enableVertexAttribArray(locP);
gl.vertexAttribPointer(locP, 2, gl.FLOAT, false, 0, 0);

const uRes      = gl.getUniformLocation(prog, 'uRes');
const uTime     = gl.getUniformLocation(prog, 'uTime');
const uMouse    = gl.getUniformLocation(prog, 'uMouse');
const uMouseOn  = gl.getUniformLocation(prog, 'uMouseOn');
const uClick    = gl.getUniformLocation(prog, 'uClick');
const uClickAge = gl.getUniformLocation(prog, 'uClickAge');

const mouse = { x: -9999, y: -9999, sx: -9999, sy: -9999, active: false };
const click = { x: 0, y: 0, at: -1e9 };

function pointTo(x, y) {
  if (!mouse.active) { mouse.sx = x; mouse.sy = y; }
  mouse.x = x; mouse.y = y; mouse.active = true;
}
window.addEventListener('mousemove', e => pointTo(e.clientX, e.clientY));
window.addEventListener('mouseleave', () => { mouse.active = false; });
window.addEventListener('touchmove', e => {
  const t = e.touches[0];
  if (t) pointTo(t.clientX, t.clientY);
}, { passive: true });
window.addEventListener('touchend', () => { mouse.active = false; });

function discharge(x, y) {
  click.x = x; click.y = y; click.at = performance.now();
}
window.addEventListener('mousedown', e => discharge(e.clientX, e.clientY));
window.addEventListener('touchstart', e => {
  const t = e.touches[0];
  if (t) { pointTo(t.clientX, t.clientY); discharge(t.clientX, t.clientY); }
}, { passive: true });

// ── Adaptive resolution ──────────────────────────────────────────────────────
// Start at 0.5x CSS pixels (scaled by devicePixelRatio, capped at 2) and step
// down if frames are slow, up if the GPU has headroom.
let scale = 0.5;
const SCALE_MIN = 0.3, SCALE_MAX = Math.min(window.devicePixelRatio || 1, 2) * 0.5;

function resize() {
  canvas.width  = Math.max(1, Math.floor(window.innerWidth  * scale));
  canvas.height = Math.max(1, Math.floor(window.innerHeight * scale));
  gl.viewport(0, 0, canvas.width, canvas.height);
}
window.addEventListener('resize', resize);
resize();

let frameTimes = [];
let lastFrame = performance.now();
function tuneResolution(now) {
  frameTimes.push(now - lastFrame);
  lastFrame = now;
  if (frameTimes.length < 60) return;
  const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
  frameTimes = [];
  if (avg > 22 && scale > SCALE_MIN)      { scale = Math.max(SCALE_MIN, scale * 0.8); resize(); }
  else if (avg < 12 && scale < SCALE_MAX) { scale = Math.min(SCALE_MAX, scale * 1.15); resize(); }
}

// ── Render loop ───────────────────────────────────────────────────────────────
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let running = true;
document.addEventListener('visibilitychange', () => {
  running = document.visibilityState === 'visible';
  if (running && !reducedMotion) requestAnimationFrame(frame);
});

const t0 = performance.now();
function render(now) {
  gl.uniform2f(uRes, canvas.width, canvas.height);
  gl.uniform1f(uTime, (now - t0) / 1000);
  mouse.sx += (mouse.x - mouse.sx) * 0.06;
  mouse.sy += (mouse.y - mouse.sy) * 0.06;
  gl.uniform2f(uMouse, mouse.sx * scale, mouse.sy * scale);
  gl.uniform1f(uMouseOn, mouse.active ? 1 : 0);
  gl.uniform2f(uClick, click.x * scale, click.y * scale);
  gl.uniform1f(uClickAge, (now - click.at) / 1000);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function frame() {
  if (!running) return;
  requestAnimationFrame(frame);
  const now = performance.now();
  tuneResolution(now);
  render(now);
}

if (reducedMotion) {
  // static frame, no animation
  render(performance.now());
} else {
  frame();
}
