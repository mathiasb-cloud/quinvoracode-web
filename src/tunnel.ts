/* ============================================================
   ABOUT · túnel de partículas guiado por el scroll
   El progreso del scroll (0 → 1) mueve la cámara a lo largo de un
   valle de partículas. Los textos (.tunnel__station) aparecen,
   se acercan y se desvanecen según ese mismo progreso.
   ============================================================ */
import * as THREE from 'three';
import ScrollTrigger from 'gsap/ScrollTrigger';

const LENGTH = 300;      // recorrido total de la cámara
const FOG_NEAR = 18;
const FOG_FAR = 150;

// Paleta Quinvora (la misma que en style.scss)
const AMBER = new THREE.Color('rgb(240, 170, 98)');
const AZURE = new THREE.Color('rgb(112, 158, 236)');
const CREAM = new THREE.Color('rgb(244, 238, 226)');

/* ---------- GLSL compartido: altura del terreno ---------- */
const TERRAIN_GLSL = /* glsl */ `
  uniform float uTime;

  float hash(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = p * 2.03 + 17.1;
      a *= 0.5;
    }
    return v;
  }

  // 0 en el centro del valle, 1 en las laderas
  float sideOf(vec2 xz) {
    return smoothstep(5.0, 55.0, abs(xz.x));
  }

  // Altura del terreno: valle central con dunas que respiran
  float terrain(vec2 xz) {
    float side = sideOf(xz);
    float n = fbm(xz * 0.045 + vec2(uTime * 0.02, uTime * 0.035));
    float dunes = sin(xz.y * 0.08 + xz.x * 0.05 + uTime * 0.25) * 0.7;
    return (n - 0.5) * 7.0 + dunes + side * side * 24.0 + side * n * 10.0;
  }
`;

/* ---------- Terreno como nube de puntos ---------- */
const POINTS_VERT = /* glsl */ `
  ${TERRAIN_GLSL}
  uniform float uBase;
  uniform float uFlip;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uOpacity;
  uniform vec3 uLow;
  uniform vec3 uHigh;
  uniform vec3 uPeak;
  attribute float aSeed;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    // Rompe la cuadrícula para que parezca polvo y no una malla
    p.xz += (vec2(aSeed, fract(aSeed * 7.13)) - 0.5) * 1.1;

    float h = terrain(p.xz);
    p.y = uBase + uFlip * h;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = -mv.z;

    float side = sideOf(p.xz);
    float crest = smoothstep(0.62, 0.95, fbm(p.xz * 0.09 - uTime * 0.03));
    vColor = mix(mix(uLow, uHigh, side), uPeak, crest * 0.8);

    float twinkle = 0.55 + 0.45 * sin(uTime * 1.6 + aSeed * 60.0);
    float fog = 1.0 - smoothstep(${FOG_NEAR.toFixed(1)}, ${FOG_FAR.toFixed(1)}, dist);
    float near = smoothstep(0.6, 5.0, dist);
    vAlpha = fog * near * twinkle * uOpacity * (0.55 + crest * 0.9);

    gl_PointSize = uSize * uPixelRatio * (0.5 + aSeed) * (12.0 / max(dist, 0.1));
  }
`;

const POINTS_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, a * a * vAlpha);
  }
