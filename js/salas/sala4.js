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

export function sala4Estadisticas(scene, camera, renderer) {
  scene.background = new THREE.Color(0x020508);
  scene.fog = new THREE.FogExp2(0x020810, 0.025);

  // ── LUCES ────────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0x0a1828, 2.5));
  const blue  = new THREE.PointLight(0x1166ff, 3.0, 18);
  blue.position.set(-5, 6, 2);  scene.add(blue);
  const cyan  = new THREE.PointLight(0x00ffcc, 2.2, 14);
  cyan.position.set(5, 4, -3);  scene.add(cyan);
  const white = new THREE.PointLight(0xffffff, 1.2, 10);
  white.position.set(0, 8, 1);  scene.add(white);

  // ── SUELO REFLECTANTE ────────────────────────────────────────────
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color:0x020810, roughness:0.04, metalness:0.85 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;
  scene.add(floor);

  // Grid espacial tenue
  const grid = new THREE.GridHelper(60, 60, 0x071830, 0x040e20);
  grid.position.y = 0.005;
  scene.add(grid);

  // ── RED DE NODOS WIREFRAME (estilo three.js examples) ────────────
  const NODE_COUNT = 80;
  const nodes = [];
  const nodeGeo = new THREE.SphereGeometry(0.045, 6, 6);

  for (let i = 0; i < NODE_COUNT; i++) {
    const color = Math.random() > 0.6 ? 0x00ffcc : (Math.random() > 0.5 ? 0x4488ff : 0xcc44ff);
    const mat   = new THREE.MeshBasicMaterial({ color });
    const mesh  = new THREE.Mesh(nodeGeo, mat);
    mesh.position.set(
      (Math.random() - 0.5) * 22,
      Math.random() * 7 + 0.3,
      (Math.random() - 0.5) * 18
    );
    scene.add(mesh);
    nodes.push({
      mesh,
      vx: (Math.random() - 0.5) * 0.008,
      vy: (Math.random() - 0.5) * 0.004,
      vz: (Math.random() - 0.5) * 0.008,
      baseY: mesh.position.y,
    });
  }

  // Líneas entre nodos cercanos — BufferGeometry dinámica
  const MAX_LINES = 600;
  const linePositions = new Float32Array(MAX_LINES * 6);
  const lineColors    = new Float32Array(MAX_LINES * 6);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
  lineGeo.setAttribute("color",    new THREE.BufferAttribute(lineColors,    3));
  lineGeo.setDrawRange(0, 0);
  const lineMat = new THREE.LineSegments(lineGeo,
    new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55 })
  );
  scene.add(lineMat);

  // ── ANILLOS ORBITALES ANIMADOS ───────────────────────────────────
  const rings = [];
  [[3.8, 0x00ffcc, 0.6], [5.2, 0x4488ff, 0.4], [6.8, 0xcc44ff, 0.28]].forEach(([r, col, op]) => {
    const geo = new THREE.TorusGeometry(r, 0.018, 6, 80);
    const mat = new THREE.MeshStandardMaterial({
      color: col, emissive: col, emissiveIntensity: 0.7,
      transparent: true, opacity: op
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.position.set(0, 2.8, -1);
    ring.rotation.x = Math.PI / 2 + 0.4;
    scene.add(ring);
    rings.push({ mesh: ring, speed: 0.006 + Math.random() * 0.004 });
  });

  // ── ESFERA CENTRAL WIREFRAME ─────────────────────────────────────
  const sphereGroup = new THREE.Group();
  sphereGroup.position.set(0, 3.2, -1.5);
  scene.add(sphereGroup);

  const sphereOuter = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.35, 3),
    new THREE.MeshStandardMaterial({
      color: 0x0a2244, emissive: 0x001133, emissiveIntensity: 0.4,
      wireframe: true, transparent: true, opacity: 0.45
    })
  );
  sphereGroup.add(sphereOuter);

  const sphereInner = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.85, 2),
    new THREE.MeshStandardMaterial({
      color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 0.28,
      wireframe: true, transparent: true, opacity: 0.6
    })
  );
  sphereGroup.add(sphereInner);

  // Puntos orbitando la esfera
  const orbitDots = [];
  for (let i = 0; i < 24; i++) {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.038, 6, 6),
      new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x00ffcc : 0x4488ff })
    );
    sphereGroup.add(dot);
    orbitDots.push({ mesh: dot, phase: (i / 24) * Math.PI * 2, radius: 1.5 + Math.random() * 0.4, speed: 0.5 + Math.random() * 0.4, tilt: Math.random() * 0.8 });
  }

  // ── BARRAS 3D FLOTANTES ──────────────────────────────────────────
  const barGroup = new THREE.Group();
  barGroup.position.set(-4.5, 0, 1.5);
  scene.add(barGroup);

  const statsData = [
    { year: "2015", val: 91.5,  col: 0x2266cc },
    { year: "2017", val: 108.9, col: 0x3388ee },
    { year: "2019", val: 145.7, col: 0x44aaff },
    { year: "2020", val: 155.9, col: 0x00ddbb },
    { year: "2021", val: 180.3, col: 0x00ffcc },
    { year: "2023", val: 184.4, col: 0x44ffdd },
    { year: "2025*",val: 211.2, col: 0xffffff },
  ];
  const maxVal = 211.2, maxH = 3.8;
  const barMeshes = [];

  statsData.forEach((s, i) => {
    const h = (s.val / maxVal) * maxH;
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, h, 0.38),
      new THREE.MeshStandardMaterial({
        color: s.col, emissive: s.col, emissiveIntensity: 0.3,
        roughness: 0.25, metalness: 0.65, transparent: true, opacity: 0.88
      })
    );
    bar.position.set(i * 0.72 - 2.2, h / 2, 0);
    barGroup.add(bar);
    const pl = new THREE.PointLight(s.col, 0.4, 2.2);
    pl.position.copy(bar.position); pl.position.y += h / 2 + 0.3;
    barGroup.add(pl);
    barMeshes.push({ mesh: bar, pl, h, phase: i * 0.55 });
  });

  // ── PARTÍCULAS FLOTANTES ─────────────────────────────────────────
  const partCount = 280;
  const partGeo   = new THREE.BufferGeometry();
  const partPos   = new Float32Array(partCount * 3);
  const partSpeeds = new Float32Array(partCount);
  for (let i = 0; i < partCount; i++) {
    partPos[i*3]   = (Math.random() - 0.5) * 28;
    partPos[i*3+1] = Math.random() * 9;
    partPos[i*3+2] = (Math.random() - 0.5) * 22;
    partSpeeds[i]  = 0.003 + Math.random() * 0.008;
  }
  partGeo.setAttribute("position", new THREE.BufferAttribute(partPos, 3));
  const partMat = new THREE.PointsMaterial({
    size: 0.035, color: 0x88ccff, transparent: true, opacity: 0.5, sizeAttenuation: true
  });
  const particles = new THREE.Points(partGeo, partMat);
  scene.add(particles);

  // ── PANEL HTML PREMIUM ───────────────────────────────────────────
  // Inyectar estilos propios si no existen
  if (!document.getElementById("sala4-styles")) {
    const style = document.createElement("style");
    style.id = "sala4-styles";
    style.textContent = `
      #panel-sala4 {
        position: fixed;
        top: 72px; left: 18px;
        width: min(420px, 44vw);
        max-height: calc(100vh - 100px);
        overflow-y: auto;
        z-index: 8;
        pointer-events: none;
        scrollbar-width: thin;
        scrollbar-color: #00ffcc22 transparent;
        font-family: 'Space Mono', monospace;
      }
      #panel-sala4::-webkit-scrollbar { width: 3px; }
      #panel-sala4::-webkit-scrollbar-thumb { background: #00ffcc44; border-radius: 3px; }

      .s4-inner {
        background: linear-gradient(145deg, rgba(3,9,22,0.94), rgba(6,15,35,0.90));
        border: 1px solid rgba(0,255,204,0.18);
        border-radius: 22px;
        padding: 26px 22px 22px;
        backdrop-filter: blur(22px) saturate(1.6);
        box-shadow: 0 0 40px rgba(0,255,204,0.06), 0 24px 60px rgba(0,0,0,0.8),
                    inset 0 1px 0 rgba(255,255,255,0.06);
        position: relative;
        overflow: hidden;
      }
      .s4-inner::before {
        content: '';
        position: absolute; inset: 0;
        background: radial-gradient(ellipse at 20% 0%, rgba(0,255,204,0.07) 0%, transparent 60%),
                    radial-gradient(ellipse at 80% 100%, rgba(68,136,255,0.06) 0%, transparent 60%);
        pointer-events: none;
      }
      .s4-badge {
        display: inline-flex; align-items: center; gap: 7px;
        background: rgba(0,255,204,0.10); border: 1px solid rgba(0,255,204,0.30);
        border-radius: 20px; padding: 4px 13px; margin-bottom: 14px;
      }
      .s4-badge span { font-family: 'Orbitron',sans-serif; font-size: 9px; letter-spacing: .28em; color: #00ffcc; font-weight: 700; }
      .s4-title {
        font-family: 'Orbitron', sans-serif;
        font-size: clamp(18px, 2.2vw, 26px); font-weight: 900; line-height: 1.15;
        margin-bottom: 6px; color: #fff;
      }
      .s4-title em { font-style: normal;
        background: linear-gradient(90deg, #00ffcc, #4488ff);
        -webkit-background-clip: text; background-clip: text; color: transparent;
      }
      .s4-subtitle {
        font-size: 11px; color: rgba(166,200,190,0.65); line-height: 1.7;
        margin-bottom: 20px; border-left: 2px solid rgba(0,255,204,0.3); padding-left: 10px;
      }

      /* Métricas hero */
      .s4-metrics {
        display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 9px; margin-bottom: 20px;
      }
      .s4-metric {
        background: rgba(255,255,255,0.03); border: 1px solid rgba(0,255,204,0.15);
        border-radius: 13px; padding: 12px 9px; text-align: center;
        transition: border-color 0.3s;
        position: relative; overflow: hidden;
      }
      .s4-metric::after {
        content: '';
        position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
        width: 40%; height: 1.5px;
        background: linear-gradient(90deg, transparent, var(--mc, #00ffcc), transparent);
      }
      .s4-metric-val {
        font-family: 'Orbitron', sans-serif; font-size: clamp(16px, 1.8vw, 22px);
        font-weight: 900; color: var(--mc, #00ffcc);
        text-shadow: 0 0 12px var(--mc, #00ffcc);
        display: block; margin-bottom: 4px;
      }
      .s4-metric-ico { font-size: 16px; display: block; margin-bottom: 4px; }
      .s4-metric-lbl { font-size: 9px; color: rgba(166,200,190,0.55); line-height: 1.4; }

      /* Beneficios cognitivos cards */
      .s4-section-title {
        font-family: 'Orbitron', sans-serif; font-size: 10px; letter-spacing: .2em;
        color: rgba(0,255,204,0.6); text-transform: uppercase;
        margin-bottom: 10px; display: flex; align-items: center; gap: 8px;
      }
      .s4-section-title::after { content: ''; flex: 1; height: 1px; background: rgba(0,255,204,0.15); }

      .s4-cognitives { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
      .s4-cog {
        display: flex; align-items: flex-start; gap: 12px;
        background: rgba(255,255,255,0.025); border: 1px solid transparent;
        border-radius: 13px; padding: 12px 14px;
        transition: background 0.3s, border-color 0.3s;
        position: relative; overflow: hidden;
      }
      .s4-cog::before {
        content: '';
        position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
        background: var(--bc, #00ffcc);
        border-radius: 3px 0 0 3px;
        box-shadow: 0 0 8px var(--bc, #00ffcc);
      }
      .s4-cog-ico { font-size: 22px; flex-shrink: 0; margin-top: 1px; }
      .s4-cog-body {}
      .s4-cog-title {
        font-family: 'Orbitron', sans-serif; font-size: 11px; font-weight: 700;
        color: var(--bc, #00ffcc); margin-bottom: 4px;
        text-shadow: 0 0 8px var(--bc, #00ffcc44);
      }
      .s4-cog-desc { font-size: 10.5px; color: rgba(180,210,200,0.75); line-height: 1.65; }
      .s4-cog-stat {
        display: inline-block; margin-top: 5px;
        background: rgba(255,255,255,0.06); border-radius: 6px;
        padding: 2px 8px; font-size: 9px;
        color: var(--bc, #00ffcc); font-family: 'Orbitron', sans-serif;
        font-weight: 700; letter-spacing: .1em;
      }

      /* Barra de progreso animada */
      .s4-progress-section { margin-bottom: 18px; }
      .s4-progress-item { margin-bottom: 9px; }
      .s4-progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
      .s4-progress-label { font-size: 9.5px; color: rgba(166,200,190,0.7); }
      .s4-progress-pct { font-family: 'Orbitron', sans-serif; font-size: 9px; font-weight: 700; color: var(--pc, #00ffcc); }
      .s4-bar-track { height: 5px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden; }
      .s4-bar-fill {
        height: 100%; width: 0%; border-radius: 3px;
        background: linear-gradient(90deg, var(--pc, #00ffcc), color-mix(in srgb, var(--pc,#00ffcc) 60%, #fff));
        box-shadow: 0 0 8px var(--pc, #00ffcc);
        transition: width 1.4s cubic-bezier(.22,1,.36,1);
      }

      /* Footer fuente */
      .s4-source {
        font-size: 9px; color: rgba(166,200,190,0.3); text-align: center;
        border-top: 1px solid rgba(255,255,255,0.06); padding-top: 10px; margin-top: 4px;
        line-height: 1.6;
      }
    `;
    document.head.appendChild(style);
  }

  crearPanel("panel-sala4", `
    <div class="s4-inner">

      <div class="s4-badge"><span>🧠</span><span>SALA 04 · BENEFICIOS COGNITIVOS</span></div>

      <div class="s4-title">Los videojuegos<br/><em>entrenan el cerebro</em></div>
      <p class="s4-subtitle">
        La ciencia demuestra que jugar activa regiones clave del cerebro vinculadas
        a la atención, memoria espacial y toma de decisiones bajo presión.
      </p>

      <!-- MÉTRICAS HERO -->
      <div class="s4-metrics">
        <div class="s4-metric" style="--mc:#00ffcc">
          <span class="s4-metric-ico">👁️</span>
          <span class="s4-metric-val">+58%</span>
          <div class="s4-metric-lbl">Resolución visual</div>
        </div>
        <div class="s4-metric" style="--mc:#4488ff">
          <span class="s4-metric-ico">⚡</span>
          <span class="s4-metric-val">+25%</span>
          <div class="s4-metric-lbl">Velocidad cognitiva</div>
        </div>
        <div class="s4-metric" style="--mc:#cc44ff">
          <span class="s4-metric-ico">🎯</span>
          <span class="s4-metric-val">12+</span>
          <div class="s4-metric-lbl">Países replicado</div>
        </div>
      </div>

      <!-- BENEFICIOS COGNITIVOS DETALLADOS -->
      <div class="s4-section-title">Beneficios comprobados</div>
      <div class="s4-cognitives">

        <div class="s4-cog" style="--bc:#00ffcc">
          <span class="s4-cog-ico">🧠</span>
          <div class="s4-cog-body">
            <div class="s4-cog-title">Atención y Concentración</div>
            <div class="s4-cog-desc">Los juegos de acción entrenan la atención selectiva y la capacidad de ignorar distractores irrelevantes. Bavelier (U. Rochester) demostró un 58% más de resolución visual en jugadores habituales.</div>
            <span class="s4-cog-stat">Bavelier Lab · 2012 · Replicado en 12 países</span>
          </div>
        </div>

        <div class="s4-cog" style="--bc:#4488ff">
          <span class="s4-cog-ico">🗺️</span>
          <div class="s4-cog-body">
            <div class="s4-cog-title">Memoria Espacial 3D</div>
            <div class="s4-cog-desc">Navegar mundos 3D activa y fortalece el hipocampo — la región del cerebro responsable de la memoria y la orientación espacial. Efecto medido incluso tras 2 semanas de juego.</div>
            <span class="s4-cog-stat">Nature · 2013 · Düsseldorf University</span>
          </div>
        </div>

        <div class="s4-cog" style="--bc:#ff6644">
          <span class="s4-cog-ico">🤝</span>
          <div class="s4-cog-body">
            <div class="s4-cog-title">Coordinación Ojo-Mano</div>
            <div class="s4-cog-desc">Cirujanos que jugaban videojuegos cometieron un 37% menos de errores en operaciones laparoscópicas (Rosser, 2007). La precisión motora fina mejora significativamente.</div>
            <span class="s4-cog-stat">Arch. Surgery · 2007 · +37% precisión</span>
          </div>
        </div>

        <div class="s4-cog" style="--bc:#cc44ff">
          <span class="s4-cog-ico">⚡</span>
          <div class="s4-cog-body">
            <div class="s4-cog-title">Toma de Decisiones</div>
            <div class="s4-cog-desc">Jugadores procesan información visual 25% más rápido y toman decisiones bajo presión con mayor precisión. Las simulaciones estratégicas desarrollan pensamiento sistémico y planificación.</div>
            <span class="s4-cog-stat">+25% velocidad decisional · Green & Bavelier</span>
          </div>
        </div>

        <div class="s4-cog" style="--bc:#f5c518">
          <span class="s4-cog-ico">💊</span>
          <div class="s4-cog-body">
            <div class="s4-cog-title">Terapia y Rehabilitación</div>
            <div class="s4-cog-desc">La VR y los videojuegos se usan en fisioterapia, tratamiento de PTSD, ansiedad y fobias. AppliedVR (2021): reducción de ansiedad hospitalaria del 24% con terapia de exposición en VR.</div>
            <span class="s4-cog-stat">AppliedVR · 2021 · −24% ansiedad</span>
          </div>
        </div>

      </div>

      <!-- BARRAS DE PROGRESO COGNITIVO -->
      <div class="s4-section-title">Mejoras medidas vs. no-jugadores</div>
      <div class="s4-progress-section">
        ${[
          ["Resolución visual periférica", 58, "#00ffcc"],
          ["Velocidad de procesamiento",   25, "#4488ff"],
          ["Precisión motora fina",         37, "#cc44ff"],
          ["Memoria espacial a largo plazo",28, "#ff6644"],
          ["Control de atención selectiva", 45, "#f5c518"],
        ].map(([lbl, pct, col]) => `
          <div class="s4-progress-item">
            <div class="s4-progress-header">
              <span class="s4-progress-label">${lbl}</span>
              <span class="s4-progress-pct" style="--pc:${col}">+${pct}%</span>
            </div>
            <div class="s4-bar-track">
              <div class="s4-bar-fill" data-pct="${pct}" style="--pc:${col}"></div>
            </div>
          </div>
        `).join("")}
      </div>

      <div class="s4-source">
        Fuentes: Bavelier Lab (U. Rochester) · Nature 2013 · Archives of Surgery 2007<br/>
        AppliedVR 2021 · ESA Essential Facts 2023 · Newzoo Global Games Market
      </div>

    </div>
  `);

  // Animar barras de progreso con delay
  requestAnimationFrame(() => {
    setTimeout(() => {
      document.querySelectorAll(".s4-bar-fill").forEach((el, i) => {
        setTimeout(() => {
          const pct = parseInt(el.dataset.pct);
          // Escalar al máximo visual (58% → 100% de la barra)
          el.style.width = `${(pct / 60) * 100}%`;
        }, i * 180);
      });
    }, 400);
  });

  // ── FUNCIÓN UPDATE ───────────────────────────────────────────────
  let lineIdx = 0;
  function update(dt, t) {

    // Mover nodos
    nodes.forEach(n => {
      n.mesh.position.x += n.vx;
      n.mesh.position.z += n.vz;
      n.mesh.position.y = n.baseY + Math.sin(t * 0.4 + n.mesh.position.x) * 0.25;
      if (Math.abs(n.mesh.position.x) > 11) n.vx *= -1;
      if (Math.abs(n.mesh.position.z) > 9)  n.vz *= -1;
    });

    // Actualizar líneas entre nodos cercanos
    lineIdx = 0;
    const THRESH = 5.5;
    for (let i = 0; i < nodes.length && lineIdx < MAX_LINES - 1; i++) {
      for (let j = i + 1; j < nodes.length && lineIdx < MAX_LINES - 1; j++) {
        const dx = nodes[i].mesh.position.x - nodes[j].mesh.position.x;
        const dy = nodes[i].mesh.position.y - nodes[j].mesh.position.y;
        const dz = nodes[i].mesh.position.z - nodes[j].mesh.position.z;
        const d  = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (d < THRESH) {
          const alpha = (1 - d / THRESH);
          const base  = lineIdx * 6;
          linePositions[base]   = nodes[i].mesh.position.x;
          linePositions[base+1] = nodes[i].mesh.position.y;
          linePositions[base+2] = nodes[i].mesh.position.z;
          linePositions[base+3] = nodes[j].mesh.position.x;
          linePositions[base+4] = nodes[j].mesh.position.y;
          linePositions[base+5] = nodes[j].mesh.position.z;
          // Color de línea basado en el primer nodo
          const col = nodes[i].mesh.material.color;
          lineColors[base]   = col.r * alpha;
          lineColors[base+1] = col.g * alpha;
          lineColors[base+2] = col.b * alpha;
          lineColors[base+3] = lineColors[base];
          lineColors[base+4] = lineColors[base+1];
          lineColors[base+5] = lineColors[base+2];
          lineIdx++;
        }
      }
    }
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate    = true;
    lineGeo.setDrawRange(0, lineIdx * 2);

    // Anillos orbitales
    rings.forEach((r, i) => {
      r.mesh.rotation.z += r.speed;
      r.mesh.rotation.x  = Math.PI/2 + 0.4 + Math.sin(t * 0.3 + i) * 0.15;
    });

    // Esfera central
    sphereOuter.rotation.y += 0.003;
    sphereOuter.rotation.x  = Math.sin(t * 0.18) * 0.15;
    sphereInner.rotation.y -= 0.006;
    sphereInner.rotation.z  = Math.cos(t * 0.22) * 0.2;

    // Puntos orbitando
    orbitDots.forEach(d => {
      const ang = t * d.speed + d.phase;
      d.mesh.position.x = Math.cos(ang) * d.radius;
      d.mesh.position.y = Math.sin(ang * 0.7 + d.tilt) * 0.5;
      d.mesh.position.z = Math.sin(ang) * d.radius;
    });

    // Barras pulsantes
    barMeshes.forEach((b, i) => {
      const pulse = Math.sin(t * 1.4 + b.phase) * 0.06;
      b.mesh.material.emissiveIntensity = 0.2 + Math.abs(Math.sin(t * 0.9 + b.phase)) * 0.35;
      b.mesh.scale.y = 1 + pulse * 0.06;
      b.pl.intensity = 0.3 + Math.abs(Math.sin(t * 0.7 + b.phase)) * 0.35;
    });

    // Partículas ascendentes
    const pos = partGeo.attributes.position.array;
    for (let i = 0; i < partCount; i++) {
      pos[i*3+1] += partSpeeds[i];
      if (pos[i*3+1] > 9) pos[i*3+1] = 0.1;
    }
    partGeo.attributes.position.needsUpdate = true;

    // Luces pulsantes
    blue.intensity  = 2.5 + Math.sin(t * 1.1) * 0.5;
    cyan.intensity  = 1.8 + Math.sin(t * 0.9 + 1) * 0.4;
    white.intensity = 0.9 + Math.sin(t * 0.6) * 0.3;
  }

  function dispose() {
    const el = document.getElementById("panel-sala4");
    if (el) el.style.display = "none";
  }

  return { update, dispose };
}