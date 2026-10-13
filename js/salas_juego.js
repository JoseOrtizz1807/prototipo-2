// ═══════════════════════════════════════════════════════════════
//  SALAS DE JUEGO — una sala lateral por época, con una máquina
//  arcade que abre un minijuego jugable. Las salas se abren en la
//  pared izquierda del pasillo (puertas reales, se entra caminando),
//  así el recorrido se ramifica en lugar de ser una línea recta.
// ═══════════════════════════════════════════════════════════════
import * as THREE from "three";

export const SALA = { ancho: 7.4, fondo: 9, alto: 4.2, puerta: 2.4, altoPuerta: 3.3 };

// z de cada puerta: huecos de la pared izquierda sin vitrinas, grafitis ni paneles
export const PUERTAS = [
  { zona: "origen",   z: -22.5, juego: "oxo" },
  { zona: "arcade",   z: -52,   juego: "pong" },
  { zona: "consolas", z: -90,   juego: "tetris" },
  { zona: "3d",       z: -122,  juego: "reflejos" },
  { zona: "online",   z: -219,  juego: "snake" },
  { zona: "futuro",   z: -275,  juego: "memoria" },
];

export const INFO = {
  oxo: { titulo: "OXO", anio: "1952", autor: "A. S. Douglas · computadora EDSAC, Universidad de Cambridge",
    texto: "Uno de los primeros juegos con gráficos: tres en raya contra la máquina, creado para una tesis sobre interacción humano-computador.",
    beneficio: "Planificar y anticipar la jugada del rival ejercita el razonamiento estratégico." },
  pong: { titulo: "PONG", anio: "1972", autor: "Allan Alcorn · Atari",
    texto: "El primer gran éxito comercial del videojuego. Su sencillez lo hizo comprensible para cualquiera en segundos.",
    beneficio: "Seguir la pelota y anticipar su rebote pone a trabajar la coordinación ojo-mano." },
  tetris: { titulo: "TETRIS", anio: "1984", autor: "Alekséi Pázhitnov · Academia de Ciencias de la URSS",
    texto: "Llegó a todo el mundo con el Game Boy en 1989 y se convirtió en el juego que «enganchaba» incluso a quien no jugaba.",
    beneficio: "Girar piezas mentalmente entrena la rotación mental y el razonamiento visoespacial (Haier et al., 2009)." },
  reflejos: { titulo: "LABORATORIO DE REFLEJOS", anio: "1995 – 2005", autor: "La era de los shooters en 3D",
    texto: "Los juegos de acción en 3D exigen reaccionar en fracciones de segundo. Mide aquí tu tiempo de reacción.",
    beneficio: "Dye, Green y Bavelier (2009): quienes juegan juegos de acción responden más rápido sin perder precisión." },
  snake: { titulo: "SNAKE", anio: "1997", autor: "Taneli Armanto · Nokia 6110",
    texto: "Antes de los teléfonos inteligentes, Snake puso un videojuego en el bolsillo de millones de personas: el inicio del juego móvil.",
    beneficio: "Planificar la ruta sin chocar contigo mismo exige atención sostenida y planificación." },
  memoria: { titulo: "LABORATORIO DE MEMORIA", anio: "Hoy", autor: "Inspirado en Simon (1978) · Ralph Baer y Howard Morrison",
    texto: "Repite la secuencia de luces y sonidos: cada ronda añade un paso más.",
    beneficio: "La memoria de trabajo es una de las funciones que más estudia la investigación sobre videojuegos; sus resultados aún se debaten." },
};

function canvasTex(w, h, dibujar) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  dibujar(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.userData.canvas = c; t.userData.dibujar = dibujar;
  return t;
}
function redibujar(tex, dibujar) {
  const c = tex.userData.canvas; const g = c.getContext("2d");
  g.clearRect(0, 0, c.width, c.height); dibujar(g, c.width, c.height); tex.needsUpdate = true;
}
function lineas(g, texto, x, y, maxW, lh) {
  const pal = texto.split(" "); let l = "";
  for (const p of pal) {
    const prueba = l ? l + " " + p : p;
    if (g.measureText(prueba).width > maxW && l) { g.fillText(l, x, y); y += lh; l = p; } else l = prueba;
  }
  if (l) g.fillText(l, x, y);
  return y + lh;
}

// ── Áreas por las que se puede caminar (colisión simple por rectángulos) ──
export function regionesTransitables(W, L) {
  const x0 = -W / 2, r = [];
  r.push({ x1: -W / 2 + 1.2, x2: W / 2 - 1.2, z1: -L + 3, z2: 2.2 });      // pasillo
  PUERTAS.forEach(p => {
    r.push({ x1: x0 - 1.0, x2: x0 + 1.3, z1: p.z - SALA.puerta / 2 + 0.4, z2: p.z + SALA.puerta / 2 - 0.4 }); // umbral
    r.push({ x1: x0 - SALA.ancho + 1.6, x2: x0 - 0.45, z1: p.z - SALA.fondo / 2 + 0.45, z2: p.z + SALA.fondo / 2 - 0.45 }); // sala
  });
  return r;
}