`;

/* ---------- Terreno como niebla luminosa (superficie) ---------- */
const MIST_VERT = /* glsl */ `
  ${TERRAIN_GLSL}
  uniform float uBase;
  varying vec3 vNormal2;
  varying vec3 vView;
  varying float vSide;
  varying float vDist;

  void main() {
    vec3 p = position;
    float e = 0.8;
    float h = terrain(p.xz);
    float hL = terrain(p.xz - vec2(e, 0.0));
    float hR = terrain(p.xz + vec2(e, 0.0));
    float hD = terrain(p.xz - vec2(0.0, e));
    float hU = terrain(p.xz + vec2(0.0, e));
    p.y = uBase + h;

    vNormal2 = normalize(vec3(hL - hR, 2.0 * e, hD - hU));
    vSide = sideOf(p.xz);

    vec4 world = modelMatrix * vec4(p, 1.0);
    vView = normalize(cameraPosition - world.xyz);
    vec4 mv = viewMatrix * world;
    vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const MIST_FRAG = /* glsl */ `
  uniform vec3 uLow;
  uniform vec3 uHigh;
  uniform float uOpacity;
  varying vec3 vNormal2;
  varying vec3 vView;
  varying float vSide;
  varying float vDist;

  void main() {
    vec3 light = normalize(vec3(0.25, 0.9, -0.6));
    float diff = clamp(dot(vNormal2, light), 0.0, 1.0);
    float rim = pow(1.0 - clamp(dot(vNormal2, vView), 0.0, 1.0), 2.5);
    vec3 col = mix(uLow, uHigh, vSide);
    float fog = 1.0 - smoothstep(${FOG_NEAR.toFixed(1)}, ${FOG_FAR.toFixed(1)}, vDist);
    float near = smoothstep(1.0, 8.0, vDist);
    float a = (diff * 0.35 + rim * 0.9) * fog * near * uOpacity;
    gl_FragColor = vec4(col * (0.35 + diff * 0.65 + rim), a);
  }
`;

/* ---------- Polvo flotante ---------- */
const DUST_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  attribute float aSeed;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    p.x += sin(uTime * 0.25 + aSeed * 31.0) * 0.8;
    p.y += cos(uTime * 0.2 + aSeed * 17.0) * 0.6;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = -mv.z;

    float twinkle = 0.4 + 0.6 * pow(0.5 + 0.5 * sin(uTime * 2.2 + aSeed * 90.0), 3.0);
    float fog = 1.0 - smoothstep(${FOG_NEAR.toFixed(1)}, ${(FOG_FAR * 0.8).toFixed(1)}, dist);
    vAlpha = fog * smoothstep(0.5, 3.0, dist) * twinkle;
    vColor = aColor;
    gl_PointSize = uSize * uPixelRatio * (0.6 + aSeed * 1.2) * (12.0 / max(dist, 0.1));
  }
`;

/* ---------- Portal final: anillo de partículas que gira ---------- */
const PORTAL_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uReveal;
  uniform vec3 uA;
  uniform vec3 uB;
  uniform vec3 uC;
  attribute float aSeed;
  attribute float aAngle;
  attribute float aRadius;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float ang = aAngle + uTime * (0.06 + aSeed * 0.05);
    float r = aRadius + sin(uTime * 0.8 + aSeed * 40.0) * 0.25;
    vec3 p = position + vec3(cos(ang) * r, sin(ang) * r, (aSeed - 0.5) * 2.0);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = -mv.z;

    float s = 0.5 + 0.5 * sin(aAngle * 2.0);
    vColor = mix(mix(uA, uB, s), uC, smoothstep(0.7, 1.0, aSeed));
    vAlpha = uReveal * (0.5 + 0.5 * sin(uTime * 2.0 + aSeed * 70.0));
    gl_PointSize = uSize * uPixelRatio * (0.6 + aSeed) * (12.0 / max(dist, 0.1));
  }
`;

const GLOW_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uReveal;
  varying vec2 vUv;

  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = pow(clamp(1.0 - d, 0.0, 1.0), 2.6);
    gl_FragColor = vec4(uColor, a * 0.55 * uReveal);
  }
