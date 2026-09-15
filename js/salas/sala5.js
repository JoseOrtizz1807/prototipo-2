import * as THREE from "three";
function crearPanel(id,html){let el=document.getElementById(id);if(!el){el=document.createElement("div");el.id=id;el.className="sala-panel";document.body.appendChild(el);}el.innerHTML=html;el.style.display="block";return el;}

export function sala5Galeria(scene, camera, renderer) {
  // ── AMBIENTE: INDUSTRIA / ECONOMÍA DEL FUTURO ─────────────────
  scene.background = new THREE.Color(0x0c0500);
  scene.fog = new THREE.FogExp2(0x0c0500, 0.022);

  const ambient = new THREE.AmbientLight(0x2a1200, 2.5); scene.add(ambient);
  const key   = new THREE.PointLight(0xffaa44, 5.0, 35); key.position.set(0, 12, 0); scene.add(key);
  const gold1 = new THREE.PointLight(0xffaa00, 3.5, 18); gold1.position.set(-6, 5, 2); scene.add(gold1);
  const gold2 = new THREE.PointLight(0xff6600, 3.0, 15); gold2.position.set(6, 5, -2); scene.add(gold2);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60,60),
    new THREE.MeshStandardMaterial({color:0x1a0800, roughness:0.01, metalness:0.98}));
  floor.rotation.x=-Math.PI/2; scene.add(floor);
  const grid=new THREE.GridHelper(60,60,0x2a1200,0x1a0800); grid.position.y=0.003; scene.add(grid);

  // ── SOL CORPORATIVO — el poder central ─────────────────────────
  const sunGroup = new THREE.Group(); sunGroup.position.set(0,9,-3); scene.add(sunGroup);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(0.9,16,16),
    new THREE.MeshStandardMaterial({color:0xffd700, emissive:0xffd700, emissiveIntensity:1.5}));
  sunGroup.add(sun);
  const sunLight = new THREE.PointLight(0xffd700, 8, 20); sunGroup.add(sunLight);
  const rayGroup = new THREE.Group(); sunGroup.add(rayGroup);
  for(let i=0;i<8;i++){
    const ray = new THREE.Mesh(new THREE.BoxGeometry(0.025,0.025,3.5),
      new THREE.MeshBasicMaterial({color:0xffd700, transparent:true, opacity:0.25}));
    ray.rotation.z = (i/8)*Math.PI*2; rayGroup.add(ray);
  }

  // ── CIUDAD DE BARRAS — el skyline del éxito ─────────────────────
  const barData = [
    {year:"2015", val:91,  col:0xff6600},
    {year:"2017", val:109, col:0xff7700},
    {year:"2019", val:146, col:0xff8800},
    {year:"2020", val:155, col:0xffaa00},
    {year:"2021", val:180, col:0xffbb00},
    {year:"2023", val:184, col:0xffcc00},
    {year:"2025*",val:211, col:0xfff8e8},
  ];
  const maxVal=211, maxH=4.2;
  const barGroup = new THREE.Group(); barGroup.position.set(-2.8, 0, 0); scene.add(barGroup);
  const barMeshes = [];
  barData.forEach((d,i)=>{
    const h=(d.val/maxVal)*maxH;
    const isLast = i===barData.length-1;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.42,h,0.42),
      new THREE.MeshStandardMaterial({color:d.col, emissive:d.col, emissiveIntensity:0.35, roughness:0.15, metalness:0.75, transparent:true, opacity:0.92}));
    bar.position.set(i*0.84-2.5, 0.001, 0); barGroup.add(bar);

    const flashPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.6,0.05),
      new THREE.MeshBasicMaterial({color:0xfff8e8, transparent:true, opacity:0}));
    flashPlane.position.set(bar.position.x, 0, 0.22);
    barGroup.add(flashPlane);

    let topRing = null;
    if(isLast){
      topRing = new THREE.Mesh(new THREE.TorusGeometry(0.32,0.02,6,32),
        new THREE.MeshStandardMaterial({color:0xfff8e8, emissive:0xfff8e8, emissiveIntensity:1.0, transparent:true, opacity:0.8}));
      topRing.rotation.x = Math.PI/2; barGroup.add(topRing);
    }

    barMeshes.push({mesh:bar, flashPlane, topRing, h, isLast, curH:0.001, phase:i*0.55, flashed:false, flashUntil:0});
  });

  // ── LLUVIA DE MONEDAS — riqueza literalmente cayendo ─────────────
  const coinGeo = new THREE.CylinderGeometry(0.045,0.045,0.06,12);
  const coinColors = [0xffd700,0xff8800,0xffcc00,0xffffff];
  const coins = [];
  for(let i=0;i<60;i++){
    let x = (Math.random()-0.5)*14;
    if(x < -3 && Math.random() < 0.65) x += 6;
    const col = coinColors[i%coinColors.length];
    const mesh = new THREE.Mesh(coinGeo, new THREE.MeshStandardMaterial({color:col, emissive:col, emissiveIntensity:0.5, roughness:0.2, metalness:0.85}));
    mesh.position.set(x, Math.random()*14, -5+Math.random()*6);
    scene.add(mesh);
    coins.push({mesh, speed:1.5+Math.random()*2.0, rx:(Math.random()-0.5)*3, rz:(Math.random()-0.5)*3});
  }

  // ── MERCADOS — planetas con estela y anillos dobles ──────────────
  const mColors = [0xffaa44,0xff6600,0xffdd00,0xff4400,0xffcc88];
  const markets = [];
  for(let i=0;i<5;i++){
    const ang=(i/5)*Math.PI*2; const r=3.5;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.28+i*0.04,12,12),
      new THREE.MeshStandardMaterial({color:mColors[i],emissive:mColors[i],emissiveIntensity:0.55,roughness:0.18,metalness:0.6}));
    mesh.position.set(r*Math.cos(ang),1.2,-3+r*Math.sin(ang)); scene.add(mesh);

    [0.4,0.55].forEach((rr,ri)=>{
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rr,0.008,6,24),
        new THREE.MeshStandardMaterial({color:mColors[i], emissive:mColors[i], emissiveIntensity:0.6, transparent:true, opacity:0.5}));
      ring.rotation.x = ri===0 ? Math.PI/2 : Math.PI/3; mesh.add(ring);
    });

    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(8*3),3));
    const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({color:mColors[i], transparent:true, opacity:0.3}));
    scene.add(trail);

    markets.push({mesh, trailGeo, ang, r, speed:0.15+i*0.03, phase:ang});
  }

  // ── LÍNEAS DE CONECTIVIDAD DEL MERCADO — economía interconectada ──
  const connGeoStatic = new THREE.BufferGeometry().setFromPoints(
    barMeshes.slice(0,-1).map((b,i)=>[
      new THREE.Vector3(b.mesh.position.x, b.h, 0).add(barGroup.position),
      new THREE.Vector3(barMeshes[i+1].mesh.position.x, barMeshes[i+1].h, 0).add(barGroup.position)
    ]).flat()
  );
  scene.add(new THREE.LineSegments(connGeoStatic, new THREE.LineBasicMaterial({color:0xffd700, transparent:true, opacity:0.25})));

  // ── PARTÍCULAS DORADAS ASCENDENTES ────────────────────────────────
  const pCount=250; const pGeo=new THREE.BufferGeometry();
  const pPos=new Float32Array(pCount*3); const pSp=new Float32Array(pCount);
  for(let i=0;i<pCount;i++){pPos[i*3]=(Math.random()-0.5)*32;pPos[i*3+1]=Math.random()*10;pPos[i*3+2]=(Math.random()-0.5)*24;pSp[i]=0.25+Math.random()*0.4;}
  pGeo.setAttribute("position",new THREE.BufferAttribute(pPos,3));
  const particles = new THREE.Points(pGeo,new THREE.PointsMaterial({size:0.04,color:0xffd700,transparent:true,opacity:0.45}));
  scene.add(particles);

  if(!document.getElementById("sala5-styles")){
    const s=document.createElement("style");s.id="sala5-styles";
    s.textContent=`
      #panel-sala5{position:fixed;top:72px;left:18px;width:min(430px,44vw);max-height:calc(100vh - 90px);overflow-y:auto;z-index:8;pointer-events:all;scrollbar-width:thin;scrollbar-color:#ffaa4433 transparent;font-family:'Space Mono',monospace;}
      #panel-sala5::-webkit-scrollbar{width:4px;}#panel-sala5::-webkit-scrollbar-thumb{background:#ffaa4455;border-radius:4px;}
      .s5-wrap{background:linear-gradient(145deg,rgba(18,8,0,0.96),rgba(26,12,0,0.93));border:1px solid rgba(255,170,68,0.2);border-radius:22px;padding:26px 22px 22px;backdrop-filter:blur(24px);box-shadow:0 0 50px rgba(255,170,68,0.07),0 24px 60px rgba(0,0,0,0.9);}
      .s5-badge{display:inline-flex;align-items:center;gap:7px;background:rgba(255,170,68,0.1);border:1px solid rgba(255,170,68,0.32);border-radius:20px;padding:5px 14px;margin-bottom:14px;}
      .s5-badge-dot{width:7px;height:7px;border-radius:50%;background:#ffaa44;box-shadow:0 0 8px #ffaa44;}
      .s5-badge span{font-family:'Orbitron',sans-serif;font-size:9px;letter-spacing:.28em;color:#ffaa44;font-weight:700;}
      .s5-title{font-family:'Orbitron',sans-serif;font-size:clamp(18px,2.2vw,26px);font-weight:900;line-height:1.15;margin-bottom:6px;color:#fff;}
      .s5-title em{font-style:normal;background:linear-gradient(90deg,#ffaa44,#fff);-webkit-background-clip:text;background-clip:text;color:transparent;}
      .s5-intro{font-size:11px;color:rgba(225,185,130,0.7);line-height:1.75;margin-bottom:20px;border-left:3px solid rgba(255,170,68,0.4);padding-left:12px;}
      .s5-hero{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:22px;}
      .s5-hero-card{background:rgba(255,170,68,0.05);border:1px solid rgba(255,170,68,0.16);border-radius:14px;padding:12px 10px;text-align:center;}
      .s5-hero-num{font-family:'Orbitron',sans-serif;font-size:22px;font-weight:900;color:var(--hc,#ffaa44);display:block;text-shadow:0 0 14px var(--hc,#ffaa44);}
      .s5-hero-lbl{font-size:9px;color:rgba(220,175,110,0.6);line-height:1.4;margin-top:3px;}
      .s5-section{font-family:'Orbitron',sans-serif;font-size:9px;letter-spacing:.22em;color:rgba(255,170,68,0.6);margin-bottom:10px;display:flex;align-items:center;gap:8px;}
      .s5-section::after{content:'';flex:1;height:1px;background:rgba(255,170,68,0.15);}
      .s5-study{display:flex;flex-direction:column;gap:9px;margin-bottom:20px;}
      .s5-card{background:rgba(255,170,68,0.025);border:1px solid rgba(255,170,68,0.1);border-radius:13px;padding:13px 15px;position:relative;overflow:hidden;transition:background .2s;}
      .s5-card:hover{background:rgba(255,170,68,0.06);}
      .s5-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--sc,#ffaa44);border-radius:3px 0 0 3px;box-shadow:0 0 10px var(--sc,#ffaa44);}
      .s5-card-title{font-family:'Orbitron',sans-serif;font-size:10.5px;font-weight:700;color:var(--sc,#ffaa44);margin-bottom:5px;}
      .s5-card-desc{font-size:10.5px;color:rgba(225,185,130,0.75);line-height:1.65;}
      .s5-card-footer{display:flex;align-items:center;justify-content:space-between;margin-top:8px;flex-wrap:wrap;gap:6px;}
      .s5-ref{font-family:'Orbitron',sans-serif;font-size:8px;color:var(--sc,#ffaa44);opacity:.7;letter-spacing:.1em;}
      .s5-link{font-family:'Orbitron',sans-serif;font-size:8px;color:var(--sc,#ffaa44);text-decoration:none;border:1px solid var(--sc,#ffaa44);border-radius:5px;padding:2px 8px;opacity:.8;transition:opacity .2s;}
      .s5-link:hover{opacity:1;background:rgba(255,170,68,0.15);}
      .s5-source{font-size:9px;color:rgba(220,170,100,0.3);text-align:center;border-top:1px solid rgba(255,170,68,0.1);padding-top:12px;line-height:1.65;}
    `;
    document.head.appendChild(s);
  }

  crearPanel("panel-sala5",`
    <div class="s5-wrap">
      <div class="s5-badge"><div class="s5-badge-dot"></div><span>SALA 05 · INDUSTRIA Y FUTURO</span></div>
      <div class="s5-title">El arte más grande<br/><em>del siglo XXI</em></div>
      <p class="s5-intro">Los videojuegos son la industria del entretenimiento más grande de la historia humana — superando al cine y la música combinados. Y apenas están comenzando.</p>

      <div class="s5-hero">
        <div class="s5-hero-card"><span class="s5-hero-num" style="--hc:#ffaa44">$184B</span><div class="s5-hero-lbl">Ingresos globales 2023</div></div>
        <div class="s5-hero-card"><span class="s5-hero-num" style="--hc:#ff6600">3.2B</span><div class="s5-hero-lbl">Jugadores activos mundiales</div></div>
        <div class="s5-hero-card"><span class="s5-hero-num" style="--hc:#ffdd00">#1</span><div class="s5-hero-lbl">Industria del entretenimiento</div></div>
        <div class="s5-hero-card"><span class="s5-hero-num" style="--hc:#ffcc88">$211B</span><div class="s5-hero-lbl">Proyección para 2025</div></div>
      </div>

      <div class="s5-section">Informes de industria y estudios</div>
      <div class="s5-study">
        <div class="s5-card" style="--sc:#ffaa44">
          <div class="s5-card-title">Newzoo Global Games Market Report 2023</div>
          <div class="s5-card-desc">La industria del videojuego generó $184 mil millones en 2023, superando a cine ($33B) y música ($26B) combinados. Proyección a $211B para 2025. Mobile gaming representa el 50% ($92B). E-Sports: $1.8B en premios acumulados desde 2010.</div>
          <div class="s5-card-footer">
            <span class="s5-ref">Newzoo Global Games Market Report 2023</span>
            <a class="s5-link" href="https://newzoo.com/resources/trend-reports/newzoo-global-games-market-report-2023-free-version" target="_blank" rel="noopener">VER REPORTE →</a>
          </div>
        </div>
        <div class="s5-card" style="--sc:#ff6600">
          <div class="s5-card-title">ESA Essential Facts — Entertainment Software Association 2023</div>
          <div class="s5-card-desc">El jugador promedio tiene 34 años. El 48% son mujeres. El 65% juega en grupo con amigos o familia. 7 de cada 10 padres juegan con sus hijos. El gaming es la actividad social digital más popular, superando redes sociales y streaming.</div>
          <div class="s5-card-footer">
            <span class="s5-ref">ESA Essential Facts 2023 · theesa.com</span>
            <a class="s5-link" href="https://www.theesa.com/resources/essential-facts-about-the-us-video-game-industry/" target="_blank" rel="noopener">VER DATOS →</a>
          </div>
        </div>
        <div class="s5-card" style="--sc:#ffdd00">
          <div class="s5-card-title">Deterding et al. — CHI Conference 2021</div>
          <div class="s5-card-desc">La gamificación (aplicación de principios de videojuegos a contextos no-lúdicos) aumenta la motivación intrínseca, el engagement y la retención de conocimiento. Duolingo: 95% de retención vs 5% de la educación tradicional. Aplicaciones en salud, educación y trabajo.</div>
          <div class="s5-card-footer">
            <span class="s5-ref">Human-Computer Interaction 2021 · DOI: 10.1080/07370024.2020.1841281</span>
            <a class="s5-link" href="https://doi.org/10.1080/07370024.2020.1841281" target="_blank" rel="noopener">LEER ESTUDIO →</a>
          </div>
        </div>
        <div class="s5-card" style="--sc:#ff4400">
          <div class="s5-card-title">Rosser et al. — Archives of Surgery 2007</div>
          <div class="s5-card-desc">Cirujanos laparoscópicos que jugaban videojuegos cometieron 37% menos errores y operaron 27% más rápido. Hoy hospitales como Beth Israel (NY) usan simuladores de videojuegos para entrenar cirujanos. El gaming salva vidas literalmente.</div>
          <div class="s5-card-footer">
            <span class="s5-ref">Archives of Surgery 2007 · DOI: 10.1001/archsurg.142.2.181</span>
            <a class="s5-link" href="https://doi.org/10.1001/archsurg.142.2.181" target="_blank" rel="noopener">LEER ESTUDIO →</a>
          </div>
        </div>
      </div>

      <div class="s5-section">La industria vs. otras</div>
      <div style="background:rgba(255,170,68,0.04);border:1px solid rgba(255,170,68,0.14);border-radius:13px;padding:13px 15px;margin-bottom:16px;">
        ${[["Videojuegos 2023","$184B","#ffaa44"],["Cine (taquilla global)","$33B","#ff6600"],["Música (streaming)","$26B","#ffdd00"],["E-Sports","$1.8B","#ff4400"]].map(([label,val,col])=>`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,170,68,0.08);">
          <span style="font-size:10.5px;color:rgba(225,180,120,0.75)">${label}</span>
          <span style="font-family:'Orbitron',sans-serif;font-size:12px;font-weight:900;color:${col};text-shadow:0 0 8px ${col}88">${val}</span>
        </div>`).join('')}
      </div>

      <div class="s5-source">Sala 05 — Industria y Futuro · Newzoo 2023 · ESA 2023 · Deterding 2021 · Rosser 2007</div>
    </div>
  `);

  function update(dt,t){
    sun.scale.setScalar(1 + Math.sin(t*0.8)*0.04);
    rayGroup.rotation.z += 0.24*dt;

    barMeshes.forEach(b=>{
      b.curH += (b.h - b.curH) * (1 - Math.pow(0.02, dt*10));
      b.mesh.scale.y = Math.max(0.001, b.curH / b.h);
      b.mesh.position.y = b.mesh.scale.y * b.h / 2;
      const growing = b.curH/b.h < 0.99;
      b.mesh.rotation.y = growing ? Math.sin(t*3+b.phase)*0.02 : 0;

      const ratio = b.curH/b.h;
      if(!b.flashed && ratio >= 0.95){
        b.flashed = true; b.flashUntil = t + 0.4;
        b.flashPlane.position.y = b.mesh.position.y + b.h/2;
        b.flashPlane.material.opacity = 0.9;
      }
      if(b.flashUntil){
        const remain = b.flashUntil - t;
        b.flashPlane.material.opacity = remain>0 ? Math.max(0, remain/0.4)*0.9 : 0;
      }
      let baseEmissive = b.isLast ? 0.6+Math.sin(t*1.5)*0.3 : 0.25+Math.abs(Math.sin(t*0.8+b.phase))*0.3;
      if(b.flashUntil && t < b.flashUntil) baseEmissive = 1.2;
      b.mesh.material.emissiveIntensity = baseEmissive;

      if(b.topRing){
        b.topRing.position.set(b.mesh.position.x, b.mesh.position.y + (b.h*b.mesh.scale.y)/2 + 0.15, 0);
        b.topRing.rotation.z += 0.6*dt;
      }
    });

    coins.forEach(c=>{
      c.mesh.position.y -= c.speed*dt;
      c.mesh.rotation.x += c.rx*dt; c.mesh.rotation.z += c.rz*dt;
      if(c.mesh.position.y < -2){ c.mesh.position.y = 12; }
    });

    markets.forEach(m=>{
      m.ang += m.speed*dt;
      const arr = m.trailGeo.attributes.position.array;
      for(let k=0;k<8;k++){
        const a2 = m.ang - k*0.08;
        arr[k*3]=m.r*Math.cos(a2); arr[k*3+1]=1.2; arr[k*3+2]=-3+m.r*Math.sin(a2);
      }
      m.trailGeo.attributes.position.needsUpdate = true;
      m.mesh.position.x=m.r*Math.cos(m.ang); m.mesh.position.z=-3+m.r*Math.sin(m.ang);
      m.mesh.rotation.y+=1.2*dt;
    });

    const pos=pGeo.attributes.position.array;
    for(let i=0;i<pCount;i++){
      const accel = pos[i*3+1]>7 ? 1.6 : 1;
      pos[i*3+1]+=pSp[i]*dt*accel;
      if(pos[i*3+1]>10) pos[i*3+1]=0;
    }
    pGeo.attributes.position.needsUpdate=true;

    key.intensity=4.5+Math.sin(t*0.5)*0.5; gold1.intensity=3.0+Math.sin(t*0.7+1)*0.5;
  }
  function dispose(){const el=document.getElementById("panel-sala5");if(el)el.style.display="none";}
  return{update,dispose};
}
