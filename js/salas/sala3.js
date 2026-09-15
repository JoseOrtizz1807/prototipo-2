import * as THREE from "three";
function crearPanel(id,html){let el=document.getElementById(id);if(!el){el=document.createElement("div");el.id=id;el.className="sala-panel";document.body.appendChild(el);}el.innerHTML=html;el.style.display="block";return el;}

export function sala3Sociales(scene, camera, renderer) {
  // ── AMBIENTE: RED SOCIAL GLOBAL / OASIS ─────────────────────────
  scene.background = new THREE.Color(0x06010e);
  scene.fog = new THREE.FogExp2(0x06010e, 0.024);

  const ambient = new THREE.AmbientLight(0x1a0535, 2.0); scene.add(ambient);
  const key   = new THREE.PointLight(0xcc44ff, 4.5, 30); key.position.set(0, 10, 0); scene.add(key);
  const fill1 = new THREE.PointLight(0x8833ff, 3.0, 16); fill1.position.set(-6, 4, 2); scene.add(fill1);
  const fill2 = new THREE.PointLight(0xff44aa, 2.5, 14); fill2.position.set(6, 4, -2); scene.add(fill2);
  const flashLight = new THREE.PointLight(0xff44aa, 0, 4); scene.add(flashLight);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60,60),
    new THREE.MeshStandardMaterial({color:0x0a0314, roughness:0.05, metalness:0.95}));
  floor.rotation.x = -Math.PI/2; scene.add(floor);
  const grid = new THREE.GridHelper(60,60,0x1a0840,0x0a0314); grid.position.y=0.002; scene.add(grid);

  // ── GLOBO TERRÁQUEO WIREFRAME — la escala global ─────────────────
  const globe = new THREE.Mesh(new THREE.IcosahedronGeometry(3.2,4),
    new THREE.MeshStandardMaterial({color:0x110022, emissive:0x220033, emissiveIntensity:0.3, wireframe:true, transparent:true, opacity:0.15}));
  globe.position.set(1.5, 2.5, -4); scene.add(globe);

  // ── RED DE JUGADORES — nodos interconectados ─────────────────────
  const netGroup = new THREE.Group(); netGroup.position.set(1.5, 2.5, -1); scene.add(netGroup);

  const centerMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42,2),
    new THREE.MeshStandardMaterial({color:0xcc44ff, emissive:0xcc44ff, emissiveIntensity:0.8, roughness:0.15, metalness:0.5}));
  netGroup.add(centerMesh);

  const playerColors = [0xff44aa,0x4488ff,0x44ffaa,0xffaa44,0xff8833,0x00ffee];
  const subtleColors  = [0x884466,0x335588,0x338866,0x997744,0x884422,0x227766];

  const nodes = [];
  for(let i=0;i<6;i++){
    const phase = (i/6)*Math.PI*2; const col = playerColors[i];
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.22,12,12),
      new THREE.MeshStandardMaterial({color:col, emissive:col, emissiveIntensity:0.55, roughness:0.2, metalness:0.5}));
    netGroup.add(mesh);
    nodes.push({mesh, r:2.0, phase, baseY:(i%2===0?0.3:-0.3), speed:0.18+i*0.02, level:1});
  }
  for(let i=0;i<6;i++){
    const phase = (i/6)*Math.PI*2 + 0.3; const col = subtleColors[i];
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.18),
      new THREE.MeshStandardMaterial({color:col, emissive:col, emissiveIntensity:0.35, roughness:0.3, metalness:0.4}));
    netGroup.add(mesh);
    nodes.push({mesh, r:3.5, phase, baseY:(i%2===0?0.3:-0.3), speed:0.11+i*0.015, level:2});
  }

  // ── LÍNEAS DE CONEXIÓN DINÁMICAS (color según distancia) ─────────
  const allPoints = [centerMesh, ...nodes.map(n=>n.mesh)];
  const N = allPoints.length;
  const connCap = N*N;
  const connPos = new Float32Array(connCap*6);
  const connCol = new Float32Array(connCap*6);
  const connGeo = new THREE.BufferGeometry();
  connGeo.setAttribute("position", new THREE.BufferAttribute(connPos,3));
  connGeo.setAttribute("color", new THREE.BufferAttribute(connCol,3));
  const connMat = new THREE.LineBasicMaterial({vertexColors:true, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false});
  netGroup.add(new THREE.LineSegments(connGeo, connMat));

  const cStrong = new THREE.Color(0xff44aa), cMed = new THREE.Color(0xcc44ff), cWeak = new THREE.Color(0x330044);

  // ── ARCOS ENTRE CONTINENTES ────────────────────────────────────────
  const arcs = [];
  for(let i=0;i<5;i++){
    const a1 = (i/5)*Math.PI*2, a2 = a1+Math.PI;
    const p1 = new THREE.Vector3(Math.cos(a1)*3.5, 0, Math.sin(a1)*3.5);
    const p2 = new THREE.Vector3(Math.cos(a2)*3.5, 0, Math.sin(a2)*3.5);
    const mid = new THREE.Vector3().addVectors(p1,p2).multiplyScalar(0.5);
    mid.y = 3.5 + Math.random()*1.5;
    const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
    const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(30));
    netGroup.add(new THREE.Line(geo, new THREE.LineBasicMaterial({color:0xcc44ff, transparent:true, opacity:0.35})));
    arcs.push(curve);
  }

  // ── PARTÍCULAS VIAJERAS — datos moviéndose por los arcos ─────────
  const travelerGeo = new THREE.SphereGeometry(0.035,5,5);
  const travelers = [];
  for(let i=0;i<10;i++){
    const mesh = new THREE.Mesh(travelerGeo, new THREE.MeshStandardMaterial({color:0xffffff, emissive:0xcc44ff, emissiveIntensity:1.2}));
    netGroup.add(mesh);
    travelers.push({mesh, arcIdx:i%5, progress:Math.random()});
  }

  // ── ANILLOS DE COMUNIDAD — plataformas ────────────────────────────
  const commRings = [];
  [[2.2,0xcc44ff,0.28,Math.PI/2],[3.0,0xff44aa,0.18,Math.PI/2+0.35],[3.8,0x4488ff,0.12,Math.PI/2-0.25]].forEach(([r,col,op,tilt],i)=>{
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r,0.016,6,64),
      new THREE.MeshStandardMaterial({color:col, emissive:col, emissiveIntensity:0.7, transparent:true, opacity:op}));
    ring.rotation.x = tilt; netGroup.add(ring);
    commRings.push({mesh:ring, speed:0.1+i*0.06});
  });

  // ── PARTÍCULAS AMBIENTE ────────────────────────────────────────────
  const pCount=220; const pGeo=new THREE.BufferGeometry();
  const pPos=new Float32Array(pCount*3); const pSp=new Float32Array(pCount);
  for(let i=0;i<pCount;i++){pPos[i*3]=(Math.random()-0.5)*28;pPos[i*3+1]=Math.random()*9;pPos[i*3+2]=(Math.random()-0.5)*22;pSp[i]=0.24+Math.random()*0.42;}
  pGeo.setAttribute("position",new THREE.BufferAttribute(pPos,3));
  scene.add(new THREE.Points(pGeo,new THREE.PointsMaterial({size:0.032,color:0xcc44ff,transparent:true,opacity:0.38})));

  if(!document.getElementById("sala3-styles")){
    const s=document.createElement("style");s.id="sala3-styles";
    s.textContent=`
      #panel-sala3{position:fixed;top:72px;left:18px;width:min(430px,44vw);max-height:calc(100vh - 90px);overflow-y:auto;z-index:8;pointer-events:all;scrollbar-width:thin;scrollbar-color:#cc44ff33 transparent;font-family:'Space Mono',monospace;}
      #panel-sala3::-webkit-scrollbar{width:4px;}#panel-sala3::-webkit-scrollbar-thumb{background:#cc44ff55;border-radius:4px;}
      .s3-wrap{background:linear-gradient(145deg,rgba(8,3,18,0.96),rgba(14,5,28,0.93));border:1px solid rgba(204,68,255,0.2);border-radius:22px;padding:26px 22px 22px;backdrop-filter:blur(24px);box-shadow:0 0 50px rgba(204,68,255,0.07),0 24px 60px rgba(0,0,0,0.9);}
      .s3-badge{display:inline-flex;align-items:center;gap:7px;background:rgba(204,68,255,0.1);border:1px solid rgba(204,68,255,0.32);border-radius:20px;padding:5px 14px;margin-bottom:14px;}
      .s3-badge-dot{width:7px;height:7px;border-radius:50%;background:#cc44ff;box-shadow:0 0 8px #cc44ff;}
      .s3-badge span{font-family:'Orbitron',sans-serif;font-size:9px;letter-spacing:.28em;color:#cc44ff;font-weight:700;}
      .s3-title{font-family:'Orbitron',sans-serif;font-size:clamp(18px,2.2vw,26px);font-weight:900;line-height:1.15;margin-bottom:6px;color:#fff;}
      .s3-title em{font-style:normal;background:linear-gradient(90deg,#cc44ff,#ff44aa);-webkit-background-clip:text;background-clip:text;color:transparent;}
      .s3-intro{font-size:11px;color:rgba(185,140,215,0.7);line-height:1.75;margin-bottom:20px;border-left:3px solid rgba(204,68,255,0.4);padding-left:12px;}
      .s3-hero{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:22px;}
      .s3-hero-card{background:rgba(204,68,255,0.05);border:1px solid rgba(204,68,255,0.16);border-radius:14px;padding:12px 10px;text-align:center;}
      .s3-hero-num{font-family:'Orbitron',sans-serif;font-size:22px;font-weight:900;color:var(--hc,#cc44ff);display:block;text-shadow:0 0 14px var(--hc,#cc44ff);}
      .s3-hero-lbl{font-size:9px;color:rgba(180,140,210,0.6);line-height:1.4;margin-top:3px;}
      .s3-section{font-family:'Orbitron',sans-serif;font-size:9px;letter-spacing:.22em;color:rgba(204,68,255,0.6);margin-bottom:10px;display:flex;align-items:center;gap:8px;}
      .s3-section::after{content:'';flex:1;height:1px;background:rgba(204,68,255,0.15);}
      .s3-study{display:flex;flex-direction:column;gap:9px;margin-bottom:20px;}
      .s3-card{background:rgba(204,68,255,0.025);border:1px solid rgba(204,68,255,0.1);border-radius:13px;padding:13px 15px;position:relative;overflow:hidden;transition:background .2s;}
      .s3-card:hover{background:rgba(204,68,255,0.06);}
      .s3-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--sc,#cc44ff);border-radius:3px 0 0 3px;box-shadow:0 0 10px var(--sc,#cc44ff);}
      .s3-card-title{font-family:'Orbitron',sans-serif;font-size:10.5px;font-weight:700;color:var(--sc,#cc44ff);margin-bottom:5px;}
      .s3-card-desc{font-size:10.5px;color:rgba(195,155,225,0.75);line-height:1.65;}
      .s3-card-footer{display:flex;align-items:center;justify-content:space-between;margin-top:8px;flex-wrap:wrap;gap:6px;}
      .s3-ref{font-family:'Orbitron',sans-serif;font-size:8px;color:var(--sc,#cc44ff);opacity:.7;letter-spacing:.1em;}
      .s3-link{font-family:'Orbitron',sans-serif;font-size:8px;color:var(--sc,#cc44ff);text-decoration:none;border:1px solid var(--sc,#cc44ff);border-radius:5px;padding:2px 8px;opacity:.8;transition:opacity .2s;}
      .s3-link:hover{opacity:1;background:rgba(204,68,255,0.15);}
      .s3-source{font-size:9px;color:rgba(175,135,205,0.3);text-align:center;border-top:1px solid rgba(204,68,255,0.1);padding-top:12px;line-height:1.65;}
    `;
    document.head.appendChild(s);
  }

  crearPanel("panel-sala3",`
    <div class="s3-wrap">
      <div class="s3-badge"><div class="s3-badge-dot"></div><span>SALA 03 · BIENESTAR SOCIAL</span></div>
      <div class="s3-title">Los videojuegos<br/><em>construyen personas</em></div>
      <p class="s3-intro">Contrario al estereotipo del jugador solitario, la investigación científica demuestra que los videojuegos son potentes catalizadores de habilidades sociales, empatía y bienestar emocional.</p>

      <div class="s3-hero">
        <div class="s3-hero-card"><span class="s3-hero-num" style="--hc:#cc44ff">65%</span><div class="s3-hero-lbl">Jugadores activos online en comunidad</div></div>
        <div class="s3-hero-card"><span class="s3-hero-num" style="--hc:#ff44aa">−24%</span><div class="s3-hero-lbl">Reducción ansiedad hospitalaria (VR)</div></div>
        <div class="s3-hero-card"><span class="s3-hero-num" style="--hc:#44aaff">+40%</span><div class="s3-hero-lbl">Empatía en juegos cooperativos</div></div>
        <div class="s3-hero-card"><span class="s3-hero-num" style="--hc:#44ffaa">35M</span><div class="s3-hero-lbl">Estudiantes Minecraft Education</div></div>
      </div>

      <div class="s3-section">Estudios científicos publicados</div>
      <div class="s3-study">
        <div class="s3-card" style="--sc:#cc44ff">
          <div class="s3-card-title">Granic et al. — American Psychologist 2014</div>
          <div class="s3-card-desc">Revisión de 30 años de investigación: los videojuegos cooperativos aumentan la conducta prosocial, la empatía y la disposición a ayudar a otros. Los juegos colaborativos son más efectivos para desarrollar habilidades sociales que muchas intervenciones tradicionales.</div>
          <div class="s3-card-footer">
            <span class="s3-ref">American Psychologist 2014 · DOI: 10.1037/a0034857</span>
            <a class="s3-link" href="https://doi.org/10.1037/a0034857" target="_blank" rel="noopener">LEER ESTUDIO →</a>
          </div>
        </div>
        <div class="s3-card" style="--sc:#ff44aa">
          <div class="s3-card-title">AppliedVR — JMIR Serious Games 2021</div>
          <div class="s3-card-desc">EaseVRx: primer tratamiento de realidad virtual aprobado por la FDA para dolor crónico. 547 pacientes, 65.7% reportaron reducción significativa del dolor vs 40.7% del grupo control. La VR también redujo la ansiedad hospitalaria en 24% en ensayo aleatorizado.</div>
          <div class="s3-card-footer">
            <span class="s3-ref">FDA Breakthrough Device 2021 · ClinicalTrials NCT04109625</span>
            <a class="s3-link" href="https://pubmed.ncbi.nlm.nih.gov/34406959/" target="_blank" rel="noopener">LEER ESTUDIO →</a>
          </div>
        </div>
        <div class="s3-card" style="--sc:#44aaff">
          <div class="s3-card-title">Przybylski & Weinstein — Pediatrics 2019</div>
          <div class="s3-card-desc">Estudio con 1,000 adolescentes: el gaming moderado (1-3h/día) se asoció con mayor bienestar, mejor desempeño social y menos síntomas de depresión que no jugar. La clave es la moderación y el tipo de juego — los cooperativos son los más beneficiosos.</div>
          <div class="s3-card-footer">
            <span class="s3-ref">Pediatrics 2019 · DOI: 10.1542/peds.2018-2351</span>
            <a class="s3-link" href="https://doi.org/10.1542/peds.2018-2351" target="_blank" rel="noopener">LEER ESTUDIO →</a>
          </div>
        </div>
        <div class="s3-card" style="--sc:#44ffaa">
          <div class="s3-card-title">Microsoft Education — UNESCO 2023</div>
          <div class="s3-card-desc">Minecraft Education Edition en 115 países con 35 millones de estudiantes mejora significativamente habilidades de colaboración, pensamiento computacional y creatividad. La UNESCO lo reconoce como herramienta de alfabetización digital de referencia global.</div>
          <div class="s3-card-footer">
            <span class="s3-ref">UNESCO Digital Skills Report 2023 · education.minecraft.net</span>
            <a class="s3-link" href="https://education.minecraft.net/en-us/resources/research" target="_blank" rel="noopener">LEER EVIDENCIA →</a>
          </div>
        </div>
      </div>
      <div class="s3-source">Sala 03 — Bienestar Social · Granic 2014 · AppliedVR 2021 · Przybylski 2019 · UNESCO 2023</div>
    </div>
  `);

  function update(dt,t){
    globe.rotation.y += 0.048*dt;

    nodes.forEach(n=>{
      const ang = t*n.speed + n.phase;
      const rr = n.r + Math.sin(t*0.3+n.phase)*0.2;
      n.mesh.position.x = rr*Math.cos(ang);
      n.mesh.position.z = rr*Math.sin(ang);
      n.mesh.position.y = n.baseY + Math.sin(t*0.5+n.phase)*0.35;
      n.mesh.material.emissiveIntensity = (n.level===1?0.45:0.3) + Math.sin(t*1.4+n.phase)*0.2;
    });
    centerMesh.rotation.y += 0.7*dt;

    let idx=0; let closestD=Infinity; let closestLocal=null;
    for(let i=0;i<N && idx<connCap-1;i++){
      for(let j=i+1;j<N && idx<connCap-1;j++){
        const pi = allPoints[i].position, pj = allPoints[j].position;
        const d = pi.distanceTo(pj);
        let col, alpha;
        if(d<1.5){ col=cStrong; alpha=0.7; }
        else if(d<3.0){ col=cMed; alpha=0.3; }
        else { col=cWeak; alpha=0.08; }
        const b=idx*6;
        connPos[b]=pi.x; connPos[b+1]=pi.y; connPos[b+2]=pi.z;
        connPos[b+3]=pj.x; connPos[b+4]=pj.y; connPos[b+5]=pj.z;
        connCol[b]=col.r*alpha; connCol[b+1]=col.g*alpha; connCol[b+2]=col.b*alpha;
        connCol[b+3]=connCol[b]; connCol[b+4]=connCol[b+1]; connCol[b+5]=connCol[b+2];
        idx++;
        if(d<0.8 && d<closestD){ closestD=d; closestLocal=new THREE.Vector3().addVectors(pi,pj).multiplyScalar(0.5); }
      }
    }
    connGeo.attributes.position.needsUpdate=true; connGeo.attributes.color.needsUpdate=true; connGeo.setDrawRange(0,idx*2);

    if(closestLocal){
      flashLight.position.copy(closestLocal).add(netGroup.position);
      flashLight.intensity = 2.0;
    } else {
      flashLight.intensity = Math.max(0, flashLight.intensity - dt*6.6);
    }

    travelers.forEach(tr=>{
      tr.progress += 0.24*dt;
      if(tr.progress>=1){ tr.progress=0; tr.arcIdx = Math.floor(Math.random()*5); }
      tr.mesh.position.copy(arcs[tr.arcIdx].getPoint(tr.progress));
    });

    commRings.forEach(r=>{ r.mesh.rotation.z += r.speed*dt; });

    const pos=pGeo.attributes.position.array;
    for(let i=0;i<pCount;i++){ pos[i*3+1]+=pSp[i]*dt; if(pos[i*3+1]>9) pos[i*3+1]=0; }
    pGeo.attributes.position.needsUpdate=true;

    key.intensity = 4.2 + Math.sin(t*0.6)*0.4;
  }
  function dispose(){ const el=document.getElementById("panel-sala3"); if(el) el.style.display="none"; }
  return{update,dispose};
}