`;

const GLOW_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;


/* ---------- Utilidades ---------- */
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function seeds(count: number): Float32Array {
  const out = new Float32Array(count);
  for (let i = 0; i < count; i++) out[i] = Math.random();
  return out;
}


/* ---------- Construcción de la escena ---------- */
function buildScene(scene: THREE.Scene, small: boolean, pixelRatio: number) {
  const uTime = { value: 0 };
  const uPixelRatio = { value: pixelRatio };

  // Terreno: una sola malla que comparten los puntos del suelo y del techo
  const planeLength = LENGTH + 200;
  const ground = new THREE.PlaneGeometry(140, planeLength, small ? 120 : 220, small ? 280 : 520);
  ground.rotateX(-Math.PI / 2);
  ground.translate(0, 0, -(planeLength / 2 - 40));
  ground.setAttribute('aSeed', new THREE.BufferAttribute(seeds(ground.attributes.position.count), 1));

  const pointsMaterial = (base: number, flip: number, opacity: number, size: number) =>
    new THREE.ShaderMaterial({
      vertexShader: POINTS_VERT,
      fragmentShader: POINTS_FRAG,
      uniforms: {
        uTime,
        uPixelRatio,
        uBase: { value: base },
        uFlip: { value: flip },
        uSize: { value: size },
        uOpacity: { value: opacity },
        uLow: { value: AMBER },
        uHigh: { value: AZURE },
        uPeak: { value: CREAM },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

  const floor = new THREE.Points(ground, pointsMaterial(-6, 1, 1, 2.2));
  const ceiling = new THREE.Points(ground, pointsMaterial(11, -0.55, 0.4, 1.6));
  floor.frustumCulled = ceiling.frustumCulled = false;
  scene.add(floor, ceiling);

  // Superficie luminosa bajo los puntos
  const mistGeo = new THREE.PlaneGeometry(140, planeLength, small ? 70 : 140, small ? 170 : 330);
  mistGeo.rotateX(-Math.PI / 2);
  mistGeo.translate(0, 0, -(planeLength / 2 - 40));
  const mist = new THREE.Mesh(mistGeo, new THREE.ShaderMaterial({
    vertexShader: MIST_VERT,
    fragmentShader: MIST_FRAG,
    uniforms: {
      uTime,
      uBase: { value: -6.4 },
      uLow: { value: AMBER },
      uHigh: { value: AZURE },
      uOpacity: { value: 0.32 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  mist.frustumCulled = false;
  scene.add(mist);

  // Polvo flotante a lo largo de todo el recorrido
  const dustCount = small ? 1400 : 2800;
  const dustPos = new Float32Array(dustCount * 3);
  const dustCol = new Float32Array(dustCount * 3);
  const palette = [CREAM, CREAM, CREAM, AMBER, AZURE];
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 60;
    dustPos[i * 3 + 1] = -3 + Math.random() * 14;
    dustPos[i * 3 + 2] = 30 - Math.random() * (LENGTH + 110);
    const c = palette[Math.floor(Math.random() * palette.length)];
    dustCol.set([c.r, c.g, c.b], i * 3);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute('aColor', new THREE.BufferAttribute(dustCol, 3));
  dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds(dustCount), 1));
  const dust = new THREE.Points(dustGeo, new THREE.ShaderMaterial({
    vertexShader: DUST_VERT,
    fragmentShader: POINTS_FRAG,
    uniforms: { uTime, uPixelRatio, uSize: { value: 2.2 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  dust.frustumCulled = false;
  scene.add(dust);

  // Portal al final del túnel
  const portalZ = -LENGTH - 26;
  const uReveal = { value: 0 };
  const ringCount = small ? 1400 : 2600;
  const ringGeo = new THREE.BufferGeometry();
  const angles = new Float32Array(ringCount);
  const radii = new Float32Array(ringCount);
  for (let i = 0; i < ringCount; i++) {
    angles[i] = Math.random() * Math.PI * 2;
    radii[i] = 8.5 + (Math.random() ** 2) * (Math.random() < 0.5 ? -1.6 : 2.4);
  }
  ringGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ringCount * 3), 3));
  ringGeo.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1));
  ringGeo.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));
  ringGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds(ringCount), 1));
  const ring = new THREE.Points(ringGeo, new THREE.ShaderMaterial({
    vertexShader: PORTAL_VERT,
    fragmentShader: POINTS_FRAG,
    uniforms: { uTime, uPixelRatio, uReveal, uSize: { value: 3.6 }, uA: { value: AMBER }, uB: { value: AZURE }, uC: { value: CREAM } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  ring.position.set(0, 1.2, portalZ);
  ring.frustumCulled = false;

  const glow = new THREE.Mesh(new THREE.PlaneGeometry(46, 46), new THREE.ShaderMaterial({
    vertexShader: GLOW_VERT,
    fragmentShader: GLOW_FRAG,
    uniforms: { uReveal, uColor: { value: CREAM.clone().lerp(AMBER, 0.35) } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  glow.position.set(0, 1.2, portalZ - 4);
  scene.add(ring, glow);

  return { uTime, uPixelRatio, uReveal };
}


/* ---------- Textos y HUD ---------- */
type Station = { el: HTMLElement; at: number; span: number; last: boolean; on: boolean };

function readStations(stage: HTMLElement): Station[] {
  const els = Array.from(stage.querySelectorAll<HTMLElement>('.tunnel__station'));
  return els.map((el, i) => ({
    el,
    at: Number(el.dataset.at ?? 0),
    span: i === 0 ? 0.075 : 0.065,
    last: i === els.length - 1,
    on: false,
  }));
}

/* d < 0: la parada se acerca · d ≈ 0: está delante · d > 0: la atravesamos */
function paintStation(s: Station, progress: number): void {
  let d = (progress - s.at) / s.span;
  if (s.last) d = Math.min(d, 0);
  if (s.at === 0) d = Math.max(d, 0);

  let opacity = 0;
  let scale = 1;
  let blur = 0;
  if (d > -1 && d < 1) {
    if (d < -0.3) {
      const t = smooth(-1, -0.3, d);
      opacity = t;
      scale = 0.78 + 0.22 * t;
      blur = (1 - t) * 6;
    } else if (d > 0.3) {
      const t = smooth(0.3, 1, d);
      opacity = 1 - t;
      scale = 1 + 0.45 * t;
      blur = t * 10;
    } else {
      opacity = 1;
    }
  }

  const visible = opacity > 0.01;
  s.el.style.opacity = visible ? opacity.toFixed(3) : '0';
  s.el.style.transform = visible ? `scale(${scale.toFixed(4)})` : '';
  s.el.style.filter = blur > 0.2 ? `blur(${blur.toFixed(2)}px)` : '';
  s.el.style.visibility = visible ? 'visible' : 'hidden';

  const on = opacity > 0.6;
  if (on !== s.on) {
    s.on = on;
    s.el.classList.toggle('is-on', on);
  }
}

function buildRail(rail: HTMLElement, count: number): HTMLElement[] {
  const ticks: HTMLElement[] = [];
  for (let i = 0; i < count; i++) {
    const tick = document.createElement('i');
    rail.appendChild(tick);
    ticks.push(tick);
  }
  return ticks;
}

function statusFor(p: number): string {
  if (p < 0.04) return 'Scroll to dive in';
  if (p < 0.6) return 'Keep going';
  if (p < 0.93) return 'Almost there';
  return 'Welcome aboard';
}


/* ---------- Arranque ---------- */
export function initTunnel(): void {
  const root = document.documentElement;
  const section = document.querySelector<HTMLElement>('.tunnel');
  const stage = section?.querySelector<HTMLElement>('.tunnel__stage');
  const canvas = section?.querySelector<HTMLCanvasElement>('.tunnel__canvas');
  if (!section || !stage || !canvas || !root.classList.contains('tunnel-js')) return;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  } catch {
    // Sin WebGL: se queda la versión estática
    root.classList.remove('tunnel-js');
    return;
  }

  const small = window.innerWidth < 768;
  const pixelRatio = Math.min(window.devicePixelRatio, small ? 1.5 : 1.75);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x070708, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 260);
  const { uTime, uPixelRatio, uReveal } = buildScene(scene, small, pixelRatio);

  const stations = readStations(stage);
  const status = stage.querySelector<HTMLElement>('.tunnel__status');
  const pct = stage.querySelector<HTMLElement>('.tunnel__pct');
  const rail = stage.querySelector<HTMLElement>('.tunnel__rail');
  const ticks = rail ? buildRail(rail, small ? 24 : 48) : [];

  // Tamaño del lienzo = tamaño de la escena fija
  const resize = () => {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uPixelRatio.value = renderer.getPixelRatio();
  };
  new ResizeObserver(resize).observe(stage);
  resize();

  // Progreso del scroll dentro de la sección
  let target = 0;
  const progressTrigger = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: self => { target = self.progress; },
  });
  target = progressTrigger.progress;

  // Movimiento sutil con el ratón
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('pointermove', e => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  // Si el teclado llega a un botón del final, lleva el scroll hasta allí
  stations[stations.length - 1]?.el.addEventListener('focusin', () => {
    if (progress < 0.95) window.scrollTo(0, section.offsetTop + section.offsetHeight - window.innerHeight);
  });

  let lastTime = performance.now();
  let progress = target;
  // En pantallas verticales se abre el campo de visión para ver las laderas
  const baseFov = () => (camera.aspect < 1 ? 78 : 60);
  let fov = baseFov();
  let lastStatus = '';
  let lastTicks = -1;
  const look = new THREE.Vector3();

  const pathX = (p: number) => Math.sin(p * Math.PI * 2) * 3;
  const pathY = (p: number) => 0.6 + Math.sin(p * Math.PI * 3) * 0.7;

  const frame = () => {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    uTime.value += dt;

    // Interpolación: la cámara persigue al scroll con algo de inercia
    const k = 1 - Math.pow(0.0009, dt);
    const prev = progress;
    progress += (target - progress) * k;
    if (Math.abs(target - progress) < 0.00005) progress = target;
    const velocity = (progress - prev) / Math.max(dt, 0.001);

    pointer.sx += (pointer.x - pointer.sx) * (1 - Math.pow(0.02, dt));
    pointer.sy += (pointer.y - pointer.sy) * (1 - Math.pow(0.02, dt));

    const z = -progress * LENGTH;
    camera.position.set(pathX(progress) + pointer.sx * 1.4, pathY(progress) - pointer.sy * 0.8, z);
    const ahead = clamp01(progress + 0.06);
    look.set(pathX(ahead) * 0.6 + pointer.sx * 2.5, pathY(ahead) - 0.6 - pointer.sy * 1.2, z - 20);
    camera.lookAt(look);

    // Al ir rápido se abre el campo de visión: sensación de velocidad
    const targetFov = baseFov() + Math.min(Math.abs(velocity) * 90, 16);
    fov += (targetFov - fov) * (1 - Math.pow(0.05, dt));
    camera.fov = fov;
    camera.updateProjectionMatrix();

    uReveal.value = smooth(0.82, 1, progress);

    renderer.render(scene, camera);

    for (const s of stations) paintStation(s, progress);

    const label = statusFor(progress);
    if (label !== lastStatus && status) {
      status.textContent = label;
      lastStatus = label;
    }
    if (pct) pct.textContent = `${String(Math.round(progress * 100)).padStart(2, '0')}%`;
    const lit = Math.round(progress * ticks.length);
    if (lit !== lastTicks) {
      ticks.forEach((t, i) => t.classList.toggle('on', i < lit));
      lastTicks = lit;
    }
  };

  // Solo se dibuja mientras el túnel está en pantalla
  const setRunning = (running: boolean) => {
    if (running) lastTime = performance.now();
    renderer.setAnimationLoop(running ? frame : null);
  };
  ScrollTrigger.create({
    trigger: section,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: self => setRunning(self.isActive),
  });
  setRunning(true);

  root.classList.add('tunnel-ready');
}
