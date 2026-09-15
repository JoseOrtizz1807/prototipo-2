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
  // ── AMBIENTE: LABORATORIO DE DATOS DEL FUTURO ──────────────────
  scene.background = new THREE.Color(0x020508);
  scene.fog = new THREE.FogExp2(0x020810, 0.025);

  // ── LUCES (máx 4 PointLights: cyan, azul, blanco + flash reutilizable) ──
  scene.add(new THREE.AmbientLight(0x0a1828, 2.5));
  const cyan  = new THREE.PointLight(0x00ffcc, 3.5, 18); cyan.position.set(-5, 6, 2); scene.add(cyan);
  const blue  = new THREE.PointLight(0x4488ff, 2.5, 14); blue.position.set(5, 4, -3); scene.add(blue);
  const white = new THREE.PointLight(0xffffff, 1.5, 10); white.position.set(0, 8, 1); scene.add(white);
  const flashLight = new THREE.PointLight(0x00ffcc, 0, 4); scene.add(flashLight);

  // ── SUELO ────────────────────────────────────────────────────────
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color:0x020810, roughness:0.04, metalness:0.95 })
  );
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.01; scene.add(floor);
  const grid = new THREE.GridHelper(60, 60, 0x071830, 0x040e20);
  grid.position.y = 0.005; scene.add(grid);

  // ── RED DE DATOS DEL FONDO — 80 nodos (atenuada, es el fondo) ──────
  const NODE_COUNT = 80; const nodes = [];
  const nodeGeo = new THREE.SphereGeometry(0.045, 6, 6);
  for (let i = 0; i < NODE_COUNT; i++) {
    const color = Math.random()>0.6 ? 0x00ffcc : (Math.random()>0.5 ? 0x4488ff : 0xcc44ff);
    const mesh  = new THREE.Mesh(nodeGeo, new THREE.MeshBasicMaterial({ color }));
    mesh.position.set((Math.random()-0.5)*22, Math.random()*7+0.3, (Math.random()-0.5)*18);
    scene.add(mesh);
    nodes.push({ mesh, vx:(Math.random()-0.5)*0.34, vz:(Math.random()-0.5)*0.34, baseY:mesh.position.y });
  }
  const MAX_LINES=600;
  const linePositions=new Float32Array(MAX_LINES*6), lineColors=new Float32Array(MAX_LINES*6);
  const lineGeo=new THREE.BufferGeometry();
  lineGeo.setAttribute("position",new THREE.BufferAttribute(linePositions,3));
  lineGeo.setAttribute("color",   new THREE.BufferAttribute(lineColors,3));
  lineGeo.setDrawRange(0,0);
  const lineMat=new THREE.LineSegments(lineGeo,
    new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:0.35}));
  scene.add(lineMat);

  // ── SISTEMA SOLAR DE BENEFICIOS — corazón visual de la sala ────────
  const solarGroup = new THREE.Group(); solarGroup.position.set(0.5, 3.2, -1.5); scene.add(solarGroup);
  const sphereOuter=new THREE.Mesh(new THREE.IcosahedronGeometry(1.3,4),
    new THREE.MeshStandardMaterial({color:0x0a2244,emissive:0x001133,emissiveIntensity:0.4,wireframe:true,transparent:true,opacity:0.45}));
  solarGroup.add(sphereOuter);
  const sphereInner=new THREE.Mesh(new THREE.IcosahedronGeometry(0.8,2),
    new THREE.MeshStandardMaterial({color:0x00ffcc,emissive:0x00ffcc,emissiveIntensity:0.28,wireframe:true,transparent:true,opacity:0.6}));
  solarGroup.add(sphereInner);

  const planetData = [
    { r:2.8, col:0x00ffcc, scale:0.28, incl: 0 },
    { r:3.4, col:0x4488ff, scale:0.22, incl: THREE.MathUtils.degToRad(25) },
    { r:2.2, col:0xcc44ff, scale:0.20, incl: THREE.MathUtils.degToRad(-15) },
    { r:4.0, col:0xff6644, scale:0.18, incl: THREE.MathUtils.degToRad(40) },
    { r:3.0, col:0xf5c518, scale:0.24, incl: THREE.MathUtils.degToRad(-30) },
  ];
  const planets = [];
  planetData.forEach((p,i)=>{
    const pivot = new THREE.Group(); pivot.rotation.x = p.incl; solarGroup.add(pivot);

    const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.scale,14,14),
      new THREE.MeshStandardMaterial({color:p.col, emissive:p.col, emissiveIntensity:0.65, roughness:0.25, metalness:0.4}));
    pivot.add(mesh);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(p.scale*1.7,0.012,6,32),
      new THREE.MeshStandardMaterial({color:p.col, emissive:p.col, emissiveIntensity:0.6, transparent:true, opacity:0.5}));
    ring.rotation.x = Math.PI/2.4; mesh.add(ring);

    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(12*3),3));
    const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({color:p.col, transparent:true, opacity:0.35}));
    pivot.add(trail);

    planets.push({ mesh, trailGeo, r:p.r, speed:0.16+i*0.05, phase:i*1.3 });
  });

  // ── INDICADORES DE DATOS — marcadores flotantes (sin texto, en el panel HTML van las cifras) ──
  const markerColors = [0x00ffcc,0x4488ff,0xcc44ff,0xff6644,0xf5c518];
  const markers = [];
  for(let i=0;i<5;i++){
    const col = markerColors[i];
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.14,0),
      new THREE.MeshStandardMaterial({color:col, emissive:col, emissiveIntensity:0.8, wireframe:true, transparent:true, opacity:0.7}));
    const ang = (i/5)*Math.PI*2;
    mesh.position.set(2.2+Math.cos(ang)*2.4, 1.4+Math.sin(i*1.7)*1.4, -0.5+Math.sin(ang)*1.6);
    scene.add(mesh);
    markers.push({ mesh, phase:i*0.9 });
  }

  // ── CASCADAS DE DATOS — efecto Interstellar ───────────────────────
  const CASCADE_COUNT = 80;
  const cascadeGeo = new THREE.PlaneGeometry(0.018, 0.8);
  const cascades = [];
  for(let i=0;i<CASCADE_COUNT;i++){
    let x = (Math.random()-0.5)*16;
    if(x < -2 && Math.random() < 0.6) x += 6;
    const col = i%2===0 ? 0x00ffcc : 0x4488ff;
    const mesh = new THREE.Mesh(cascadeGeo, new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:0.08+Math.random()*0.17, side:THREE.DoubleSide}));
    mesh.position.set(x, Math.random()*10-2, -6+Math.random()*4);
    scene.add(mesh);
    cascades.push({ mesh, speed:1.5+Math.random()*2.0 });
  }

  // ── ANILLOS ORBITALES DECORATIVOS — campo de estudio (armilar) ────
  const decoRings = [];
  [[0x00ffcc,0.12,0,0],[0x4488ff,0.08,Math.PI/2.3,0.3],[0xcc44ff,0.06,0.6,Math.PI/2.6]].forEach(([col,op,rx,ry],i)=>{
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.5,0.015,6,90),
      new THREE.MeshStandardMaterial({color:col, emissive:col, emissiveIntensity:0.5, transparent:true, opacity:op}));
    ring.position.copy(solarGroup.position); ring.rotation.set(rx,ry,0); scene.add(ring);
    decoRings.push({ mesh:ring, speed:0.02+i*0.015, axis: i%2===0?"y":"x" });
  });

  // ── BARRAS 3D — con animación de entrada y flash ───────────────────
  const barGroup=new THREE.Group(); barGroup.position.set(-4.5,0,1.5); scene.add(barGroup);
  const statsData=[
    {year:"2015",val:91.5, col:0x2266cc},{year:"2017",val:108.9,col:0x3388ee},
    {year:"2019",val:145.7,col:0x44aaff},{year:"2020",val:155.9,col:0x00ddbb},
    {year:"2021",val:180.3,col:0x00ffcc},{year:"2023",val:184.4,col:0x44ffdd},
    {year:"2025*",val:211.2,col:0xffffff},
  ];
  const maxVal=211.2,maxH=3.8; const barMeshes=[];
  statsData.forEach((s,i)=>{
    const h=(s.val/maxVal)*maxH;
    const bar=new THREE.Mesh(new THREE.BoxGeometry(0.38,h,0.38),
      new THREE.MeshStandardMaterial({color:s.col,emissive:s.col,emissiveIntensity:0.3,roughness:0.25,metalness:0.65,transparent:true,opacity:0.88}));
    bar.position.set(i*0.72-2.2,0.001,0); barGroup.add(bar);
    barMeshes.push({mesh:bar, h, curH:0.001, phase:i*0.55, flashed:false});
  });

  // ── PARTÍCULAS ────────────────────────────────────────────────────
  const partCount=280; const partGeo=new THREE.BufferGeometry();
  const partPos=new Float32Array(partCount*3); const partSpeeds=new Float32Array(partCount);
  for(let i=0;i<partCount;i++){
    partPos[i*3]=(Math.random()-0.5)*28; partPos[i*3+1]=Math.random()*9; partPos[i*3+2]=(Math.random()-0.5)*22;
    partSpeeds[i]=0.2+Math.random()*0.5;
  }
  partGeo.setAttribute("position",new THREE.BufferAttribute(partPos,3));
  const particles=new THREE.Points(partGeo,new THREE.PointsMaterial({size:0.035,color:0x88ccff,transparent:true,opacity:0.5,sizeAttenuation:true}));
  scene.add(particles);

  // ── ESTILOS ───────────────────────────────────────────
  if(!document.getElementById("sala4-styles")){
    const style=document.createElement("style");
    style.id="sala4-styles";
    style.textContent=`
      #panel-sala4{
        position:fixed;top:72px;left:18px;
        width:min(430px,44vw);
        max-height:calc(100vh - 90px);
        overflow-y:auto;
        z-index:8;pointer-events:all;
        scrollbar-width:thin;scrollbar-color:#00ffcc33 transparent;
        font-family:'Space Mono',monospace;
      }
      #panel-sala4::-webkit-scrollbar{width:4px;}
      #panel-sala4::-webkit-scrollbar-thumb{background:#00ffcc55;border-radius:4px;}
      .s4-inner{
        background:linear-gradient(145deg,rgba(3,9,22,0.95),rgba(6,15,35,0.92));
        border:1px solid rgba(0,255,204,0.18);border-radius:22px;
        padding:26px 22px 22px;
        backdrop-filter:blur(22px) saturate(1.6);
        box-shadow:0 0 40px rgba(0,255,204,0.06),0 24px 60px rgba(0,0,0,0.8),inset 0 1px 0 rgba(255,255,255,0.06);
        position:relative;overflow:hidden;
      }
      .s4-inner::before{
        content:'';position:absolute;inset:0;
        background:radial-gradient(ellipse at 20% 0%,rgba(0,255,204,0.07) 0%,transparent 60%),
                   radial-gradient(ellipse at 80% 100%,rgba(68,136,255,0.06) 0%,transparent 60%);
        pointer-events:none;
      }
      .s4-badge{
        display:inline-flex;align-items:center;gap:7px;
        background:rgba(0,255,204,0.10);border:1px solid rgba(0,255,204,0.30);
        border-radius:20px;padding:4px 13px;margin-bottom:14px;
      }
      .s4-badge span{font-family:'Orbitron',sans-serif;font-size:9px;letter-spacing:.28em;color:#00ffcc;font-weight:700;}
      .s4-title{font-family:'Orbitron',sans-serif;font-size:clamp(18px,2.2vw,26px);font-weight:900;line-height:1.15;margin-bottom:6px;color:#fff;}
      .s4-title em{font-style:normal;background:linear-gradient(90deg,#00ffcc,#4488ff);-webkit-background-clip:text;background-clip:text;color:transparent;}
      .s4-subtitle{font-size:11px;color:rgba(166,200,190,0.65);line-height:1.7;margin-bottom:20px;border-left:2px solid rgba(0,255,204,0.3);padding-left:10px;}
      .s4-metrics{display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px;margin-bottom:20px;}
      .s4-metric{background:rgba(255,255,255,0.03);border:1px solid rgba(0,255,204,0.15);border-radius:13px;padding:12px 9px;text-align:center;position:relative;overflow:hidden;}
      .s4-metric::after{content:'';position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:40%;height:1.5px;background:linear-gradient(90deg,transparent,var(--mc,#00ffcc),transparent);}
      .s4-metric-val{font-family:'Orbitron',sans-serif;font-size:clamp(16px,1.8vw,22px);font-weight:900;color:var(--mc,#00ffcc);text-shadow:0 0 12px var(--mc,#00ffcc);display:block;margin-bottom:4px;}
      .s4-metric-ico{font-size:16px;display:block;margin-bottom:4px;}
      .s4-metric-lbl{font-size:9px;color:rgba(166,200,190,0.55);line-height:1.4;}
      .s4-section-title{font-family:'Orbitron',sans-serif;font-size:10px;letter-spacing:.2em;color:rgba(0,255,204,0.6);text-transform:uppercase;margin-bottom:10px;display:flex;align-items:center;gap:8px;}
      .s4-section-title::after{content:'';flex:1;height:1px;background:rgba(0,255,204,0.15);}
      .s4-cognitives{display:flex;flex-direction:column;gap:8px;margin-bottom:20px;}
      .s4-cog{display:flex;align-items:flex-start;gap:12px;background:rgba(255,255,255,0.025);border:1px solid transparent;border-radius:13px;padding:12px 14px;position:relative;overflow:hidden;}
      .s4-cog::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--bc,#00ffcc);border-radius:3px 0 0 3px;box-shadow:0 0 8px var(--bc,#00ffcc);}
      .s4-cog-ico{font-size:22px;flex-shrink:0;margin-top:1px;}
      .s4-cog-title{font-family:'Orbitron',sans-serif;font-size:11px;font-weight:700;color:var(--bc,#00ffcc);margin-bottom:4px;text-shadow:0 0 8px var(--bc,#00ffcc44);}
      .s4-cog-desc{font-size:10.5px;color:rgba(180,210,200,0.75);line-height:1.65;}
      .s4-cog-stat{display:inline-block;margin-top:5px;background:rgba(255,255,255,0.06);border-radius:6px;padding:2px 8px;font-size:9px;color:var(--bc,#00ffcc);font-family:'Orbitron',sans-serif;font-weight:700;letter-spacing:.1em;}
      .s4-progress-item{margin-bottom:9px;}
      .s4-progress-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;}
      .s4-progress-label{font-size:9.5px;color:rgba(166,200,190,0.7);}
      .s4-progress-pct{font-family:'Orbitron',sans-serif;font-size:9px;font-weight:700;color:var(--pc,#00ffcc);}
      .s4-bar-track{height:5px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;}
      .s4-bar-fill{height:100%;width:0%;border-radius:3px;background:linear-gradient(90deg,var(--pc,#00ffcc),color-mix(in srgb,var(--pc,#00ffcc) 60%,#fff));box-shadow:0 0 8px var(--pc,#00ffcc);transition:width 1.4s cubic-bezier(.22,1,.36,1);}
      .s4-source{font-size:9px;color:rgba(166,200,190,0.3);text-align:center;border-top:1px solid rgba(255,255,255,0.06);padding-top:10px;margin-top:4px;line-height:1.6;}

      /* CONTEXTO SOCIAL - nueva sección */
      .s4-social-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px;}
      .s4-social-card{background:rgba(255,255,255,0.025);border:1px solid rgba(68,136,255,0.15);border-radius:12px;padding:10px 12px;text-align:center;}
      .s4-social-num{font-family:'Orbitron',sans-serif;font-size:18px;font-weight:900;color:#4488ff;text-shadow:0 0 12px #4488ff88;}
      .s4-social-lbl{font-size:9px;color:rgba(150,180,200,0.6);line-height:1.5;margin-top:3px;}

      /* IMPACTO INDUSTRIA */
      .s4-industry{background:rgba(255,215,0,0.04);border:1px solid rgba(255,215,0,0.15);border-radius:13px;padding:14px 16px;margin-bottom:18px;}
      .s4-industry-title{font-family:'Orbitron',sans-serif;font-size:10px;letter-spacing:.15em;color:#ffd700;margin-bottom:10px;}
      .s4-industry-row{display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid rgba(255,215,0,0.08);}
      .s4-industry-row:last-child{border-bottom:none;}
      .s4-industry-label{font-size:10px;color:rgba(200,190,150,0.7);}
      .s4-industry-val{font-family:'Orbitron',sans-serif;font-size:11px;font-weight:700;color:#ffd700;}
    `;
    document.head.appendChild(style);
  }

  crearPanel("panel-sala4",`
    <div class="s4-inner">

      <div class="s4-badge"><span>SALA 04 · BENEFICIOS COGNITIVOS</span></div>

      <div class="s4-title">Los videojuegos<br/><em>entrenan el cerebro</em></div>
      <p class="s4-subtitle">
        La ciencia demuestra que jugar activa regiones clave del cerebro vinculadas
        a la atención, memoria espacial y toma de decisiones bajo presión.
        Más de 50 estudios independientes lo confirman.
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
          <span class="s4-metric-ico">🌍</span>
          <span class="s4-metric-val">12+</span>
          <div class="s4-metric-lbl">Países replicado</div>
        </div>
      </div>

      <!-- BENEFICIOS COGNITIVOS -->
      <div class="s4-section-title">Beneficios comprobados en laboratorio</div>
      <div class="s4-cognitives">
        <div class="s4-cog" style="--bc:#00ffcc">
          <span class="s4-cog-ico">🧠</span>
          <div class="s4-cog-body">
            <div class="s4-cog-title">Atención y Concentración</div>
            <div class="s4-cog-desc">Los juegos de acción entrenan la atención selectiva y la capacidad de ignorar distractores. Bavelier (U. Rochester, 2012): jugadores tienen 58% más resolución visual periférica.</div>
            <span class="s4-cog-stat">Bavelier Lab · 2012 · 12 países</span>
          </div>
        </div>
        <div class="s4-cog" style="--bc:#4488ff">
          <span class="s4-cog-ico">🗺️</span>
          <div class="s4-cog-body">
            <div class="s4-cog-title">Memoria Espacial 3D</div>
            <div class="s4-cog-desc">Navegar mundos 3D activa y fortalece el hipocampo — la región responsable de memoria y orientación. Efecto medido tras solo 2 semanas de juego regular.</div>
            <span class="s4-cog-stat">Nature · 2013 · U. Düsseldorf</span>
          </div>
        </div>
        <div class="s4-cog" style="--bc:#ff6644">
          <span class="s4-cog-ico">🤝</span>
          <div class="s4-cog-body">
            <div class="s4-cog-title">Coordinación Ojo-Mano</div>
            <div class="s4-cog-desc">Cirujanos jugadores cometieron 37% menos errores en operaciones laparoscópicas vs. no-jugadores. La precisión motora fina mejora con juegos de acción en semanas.</div>
            <span class="s4-cog-stat">Arch. Surgery · 2007 · +37% precisión</span>
          </div>
        </div>
        <div class="s4-cog" style="--bc:#cc44ff">
          <span class="s4-cog-ico">⚡</span>
          <div class="s4-cog-body">
            <div class="s4-cog-title">Toma de Decisiones Rápidas</div>
            <div class="s4-cog-desc">Jugadores procesan información visual 25% más rápido y toman decisiones bajo presión con mayor precisión. Los juegos estratégicos desarrollan pensamiento sistémico.</div>
            <span class="s4-cog-stat">+25% velocidad · Green & Bavelier</span>
          </div>
        </div>
        <div class="s4-cog" style="--bc:#f5c518">
          <span class="s4-cog-ico">💊</span>
          <div class="s4-cog-body">
            <div class="s4-cog-title">Terapia y Rehabilitación</div>
            <div class="s4-cog-desc">VR y videojuegos se usan en fisioterapia, PTSD, ansiedad y fobias. La FDA aprobó el primer tratamiento VR para dolor crónico en 2021. AppliedVR: −24% ansiedad hospitalaria.</div>
            <span class="s4-cog-stat">AppliedVR · 2021 · FDA aprobado</span>
          </div>
        </div>
      </div>

      <!-- BARRAS DE PROGRESO -->
      <div class="s4-section-title">Mejoras medidas vs. no-jugadores</div>
      <div class="s4-progress-section" style="margin-bottom:18px">
        ${[
          ["Resolución visual periférica",   58, "#00ffcc"],
          ["Velocidad de procesamiento",     25, "#4488ff"],
          ["Precisión motora fina",          37, "#cc44ff"],
          ["Memoria espacial largo plazo",   28, "#ff6644"],
          ["Control de atención selectiva",  45, "#f5c518"],
        ].map(([lbl,pct,col]) => `
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

      <!-- CONTEXTO SOCIAL -->
      <div class="s4-section-title">Contexto social global</div>
      <div class="s4-social-grid">
        <div class="s4-social-card">
          <div class="s4-social-num">3.2B</div>
          <div class="s4-social-lbl">Jugadores activos en el mundo (2023)</div>
        </div>
        <div class="s4-social-card">
          <div class="s4-social-num">48%</div>
          <div class="s4-social-lbl">Son mujeres según ESA 2023</div>
        </div>
        <div class="s4-social-card">
          <div class="s4-social-num">34</div>
          <div class="s4-social-lbl">Edad promedio del jugador adulto</div>
        </div>
        <div class="s4-social-card">
          <div class="s4-social-num">65%</div>
          <div class="s4-social-lbl">Juegan con familiares o amigos</div>
        </div>
      </div>

      <!-- IMPACTO INDUSTRIA -->
      <div class="s4-section-title">Impacto económico</div>
      <div class="s4-industry">
        <div class="s4-industry-title">Ingresos globales de la industria</div>
        <div class="s4-industry-row"><span class="s4-industry-label">Videojuegos (2023)</span><span class="s4-industry-val">$184 mil millones</span></div>
        <div class="s4-industry-row"><span class="s4-industry-label">Cine (taquilla global)</span><span class="s4-industry-val">$33 mil millones</span></div>
        <div class="s4-industry-row"><span class="s4-industry-label">Música (streaming)</span><span class="s4-industry-val">$26 mil millones</span></div>
        <div class="s4-industry-row"><span class="s4-industry-label">Proyección 2025</span><span class="s4-industry-val">$211 mil millones</span></div>
      </div>

      <div class="s4-source">
        Fuentes: Bavelier Lab (U. Rochester) · Nature 2013 · Archives of Surgery 2007<br/>
        AppliedVR 2021 · ESA Essential Facts 2023 · Newzoo Global Games Market Report
      </div>

    </div>
  `);

  requestAnimationFrame(() => {
    setTimeout(() => {
      document.querySelectorAll(".s4-bar-fill").forEach((el, i) => {
        setTimeout(() => {
          el.style.width = `${(parseInt(el.dataset.pct) / 60) * 100}%`;
        }, i * 180);
      });
    }, 400);
  });

  // ── FUNCIÓN UPDATE ─────────────────────────────────────
  let lineIdx=0;
  function update(dt, t) {
    nodes.forEach(n => {
      n.mesh.position.x += n.vx*dt; n.mesh.position.z += n.vz*dt;
      n.mesh.position.y = n.baseY + Math.sin(t*0.4+n.mesh.position.x)*0.25;
      if(Math.abs(n.mesh.position.x)>11) n.vx*=-1;
      if(Math.abs(n.mesh.position.z)>9)  n.vz*=-1;
    });
    lineIdx=0;
    const THRESH=5.5;
    for(let i=0;i<nodes.length&&lineIdx<MAX_LINES-1;i++){
      for(let j=i+1;j<nodes.length&&lineIdx<MAX_LINES-1;j++){
        const dx=nodes[i].mesh.position.x-nodes[j].mesh.position.x;
        const dy=nodes[i].mesh.position.y-nodes[j].mesh.position.y;
        const dz=nodes[i].mesh.position.z-nodes[j].mesh.position.z;
        const d=Math.sqrt(dx*dx+dy*dy+dz*dz);
        if(d<THRESH){
          const alpha=(1-d/THRESH); const base=lineIdx*6;
          linePositions[base]=nodes[i].mesh.position.x; linePositions[base+1]=nodes[i].mesh.position.y; linePositions[base+2]=nodes[i].mesh.position.z;
          linePositions[base+3]=nodes[j].mesh.position.x; linePositions[base+4]=nodes[j].mesh.position.y; linePositions[base+5]=nodes[j].mesh.position.z;
          const col=nodes[i].mesh.material.color;
          lineColors[base]=col.r*alpha; lineColors[base+1]=col.g*alpha; lineColors[base+2]=col.b*alpha;
          lineColors[base+3]=lineColors[base]; lineColors[base+4]=lineColors[base+1]; lineColors[base+5]=lineColors[base+2];
          lineIdx++;
        }
      }
    }
    lineGeo.attributes.position.needsUpdate=true; lineGeo.attributes.color.needsUpdate=true; lineGeo.setDrawRange(0,lineIdx*2);

    sphereOuter.rotation.y+=0.18*dt; sphereOuter.rotation.x=Math.sin(t*0.18)*0.15;
    sphereInner.rotation.y-=0.36*dt; sphereInner.rotation.z=Math.cos(t*0.22)*0.2;

    planets.forEach(p=>{
      const ang = t*p.speed + p.phase;
      p.mesh.position.set(p.r*Math.cos(ang), 0, p.r*Math.sin(ang));
      p.mesh.rotation.y += 1.2*dt;
      const arr = p.trailGeo.attributes.position.array;
      for(let k=0;k<12;k++){
        const a2 = ang - k*0.1;
        arr[k*3]=p.r*Math.cos(a2); arr[k*3+1]=0; arr[k*3+2]=p.r*Math.sin(a2);
      }
      p.trailGeo.attributes.position.needsUpdate = true;
    });

    markers.forEach(m=>{
      m.mesh.position.y += Math.sin(t*0.8+m.phase)*0.008;
      m.mesh.rotation.y += 0.5*dt; m.mesh.rotation.x += 0.3*dt;
      m.mesh.material.opacity = 0.5 + Math.sin(t*1.2+m.phase)*0.2;
    });

    cascades.forEach(c=>{
      c.mesh.position.y -= c.speed*dt;
      if(c.mesh.position.y < -2) c.mesh.position.y = 8;
    });

    decoRings.forEach(r=>{
      if(r.axis==="y") r.mesh.rotation.y += r.speed*dt; else r.mesh.rotation.x += r.speed*dt;
    });

    let flashPos = null;
    barMeshes.forEach(b=>{
      b.curH += (b.h - b.curH) * (1 - Math.pow(0.02, dt*10));
      b.mesh.scale.y = Math.max(0.001, b.curH / b.h);
      b.mesh.position.y = b.mesh.scale.y * b.h / 2;
      b.mesh.rotation.y = Math.sin(t*2+b.phase) * 0.02 * (1 - b.curH/b.h);
      const ratio = b.curH / b.h;
      if(!b.flashed && ratio >= 0.95){
        b.flashed = true; b.flashUntil = t + 0.3;
        flashPos = b.mesh.position.clone().add(barGroup.position);
      }
      let emissive = 0.3;
      if(b.flashUntil && t < b.flashUntil) emissive = 0.8;
      b.mesh.material.emissiveIntensity = emissive;
    });
    if(flashPos){ flashLight.position.copy(flashPos); flashLight.intensity = 4; }
    else if(flashLight.intensity > 0){ flashLight.intensity = Math.max(0, flashLight.intensity - dt*10); }

    const pos=partGeo.attributes.position.array;
    for(let i=0;i<partCount;i++){ pos[i*3+1]+=partSpeeds[i]*dt; if(pos[i*3+1]>9) pos[i*3+1]=0.1; }
    partGeo.attributes.position.needsUpdate=true;
    blue.intensity=2.2+Math.sin(t*1.1)*0.4; cyan.intensity=3.2+Math.sin(t*0.9+1)*0.4; white.intensity=1.3+Math.sin(t*0.6)*0.3;
  }

  function dispose() {
    const el=document.getElementById("panel-sala4");
    if(el) el.style.display="none";
  }

  return { update, dispose };
}
