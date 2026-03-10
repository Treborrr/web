import { Renderer, Program, Mesh, Triangle, Color } from 'https://esm.sh/ogl';

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
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    
    varying vec2 vUv;

    // Simplex 2D noise
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    float snoise(vec2 v){
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
               -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
      + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
        dot(x12.zw,x12.zw)), 0.0);
      m = m*m ;
      m = m*m ;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
        vec2 uv = vUv;
        
        // a) Simplex Noise - ruido más amplio y lento para una elegancia "premium".
        float noiseVal = snoise(vec2(uv.x * 1.5 + uTime * 0.07, uTime * 0.15));
        float height = noiseVal * 0.5 * uAmplitude;
        
        // b) Exponencial - curva suave pero dramática
        height = exp(height) * 0.25; 
        
        // c) Gradiente de colores orgánico - usamos ruido para deformar sutilmente la unión de los colores
        float colorWarp = snoise(vec2(uv.x * 2.0, uTime * 0.1)) * 0.2;
        vec3 rampColor = mix(uColor1, uColor2, smoothstep(0.0, 0.5, uv.x + colorWarp));
        rampColor = mix(rampColor, uColor3, smoothstep(0.4, 0.9, uv.x + colorWarp));
        
        // d) Caída de la aurora
        // Levantamos un poco el punto medio para que no invada la zona inferior de texto
        float midPoint = 0.6 + height; 
        float intensity = uv.y;
        
        // Asimetría en el smoothstep: ahora cae MÁS rápido hacia abajo para dejar el texto limpio
        float auroraAlpha = smoothstep(midPoint - uBlend * 0.45, midPoint + uBlend * 0.2, intensity);
        
        // El fondo Dracula (#282a36 en el techo, más oscuro #191a21 hacia el piso)
        vec3 bgTop = vec3(0.157, 0.165, 0.212);  
        vec3 bgBottom = vec3(0.098, 0.102, 0.129); 
        
        // Empujamos el negro intenso de fondo para que suba hasta el 40% de la pantalla
        vec3 deepBg = mix(bgBottom, bgTop, smoothstep(0.4, 0.9, uv.y));
        
        // Reducimos el alfa levemente (0.4) para una atmósfera neón súper sutil
        vec3 finalColor = mix(deepBg, rampColor, auroraAlpha * 0.4);
        
        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

function initAurora() {
    const renderer = new Renderer({ alpha: true, dpr: window.devicePixelRatio || 1 });
    const gl = renderer.gl;

    gl.canvas.style.position = 'fixed';
    gl.canvas.style.top = '0';
    gl.canvas.style.left = '0';
    gl.canvas.style.width = '100vw';
    gl.canvas.style.height = '100vh';
    gl.canvas.style.zIndex = '-2';
    gl.canvas.style.pointerEvents = 'none';
    document.body.appendChild(gl.canvas);

    const geometry = new Triangle(gl);

    const program = new Program(gl, {
        vertex,
        fragment,
        uniforms: {
            uTime: { value: 0 },
            uAmplitude: { value: 1.2 }, // Amplitud de la ola
            uBlend: { value: 1.0 },     // Qué tan suave es la caída de la aurora
            uColor1: { value: new Color('#8be9fd') }, // Cyan 
            uColor2: { value: new Color('#bd93f9') }, // Purple
            uColor3: { value: new Color('#ff79c6') }, // Pink
        },
    });

    const mesh = new Mesh(gl, { geometry, program });

    function resize() {
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', resize, false);
    resize();

    const speed = 1.0;
    const update = (t) => {
        requestAnimationFrame(update);
        program.uniforms.uTime.value = t * 0.001 * speed;
        renderer.render({ scene: mesh });
    };
    requestAnimationFrame(update);
}

// Iniciar solo si el dispositivo puede con ello (WebGL soportado)
try {
    initAurora();
} catch (e) {
    console.warn("WebGL no soportado, cayendo a fondo estático CSS.");
}
