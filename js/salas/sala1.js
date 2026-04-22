import * as THREE from "three";

// Utilidad: panel HTML flotante sobre el canvas
function crearPanel(id, html) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    el.className = "sala-panel";
    document.body.appendChild(el);
  }
  el.innerHTML = html;
  el.style.display = "block";
  return el;
}

export function sala1Historia(scene, camera, renderer) {
  // ── AMBIENTE ────────────────────────────────────────────────────
  scene.background = new THREE.Color(0x080c10);
  scene.fog = new THREE.FogExp2(0x080c10, 0.045);

  // Luz ambiente tenue
  const ambient = new THREE.AmbientLight(0x1a2a3a, 1.2);
  scene.add(ambient);

  // Luz principal cálida (como foco de museo)
  const spot = new THREE.SpotLight(0xffd580, 3.5, 18, Math.PI / 5, 0.4);
  spot.position.set(0, 8, 2);
  spot.target.position.set(0, 0, 0);
  spot.castShadow = true;
  scene.add(spot);
  scene.add(spot.target);

  // Luces de acento azuladas
  const rimL = new THREE.PointLight(0x204080, 2.0, 12);
  rimL.position.set(-5, 3, -2);
  scene.add(rimL);
  const rimR = new THREE.PointLight(0x102040, 1.5, 12);
  rimR.position.set(5, 2, -2);
  scene.add(rimR);

  // ── SUELO ───────────────────────────────────────────────────────
  const floorGeo = new THREE.PlaneGeometry(30, 30);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x0d1520, roughness: 0.9, metalness: 0.1 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // ── LÍNEA DE TIEMPO 3D ──────────────────────────────────────────
  const hitos = [
    { año: "1958", color: 0xff6b35, label: "Tennis\nfor Two" },
    { año: "1972", color: 0xffd700, label: "Pong\nAtari" },
    { año: "1978", color: 0x00ff88, label: "Space\nInvaders" },
    { año: "1985", color: 0xff3355, label: "Super\nMario" },
    { año: "1989", color: 0x44aaff, label: "Game\nBoy" },
    { año: "2000", color: 0xcc44ff, label: "PS2\nEra" },
    { año: "2007", color: 0xff8844, label: "iPhone\n& Mobile" },
    { año: "2020", color: 0x00ffcc, label: "PS5 / XSX\n& Cloud" },
  ];

  const objects = [];
  const lineGroup = new THREE.Group();
  scene.add(lineGroup);

  // Línea horizontal
  const lineMat = new THREE.MeshStandardMaterial({ color: 0x334466, roughness: 0.5 });
  const lineGeo = new THREE.BoxGeometry(22, 0.05, 0.05);
  const lineMesh = new THREE.Mesh(lineGeo, lineMat);
  lineMesh.position.set(0, 0.03, 0);
  lineGroup.add(lineMesh);

  hitos.forEach((h, i) => {
    const x = -9.5 + i * 2.8;

    // Pedestal
    const pedGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.8 + i * 0.06, 6);
    const pedMat = new THREE.MeshStandardMaterial({ color: 0x1a2a3a, roughness: 0.6, metalness: 0.4 });
    const ped = new THREE.Mesh(pedGeo, pedMat);
    ped.position.set(x, 0.4, 0);
    ped.castShadow = true;
    lineGroup.add(ped);

    // Orbe brillante
    const orbGeo = new THREE.IcosahedronGeometry(0.3 + i * 0.02, 2);
    const orbMat = new THREE.MeshStandardMaterial({
      color: h.color, emissive: h.color, emissiveIntensity: 0.4,
      roughness: 0.2, metalness: 0.7
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.set(x, 1.2 + i * 0.05, 0);
    orb.castShadow = true;
    lineGroup.add(orb);
    objects.push({ mesh: orb, y: orb.position.y, phase: i * 0.8 });

    // Luz puntual por orbe
    const pl = new THREE.PointLight(h.color, 0.8, 2.5);
    pl.position.copy(orb.position);
    lineGroup.add(pl);
  });

  // Partículas de fondo
  const partCount = 300;
  const partGeo = new THREE.BufferGeometry();
  const partPos = new Float32Array(partCount * 3);
  for (let i = 0; i < partCount; i++) {
    partPos[i*3]   = (Math.random() - 0.5) * 40;
    partPos[i*3+1] = Math.random() * 10;
    partPos[i*3+2] = (Math.random() - 0.5) * 20 - 5;
  }
  partGeo.setAttribute("position", new THREE.BufferAttribute(partPos, 3));
  const partMat = new THREE.PointsMaterial({ size: 0.04, color: 0x8899bb, transparent: true, opacity: 0.6 });
  const particles = new THREE.Points(partGeo, partMat);
  scene.add(particles);

  // ── PANEL HTML ──────────────────────────────────────────────────
  crearPanel("panel-sala1", `
    <div class="panel-inner">
      <div class="panel-tag">SALA 01</div>
      <h2>Historia de los<br/><span>Videojuegos</span></h2>
      <p>Desde los primeros experimentos electrónicos en los años 50 hasta la era del gaming en la nube, los videojuegos han evolucionado de simples puntos en pantalla a experiencias que mueven industrias multimillonarias.</p>
      <div class="timeline-labels">
        <div class="tl-item"><span class="tl-year">1958</span><span class="tl-desc">Primeros juegos electrónicos experimentales en laboratorios</span></div>
        <div class="tl-item"><span class="tl-year">1972</span><span class="tl-desc">Atari lanza Pong, el primer videojuego comercial exitoso</span></div>
        <div class="tl-item"><span class="tl-year">1985</span><span class="tl-desc">Nintendo salva la industria con Super Mario Bros</span></div>
        <div class="tl-item"><span class="tl-year">2000s</span><span class="tl-desc">Era 3D, internet y los juegos multijugador masivos</span></div>
        <div class="tl-item"><span class="tl-year">Hoy</span><span class="tl-desc">Cloud gaming, VR, IA generativa y metaverso</span></div>
      </div>
    </div>
  `);

  // ── UPDATE ──────────────────────────────────────────────────────
  function update(dt, t) {
    lineGroup.rotation.y = Math.sin(t * 0.1) * 0.08;
    objects.forEach(o => {
      o.mesh.position.y = o.y + Math.sin(t * 0.8 + o.phase) * 0.08;
      o.mesh.rotation.y += dt * 0.5;
    });
    particles.rotation.y += dt * 0.01;
  }

  function dispose() {
    const el = document.getElementById("panel-sala1");
    if (el) el.style.display = "none";
  }

  return { update, dispose };
}
