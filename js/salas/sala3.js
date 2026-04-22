import * as THREE from "three";

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

export function sala3Sociales(scene, camera, renderer) {
  scene.background = new THREE.Color(0x0a0510);
  scene.fog = new THREE.FogExp2(0x0d0618, 0.038);

  const ambient = new THREE.AmbientLight(0x2a1050, 1.8);
  scene.add(ambient);

  const spot = new THREE.SpotLight(0xcc88ff, 2.8, 22, Math.PI / 3.5, 0.45);
  spot.position.set(0, 10, 4);
  spot.castShadow = true;
  scene.add(spot);

  const purple = new THREE.PointLight(0x8833ff, 3.0, 10);
  purple.position.set(-3, 4, 0);
  scene.add(purple);
  const pink = new THREE.PointLight(0xff44aa, 2.0, 8);
  pink.position.set(4, 3, -2);
  scene.add(pink);

  // Suelo
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ color: 0x100820, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // ── RED SOCIAL 3D ────────────────────────────────────────────────
  const netGroup = new THREE.Group();
  netGroup.position.set(2.5, 2.5, -1.5);
  scene.add(netGroup);

  const playerColors = [0xff44aa, 0x8833ff, 0x44aaff, 0x44ffaa, 0xffaa44, 0xff4444, 0x44ff88];
  const players = [];

  for (let i = 0; i < 7; i++) {
    const phi = (i / 7) * Math.PI * 2;
    const r = i === 0 ? 0 : 1.4;
    const geo = new THREE.SphereGeometry(i === 0 ? 0.35 : 0.22, 16, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: playerColors[i], emissive: playerColors[i], emissiveIntensity: 0.45,
      roughness: 0.2, metalness: 0.5
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(
      i === 0 ? 0 : Math.cos(phi) * r,
      i === 0 ? 0 : Math.sin(phi) * r * 0.4,
      i === 0 ? 0 : Math.sin(phi) * r
    );
    netGroup.add(m);

    const pl = new THREE.PointLight(playerColors[i], 0.7, 1.8);
    pl.position.copy(m.position);
    netGroup.add(pl);

    players.push({ mesh: m, phi, r, phase: i * 0.9 });
  }

  // Conexiones entre jugadores
  const connMat = new THREE.LineBasicMaterial({ color: 0xcc88ff, transparent: true, opacity: 0.3 });
  for (let i = 1; i < players.length; i++) {
    const pts = [players[0].mesh.position.clone(), players[i].mesh.position.clone()];
    netGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), connMat));
  }

  // Anillos orbitales decorativos
  const ringGeos = [1.0, 1.5, 2.0].map(r => new THREE.TorusGeometry(r, 0.02, 8, 60));
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x8833ff, emissive: 0x8833ff, emissiveIntensity: 0.2, transparent: true, opacity: 0.4 });
  ringGeos.forEach((g, i) => {
    const ring = new THREE.Mesh(g, ringMat);
    ring.rotation.x = Math.PI / 2 + i * 0.3;
    netGroup.add(ring);
  });

  // Partículas flotantes
  const partGeo = new THREE.BufferGeometry();
  const partPos = new Float32Array(200 * 3);
  for (let i = 0; i < 200; i++) {
    partPos[i*3]   = (Math.random() - 0.5) * 30;
    partPos[i*3+1] = Math.random() * 8;
    partPos[i*3+2] = (Math.random() - 0.5) * 20;
  }
  partGeo.setAttribute("position", new THREE.BufferAttribute(partPos, 3));
  const particles = new THREE.Points(partGeo, new THREE.PointsMaterial({ size: 0.05, color: 0xcc88ff, transparent: true, opacity: 0.5 }));
  scene.add(particles);

  crearPanel("panel-sala3", `
    <div class="panel-inner">
      <div class="panel-tag">SALA 03</div>
      <h2>Beneficios<br/><span>Sociales</span></h2>
      <p>Contrario al mito del "gamer solitario", los videojuegos son hoy una de las mayores plataformas de socialización del mundo.</p>
      <div class="benefit-grid">
        <div class="benefit-card" style="--c:#ff44aa">
          <div class="b-icon">🤝</div>
          <strong>Trabajo en equipo</strong>
          <span>Los juegos cooperativos desarrollan liderazgo y comunicación</span>
        </div>
        <div class="benefit-card" style="--c:#8833ff">
          <div class="b-icon">🌍</div>
          <strong>Conexión global</strong>
          <span>+3.2 mil millones de jugadores conectados mundialmente</span>
        </div>
        <div class="benefit-card" style="--c:#44aaff">
          <div class="b-icon">💬</div>
          <strong>Comunicación</strong>
          <span>Mejora habilidades de negociación y resolución de conflictos</span>
        </div>
        <div class="benefit-card" style="--c:#44ffaa">
          <div class="b-icon">🎯</div>
          <strong>Inclusión</strong>
          <span>Espacios seguros para personas con dificultades de socialización</span>
        </div>
      </div>
      <p class="source">Fuentes: Pew Research (2021), Kowert et al. (2014), ISFE (2023)</p>
    </div>
  `);

  function update(dt, t) {
    netGroup.rotation.y += dt * 0.2;

    players.forEach((p, i) => {
      if (i === 0) {
        p.mesh.scale.setScalar(1 + Math.sin(t * 2) * 0.06);
      } else {
        const phi2 = p.phi + t * 0.3;
        p.mesh.position.set(
          Math.cos(phi2) * p.r,
          Math.sin(phi2 + p.phase) * p.r * 0.3,
          Math.sin(phi2) * p.r
        );
      }
      p.mesh.material.emissiveIntensity = 0.35 + Math.sin(t * 1.5 + p.phase) * 0.2;
    });

    purple.intensity = 2.5 + Math.sin(t * 1.8) * 0.5;
    particles.rotation.y += dt * 0.008;
  }

  function dispose() {
    const el = document.getElementById("panel-sala3");
    if (el) el.style.display = "none";
  }

  return { update, dispose };
}
