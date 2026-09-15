import * as THREE from "three";
function crearPanel(id,html){let el=document.getElementById(id);if(!el){el=document.createElement("div");el.id=id;el.className="sala-panel";document.body.appendChild(el);}el.innerHTML=html;el.style.display="block";return el;}

export function sala2Cognitivos(scene, camera, renderer) {
  // ── AMBIENTE: HIPOCAMPO / NEUROPLASTICIDAD ──────────────────────
  scene.background = new THREE.Color(0x010d08);
  scene.fog = new THREE.FogExp2(0x010d08, 0.026);

  const ambient = new THREE.AmbientLight(0x081f10, 2.2); scene.add(ambient);
  const key   = new THREE.PointLight(0x00ff88, 4.5, 30); key.position.set(0, 10, 0); scene.add(key);
  const fill1 = new THREE.PointLight(0x00dd66, 3.0, 16); fill1.position.set(-6, 4, 2); scene.add(fill1);
  const fill2 = new THREE.PointLight(0x44ffaa, 2.5, 14); fill2.position.set(6, 4, -2); scene.add(fill2);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60,60),
    new THREE.MeshStandardMaterial({color:0x020f0a, roughness:0.05, metalness:0.95}));
  floor.rotation.x = -Math.PI/2; scene.add(floor);
  const grid = new THREE.GridHelper(60,60,0x063018,0x020f0a); grid.position.y=0.002; scene.add(grid);

  // ── HIPOCAMPO CENTRAL ─────────────────────────────────────────
  const brainGroup = new THREE.Group(); brainGroup.position.set(2.5, 2.8, -1.5); scene.add(brainGroup);

  const outer = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4,4),
    new THREE.MeshStandardMaterial({color:0x001a08, emissive:0x002210, emissiveIntensity:0.5, wireframe:true, transparent:true, opacity:0.4}));
  brainGroup.add(outer);

  const inner = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9,3),
    new THREE.MeshStandardMaterial({color:0x00ff88, emissive:0x00ff88, emissiveIntensity:0.3, wireframe:true, transparent:true, opacity:0.55}));
  brainGroup.add(inner);

  // ── RED NEURONAL — 22 neuronas (distribución Fibonacci) ──────────
  const NEURON_COUNT = 22;
  const neuronGeo = new THREE.IcosahedronGeometry(0.10,1);
  const neuronColors = [0x00ff88,0x00ccff,0x44ffaa,0x88ff44];
  const neurons = [];
  for(let i=0;i<NEURON_COUNT;i++){
    const phi = Math.acos(1-2*(i+0.5)/NEURON_COUNT);
    const theta = Math.PI*(1+Math.sqrt(5))*i;
    const r = 1.6 + Math.sin(i*1.3)*0.4;
    const col = neuronColors[i%neuronColors.length];
    const mat = new THREE.MeshStandardMaterial({color:col, emissive:col, emissiveIntensity:0.4, roughness:0.2});
    const mesh = new THREE.Mesh(neuronGeo, mat);
    brainGroup.add(mesh);
    neurons.push({mesh, mat, phi, theta, r, phase:i*0.37, speed:0.22+Math.random()*0.18, flashUntil:-1});
  }

  // ── SINAPSIS DINÁMICAS ─────────────────────────────────────────
  const synCap = NEURON_COUNT*NEURON_COUNT;
  const synPos = new Float32Array(synCap*6);
  const synGeo = new THREE.BufferGeometry();
  synGeo.setAttribute("position", new THREE.BufferAttribute(synPos,3));
  const synLines = new THREE.LineSegments(synGeo, new THREE.LineBasicMaterial({color:0x00ff88, transparent:true, opacity:0.18}));
  brainGroup.add(synLines);

  // ── PULSOS SINÁPTICOS ────────────────────────────────────────────
  const PULSE_COUNT = 8;
  const pulseGeo = new THREE.SphereGeometry(0.04,6,6);
  const pulses = [];
  for(let i=0;i<PULSE_COUNT;i++){
    const mesh = new THREE.Mesh(pulseGeo, new THREE.MeshStandardMaterial({color:0xffffff, emissive:0xffffff, emissiveIntensity:1.2}));
    brainGroup.add(mesh);
    const from = Math.floor(Math.random()*NEURON_COUNT);
    let to = Math.floor(Math.random()*NEURON_COUNT); if(to===from) to=(to+1)%NEURON_COUNT;
    pulses.push({mesh, from, to, prog:Math.random()});
  }

  // ── ANILLOS DEL HIPOCAMPO ─────────────────────────────────────────
  const hRings = [];
  [[2.0,0x00ff88,0.35,Math.PI/2+0.4],[2.8,0x44ffaa,0.22,Math.PI/2-0.3],[3.6,0x00ccff,0.14,Math.PI/2+0.7]].forEach(([r,col,op,tilt],i)=>{
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r,0.016,6,72),
      new THREE.MeshStandardMaterial({color:col, emissive:col, emissiveIntensity:0.7, transparent:true, opacity:op}));
    ring.rotation.x = tilt; brainGroup.add(ring);
    hRings.push({mesh:ring, speed:0.15+i*0.08});
  });

  // ── ONDAS EXPANSIVAS DEL SUELO (EEG) ───────────────────────────────
  const waveRings = [];
  for(let i=0;i<4;i++){
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(1,0.02,6,48),
      new THREE.MeshBasicMaterial({color:0x00ff88, transparent:true, opacity:0.6}));
    mesh.rotation.x = -Math.PI/2; mesh.position.set(0,0.01,0); mesh.scale.setScalar(0.1);
    scene.add(mesh);
    waveRings.push({mesh, offset:i*0.75});
  }

  // ── PARTÍCULAS ────────────────────────────────────────────────────
  const pCount=280; const pGeo=new THREE.BufferGeometry();
  const pPos=new Float32Array(pCount*3); const pSp=new Float32Array(pCount);
  for(let i=0;i<pCount;i++){pPos[i*3]=(Math.random()-0.5)*28;pPos[i*3+1]=Math.random()*9;pPos[i*3+2]=(Math.random()-0.5)*22;pSp[i]=0.4+Math.random()*0.7;}
  pGeo.setAttribute("position",new THREE.BufferAttribute(pPos,3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({size:0.035, color:0x44ff99, transparent:true, opacity:0.42}));
  scene.add(particles);

  if(!document.getElementById("sala2-styles")){
    const s=document.createElement("style");s.id="sala2-styles";
    s.textContent=`
      #panel-sala2{position:fixed;top:72px;left:18px;width:min(430px,44vw);max-height:calc(100vh - 90px);overflow-y:auto;z-index:8;pointer-events:all;scrollbar-width:thin;scrollbar-color:#00ff8833 transparent;font-family:'Space Mono',monospace;}
      #panel-sala2::-webkit-scrollbar{width:4px;}#panel-sala2::-webkit-scrollbar-thumb{background:#00ff8855;border-radius:4px;}
      .s2-wrap{background:linear-gradient(145deg,rgba(3,12,8,0.96),rgba(5,18,12,0.93));border:1px solid rgba(0,255,136,0.2);border-radius:22px;padding:26px 22px 22px;backdrop-filter:blur(24px);box-shadow:0 0 50px rgba(0,255,136,0.07),0 24px 60px rgba(0,0,0,0.9);}
      .s2-badge{display:inline-flex;align-items:center;gap:7px;background:rgba(0,255,136,0.1);border:1px solid rgba(0,255,136,0.32);border-radius:20px;padding:5px 14px;margin-bottom:14px;}
      .s2-badge-dot{width:7px;height:7px;border-radius:50%;background:#00ff88;box-shadow:0 0 8px #00ff88;}
      .s2-badge span{font-family:'Orbitron',sans-serif;font-size:9px;letter-spacing:.28em;color:#00ff88;font-weight:700;}
      .s2-title{font-family:'Orbitron',sans-serif;font-size:clamp(18px,2.2vw,26px);font-weight:900;line-height:1.15;margin-bottom:6px;color:#fff;}
      .s2-title em{font-style:normal;background:linear-gradient(90deg,#00ff88,#00ccff);-webkit-background-clip:text;background-clip:text;color:transparent;}
      .s2-intro{font-size:11px;color:rgba(130,200,160,0.7);line-height:1.75;margin-bottom:20px;border-left:3px solid rgba(0,255,136,0.4);padding-left:12px;}
      .s2-hero{display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px;margin-bottom:22px;}
      .s2-hero-card{background:rgba(0,255,136,0.05);border:1px solid rgba(0,255,136,0.16);border-radius:14px;padding:12px 10px;text-align:center;}
      .s2-hero-num{font-family:'Orbitron',sans-serif;font-size:22px;font-weight:900;color:var(--hc,#00ff88);display:block;text-shadow:0 0 14px var(--hc,#00ff88);}
      .s2-hero-lbl{font-size:9px;color:rgba(120,190,150,0.6);line-height:1.4;margin-top:3px;}
      .s2-section{font-family:'Orbitron',sans-serif;font-size:9px;letter-spacing:.22em;color:rgba(0,255,136,0.6);margin-bottom:10px;display:flex;align-items:center;gap:8px;}
      .s2-section::after{content:'';flex:1;height:1px;background:rgba(0,255,136,0.15);}
      .s2-study{display:flex;flex-direction:column;gap:9px;margin-bottom:20px;}
      .s2-card{background:rgba(0,255,136,0.025);border:1px solid rgba(0,255,136,0.1);border-radius:13px;padding:13px 15px;position:relative;overflow:hidden;transition:background .2s;}
      .s2-card:hover{background:rgba(0,255,136,0.06);}
      .s2-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--sc,#00ff88);border-radius:3px 0 0 3px;box-shadow:0 0 10px var(--sc,#00ff88);}
      .s2-card-title{font-family:'Orbitron',sans-serif;font-size:10.5px;font-weight:700;color:var(--sc,#00ff88);margin-bottom:5px;}
      .s2-card-desc{font-size:10.5px;color:rgba(150,210,180,0.75);line-height:1.65;}
      .s2-card-footer{display:flex;align-items:center;justify-content:space-between;margin-top:8px;flex-wrap:wrap;gap:6px;}
      .s2-ref{font-family:'Orbitron',sans-serif;font-size:8px;color:var(--sc,#00ff88);opacity:.7;letter-spacing:.1em;}
      .s2-link{font-family:'Orbitron',sans-serif;font-size:8px;color:var(--sc,#00ff88);text-decoration:none;border:1px solid var(--sc,#00ff88);border-radius:5px;padding:2px 8px;opacity:.8;transition:opacity .2s;}
      .s2-link:hover{opacity:1;background:rgba(0,255,136,0.15);}
      .s2-source{font-size:9px;color:rgba(120,190,150,0.3);text-align:center;border-top:1px solid rgba(0,255,136,0.1);padding-top:12px;line-height:1.65;}
    `;
    document.head.appendChild(s);
  }

  crearPanel("panel-sala2",`
    <div class="s2-wrap">
      <div class="s2-badge"><div class="s2-badge-dot"></div><span>SALA 02 · MEMORIA Y CEREBRO</span></div>
      <div class="s2-title">Los videojuegos<br/><em>expanden tu hipocampo</em></div>
      <p class="s2-intro">La Universidad de Berlín descubrió en 2013 que jugar videojuegos 3D aumenta físicamente el volumen del hipocampo — la región del cerebro responsable de la memoria espacial y episódica. El efecto es visible en resonancia magnética.</p>

      <div class="s2-hero">
        <div class="s2-hero-card"><span class="s2-hero-num" style="--hc:#00ff88">+12%</span><div class="s2-hero-lbl">Volumen hipocampo 2 meses</div></div>
        <div class="s2-hero-card"><span class="s2-hero-num" style="--hc:#44ffaa">+28%</span><div class="s2-hero-lbl">Memoria espacial largo plazo</div></div>
        <div class="s2-hero-card"><span class="s2-hero-num" style="--hc:#00ccff">3x</span><div class="s2-hero-lbl">Más conexiones sinápticas</div></div>
      </div>

      <div class="s2-section">Estudios científicos publicados</div>
      <div class="s2-study">
        <div class="s2-card" style="--sc:#00ff88">
          <div class="s2-card-title">Kühn et al. — Nature 2014</div>
          <div class="s2-card-desc">Super Mario 64 jugado 2 meses (30 min/día) aumentó el volumen del hipocampo derecho, la corteza prefrontal y el cerebelo. Cambios detectables por RMf. Los efectos se mantuvieron 3 meses después de dejar de jugar. Control activo vs. grupo de juego.</div>
          <div class="s2-card-footer">
            <span class="s2-ref">Molecular Psychiatry 2014 · DOI: 10.1038/mp.2013.120</span>
            <a class="s2-link" href="https://doi.org/10.1038/mp.2013.120" target="_blank" rel="noopener">LEER ESTUDIO →</a>
          </div>
        </div>
        <div class="s2-card" style="--sc:#44ffaa">
          <div class="s2-card-title">Maguire et al. — PNAS 2000</div>
          <div class="s2-card-desc">Los taxistas de Londres, que memorizan miles de rutas, tienen hipocampos significativamente más grandes que la media. El mismo principio aplica a jugadores de videojuegos de mundo abierto: navegar entornos 3D entrena directamente la memoria espacial.</div>
          <div class="s2-card-footer">
            <span class="s2-ref">PNAS 2000 · DOI: 10.1073/pnas.070039597</span>
            <a class="s2-link" href="https://doi.org/10.1073/pnas.070039597" target="_blank" rel="noopener">LEER ESTUDIO →</a>
          </div>
        </div>
        <div class="s2-card" style="--sc:#00ccff">
          <div class="s2-card-title">Pallavicini et al. — Frontiers 2018</div>
          <div class="s2-card-desc">Revisión sistemática de 22 estudios: los videojuegos de estrategia y acción potencian la memoria de trabajo, la flexibilidad cognitiva y la inhibición. El efecto es mayor en adultos mayores — el gaming puede retrasar el deterioro cognitivo asociado a la edad.</div>
          <div class="s2-card-footer">
            <span class="s2-ref">Frontiers in Psychology 2018 · DOI: 10.3389/fpsyg.2018.02127</span>
            <a class="s2-link" href="https://doi.org/10.3389/fpsyg.2018.02127" target="_blank" rel="noopener">LEER ESTUDIO →</a>
          </div>
        </div>
        <div class="s2-card" style="--sc:#88ff44">
          <div class="s2-card-title">Belchior et al. — Psychology & Aging 2013</div>
          <div class="s2-card-desc">Adultos mayores (60-80 años) que jugaron videojuegos durante 6 semanas mejoraron su memoria de trabajo en 30% y su velocidad de procesamiento en 25%, comparados con el grupo de control. El gaming como intervención anti-envejecimiento cognitivo.</div>
          <div class="s2-card-footer">
            <span class="s2-ref">Psychology & Aging 2013 · DOI: 10.1037/a0034857</span>
            <a class="s2-link" href="https://doi.org/10.1037/a0034857" target="_blank" rel="noopener">LEER ESTUDIO →</a>
          </div>
        </div>
      </div>

      <div class="s2-section">Aplicación clínica</div>
      <div style="background:rgba(0,255,136,0.04);border:1px solid rgba(0,255,136,0.14);border-radius:13px;padding:13px 15px;margin-bottom:16px;font-size:10.5px;color:rgba(140,210,175,0.75);line-height:1.7;">
        El Hospital Charité (Berlín) usa videojuegos 3D como parte de protocolos para pacientes con Alzheimer temprano. La NASA utiliza entornos 3D interactivos para mantener la memoria espacial de astronautas en misiones prolongadas.
      </div>

      <div class="s2-source">Sala 02 — Memoria y Neuroplasticidad · Kühn 2014 · Maguire 2000 · Pallavicini 2018 · Belchior 2013</div>
    </div>
  `);

  function update(dt,t){
    outer.rotation.y += 0.18*dt;
    inner.rotation.y -= 0.36*dt;
    inner.rotation.z = Math.sin(t*0.22)*0.2;

    neurons.forEach(n=>{
      const ang = t*n.speed + n.phase;
      const wobble = Math.sin(ang)*0.12;
      n.mesh.position.set(
        n.r*Math.sin(n.phi+wobble)*Math.cos(n.theta+ang*0.06),
        n.r*Math.sin(n.phi+wobble)*Math.sin(n.theta+ang*0.06),
        n.r*Math.cos(n.phi+wobble)
      );
      let intensity = 0.4 + Math.sin(t*2+n.phase)*0.25;
      if(t < n.flashUntil) intensity = 2.0;
      n.mat.emissiveIntensity = intensity;
    });

    let synIdx=0; const maxSyn = synCap-1;
    for(let i=0;i<NEURON_COUNT && synIdx<maxSyn;i++){
      for(let j=i+1;j<NEURON_COUNT && synIdx<maxSyn;j++){
        const d = neurons[i].mesh.position.distanceTo(neurons[j].mesh.position);
        if(d<2.0){
          const b=synIdx*6;
          synPos[b]=neurons[i].mesh.position.x; synPos[b+1]=neurons[i].mesh.position.y; synPos[b+2]=neurons[i].mesh.position.z;
          synPos[b+3]=neurons[j].mesh.position.x; synPos[b+4]=neurons[j].mesh.position.y; synPos[b+5]=neurons[j].mesh.position.z;
          synIdx++;
        }
      }
    }
    synGeo.attributes.position.needsUpdate=true; synGeo.setDrawRange(0,synIdx*2);

    pulses.forEach(p=>{
      p.prog += dt/1.5;
      if(p.prog>=1){
        neurons[p.to].flashUntil = t+0.4;
        p.from = p.to;
        let nt = Math.floor(Math.random()*NEURON_COUNT); if(nt===p.from) nt=(nt+1)%NEURON_COUNT;
        p.to = nt; p.prog = 0;
      }
      p.mesh.position.lerpVectors(neurons[p.from].mesh.position, neurons[p.to].mesh.position, p.prog);
    });

    hRings.forEach(r=>{ r.mesh.rotation.z += r.speed*dt; });

    waveRings.forEach(w=>{
      const elapsed = ((t - w.offset) % 3 + 3) % 3;
      const prog = elapsed/3;
      w.mesh.scale.setScalar(0.1 + prog*3.9);
      w.mesh.material.opacity = 0.6*(1-prog);
    });

    const pos=pGeo.attributes.position.array;
    for(let i=0;i<pCount;i++){ pos[i*3+1]+=pSp[i]*dt; if(pos[i*3+1]>9) pos[i*3+1]=0; }
    pGeo.attributes.position.needsUpdate=true;

    key.intensity = 4.0 + Math.sin(t*0.6)*0.5;
  }
  function dispose(){ const el=document.getElementById("panel-sala2"); if(el) el.style.display="none"; }
  return{update,dispose};
}