// ── Pared izquierda del pasillo con huecos de puerta ──────────────
export function buildParedIzquierda(scene, mat, W, H, L, zC) {
  const x = -W / 2;
  const huecos = PUERTAS.map(p => [p.z + SALA.puerta / 2, p.z - SALA.puerta / 2]).sort((a, b) => b[0] - a[0]);
  const segs = []; let zA = zC + L / 2;
  huecos.forEach(([a, b]) => { segs.push([zA, a]); zA = b; });
  segs.push([zA, zC - L / 2]);
  const plano = (zTop, zBot, y0, y1) => {
    const len = zTop - zBot, alto = y1 - y0;
    const geo = new THREE.PlaneGeometry(len, alto);
    // UV continuos con la pared original (una sola textura a lo largo de L)
    const zm = (zTop + zBot) / 2, u0 = (zC - zm - len / 2 + L / 2) / L;
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * len / L, y0 / H + uv.getY(i) * alto / H);
    const m = new THREE.Mesh(geo, mat);
    m.rotation.y = Math.PI / 2; m.position.set(x, (y0 + y1) / 2, zm); scene.add(m);
  };
  segs.forEach(([a, b]) => { if (a - b > 0.01) plano(a, b, 0, H); });
  huecos.forEach(([a, b]) => plano(a, b, SALA.altoPuerta, H));                  // dintel
  // franja neón inferior (partida en las puertas)
  const fMat = new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 0.6, roughness: 0.05 });
  segs.forEach(([a, b]) => {
    if (a - b < 0.05) return;
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, a - b), fMat);
    f.position.set(x + 0.06, 0.28, (a + b) / 2); scene.add(f);
  });
}

// ── Máquina arcade procedimental (mira hacia +Z en local) ─────────
function buildMaquina(color, screenTex, marqueeTex) {
  const g = new THREE.Group();
  const cuerpo = new THREE.MeshStandardMaterial({ color: 0x232c44, roughness: 0.4, metalness: 0.3, emissive: color, emissiveIntensity: 0.06 });
  const borde = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.3 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 0.85), cuerpo); base.position.set(0, 0.5, 0); g.add(base);
  const torre = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.05, 0.6), cuerpo); torre.position.set(0, 1.52, -0.12); g.add(torre);
  const tablero = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.45), cuerpo);
  tablero.position.set(0, 1.04, 0.32); tablero.rotation.x = 0.18; g.add(tablero);
  const pantalla = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  pantalla.position.set(0, 1.55, 0.19); g.add(pantalla);
  const marquee = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 0.7), cuerpo); marquee.position.set(0, 2.2, -0.07); g.add(marquee);
  const cartel = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 0.26), new THREE.MeshBasicMaterial({ map: marqueeTex, toneMapped: false }));
  cartel.position.set(0, 2.2, 0.285); g.add(cartel);
  [-0.56, 0.56].forEach(x => {
    const tira = new THREE.Mesh(new THREE.BoxGeometry(0.02, 2.35, 0.02), borde); tira.position.set(x, 1.18, 0.43); g.add(tira);
  });
  const palanca = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8), new THREE.MeshStandardMaterial({ color: 0x222833 }));
  palanca.position.set(-0.25, 1.13, 0.34); g.add(palanca);
  const bola = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), borde); bola.position.set(-0.25, 1.2, 0.34); g.add(bola);
  [0.08, 0.24].forEach(x => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 16), borde); b.position.set(x, 1.1, 0.36); b.rotation.x = 0.18; g.add(b);
  });
  return { group: g, borde };
}

