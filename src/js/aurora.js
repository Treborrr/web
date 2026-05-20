import { Renderer, Program, Mesh, Triangle, Color } from 'https://esm.sh/ogl';

const MAX_RIPPLES = 6;
const RIPPLE_LIFETIME = 2.8;
const RIPPLE_SPEED   = 0.40; // units/sec in aspect-corrected space
const RIPPLE_THRESH  = 0.028; // min mouse delta to emit a new ripple

const vertex = `
    attribute vec2 position;
    attribute vec2 uv;
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position, 0, 1);
    }
`;

const fragment = `
    precision highp float;

    uniform float uTime;
    uniform float uAmplitude;
    uniform float uBlend;
    uniform vec3  uColor1;
    uniform vec3  uColor2;
    uniform vec3  uColor3;
    uniform float uAspect;

    // 6 ripple slots — each vec3 is (x, y, age); age >= 99.0 means inactive
    uniform vec3 uR0, uR1, uR2, uR3, uR4, uR5;

    varying vec2 vUv;

    // ── Simplex 2D noise ─────────────────────────────────────────────────────
    vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
    float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                           -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy  -= i1;
        i = mod(i, 289.0);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                       + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0, x0),
                                dot(x12.xy, x12.xy),
                                dot(x12.zw, x12.zw)), 0.0);
        m = m * m; m = m * m;
        vec3 x  = 2.0 * fract(p * C.www) - 1.0;
        vec3 h  = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
    }

    // ── Single ring contribution ──────────────────────────────────────────────
    // delay: seconds before this ring starts expanding
    float ringBand(float dist, float age, float delay) {
        float a      = max(age - delay, 0.0);
        float radius = a * ${RIPPLE_SPEED.toFixed(2)};
        float band   = exp(-abs(dist - radius) * 24.0); // sharpness of ring
        float tFade  = exp(-a * 1.55);                  // fade with time
        return band * tFade * step(delay, age);
    }

    // ── One ripple source (x, y, age) ────────────────────────────────────────
    float rippleGlow(vec3 r, vec2 pos) {
        if (r.z >= 90.0) return 0.0; // inactive slot
        float dist = length(pos - r.xy);
        // two concentric rings — second slightly delayed for the "water drop" look
        return ringBand(dist, r.z, 0.0)
             + ringBand(dist, r.z, 0.22) * 0.55;
    }

    void main() {
        vec2 uv = vUv;

        // ── Aurora ───────────────────────────────────────────────────────────
        float noiseVal  = snoise(vec2(uv.x * 1.5 + uTime * 0.07, uTime * 0.15));
        float height    = exp(noiseVal * 0.5 * uAmplitude) * 0.25;
        float colorWarp = snoise(vec2(uv.x * 2.0, uTime * 0.1)) * 0.2;

        vec3 rampColor = mix(uColor1, uColor2, smoothstep(0.0, 0.5, uv.x + colorWarp));
        rampColor      = mix(rampColor, uColor3, smoothstep(0.4, 0.9, uv.x + colorWarp));

        float midPoint   = 0.6 + height;
        float auroraAlpha = smoothstep(midPoint - uBlend * 0.45,
                                       midPoint + uBlend * 0.20, uv.y);

        vec3 bgTop    = vec3(0.157, 0.165, 0.212);
        vec3 bgBottom = vec3(0.098, 0.102, 0.129);
        vec3 deepBg   = mix(bgBottom, bgTop, smoothstep(0.4, 0.9, uv.y));

        vec3 finalColor = mix(deepBg, rampColor, auroraAlpha * 0.4);

        // ── Ripples ──────────────────────────────────────────────────────────
        // Aspect-correct so rings are perfect circles regardless of viewport
        vec2 aPos = vec2(uv.x * uAspect, uv.y);

        float glow = rippleGlow(vec3(uR0.x * uAspect, uR0.y, uR0.z), aPos)
                   + rippleGlow(vec3(uR1.x * uAspect, uR1.y, uR1.z), aPos)
                   + rippleGlow(vec3(uR2.x * uAspect, uR2.y, uR2.z), aPos)
                   + rippleGlow(vec3(uR3.x * uAspect, uR3.y, uR3.z), aPos)
                   + rippleGlow(vec3(uR4.x * uAspect, uR4.y, uR4.z), aPos)
                   + rippleGlow(vec3(uR5.x * uAspect, uR5.y, uR5.z), aPos);

        // Subtle Dracula tint — blend cyan→purple as a soft shimmer
        vec3 rippleColor = mix(uColor1, uColor2, 0.45);
        finalColor += rippleColor * clamp(glow, 0.0, 1.0) * 0.10;

        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

function initAurora() {
    const renderer = new Renderer({ alpha: true, dpr: Math.min(window.devicePixelRatio || 1, 2) });
    const gl = renderer.gl;

    Object.assign(gl.canvas.style, {
        position: 'fixed', top: '0', left: '0',
        width: '100vw', height: '100vh',
        zIndex: '-2', pointerEvents: 'none',
    });
    document.body.appendChild(gl.canvas);

    const geometry = new Triangle(gl);

    const inactive = [0, 0, 99]; // sentinel for unused ripple slot

    const program = new Program(gl, {
        vertex,
        fragment,
        uniforms: {
            uTime:      { value: 0 },
            uAmplitude: { value: 1.2 },
            uBlend:     { value: 1.0 },
            uAspect:    { value: window.innerWidth / window.innerHeight },
            uColor1:    { value: new Color('#8be9fd') }, // Cyan
            uColor2:    { value: new Color('#bd93f9') }, // Purple
            uColor3:    { value: new Color('#ff79c6') }, // Pink
            uR0: { value: [...inactive] },
            uR1: { value: [...inactive] },
            uR2: { value: [...inactive] },
            uR3: { value: [...inactive] },
            uR4: { value: [...inactive] },
            uR5: { value: [...inactive] },
        },
    });

    const slotKeys = ['uR0', 'uR1', 'uR2', 'uR3', 'uR4', 'uR5'];
    const mesh = new Mesh(gl, { geometry, program });

    function resize() {
        renderer.setSize(window.innerWidth, window.innerHeight);
        program.uniforms.uAspect.value = window.innerWidth / window.innerHeight;
    }
    window.addEventListener('resize', resize, false);
    resize();

    // ── Ripple system ─────────────────────────────────────────────────────────
    // Each entry: { x, y, born } where x/y are normalised [0,1] (Y flipped for WebGL)
    const ripples = [];
    let lastX = -1, lastY = -1, lastEmitTime = 0;

    document.addEventListener('mousemove', (e) => {
        const now = performance.now() * 0.001;
        const x   = e.clientX / window.innerWidth;
        const y   = 1.0 - e.clientY / window.innerHeight; // WebGL Y-up

        const dx = x - lastX, dy = y - lastY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > RIPPLE_THRESH && now - lastEmitTime > 0.18) {
            ripples.push({ x, y, born: now });
            if (ripples.length > MAX_RIPPLES) ripples.shift();
            lastX = x; lastY = y;
            lastEmitTime = now;
        }
    });

    // ── Render loop ───────────────────────────────────────────────────────────
    const update = (t) => {
        requestAnimationFrame(update);
        const now = performance.now() * 0.001;
        program.uniforms.uTime.value = t * 0.001;

        // Remove expired ripples
        for (let i = ripples.length - 1; i >= 0; i--) {
            if (now - ripples[i].born >= RIPPLE_LIFETIME) ripples.splice(i, 1);
        }

        // Upload ripple data to shader slots
        for (let i = 0; i < MAX_RIPPLES; i++) {
            const u = program.uniforms[slotKeys[i]].value;
            if (i < ripples.length) {
                u[0] = ripples[i].x;
                u[1] = ripples[i].y;
                u[2] = now - ripples[i].born; // age in seconds
            } else {
                u[0] = 0; u[1] = 0; u[2] = 99; // inactive
            }
        }

        renderer.render({ scene: mesh });
    };
    requestAnimationFrame(update);
}

try {
    initAurora();
} catch (e) {
    console.warn('WebGL no soportado, cayendo a fondo estático CSS.');
}
