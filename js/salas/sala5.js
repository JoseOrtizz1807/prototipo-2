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

export function sala5Galeria(scene, camera, renderer) {
  scene.background = new THREE.Color(0x0f0800);
  scene.fog = new THREE.FogExp2(0x120a00, 0.035);

  const ambient = new THREE.AmbientLight(0x3a2000, 2.0);
  scene.add(ambient);

  const spot = new THREE.SpotLight(0xffaa44, 3.5, 25, Math.PI / 3.5, 0.4);
  spot.position.set(0, 12, 5);
  spot.castShadow = true;
  scene.add(spot);

  const gold = new THREE.PointLight(0xffaa00, 2.8, 12);
  gold.position.set(-4, 4, 0);
  scene.add(gold);
  const orange = new THREE.PointLight(0xff5500, 2.0, 10);
  orange.position.set(4, 3, -2);
  scene.add(orange);

  // Suelo con patrón dorado
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ color: 0x1a1000, roughness: 0.85, metalness: 0.15 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // ── PEDESTALES DE CONSOLAS ───────────────────────────────────────
  const galGroup = new THREE.Group();
  galGroup.position.set(0, 0, 0);
  scene.add(galGroup);

  const consolas = [
    { nombre: "Atari 2600", año: 1977, color: 0xcc8822, shape: "box",    w: 0.8, h: 0.2, d: 0.5 },
    { nombre: "NES",        año: 1985, color: 0xff4444, shape: "box",    w: 0.7, h: 0.18, d: 0.5 },
    { nombre: "GameBoy",    año: 1989, color: 0x99cc44, shape: "box",    w: 0.35, h: 0.6, d: 0.12 },
    { nombre: "PlayStation",año: 1994, color: 0x4488ff, shape: "box",    w: 0.7, h: 0.1, d: 0.6 },
    { nombre: "Nintendo 64",año: 1996, color: 0xaa44ff, shape: "ico",    size: 0.38 },
    { nombre: "Xbox",       año: 2001, color: 0x44ff44, shape: "sphere", size: 0.35 },
    { nombre: "Wii",        año: 2006, color: 0xffffff, shape: "box",    w: 0.18, h: 0.7, d: 0.12 },
    { nombre: "Switch",     año: 2017, color: 0xff0044, shape: "box",    w: 0.75, h: 0.42, d: 0.08 },
  ];

  const consolaMeshes = [];
  const arcRadius = 5.5;

  consolas.forEach((c, i) => {
    const angle = (i / consolas.length) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * arcRadius;
    const z = Math.sin(angle) * arcRadius;

    // Pedestal
    const pedGeo = new THREE.CylinderGeometry(0.45, 0.5, 0.6, 8);
    const pedMat = new THREE.MeshStandardMaterial({ color: 0x2a1a00, roughness: 0.6, metalness: 0.5 });
    const ped = new THREE.Mesh(pedGeo, pedMat);
    ped.position.set(x, 0.3, z);
    ped.castShadow = true;
    galGroup.add(ped);

    // Consola (forma)
    let geo;
    if (c.shape === "box")    geo = new THREE.BoxGeometry(c.w, c.h, c.d);
    else if (c.shape === "ico") geo = new THREE.IcosahedronGeometry(c.size, 0);
    else geo = new THREE.SphereGeometry(c.size, 16, 16);

    const mat = new THREE.MeshStandardMaterial({
      color: c.color, emissive: c.color, emissiveIntensity: 0.3,
      roughness: 0.25, metalness: 0.65
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.9, z);
    mesh.castShadow = true;
    galGroup.add(mesh);

    const pl = new THREE.PointLight(c.color, 0.8, 2.5);
    pl.position.set(x, 1.4, z);
    galGroup.add(pl);

    consolaMeshes.push({ mesh, angle, phase: i * 0.75, y: 0.9 });
  });

  // Trofeo central
  const trofeoGroup = new THREE.Group();
  trofeoGroup.position.set(0, 0, 0);
  galGroup.add(trofeoGroup);

  const cupaGeo = new THREE.CylinderGeometry(0.5, 0.3, 1.0, 12);
  const cupaMat = new THREE.MeshStandardMaterial({ color: 0xffdd44, emissive: 0xffaa00, emissiveIntensity: 0.4, roughness: 0.1, metalness: 0.9 });
  const copa = new THREE.Mesh(cupaGeo, cupaMat);
  copa.position.y = 1.5;
  trofeoGroup.add(copa);

  const starGeo = new THREE.IcosahedronGeometry(0.4, 1);
  const starMat = new THREE.MeshStandardMaterial({ color: 0xffee00, emissive: 0xffcc00, emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.9 });
  const star = new THREE.Mesh(starGeo, starMat);
  star.position.y = 2.4;
  trofeoGroup.add(star);

  const trofeoLight = new THREE.PointLight(0xffee00, 3.0, 6);
  trofeoLight.position.y = 2.5;
  trofeoGroup.add(trofeoLight);

  // Partículas doradas
  const partGeo = new THREE.BufferGeometry();
  const partPos = new Float32Array(300 * 3);
  for (let i = 0; i < 300; i++) {
    partPos[i*3]   = (Math.random() - 0.5) * 30;
    partPos[i*3+1] = Math.random() * 8;
    partPos[i*3+2] = (Math.random() - 0.5) * 25;
  }
  partGeo.setAttribute("position", new THREE.BufferAttribute(partPos, 3));
  const particles = new THREE.Points(partGeo, new THREE.PointsMaterial({ size: 0.06, color: 0xffaa44, transparent: true, opacity: 0.6 }));
  scene.add(particles);

  crearPanel("panel-sala5", `
    <div class="panel-inner panel-final">
      <div class="panel-tag">SALA 05</div>
      <h2>Galería<br/><span>Icónica</span></h2>
      <p>Las consolas que definieron generaciones y crearon culturas alrededor del mundo.</p>
      <div class="consolas-list">
        <div class="consola-item"><span class="c-año">1977</span><span class="c-nombre">Atari 2600</span><span class="c-desc">El primer sistema en hogares masivo</span></div>
        <div class="consola-item"><span class="c-año">1985</span><span class="c-nombre">Nintendo NES</span><span class="c-desc">Salvó la industria tras el crash del 83</span></div>
        <div class="consola-item"><span class="c-año">1989</span><span class="c-nombre">Game Boy</span><span class="c-desc">100M unidades vendidas mundialmente</span></div>
        <div class="consola-item"><span class="c-año">1994</span><span class="c-nombre">PlayStation</span><span class="c-desc">Llevó el 3D a las masas</span></div>
        <div class="consola-item"><span class="c-año">2017</span><span class="c-nombre">Nintendo Switch</span><span class="c-desc">Fusión de consola y portátil</span></div>
      </div>
      <div class="conclusion-box">
        <strong>Conclusión de la tesis:</strong>
        <p>Los videojuegos no son solo entretenimiento. Son un medio cultural, una herramienta cognitiva y una plataforma social que ha transformado la manera en que los seres humanos aprendemos, nos relacionamos y vivimos.</p>
      </div>
    </div>
  `);

  function update(dt, t) {
    // Consolas flotan y rotan
    consolaMeshes.forEach(c => {
      c.mesh.position.y = c.y + Math.sin(t * 0.8 + c.phase) * 0.08;
      c.mesh.rotation.y += dt * 0.6;
    });

    // Trofeo central
    trofeoGroup.rotation.y += dt * 0.5;
    star.rotation.y += dt * 1.2;
    star.rotation.x += dt * 0.4;
    trofeoLight.intensity = 2.5 + Math.sin(t * 2.5) * 0.8;

    gold.intensity = 2.5 + Math.sin(t * 1.3) * 0.5;
    particles.rotation.y += dt * 0.012;
  }

  function dispose() {
    const el = document.getElementById("panel-sala5");
    if (el) el.style.display = "none";
  }

  return { update, dispose };
}
