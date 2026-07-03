import * as THREE from 'three';

// Three.js r152+ enabled automatic color management by default, which changes
// how colors/lighting render compared to the r128 CDN build this scene was
// originally designed against. Disabling it restores the older, uncorrected
// color behavior the textures and lighting values were tuned for.


const BALL_RADIUS = 1.72;
const CAMERA_RADIUS = 6.5;
const TRANSITION_DURATION = 1.25;

function drawSeams(x, strokeStyle, lineWidth) {
  x.strokeStyle = strokeStyle;
  x.lineWidth = lineWidth;
  x.lineCap = 'round';
  x.beginPath();
  x.moveTo(0, 256);
  x.lineTo(1024, 256);
  x.stroke();
  [0, 512, 1024].forEach((u) => {
    x.beginPath();
    x.moveTo(u, 0);
    x.lineTo(u, 512);
    x.stroke();
  });
  x.beginPath();
  x.moveTo(256, 0);
  x.quadraticCurveTo(150, 256, 256, 512);
  x.stroke();
  x.beginPath();
  x.moveTo(768, 0);
  x.quadraticCurveTo(874, 256, 768, 512);
  x.stroke();
}

function makeBallTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const x = c.getContext('2d');

  const g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#d97a3d');
  g.addColorStop(0.5, '#c96426');
  g.addColorStop(1, '#b3521c');
  x.fillStyle = g;
  x.fillRect(0, 0, 1024, 512);

  // pebbled leather grain
  for (let i = 0; i < 9000; i++) {
    const shade = Math.random() > 0.5
      ? `rgba(70,30,8,${Math.random() * 0.16})`
      : `rgba(255,200,140,${Math.random() * 0.10})`;
    x.fillStyle = shade;
    const r = Math.random() * 1.8 + 0.3;
    x.beginPath();
    x.arc(Math.random() * 1024, Math.random() * 512, r, 0, Math.PI * 2);
    x.fill();
  }

  // subtle darker vignette near poles/edges for roundness cue
  const vg = x.createRadialGradient(512, 256, 60, 512, 256, 380);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(40,15,3,.28)');
  x.fillStyle = vg;
  x.fillRect(0, 0, 1024, 512);

  // seam channel: soft highlight either side of a dark groove for depth
  drawSeams(x, 'rgba(255,200,140,.28)', 13);
  drawSeams(x, '#120702', 8);

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  return tex;
}

function makeBallBumpMap() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#808080';
  x.fillRect(0, 0, 1024, 512);

  for (let i = 0; i < 7000; i++) {
    const px = Math.random() * 1024;
    const py = Math.random() * 512;
    const r = Math.random() * 1.4 + 0.7;
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, 'rgba(255,255,255,.85)');
    g.addColorStop(1, 'rgba(128,128,128,0)');
    x.fillStyle = g;
    x.beginPath();
    x.arc(px, py, r, 0, Math.PI * 2);
    x.fill();
  }

  drawSeams(x, '#1a1a1a', 10);

  return new THREE.CanvasTexture(c);
}