export function buildSalas(scene, zonas, W, H, records = {}) {
  const x0 = -W / 2, { ancho, fondo, alto, puerta, altoPuerta } = SALA;
  const xc = x0 - ancho / 2;
  const pared = new THREE.MeshStandardMaterial({ color: 0x1a2134, roughness: 0.6, metalness: 0.1, emissive: 0x0b1020, emissiveIntensity: 1 });
  const techoMat = new THREE.MeshStandardMaterial({ color: 0x04060c, emissive: 0x060a18, emissiveIntensity: 0.6 });
  const salas = [];

  PUERTAS.forEach(p => {
    const zona = zonas.find(z => z.id === p.zona); const info = INFO[p.juego];
    const col = zona.color, hex = zona.hex, z = p.z;

    // Suelo con rejilla neón
    const rejilla = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = "#000"; g.fillRect(0, 0, w, h); g.strokeStyle = hex; g.lineWidth = 3; g.globalAlpha = 0.6;
      for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke(); }
    });
    rejilla.wrapS = rejilla.wrapT = THREE.RepeatWrapping; rejilla.repeat.set(ancho / 2, fondo / 2);
    const suelo = new THREE.Mesh(new THREE.PlaneGeometry(ancho, fondo), new THREE.MeshStandardMaterial({
      color: 0x03050a, roughness: 0.2, metalness: 0.8, emissive: col, emissiveMap: rejilla, emissiveIntensity: 0.35 }));
    suelo.rotation.x = -Math.PI / 2; suelo.position.set(xc, 0.001, z); scene.add(suelo);
    const techo = new THREE.Mesh(new THREE.PlaneGeometry(ancho, fondo), techoMat);
    techo.rotation.x = Math.PI / 2; techo.position.set(xc, alto, z); scene.add(techo);

    // Paredes: fondo, laterales y pared de la puerta (vista desde dentro)
    const fondoM = new THREE.Mesh(new THREE.PlaneGeometry(fondo, alto), pared);
    fondoM.rotation.y = Math.PI / 2; fondoM.position.set(x0 - ancho, alto / 2, z); scene.add(fondoM);
    const lat1 = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), pared); lat1.position.set(xc, alto / 2, z - fondo / 2); scene.add(lat1);
    const lat2 = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), pared); lat2.rotation.y = Math.PI; lat2.position.set(xc, alto / 2, z + fondo / 2); scene.add(lat2);
    const anchoLado = (fondo - puerta) / 2;
    [z - puerta / 2 - anchoLado / 2, z + puerta / 2 + anchoLado / 2].forEach(zz => {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(anchoLado, alto), pared);
      s.rotation.y = -Math.PI / 2; s.position.set(x0 - 0.01, alto / 2, zz); scene.add(s);
    });
    const dintel = new THREE.Mesh(new THREE.PlaneGeometry(puerta, alto - altoPuerta), pared);
    dintel.rotation.y = -Math.PI / 2; dintel.position.set(x0 - 0.01, (alto + altoPuerta) / 2, z); scene.add(dintel);

    // Neón perimetral
    const neon = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.2 });
    [[xc, z - fondo / 2 + 0.03, ancho, 0], [xc, z + fondo / 2 - 0.03, ancho, 0], [x0 - ancho + 0.03, z, fondo, 1]].forEach(([x, zz, len, rot]) => {
      [0.12, alto - 0.12].forEach(y => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(rot ? 0.03 : len, 0.03, rot ? len : 0.03), neon);
        b.position.set(x, y, zz); scene.add(b);
      });
    });

    // Marco de la puerta y cartel (lado del pasillo)
    const marco = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.8 });
    [z - puerta / 2, z + puerta / 2].forEach(zz => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, altoPuerta, 0.08), marco); m.position.set(x0, altoPuerta / 2, zz); scene.add(m);
    });
    const mTop = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, puerta + 0.08), marco); mTop.position.set(x0, altoPuerta, z); scene.add(mTop);
    const cartelTex = canvasTex(512, 160, (g, w, h) => {
      g.fillStyle = "rgba(3,6,12,.92)"; g.fillRect(0, 0, w, h); g.strokeStyle = hex; g.lineWidth = 5; g.strokeRect(5, 5, w - 10, h - 10);
      g.textAlign = "center"; g.fillStyle = "#e6f2ef"; g.font = "26px 'Space Mono', monospace"; g.fillText("🎮 SALA DE JUEGO", w / 2, 52);
      g.fillStyle = hex; g.font = "700 50px Orbitron, Arial"; g.fillText(info.titulo.length > 12 ? info.titulo.split(" ").pop() : info.titulo, w / 2, 118);
    });
    const cartel = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.75), new THREE.MeshBasicMaterial({ map: cartelTex, transparent: true }));
    cartel.rotation.y = Math.PI / 2; cartel.position.set(x0 + 0.03, altoPuerta + 0.62, z); scene.add(cartel);
    // Flecha en el suelo del pasillo que apunta hacia la puerta
    const fl = new THREE.Shape(); fl.moveTo(-0.35, 0); fl.lineTo(0, 0.25); fl.lineTo(0, 0.11); fl.lineTo(0.35, 0.11); fl.lineTo(0.35, -0.11); fl.lineTo(0, -0.11); fl.lineTo(0, -0.25); fl.closePath();
    const flecha = new THREE.Mesh(new THREE.ShapeGeometry(fl), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
    flecha.rotation.x = -Math.PI / 2; flecha.position.set(x0 + 1.4, 0.03, z); scene.add(flecha);

    // Máquina arcade al fondo, mirando a la entrada
    const dibPantalla = (g, w, h) => {
      g.fillStyle = "#02040a"; g.fillRect(0, 0, w, h);
      g.strokeStyle = hex; g.lineWidth = 3; g.strokeRect(8, 8, w - 16, h - 16);
      g.textAlign = "center"; g.fillStyle = hex; g.font = `700 ${info.titulo.length > 10 ? 22 : 38}px Orbitron, Arial`;
      g.fillText(info.titulo, w / 2, 70);
      g.fillStyle = "#e6f2ef"; g.font = "18px 'Space Mono', monospace"; g.fillText(info.anio, w / 2, 100);
      const rec = records[p.juego];
      g.fillStyle = "#9fb3ad"; g.font = "16px 'Space Mono', monospace"; g.fillText(rec != null ? `RÉCORD: ${rec}` : "SIN RÉCORD", w / 2, 140);
      g.fillStyle = "#ffffff"; g.font = "700 18px 'Space Mono', monospace"; g.fillText("ACÉRCATE · E", w / 2, 172);
    };
    const pantallaTex = canvasTex(320, 200, dibPantalla);
    const marqueeTex = canvasTex(512, 128, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, "#05070e"); gr.addColorStop(0.5, hex); gr.addColorStop(1, "#05070e");
      g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = "#04060c"; g.textAlign = "center";
      g.font = "700 56px Orbitron, Arial"; g.fillText(info.titulo.split(" ").pop(), w / 2, 86);
    });
    const maq = buildMaquina(col, pantallaTex, marqueeTex);
    const cabX = x0 - ancho + 0.75;
    maq.group.position.set(cabX, 0, z); maq.group.rotation.y = Math.PI / 2; scene.add(maq.group);

    // Placa informativa en la pared lateral
    const placa = canvasTex(768, 460, (g, w, h) => {
      g.fillStyle = "rgba(3,6,12,.94)"; g.fillRect(0, 0, w, h); g.strokeStyle = hex; g.lineWidth = 4; g.strokeRect(6, 6, w - 12, h - 12);
      g.textAlign = "left"; g.fillStyle = hex; g.font = "700 46px Orbitron, Arial"; g.fillText(info.titulo, 36, 72);
      g.fillStyle = "#e6f2ef"; g.font = "24px 'Space Mono', monospace"; g.fillText(`${info.anio} · ${info.autor}`.slice(0, 52), 36, 112);
      g.fillStyle = "#c8dcd6"; g.font = "24px 'Space Mono', monospace";
      let y = lineas(g, info.texto, 36, 166, w - 72, 34);
      g.fillStyle = hex; g.font = "700 20px Orbitron, Arial"; g.fillText("BENEFICIO COGNITIVO", 36, y + 14);
      g.fillStyle = "#e6f2ef"; g.font = "23px 'Space Mono', monospace"; lineas(g, info.beneficio, 36, y + 52, w - 72, 32);
    });
    const placaM = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.04), new THREE.MeshBasicMaterial({ map: placa, toneMapped: false }));
    placaM.position.set(xc - 0.2, 2.0, z - fondo / 2 + 0.02); scene.add(placaM);
    // Título en la pared opuesta
    const titulo = canvasTex(768, 140, (g, w, h) => {
      g.textAlign = "center"; g.fillStyle = hex; g.font = "700 64px Orbitron, Arial"; g.fillText("SALA DE JUEGO", w / 2, 70);
      g.fillStyle = "#e6f2ef"; g.font = "28px 'Space Mono', monospace"; g.fillText(`${zona.titulo} · ${info.titulo}`, w / 2, 118);
    });
    const tituloM = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.66), new THREE.MeshBasicMaterial({ map: titulo, transparent: true }));
    tituloM.rotation.y = Math.PI; tituloM.position.set(xc - 0.2, 2.6, z + fondo / 2 - 0.02); scene.add(tituloM);

    // Luces (las administra el pool de luces)
    const l1 = new THREE.PointLight(col, 3.2, 12); l1.position.set(xc, alto - 0.4, z); scene.add(l1);
    const l2 = new THREE.PointLight(0xffffff, 2.0, 7); l2.position.set(cabX + 1.6, 2.4, z); scene.add(l2);

    salas.push({
      juego: p.juego, z, zona, info,
      maquina: { x: cabX + 0.6, z },
      spawn: { x: x0 - 1.4, z, yaw: Math.PI / 2 },
      puerta: { x: x0, z },
      setRecord(v) { records[p.juego] = v; redibujar(pantallaTex, dibPantalla); },
      _borde: maq.borde,
    });
  });

  function update(t, camPos) {
    for (const s of salas) {
      if (Math.abs(camPos.z - s.z) > 16) continue;
      s._borde.emissiveIntensity = 1.1 + Math.sin(t * 3 + s.z) * 0.5;
    }
  }
  return { salas, update };
}
