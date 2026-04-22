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

export function sala2Cognitivos(scene, camera, renderer) {
  scene.background = new THREE.Color(0x05100a);
  scene.fog = new THREE.FogExp2(0x051a0f, 0.04);

  const ambient = new THREE.AmbientLight(0x0a2a1a, 1.5);
  scene.add(ambient);

  const spot = new THREE.SpotLight(0x80ffcc, 2.5, 20, Math.PI / 4, 0.5);
  spot.position.set(0, 10, 3);
  spot.castShadow = true;
  scene.add(spot);

  // Luces de neón verde
  const neon1 = new THREE.PointLight(0x00ff88, 2.5, 8);
  neon1.position.set(-4, 3, -1);
  scene.add(neon1);
  const neon2 = new THREE.PointLight(0x00ccff, 2.0, 8);
  neon2.position.set(4, 2, -1);
  scene.add(neon2);

  // Suelo
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x081510, roughness: 0.85 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // ── CEREBRO SIMULADO: ESFERAS CONECTADAS ────────────────────────
  const brainGroup = new THREE.Group();
  brainGroup.position.set(2.5, 2.2, -1);
  scene.add(brainGroup);

  const nodos = [];
  const nodoCount = 18;
  const nodoGeo = new THREE.IcosahedronGeometry(0.12, 1);

  for (let i = 0; i < nodoCount; i++) {
    const phi = Math.acos(1 - 2 * (i + 0.5) / nodoCount);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const r = 1.2 + Math.sin(i * 1.3) * 0.3;
    const mat = new THREE.MeshStandardMaterial({
      color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.5,
      roughness: 0.2, metalness: 0.6
    });
    const mesh = new THREE.Mesh(nodoGeo, mat);
    mesh.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
    brainGroup.add(mesh);
    nodos.push({ mesh, orig: mesh.position.clone(), phase: i * 0.4 });
  }

  // Conexiones (líneas)
  const connMat = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.25 });
  for (let i = 0; i < nodoCount; i++) {
    for (let j = i + 1; j < nodoCount; j++) {
      if (nodos[i].orig.distanceTo(nodos[j].orig) < 1.1) {
        const pts = [nodos[i].orig.clone(), nodos[j].orig.clone()];
        const lg = new THREE.BufferGeometry().setFromPoints(pts);
        brainGroup.add(new THREE.Line(lg, connMat));
      }
    }
  }

  // ── ICONOS FLOTANTES ─────────────────────────────────────────────
  const iconGroup = new THREE.Group();
  iconGroup.position.set(-3, 1.5, 0);
  scene.add(iconGroup);

  const beneficios = [
    { color: 0x00ff88, shape: "torus" },
    { color: 0x44ccff, shape: "oct" },
    { color: 0xffcc00, shape: "ico" },
    { color: 0xff6688, shape: "box" },
  ];
  const iconMeshes = [];
  beneficios.forEach((b, i) => {
    let geo;
    if (b.shape === "torus")  geo = new THREE.TorusGeometry(0.3, 0.08, 12, 40);
    else if (b.shape === "oct") geo = new THREE.OctahedronGeometry(0.28);
    else if (b.shape === "ico") geo = new THREE.IcosahedronGeometry(0.28, 0);
    else geo = new THREE.BoxGeometry(0.4, 0.4, 0.4);

    const mat = new THREE.MeshStandardMaterial({
      color: b.color, emissive: b.color, emissiveIntensity: 0.35,
      roughness: 0.25, metalness: 0.6
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(0, i * 1.1, 0);
    iconGroup.add(m);
    iconMeshes.push({ mesh: m, phase: i * 1.1 });

    const pl = new THREE.PointLight(b.color, 0.6, 2);
    pl.position.copy(m.position);
    iconGroup.add(pl);
  });

  crearPanel("panel-sala2", `
    <div class="panel-inner">
      <div class="panel-tag">SALA 02</div>
      <h2>Beneficios<br/><span>Cognitivos</span></h2>
      <p>La investigación científica demuestra que los videojuegos mejoran activamente las capacidades cerebrales.</p>
      <div class="benefit-grid">
        <div class="benefit-card" style="--c:#00ff88">
          <div class="b-icon">🧠</div>
          <strong>Memoria de trabajo</strong>
          <span>+23% mejora en capacidad de retención a corto plazo</span>
        </div>
        <div class="benefit-card" style="--c:#44ccff">
          <div class="b-icon">👁️</div>
          <strong>Atención visual</strong>
          <span>Mayor capacidad de procesar múltiples estímulos</span>
        </div>
        <div class="benefit-card" style="--c:#ffcc00">
          <div class="b-icon">⚡</div>
          <strong>Tiempo de reacción</strong>
          <span>Respuestas hasta 25% más rápidas ante estímulos</span>
        </div>
        <div class="benefit-card" style="--c:#ff6688">
          <div class="b-icon">🔄</div>
          <strong>Flexibilidad cognitiva</strong>
          <span>Mejor adaptación a cambios de reglas y contexto</span>
        </div>
      </div>
      <p class="source">Fuentes: Green & Bavelier (2012), Kühn et al. (2014), APA (2020)</p>
    </div>
  `);

  const objects = [...nodos, ...iconMeshes];

  function update(dt, t) {
    brainGroup.rotation.y += dt * 0.25;
    brainGroup.rotation.x = Math.sin(t * 0.3) * 0.15;

    nodos.forEach(n => {
      n.mesh.position.x = n.orig.x + Math.sin(t * 1.2 + n.phase) * 0.06;
      n.mesh.position.y = n.orig.y + Math.cos(t * 0.9 + n.phase) * 0.06;
      n.mesh.material.emissiveIntensity = 0.3 + Math.sin(t * 2 + n.phase) * 0.3;
    });

    iconMeshes.forEach(o => {
      o.mesh.position.y = (iconMeshes.indexOf(o)) * 1.1 + Math.sin(t * 0.8 + o.phase) * 0.1;
      o.mesh.rotation.y += dt * 0.8;
      o.mesh.rotation.x += dt * 0.3;
    });

    neon1.intensity = 2.0 + Math.sin(t * 2.5) * 0.5;
  }

  function dispose() {
    const el = document.getElementById("panel-sala2");
    if (el) el.style.display = "none";
  }

  return { update, dispose };
}
