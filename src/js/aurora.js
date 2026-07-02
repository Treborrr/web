/**
 * V5-B: Plasma Lamp (WebGL)
 * =========================
 * Electric plasma filaments rendered with a noise shader. Filaments drift
 * slowly and bend toward the cursor like a plasma globe. Kept dark and
 * vignetted toward the content area so text stays readable.
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
  // warp space with fbm so the line snakes around
  vec2 w = uv * 1.6 + vec2(seed * 13.7, seed * 7.3);
  float n = fbm(w + vec2(t * 0.045, -t * 0.035));
  // ridge: distance of noise value from 0.5 -> thin bright line
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

  // dracula palette: deep bg -> purple -> cyan core
  vec3 bg     = vec3(0.028, 0.03, 0.07);
  vec3 purple = vec3(0.45, 0.30, 0.85);
  vec3 cyan   = vec3(0.42, 0.85, 0.98);
  vec3 col = bg + purple * e * 0.35 + cyan * pow(e, 2.0) * 0.5;

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

const uRes     = gl.getUniformLocation(prog, 'uRes');
const uTime    = gl.getUniformLocation(prog, 'uTime');
const uMouse   = gl.getUniformLocation(prog, 'uMouse');
const uMouseOn = gl.getUniformLocation(prog, 'uMouseOn');

const mouse = { x: -9999, y: -9999, sx: -9999, sy: -9999, active: false };
window.addEventListener('mousemove', e => {
  if (!mouse.active) { mouse.sx = e.clientX; mouse.sy = e.clientY; }
  mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
});
window.addEventListener('mouseleave', () => { mouse.active = false; });

function resize() {
  // render at half resolution for perf; CSS scales it up
  canvas.width  = Math.floor(window.innerWidth / 2);
  canvas.height = Math.floor(window.innerHeight / 2);
  gl.viewport(0, 0, canvas.width, canvas.height);
}
window.addEventListener('resize', resize);
resize();

let running = true;
document.addEventListener('visibilitychange', () => {
  running = document.visibilityState === 'visible';
  if (running) requestAnimationFrame(frame);
});

const t0 = performance.now();
function frame() {
  if (!running) return;
  requestAnimationFrame(frame);
  gl.uniform2f(uRes, canvas.width, canvas.height);
  gl.uniform1f(uTime, (performance.now() - t0) / 1000);
  // trail the cursor with a bit of inertia
  mouse.sx += (mouse.x - mouse.sx) * 0.06;
  mouse.sy += (mouse.y - mouse.sy) * 0.06;
  gl.uniform2f(uMouse, mouse.sx / 2, mouse.sy / 2);
  gl.uniform1f(uMouseOn, mouse.active ? 1 : 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
frame();