function radialTexture(soft) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(soft ? 0.45 : 0.25, 'rgba(255,255,255,.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Imperative WebGL scene: a draggable, spinning 3D basketball with a
 * color-reactive court glow, orbited by particles. `setMode()` drives the
 * masc/fem cinematic transition (camera orbit + color lerp + particle burst).
 */
export function createBasketballScene({ canvas, container, initialMode, modeColors }) {
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const W = container.clientWidth || 1;
  const H = container.clientHeight || 1;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !isMobile });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.75 : 2));
  renderer.setSize(W, H);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05070c, 0.052);
  const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);

  const colorObj = {
    masculino: new THREE.Color(modeColors.masculino.hex),
    femenino: new THREE.Color(modeColors.femenino.hex),
  };
  let mode = initialMode;
  const mood = colorObj[mode].clone();

  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_RADIUS, 64, 64),
    new THREE.MeshStandardMaterial({
      map: makeBallTexture(),
      bumpMap: makeBallBumpMap(),
      bumpScale: 0.028,
      roughness: 0.58,
      metalness: 0.04,
      
      
    })
  );
  ball.position.set(0, -0.32, 0);
  scene.add(ball);

  scene.add(new THREE.AmbientLight(0x3a4560, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(4, 6, 5);
  scene.add(key);
  const warm = new THREE.PointLight(0xffcf80, 0.5, 30);
  warm.position.set(-3, 1, 4);
  scene.add(warm);
  
  
  
  const rim = new THREE.PointLight(mood.getHex(), 2.6, 40);
  scene.add(rim);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshBasicMaterial({
      map: radialTexture(true),
      color: mood,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.05;
  scene.add(floor);

  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 34),
    new THREE.MeshBasicMaterial({
      map: radialTexture(false),
      color: mood,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  scene.add(backdrop);

  const particleCount = isMobile ? 130 : 260;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const r = 2.4 + Math.random() * 5;
    const a = Math.random() * Math.PI * 2;
    const e = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(e) * Math.cos(a);
    positions[i * 3 + 1] = r * Math.cos(e) * 0.7;
    positions[i * 3 + 2] = r * Math.sin(e) * Math.sin(a);
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({
    size: 0.06,
    map: radialTexture(false),
    color: mood,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // ── pointer drag / parallax ─────────────────────────────
  const ballVel = { x: 0, y: 0.34 };
  let az = 0;
  let mx = 0;
  let my = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let transition = null;

  const onPointerDown = (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.style.cursor = 'grabbing';
  };
  const onPointerMove = (e) => {
    if (dragging) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      ballVel.y = Math.max(-12, Math.min(12, dx * 0.14));
      ballVel.x = Math.max(-8, Math.min(8, dy * 0.1));
      lastX = e.clientX;
      lastY = e.clientY;
    } else {
      const r = container.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width) * 2 - 1;
      my = ((e.clientY - r.top) / r.height) * 2 - 1;
    }
  };
  const onPointerUp = () => {
    dragging = false;
    canvas.style.cursor = 'grab';
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

  // ── render loop ──────────────────────────────────────────
  let disposed = false;
  let raf = null;
  let last = performance.now();

  const loop = () => {
    if (disposed) return;
    raf = requestAnimationFrame(loop);
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    let currentAz;
    let curMood;
    let burst = 0;

    if (transition && transition.active) {
      transition.prog += dt / TRANSITION_DURATION;
      const p = Math.min(transition.prog, 1);
      const e = easeInOutCubic(p);
      currentAz = transition.azFrom + e * Math.PI;
      curMood = transition.from.clone().lerp(transition.to, e);
      burst = 1.4 * Math.sin(p * Math.PI);
      if (transition.prog >= 1) {
        az = transition.azFrom + Math.PI;
        transition.active = false;
        transition.onDone?.();
      }
    } else {
      az += dt * 0.05;
      currentAz = az;
      curMood = colorObj[mode];
    }

    if (!dragging) {
      ballVel.y += (0.34 - ballVel.y) * 0.02;
      ballVel.x += (0 - ballVel.x) * 0.04;
    }
    ball.rotation.y += ballVel.y * dt;
    ball.rotation.x += ballVel.x * dt;

    const ax = currentAz + mx * 0.28;
    camera.position.set(Math.sin(ax) * CAMERA_RADIUS, 1.05 - my * 0.5, Math.cos(ax) * CAMERA_RADIUS);
    camera.lookAt(0, -0.2, 0);

    rim.color.copy(curMood);
    floor.material.color.copy(curMood);
    backdrop.material.color.copy(curMood);
    particleMat.color.copy(curMood);

    const dir = camera.position.clone().normalize();
    rim.position.copy(dir).multiplyScalar(-5);
    rim.position.y += 3;
    backdrop.position.copy(dir).multiplyScalar(-15);
    backdrop.position.y = 1;
    backdrop.lookAt(camera.position);

    particles.rotation.y += dt * 0.03;
    particles.scale.setScalar(1 + burst);
    particleMat.opacity = 0.85 - burst * 0.25;

    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(loop);

  const resizeObserver = new ResizeObserver(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
  resizeObserver.observe(container);

  return {
    setMode(nextMode, { onDone } = {}) {
      if (nextMode === mode || (transition && transition.active)) return;
      transition = {
        active: true,
        prog: 0,
        azFrom: az,
        from: colorObj[mode].clone(),
        to: colorObj[nextMode].clone(),
        onDone,
      };
      mode = nextMode;
      ballVel.y += 13;
    },
    destroy() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      particleGeo.dispose();
      particleMat.dispose();
      particleMat.map?.dispose();
      floor.geometry.dispose();
      floor.material.dispose();
      floor.material.map?.dispose();
      backdrop.geometry.dispose();
      backdrop.material.dispose();
      backdrop.material.map?.dispose();
      ball.geometry.dispose();
      ball.material.map?.dispose();
      ball.material.bumpMap?.dispose();
      ball.material.dispose();
      renderer.dispose();
    },
  };
}














