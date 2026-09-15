import * as THREE from "three";

function crearPanel(id, html) {
  let el = document.getElementById(id);
  if (!el) { el = document.createElement("div"); el.id = id; el.className = "sala-panel"; document.body.appendChild(el); }
  el.innerHTML = html; el.style.display = "block"; return el;
}

export function sala1Historia(scene, camera, renderer) {

  // ═══════════════════════════════════════════════════════
  //  FONDO 3D — CORREDOR DE HISTORIA / PANTALLA RETRO
  // ═══════════════════════════════════════════════════════
  scene.background = new THREE.Color(0x01020a);
  scene.fog = new THREE.FogExp2(0x01020a, 0.022);

  const ambient = new THREE.AmbientLight(0x050820, 2.5); scene.add(ambient);
  const keyL  = new THREE.PointLight(0x4488ff, 4.5, 35); keyL.position.set(0, 10, 0); scene.add(keyL);
  const sideL = new THREE.PointLight(0x0033cc, 2.8, 18); sideL.position.set(-7, 4, 0); scene.add(sideL);
  const sideR = new THREE.PointLight(0x00ddff, 2.5, 16); sideR.position.set(7, 4, 0); scene.add(sideR);
  const glow  = new THREE.PointLight(0x2255ff, 2.0, 12); glow.position.set(0, 0.5, -2); scene.add(glow);

  // Suelo con cuadrícula brillante — estilo arcade floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 50),
    new THREE.MeshStandardMaterial({ color:0x01030e, roughness:0.02, metalness:0.98 }));
  floor.rotation.x = -Math.PI/2; scene.add(floor);
  const grid = new THREE.GridHelper(50, 50, 0x1133cc, 0x050e22);
  grid.position.y = 0.003; scene.add(grid);

  // ── MURO TRASERO: PANTALLA GIGANTE RETRO ──────────────────
  const screenBg = new THREE.Mesh(new THREE.PlaneGeometry(14, 8),
    new THREE.MeshStandardMaterial({ color:0x000510, roughness:0.05, metalness:0.6,
      emissive:0x000820, emissiveIntensity:0.5 }));
  screenBg.position.set(0, 4.2, -8); scene.add(screenBg);

  // Marco neon de la pantalla
  [[14.4,0.08],[0.08,8.4]].forEach(([w,h])=>{
    ['top','bottom','left','right'].forEach(side=>{});
  });
  const frameGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(14.3, 8.3, 0.1));
  const frame = new THREE.LineSegments(frameGeo,
    new THREE.LineBasicMaterial({color:0x4488ff}));
  frame.position.set(0, 4.2, -7.92); scene.add(frame);
  const framePL = new THREE.PointLight(0x4488ff, 2.5, 8);
  framePL.position.set(0, 4.2, -7); scene.add(framePL);

  // Scanlines animadas sobre la pantalla
  const scanGeo = new THREE.PlaneGeometry(14, 8);
  const scanMat = new THREE.MeshBasicMaterial({
    color:0x000000, transparent:true, opacity:0.35, depthWrite:false,
    wireframe:false
  });
  const scanLines = new THREE.Mesh(scanGeo, scanMat);
  scanLines.position.set(0, 4.2, -7.88); scene.add(scanLines);

  // ── HITOS HISTÓRICOS 3D — columnas de luz en el suelo ──────
  const hitosData = [
    { z:0,   year:"1952", color:0x88aaff, label:"OXO\nCambridge" },
    { z:-2,  year:"1962", color:0x44ffcc, label:"Spacewar!\nMIT" },
    { z:-4,  year:"1972", color:0xff4444, label:"Pong\nAtari" },
    { z:-6,  year:"1980", color:0xffcc00, label:"Pac-Man\nNamco" },
    { z:-8,  year:"1985", color:0xff3366, label:"Mario\nNintendo" },
    { z:-10, year:"1994", color:0x4488ff, label:"PlayStation\nSony" },
    { z:-12, year:"2004", color:0xcc44ff, label:"WoW\nBlizzard" },
    { z:-14, year:"2023", color:0x00ffee, label:"IA & VR\nEl Futuro" },
  ];

  const hitoMeshes = [];
  hitosData.forEach((h, i) => {
    const x = (i%2===0 ? -3.5 : 3.5);
    const col = new THREE.Color(h.color);

    // Pedestal
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.30, 0.18, 8),
      new THREE.MeshStandardMaterial({ color:0x080f20, roughness:0.08, metalness:0.92,
        emissive:col, emissiveIntensity:0.06 }));
    ped.position.set(x, 0.09, h.z - 1); scene.add(ped);

    // Cristal / orbe
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 2),
      new THREE.MeshStandardMaterial({ color:h.color, emissive:h.color,
        emissiveIntensity:0.55, roughness:0.12, metalness:0.7 }));
    orb.position.set(x, 0.65, h.z - 1); scene.add(orb);

    // Haz de luz desde el suelo
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.12, 3.0, 6, 1, true),
      new THREE.MeshBasicMaterial({ color:h.color, transparent:true, opacity:0.12,
        side:THREE.DoubleSide, depthWrite:false }));
    beam.position.set(x, 1.5, h.z - 1); scene.add(beam);

    // Luz puntual
    const pl = new THREE.PointLight(h.color, 1.2, 3.5);
    pl.position.set(x, 0.7, h.z - 1); scene.add(pl);

    // Aro en el suelo
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.012, 6, 32),
      new THREE.MeshStandardMaterial({ color:h.color, emissive:h.color, emissiveIntensity:1.5,
        roughness:0.05 }));
    ring.rotation.x = Math.PI/2; ring.position.set(x, 0.01, h.z - 1); scene.add(ring);

    hitoMeshes.push({ orb, pl, ring, beam, phase: i * 0.7, baseY: 0.65 });
  });

  // ── PARTÍCULAS — píxeles flotando ──────────────────────────
  const pCount = 350; const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(pCount*3); const pSp = new Float32Array(pCount);
  for(let i=0;i<pCount;i++){
    pPos[i*3]=(Math.random()-0.5)*40; pPos[i*3+1]=Math.random()*10;
    pPos[i*3+2]=(Math.random()-0.5)*30; pSp[i]=0.003+Math.random()*0.007;
  }
  pGeo.setAttribute("position",new THREE.BufferAttribute(pPos,3));
  const particles = new THREE.Points(pGeo,
    new THREE.PointsMaterial({ size:0.04, color:0x4466ff, transparent:true, opacity:0.45, sizeAttenuation:true }));
  scene.add(particles);

  // ═══════════════════════════════════════════════════════
  //  ESTILOS CSS
  // ═══════════════════════════════════════════════════════
  if(!document.getElementById("sala1-styles")){
    const s = document.createElement("style"); s.id="sala1-styles";
    s.textContent = `
      #panel-sala1{
        position:fixed;top:72px;left:18px;
        width:min(440px,46vw);
        max-height:calc(100vh - 90px);
        overflow-y:auto;z-index:8;pointer-events:all;
        scrollbar-width:thin;scrollbar-color:#4488ff44 transparent;
        font-family:'Space Mono',monospace;
      }
      #panel-sala1::-webkit-scrollbar{width:4px;}
      #panel-sala1::-webkit-scrollbar-thumb{background:#4488ff55;border-radius:4px;}

      .s1-wrap{
        background:linear-gradient(160deg,rgba(1,4,18,0.97),rgba(3,8,30,0.95));
        border:1px solid rgba(68,136,255,0.22);
        border-radius:20px;padding:22px 20px 18px;
        backdrop-filter:blur(28px);
        box-shadow:0 0 60px rgba(68,136,255,0.09),0 28px 70px rgba(0,0,0,0.92),
                   inset 0 1px 0 rgba(255,255,255,0.05);
      }
      .s1-badge{
        display:inline-flex;align-items:center;gap:6px;
        background:rgba(68,136,255,0.12);border:1px solid rgba(68,136,255,0.35);
        border-radius:18px;padding:4px 13px;margin-bottom:13px;
      }
      .s1-dot{width:6px;height:6px;border-radius:50%;background:#4488ff;
              box-shadow:0 0 8px #4488ff;animation:s1pulse 2s infinite;}
      @keyframes s1pulse{0%,100%{opacity:1}50%{opacity:.4}}
      .s1-badge-txt{font-family:'Orbitron',sans-serif;font-size:8.5px;
                    letter-spacing:.28em;color:#4488ff;font-weight:700;}
      .s1-title{font-family:'Orbitron',sans-serif;font-size:clamp(17px,2vw,24px);
                font-weight:900;line-height:1.18;margin-bottom:5px;color:#fff;}
      .s1-grad{background:linear-gradient(90deg,#4488ff,#00ffcc);
               -webkit-background-clip:text;background-clip:text;color:transparent;}
      .s1-intro{font-size:10.5px;color:rgba(130,175,215,0.72);line-height:1.8;
                margin-bottom:18px;border-left:3px solid rgba(68,136,255,0.38);
                padding-left:11px;}

      /* MINIJUEGO PONG */
      .s1-game-wrap{
        background:rgba(0,0,0,0.6);border:1px solid rgba(68,136,255,0.3);
        border-radius:14px;padding:12px;margin-bottom:18px;
      }
      .s1-game-header{
        font-family:'Orbitron',sans-serif;font-size:9px;letter-spacing:.2em;
        color:rgba(68,136,255,.8);margin-bottom:8px;
        display:flex;justify-content:space-between;align-items:center;
      }
      #pongCanvas{
        display:block;width:100%;border-radius:8px;
        border:1px solid rgba(68,136,255,0.25);
        image-rendering:pixelated;cursor:none;
      }
      .s1-game-hint{font-size:9px;color:rgba(100,150,200,.5);text-align:center;
                    margin-top:6px;letter-spacing:.08em;}

      /* TIMELINE */
      .s1-section{font-family:'Orbitron',sans-serif;font-size:9px;letter-spacing:.22em;
                  color:rgba(68,136,255,.65);margin-bottom:10px;
                  display:flex;align-items:center;gap:8px;}
      .s1-section::after{content:'';flex:1;height:1px;background:rgba(68,136,255,.18);}
      .s1-timeline{display:flex;flex-direction:column;gap:0;margin-bottom:18px;
                   position:relative;}
      .s1-timeline::before{content:'';position:absolute;left:28px;top:0;bottom:0;
                           width:2px;background:rgba(68,136,255,.2);border-radius:2px;}
      .s1-event{display:flex;align-items:flex-start;gap:12px;padding:9px 0 9px 0;
                position:relative;}
      .s1-event-year{
        font-family:'Orbitron',sans-serif;font-size:10px;font-weight:900;
        color:var(--ec,#4488ff);min-width:36px;text-align:right;flex-shrink:0;
        text-shadow:0 0 10px var(--ec,#4488ff);
      }
      .s1-event-dot{
        width:12px;height:12px;border-radius:50%;background:var(--ec,#4488ff);
        box-shadow:0 0 8px var(--ec,#4488ff);flex-shrink:0;margin-top:2px;z-index:1;
      }
      .s1-event-body{flex:1;}
      .s1-event-title{font-size:11px;font-weight:700;color:#dde8f5;margin-bottom:3px;}
      .s1-event-desc{font-size:10px;color:rgba(140,180,215,.62);line-height:1.6;}
      .s1-event-tag{display:inline-block;margin-top:4px;font-family:'Orbitron',sans-serif;
                    font-size:7.5px;letter-spacing:.1em;color:var(--ec,#4488ff);
                    border:1px solid var(--ec,#4488ff);border-radius:4px;padding:1px 6px;opacity:.75;}

      .s1-source{font-size:8.5px;color:rgba(100,145,190,.3);text-align:center;
                 border-top:1px solid rgba(68,136,255,.1);padding-top:10px;line-height:1.65;}
    `;
    document.head.appendChild(s);
  }

  // ═══════════════════════════════════════════════════════
  //  PANEL HTML
  // ═══════════════════════════════════════════════════════
  const hitosHTML = [
    ["1952","#88aaff","OXO — Primer juego visual","Alexander Douglas crea el primer videojuego con salida gráfica en un tubo catódico. Cambridge, Reino Unido.","CAMBRIDGE 1952"],
    ["1958","#44ffcc","Tennis for Two","William Higinbotham diseña un juego de tenis en un osciloscopio para el Día Abierto del Laboratorio Brookhaven.","BROOKHAVEN LAB"],
    ["1962","#ffdd44","Spacewar! — MIT","El primer juego distribuido digitalmente entre universidades. La PDP-1 costaba $120,000 USD.","MIT · PDP-1"],
    ["1972","#ff4444","Pong — Nace Atari","Nolan Bushnell funda Atari con $500. La primera máquina en un bar: atascada de monedas en 2 semanas. Nació una industria.","$500 → $1B"],
    ["1978","#44ff88","Space Invaders — Taito","Agotó las monedas de ¥100 en Japón. Primer ícono cultural global. 1 millón de máquinas arcade.","100M MONEDAS"],
    ["1983","#ff8800","El Gran Crash","Atari produce 12M de cartuchos de E.T. Devuelven 7M. Los enterran en el desierto de Nuevo México.","12M CARTUCHOS"],
    ["1985","#ff3366","Super Mario Bros — Nintendo","Nintendo resucita la industria. 90M de copias. El diseño de niveles 1-1 es el más estudiado en game design.","90M COPIAS"],
    ["1989","#88bbff","Game Boy — Nintendo","118M unidades. La portabilidad cambia todo. Tetris: 35M de copias adicionales.","118M UNIDADES"],
    ["1994","#4488ff","PlayStation — Sony","El CD-ROM llega al gaming. La tercera dimensión es accesible. 102M consolas. El gaming llega a los adultos.","102M CONSOLAS"],
    ["1996","#cc88ff","Super Mario 64","El primer mundo 3D libre. Inventó la cámara libre, el joystick analógico y el open world.","METACRITIC 94"],
    ["1998","#00ffee","The Legend of Zelda: OoT","Metacritic 99/100. El mejor juego evaluado de la historia. Inventó el lock-on y la narrativa épica en 3D.","METACRITIC 99"],
    ["2004","#cc44ff","World of Warcraft","12M suscriptores en pico. $10B en ingresos. Inventó la economía de suscripción digital.","12M JUGADORES"],
    ["2007","#ff4488","Call of Duty 4: MW","Inventó el sistema XP, rangos y killstreaks. 16M copias. Toda la industria lo copió.","16M COPIAS"],
    ["2011","#44dd88","Minecraft — Mojang","238M copias. El juego más vendido de la historia humana. 35M estudiantes lo usan en 115 países.","238M COPIAS"],
    ["2022","#ffaa44","Elden Ring — FromSoftware","GOTY 2022. Fusionó mundo abierto con dificultad extrema. 20M copias. La nueva era del RPG.","20M COPIAS"],
    ["2023","#00ffcc","IA & VR — El Futuro","$184B de ingresos. 3.2B jugadores. El arte más grande del siglo XXI apenas comienza.","$184B GLOBAL"],
  ].map(([year,col,title,desc,tag])=>`
    <div class="s1-event">
      <div class="s1-event-year" style="--ec:${col}">${year}</div>
      <div class="s1-event-dot" style="--ec:${col}"></div>
      <div class="s1-event-body">
        <div class="s1-event-title">${title}</div>
        <div class="s1-event-desc">${desc}</div>
        <span class="s1-event-tag" style="--ec:${col}">${tag}</span>
      </div>
    </div>
  `).join("");

  crearPanel("panel-sala1", `
    <div class="s1-wrap">
      <div class="s1-badge">
        <div class="s1-dot"></div>
        <span class="s1-badge-txt">SALA 01 · HISTORIA DE LOS VIDEOJUEGOS</span>
      </div>
      <div class="s1-title">70 años que<br/><span class="s1-grad">cambiaron el mundo</span></div>
      <p class="s1-intro">
        Desde un osciloscopio en 1952 hasta la realidad virtual en 2023 — los videojuegos son el arte más influyente del siglo XXI. Esta es su historia.
      </p>

      <!-- ══ MINIJUEGO PONG ══════════════════════════════════ -->
      <div class="s1-game-wrap">
        <div class="s1-game-header">
          <span>PONG 1972 — JUEGA AHORA</span>
          <span id="pongScore" style="color:#fff;font-size:10px">0 — 0</span>
        </div>
        <canvas id="pongCanvas" width="380" height="180"></canvas>
        <div class="s1-game-hint">Mueve el ratón sobre el canvas · La IA controla el jugador derecho</div>
      </div>

      <!-- ══ TIMELINE ════════════════════════════════════════ -->
      <div class="s1-section">Línea de tiempo completa</div>
      <div class="s1-timeline">${hitosHTML}</div>

      <div class="s1-source">
        Historia de los Videojuegos 1952–2023 · 70+ años de innovación<br/>
        Fuentes: IGN History · Newzoo 2023 · ESA · Museum of Art & Digital Entertainment
      </div>
    </div>
  `);

  // ═══════════════════════════════════════════════════════
  //  MINIJUEGO PONG
  // ═══════════════════════════════════════════════════════
  const canvas2d = document.getElementById("pongCanvas");
  const ctx2d = canvas2d?.getContext("2d");
  let pongRAF = null;
  let scoreP = 0, scoreAI = 0;

  if(ctx2d){
    const W = canvas2d.width, H = canvas2d.height;
    const PAD_W=10, PAD_H=50, BALL_R=7, SPEED=4;
    const state = {
      py: H/2-PAD_H/2,     // jugador Y (izquierda)
      ay: H/2-PAD_H/2,     // AI Y (derecha)
      bx: W/2, by: H/2,    // bola
      vx: SPEED, vy: SPEED * (Math.random()>0.5?1:-1),
      score:[0,0]
    };

    canvas2d.addEventListener("mousemove", e => {
      const rect = canvas2d.getBoundingClientRect();
      const scale = H / rect.height;
      state.py = (e.clientY - rect.top) * scale - PAD_H/2;
      state.py = Math.max(0, Math.min(H-PAD_H, state.py));
    });

    // Touch support
    canvas2d.addEventListener("touchmove", e => {
      e.preventDefault();
      const rect = canvas2d.getBoundingClientRect();
      const scale = H / rect.height;
      state.py = (e.touches[0].clientY - rect.top) * scale - PAD_H/2;
      state.py = Math.max(0, Math.min(H-PAD_H, state.py));
    }, {passive:false});

    function resetBall(dir){
      state.bx=W/2; state.by=H/2;
      state.vx=SPEED*(dir||1);
      state.vy=SPEED*(Math.random()>0.5?1:-1);
    }

    function pongStep(){
      // Mover IA suavemente
      const aiCenter = state.ay + PAD_H/2;
      const diff = state.by - aiCenter;
      state.ay += Math.sign(diff) * Math.min(Math.abs(diff), 3.2);
      state.ay = Math.max(0, Math.min(H-PAD_H, state.ay));

      // Mover bola
      state.bx += state.vx; state.by += state.vy;

      // Rebotar paredes
      if(state.by-BALL_R < 0 || state.by+BALL_R > H){
        state.vy *= -1;
        state.by = state.by-BALL_R<0 ? BALL_R : H-BALL_R;
      }

      // Colisión paleta jugador
      if(state.bx-BALL_R < PAD_W+12 &&
         state.by > state.py && state.by < state.py+PAD_H){
        state.vx = Math.abs(state.vx)*1.04;
        const rel = (state.by-(state.py+PAD_H/2))/(PAD_H/2);
        state.vy = rel * SPEED * 1.5;
      }

      // Colisión paleta AI
      if(state.bx+BALL_R > W-PAD_W-12 &&
         state.by > state.ay && state.by < state.ay+PAD_H){
        state.vx = -Math.abs(state.vx)*1.04;
        const rel = (state.by-(state.ay+PAD_H/2))/(PAD_H/2);
        state.vy = rel * SPEED * 1.5;
      }

      // Limitar velocidad
      const maxV = 12;
      state.vx = Math.max(-maxV, Math.min(maxV, state.vx));
      state.vy = Math.max(-maxV, Math.min(maxV, state.vy));

      // Punto
      if(state.bx < 0){ state.score[1]++; resetBall(1); }
      if(state.bx > W){ state.score[0]++; resetBall(-1); }

      // Actualizar marcador
      const el = document.getElementById("pongScore");
      if(el) el.textContent = `${state.score[0]} — ${state.score[1]}`;
    }

    function pongDraw(){
      ctx2d.fillStyle = "#000510";
      ctx2d.fillRect(0,0,W,H);

      // Línea central punteada
      ctx2d.setLineDash([6,8]); ctx2d.strokeStyle="rgba(68,136,255,0.3)";
      ctx2d.lineWidth=1; ctx2d.beginPath();
      ctx2d.moveTo(W/2,0); ctx2d.lineTo(W/2,H); ctx2d.stroke(); ctx2d.setLineDash([]);

      // Paletas
      ctx2d.fillStyle="#4488ff";
      ctx2d.shadowColor="#4488ff"; ctx2d.shadowBlur=12;
      ctx2d.fillRect(12, state.py, PAD_W, PAD_H);
      ctx2d.fillStyle="#00ffcc";
      ctx2d.shadowColor="#00ffcc";
      ctx2d.fillRect(W-PAD_W-12, state.ay, PAD_W, PAD_H);

      // Bola
      ctx2d.fillStyle="#ffffff"; ctx2d.shadowColor="#88aaff"; ctx2d.shadowBlur=16;
      ctx2d.beginPath();
      ctx2d.arc(state.bx, state.by, BALL_R, 0, Math.PI*2);
      ctx2d.fill(); ctx2d.shadowBlur=0;

      // Labels
      ctx2d.fillStyle="rgba(68,136,255,0.5)";
      ctx2d.font="bold 9px monospace"; ctx2d.textAlign="center";
      ctx2d.fillText("TÚ", W*0.25, 14);
      ctx2d.fillStyle="rgba(0,255,204,0.5)";
      ctx2d.fillText("IA", W*0.75, 14);
    }

    function pongLoop(){
      pongStep(); pongDraw();
      pongRAF = requestAnimationFrame(pongLoop);
    }
    pongRAF = requestAnimationFrame(pongLoop);
  }

  // ═══════════════════════════════════════════════════════
  //  LOOP DE ANIMACIÓN 3D
  // ═══════════════════════════════════════════════════════
  function update(dt, t){
    hitoMeshes.forEach((h, i)=>{
      h.orb.position.y = h.baseY + Math.sin(t*0.9+h.phase)*0.09;
      h.orb.rotation.y += 0.015;
      h.orb.material.emissiveIntensity = 0.45 + Math.sin(t*1.5+h.phase)*0.2;
      h.pl.intensity = 1.0 + Math.sin(t*1.2+h.phase)*0.35;
      h.ring.material.emissiveIntensity = 1.2 + Math.sin(t*2+h.phase)*0.4;
    });
    framePL.intensity = 2.0 + Math.sin(t*0.8)*0.5;
    keyL.intensity = 4.0 + Math.sin(t*0.5)*0.5;
    const pos = pGeo.attributes.position.array;
    for(let i=0;i<pCount;i++){ pos[i*3+1]+=pSp[i]; if(pos[i*3+1]>10)pos[i*3+1]=0; }
    pGeo.attributes.position.needsUpdate = true;
  }

  function dispose(){
    if(pongRAF) cancelAnimationFrame(pongRAF);
    const el=document.getElementById("panel-sala1");
    if(el) el.style.display="none";
  }
  return { update, dispose };
}