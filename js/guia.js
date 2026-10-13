// ═══════════════════════════════════════════════════════════════
//  BIT — robot guía del museo
//  · Acompaña al visitante flotando a su lado y "habla" cuando el
//    narrador está activo (subtítulos en pantalla).
//  · M  → mapa del museo: saltar a cualquier época (recorrido no lineal)
//  · R  → hablar con BIT (datos curiosos y consejos de la zona)
//  · Q  → reto de la zona (pregunta de 3 opciones, teclas 1-3)
//  · B  → brillo de la escena (normal / alto / máximo)
//  · Pasaporte: zonas visitadas, retos superados y planetas.
// ═══════════════════════════════════════════════════════════════
import * as THREE from "three";

const RETOS = {
  origen: [
    { q: "¿En qué dispositivo se jugaba Tennis for Two (1958)?", o: ["En un osciloscopio", "En una consola Atari", "En un televisor a color"], a: 0,
      e: "William Higinbotham lo creó en un osciloscopio para el día abierto del Laboratorio Brookhaven." },
    { q: "¿Dónde se creó Spacewar! en 1962?", o: ["En Nintendo", "En el MIT", "En Sony"], a: 1,
      e: "Lo crearon estudiantes del MIT en una computadora PDP-1, del tamaño de una habitación." },
  ],
  arcade: [
    { q: "¿Qué provocó Space Invaders en Japón?", o: ["Un apagón nacional", "La prohibición de los arcades", "Escasez de monedas de 100 yenes"], a: 2,
      e: "Fue tan popular que las monedas de 100 yenes empezaron a escasear." },
    { q: "¿En qué se inspiró Toru Iwatani para crear Pac-Man?", o: ["En una pizza con un trozo faltante", "En un reloj de pared", "En una moneda"], a: 0,
      e: "Una pizza sin una porción le dio la forma al personaje más icónico del arcade." },
  ],
  consolas: [
    { q: "¿Qué pasó con millones de cartuchos de E.T. tras el crash de 1983?", o: ["Se regalaron en escuelas", "Fueron enterrados en el desierto", "Se convirtieron en discos"], a: 1,
      e: "Atari los enterró en el desierto de Nuevo México: el símbolo del gran crash." },
    { q: "¿Qué juego incluyó Nintendo con el Game Boy para atraer a todo tipo de público?", o: ["Tetris", "Pac-Man", "Zelda"], a: 0,
      e: "Tetris convirtió al Game Boy en un fenómeno para jugadores y no jugadores." },
  ],
  "3d": [
    { q: "¿Qué formato permitió a PlayStation incluir música orquestal y video?", o: ["El cartucho", "El disquete", "El CD-ROM"], a: 2,
      e: "El CD-ROM ofrecía mucho más espacio que los cartuchos de la época." },
    { q: "¿Qué juego obtuvo 99/100 en Metacritic, la puntuación más alta de la historia?", o: ["Zelda: Ocarina of Time", "Halo: Combat Evolved", "GoldenEye 007"], a: 0,
      e: "Ocarina of Time inventó el apuntado con botón Z y definió la aventura en 3D." },
  ],
  online: [
    { q: "¿Cuántos suscriptores tuvo World of Warcraft en su mejor momento?", o: ["1 millón", "12 millones", "100 millones"], a: 1,
      e: "Doce millones de personas pagaban cada mes por vivir en Azeroth." },
    { q: "¿En cuántos países se usa Minecraft Education?", o: ["En 115 países", "En 12 países", "Solo en Suecia"], a: 0,
      e: "Se usa para enseñar matemáticas, historia, arquitectura y programación." },
  ],
  futuro: [
    { q: "¿Cuánto generó la industria del videojuego en 2023?", o: ["18 millones de dólares", "Un billón de dólares", "Unos 184 000 millones de dólares"], a: 2,
      e: "Más que el cine y la música juntos." },
    { q: "Según Green y Bavelier (2003), ¿qué mejoran los videojuegos de acción?", o: ["La atención visual selectiva", "La estatura", "La memoria a largo plazo de idiomas"], a: 0,
      e: "Su estudio en la revista Nature mostró mejoras en la atención visual de los jugadores." },
  ],
};

const CONSEJOS = [
  "Pulsa M para abrir el mapa: puedes saltar a cualquier época sin seguir un orden.",
  "Cada época tiene una sala de juego en la pared izquierda: entra y juega Pong, Tetris, Snake y más.",
  "Desde el mapa también puedes saltar directo a cualquier sala de juego.",
  "Pulsa Q y te pongo un reto sobre esta zona. ¡Cada acierto suma a tu pasaporte!",
  "Si mantienes la mirada en una vitrina, te cuento su historia.",
  "Busca los planetas con anillo: hay dieciséis repartidos por el museo.",
  "¿Te parece oscuro? Pulsa B para subir el brillo.",
];

const css = (el, s) => { el.style.cssText = s; return el; };
const div = (s, html = "") => { const d = document.createElement("div"); css(d, s); d.innerHTML = html; return d; };

// ── Modelo 3D procedimental del robot ──────────────────────────
function buildRobot(color) {
  const g = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: 0xc9d3de, metalness: 0.35, roughness: 0.4, emissive: 0x1c2733, emissiveIntensity: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x05080f, metalness: 0.9, roughness: 0.08 });
  const glow = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.4 });

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 24), shell);
  g.add(head);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.17, 32, 24), dark);
  visor.scale.set(1, 0.62, 0.62); visor.position.set(0, 0.01, 0.1); g.add(visor);
  const eyes = [-0.06, 0.06].map(x => {
    const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.03, 4, 12), glow);
    e.position.set(x, 0.03, 0.2); g.add(e); return e;
  });
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.008, 0.01), glow);
  mouth.position.set(0, -0.04, 0.205); g.add(mouth);
  [-1, 1].forEach(s => {
    const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 20), shell);
    ear.rotation.z = Math.PI / 2; ear.position.set(0.205 * s, 0, 0); g.add(ear);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.007, 8, 24), glow);
    ring.rotation.y = Math.PI / 2; ring.position.set(0.228 * s, 0, 0); g.add(ring);
  });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.11, 8), shell);
  stem.position.set(0, 0.25, 0); g.add(stem);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), glow);
  tip.position.set(0, 0.315, 0); g.add(tip);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 16), shell);
  body.scale.set(1, 0.8, 1); body.position.set(0, -0.27, 0); g.add(body);
  const thruster = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 8, 32), glow);
  thruster.rotation.x = Math.PI / 2; thruster.position.set(0, -0.36, 0); g.add(thruster);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 16, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, depthWrite: false }));
  flame.rotation.x = Math.PI; flame.position.set(0, -0.44, 0); g.add(flame);
    g.scale.setScalar(0.62);
  return { group: g, eyes, mouth, tip, flame, glow };
}

export function createGuia({ scene, camera, renderer, zonas, onTeleport, getZona, getCoinsByZone, speak, isSpeaking, salas = [], tactil = false }) {
  const robot = buildRobot(new THREE.Color(zonas[0].color));
  scene.add(robot.group);
  robot.group.position.copy(camera.position).add(new THREE.Vector3(0.9, -0.25, -1.6));

  const estado = { visitadas: new Set(), retos: new Set(), juegos: new Set(), intentos: 0, aciertos: 0, brillo: 0 };
  const baseExposure = renderer.toneMappingExposure;
  let overlay = null;          // "mapa" | "reto" | null
  let subtTimer = null;

  // ── Interfaz ─────────────────────────────────────────────────
  const subt = div(`position:fixed;left:50%;top:64px;transform:translateX(-50%);max-width:min(760px,90vw);
    background:rgba(4,8,16,.82);border:1px solid rgba(0,255,238,.25);border-radius:14px;padding:10px 16px 10px 14px;
    color:#e6f2ef;font:13px/1.55 'Space Mono',monospace;z-index:55;display:none;gap:10px;align-items:flex-start;pointer-events:none;
    backdrop-filter:blur(10px);box-shadow:0 10px 40px rgba(0,0,0,.6)`);
  document.body.appendChild(subt);

  const ayuda = div(`position:fixed;left:18px;bottom:18px;z-index:55;font:10px/1.9 'Space Mono',monospace;color:rgba(200,225,220,.75);
    background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:8px 12px;pointer-events:none`,
    `<b style="font-family:Orbitron,sans-serif;letter-spacing:.14em;color:#00ffee">BIT</b> · tu guía<br>
     <kbd>M</kbd> Mapa y pasaporte &nbsp; <kbd>R</kbd> Hablar con BIT<br>
     <kbd>Q</kbd> Reto de la zona &nbsp; <kbd>B</kbd> Brillo &nbsp; <kbd>G</kbd> Calidad`);
  if (tactil) ayuda.style.display = "none";
  ayuda.innerHTML += `<br><kbd>E</kbd> Jugar en las salas de juego`;
  document.body.appendChild(ayuda);
  const kbdStyle = document.createElement("style");
  kbdStyle.textContent = `#museo-guia kbd,.guia-ui kbd{display:inline-block;min-width:16px;padding:0 5px;border:1px solid rgba(0,255,238,.45);
    border-radius:4px;color:#00ffee;font:10px 'Space Mono',monospace;text-align:center;margin-right:3px}
    .guia-btn{cursor:pointer;transition:transform .15s,border-color .15s,background .15s}
    .guia-btn:hover{transform:translateY(-2px);border-color:#00ffee!important;background:rgba(0,255,238,.08)!important}`;
  document.head.appendChild(kbdStyle);
  ayuda.classList.add("guia-ui");

  const panel = div(`position:fixed;inset:0;z-index:70;display:none;align-items:center;justify-content:center;
    background:rgba(1,3,8,.72);backdrop-filter:blur(6px);cursor:auto`);
  panel.classList.add("guia-ui");
  document.body.appendChild(panel);

  function avatar() {
    return `<svg width="34" height="34" viewBox="0 0 34 34" style="flex:none"><circle cx="17" cy="17" r="13" fill="#e8edf3"/>
      <ellipse cx="17" cy="17.5" rx="10" ry="6.5" fill="#05080f"/><rect x="11.5" y="15" width="3" height="5" rx="1.5" fill="#00ffee"/>
      <rect x="19.5" y="15" width="3" height="5" rx="1.5" fill="#00ffee"/><line x1="17" y1="4" x2="17" y2="0.8" stroke="#e8edf3" stroke-width="1.4"/>
      <circle cx="17" cy="1.6" r="1.6" fill="#00ffee"/></svg>`;
  }

  // ── Subtítulos (BIT "dice" lo que narra la voz) ──────────────
  function mostrarTexto(texto, ms) {
    clearTimeout(subtTimer);
    subt.innerHTML = `${avatar()}<div><b style="font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:.16em;color:#00ffee">BIT</b><br>${texto}</div>`;
    subt.style.display = "flex";
    subtTimer = setTimeout(() => {
      // se oculta cuando la voz termina (o tras el tiempo estimado si no hay voz)
      const espera = () => { if (isSpeaking()) { subtTimer = setTimeout(espera, 400); } else subt.style.display = "none"; };
      espera();
    }, ms ?? Math.max(3500, texto.split(/\s+/).length * 330));
  }
  function decir(texto, { voz = true } = {}) {
    mostrarTexto(texto);
    if (voz) speak(texto);
  }

  // ── Mapa / pasaporte (recorrido no lineal) ───────────────────
  function abrirMapa() {
    const coins = getCoinsByZone();
    const actual = getZona()?.id;
    const filas = zonas.map((z, i) => {
      const c = coins[z.id] || { got: 0, total: 0 };
      const vis = estado.visitadas.has(z.id), reto = estado.retos.has(z.id);
      return `<button class="guia-btn" data-i="${i}" style="display:grid;grid-template-columns:30px 1fr auto;gap:12px;align-items:center;width:100%;
        text-align:left;padding:12px 14px;margin:0 0 8px;border-radius:12px;background:rgba(255,255,255,.03);
        border:1px solid ${z.id === actual ? z.hex : "rgba(255,255,255,.1)"};color:#e6f2ef;font:12px 'Space Mono',monospace">
        <span style="font:700 14px Orbitron,sans-serif;color:${z.hex}">${i + 1}</span>
        <span><b style="font-family:Orbitron,sans-serif;font-size:12px;color:#fff">${z.titulo}</b>
          <span style="color:#9fb3ad"> · ${z.subtitulo}</span>${z.id === actual ? ` <span style="color:${z.hex}">· estás aquí</span>` : ""}<br>
          <span style="color:#9fb3ad;font-size:10.5px">${z.vitrinas.map(v => v.label).join(" · ")}</span></span>
        <span style="font-size:10.5px;color:#cfe;white-space:nowrap;text-align:right">${vis ? "✓ visitada" : "○ sin visitar"}<br>
          ${reto ? "★ reto superado" : "☆ reto pendiente"}<br>🪐 ${c.got}/${c.total}</span></button>`;
    }).join("");
    const totalC = Object.values(coins).reduce((a, c) => a + c.got, 0);
    const totalT = Object.values(coins).reduce((a, c) => a + c.total, 0);
    panel.innerHTML = `<div style="width:min(720px,94vw);max-height:90vh;overflow:auto;background:rgba(4,7,14,.97);
      border:1px solid rgba(0,255,238,.25);border-radius:20px;padding:22px 22px 14px;box-shadow:0 30px 90px rgba(0,0,0,.8)">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">${avatar()}
        <div><div style="font:700 15px Orbitron,sans-serif;color:#fff;letter-spacing:.06em">Mapa del museo</div>
        <div style="font:11px 'Space Mono',monospace;color:#9fb3ad">Elige una época para viajar hasta ella (clic o teclas 1–6; 7 = monumento final; 0 = vestíbulo)</div></div></div>
      <div style="display:flex;gap:10px;margin:14px 0 16px;flex-wrap:wrap">
        ${[["Zonas visitadas", `${estado.visitadas.size}/6`], ["Retos superados", `${[...estado.retos].filter(x => !x.includes(":")).length}/6`],
           ["Juegos", `${estado.juegos.size}/${salas.length}`], ["Planetas", `${totalC}/${totalT}`],
           ["Aciertos", `${estado.aciertos}/${estado.intentos}`]].map(([k, v]) =>
          `<div style="flex:1;min-width:120px;padding:10px 12px;border-radius:12px;background:rgba(0,255,238,.06);border:1px solid rgba(0,255,238,.18)">
            <div style="font:9px Orbitron,sans-serif;letter-spacing:.16em;color:#00ffee">${k.toUpperCase()}</div>
            <div style="font:700 18px Orbitron,sans-serif;color:#fff;margin-top:4px">${v}</div></div>`).join("")}
      </div>${filas}
      <button class="guia-btn" data-i="6" style="width:100%;padding:11px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);
        color:#e6f2ef;font:12px 'Space Mono',monospace"><b style="font-family:Orbitron,sans-serif;color:#00ffee">7</b> · Monumento de cierre</button>
      <button class="guia-btn" data-i="-1" style="width:100%;margin-top:8px;padding:11px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);
        color:#e6f2ef;font:12px 'Space Mono',monospace"><b style="font-family:Orbitron,sans-serif;color:#00ffee">0</b> · Volver al vestíbulo</button>
      ${salas.length ? `<div style="margin:18px 0 8px;font:9px Orbitron,sans-serif;letter-spacing:.18em;color:#00ffee">🎮 SALAS DE JUEGO</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px">${salas.map((sl, k) => `
        <button class="guia-btn" data-s="${k}" style="text-align:left;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.03);
          border:1px solid ${sl.zona.hex}55;color:#e6f2ef;font:11px 'Space Mono',monospace">
          <b style="font-family:Orbitron,sans-serif;font-size:11px;color:${sl.zona.hex}">${sl.nombre}</b><br>
          <span style="color:#9fb3ad;font-size:10px">${sl.zona.titulo}${estado.juegos.has(sl.juego) ? " · ✓ jugado" : ""}</span></button>`).join("")}</div>` : ""}
      <div style="text-align:center;margin-top:12px;font:10px 'Space Mono',monospace;color:#7d918b"><kbd>M</kbd> o <kbd>Esc</kbd> para cerrar</div></div>`;
    panel.querySelectorAll("button[data-i]").forEach(b => b.onclick = () => viajar(+b.dataset.i));
    panel.querySelectorAll("button[data-s]").forEach(b => b.onclick = () => viajar(salas[+b.dataset.s]));
    abrirPanel("mapa");
  }
  function viajar(i) {
    cerrarPanel();
    const fade = div(`position:fixed;inset:0;background:#000;z-index:80;opacity:0;transition:opacity .35s;pointer-events:none`);
    document.body.appendChild(fade);
    requestAnimationFrame(() => fade.style.opacity = "1");
    setTimeout(() => {
      const esSala = typeof i === "object";
      const z = esSala ? i.destino : i < 0 ? "hub" : i >= zonas.length ? -294 : zonas[i].zStart - 3.5;
      onTeleport(z);
      robot.group.position.set(camera.position.x + 1, camera.position.y - 0.35, camera.position.z - 2);
      fade.style.opacity = "0";
      setTimeout(() => fade.remove(), 400);
      const destino = esSala ? `la sala de juego de ${i.nombre}` : i < 0 ? "el vestíbulo" : i >= zonas.length ? "el monumento de cierre" : `«${zonas[i].titulo}»`;
      mostrarTexto(`¡Llegamos a ${destino}!${esSala ? (tactil ? " Acércate a la máquina y toca «Jugar»." : " Acércate a la máquina y pulsa E.") : tactil ? "" : " Haz clic en la escena para seguir explorando."}`, 3500);
    }, 380);
  }

  // ── Retos ─────────────────────────────────────────────────────
  let retoActual = null;
  function abrirReto() {
    let zona = getZona() || zonas[0];
    if (!RETOS[zona.id]) zona = zonas[Math.floor(Math.random() * zonas.length)];   // en el vestíbulo: época al azar
    const banco = RETOS[zona.id] || [];
    if (!banco.length) return;
    const pendientes = banco.filter((_, k) => !estado.retos.has(zona.id + ":" + k));
    const lista = pendientes.length ? pendientes : banco;
    retoActual = { zona, r: lista[Math.floor(Math.random() * lista.length)] };
    retoActual.k = banco.indexOf(retoActual.r);
    pintarReto(null);
    abrirPanel("reto");
    speak(retoActual.r.q);
  }
  function pintarReto(elegida) {
    const { zona, r } = retoActual;
    const resp = elegida !== null;
    const ok = resp && elegida === r.a;
    panel.innerHTML = `<div style="width:min(560px,92vw);background:rgba(4,7,14,.97);border:1px solid ${zona.hex}66;border-radius:20px;
      padding:24px;box-shadow:0 30px 90px rgba(0,0,0,.8)">
      <div style="display:flex;gap:12px;align-items:center">${avatar()}<div>
        <div style="font:9px Orbitron,sans-serif;letter-spacing:.18em;color:${zona.hex}">RETO · ${zona.titulo.toUpperCase()}</div>
        <div style="font:700 15px/1.45 Orbitron,sans-serif;color:#fff;margin-top:4px">${r.q}</div></div></div>
      <div style="margin-top:18px">${r.o.map((op, i) => {
        let bc = "rgba(255,255,255,.12)", bg = "rgba(255,255,255,.03)";
        if (resp && i === r.a) { bc = "#44ff88"; bg = "rgba(68,255,136,.1)"; }
        else if (resp && i === elegida) { bc = "#ff5566"; bg = "rgba(255,85,102,.1)"; }
        return `<button class="guia-btn" data-o="${i}" ${resp ? "disabled" : ""} style="display:block;width:100%;text-align:left;margin-bottom:8px;
          padding:12px 14px;border-radius:12px;border:1px solid ${bc};background:${bg};color:#e6f2ef;font:12.5px 'Space Mono',monospace">
          <kbd>${i + 1}</kbd> ${op}</button>`;
      }).join("")}</div>
      ${resp ? `<div style="margin-top:8px;padding:12px 14px;border-radius:12px;background:${ok ? "rgba(68,255,136,.08)" : "rgba(255,85,102,.08)"};
        font:12px/1.6 'Space Mono',monospace;color:#e6f2ef"><b style="color:${ok ? "#44ff88" : "#ff8899"}">${ok ? "¡Correcto!" : "Casi…"}</b> ${r.e}</div>
        <div style="text-align:center;margin-top:12px;font:10px 'Space Mono',monospace;color:#7d918b"><kbd>Q</kbd> otro reto · <kbd>Esc</kbd> volver al museo</div>`
      : `<div style="text-align:center;margin-top:6px;font:10px 'Space Mono',monospace;color:#7d918b">Responde con clic o con las teclas 1, 2 y 3 · <kbd>Esc</kbd> salir</div>`}
    </div>`;
    panel.querySelectorAll("button[data-o]").forEach(b => b.onclick = () => responder(+b.dataset.o));
  }
  function responder(i) {
    if (!retoActual || retoActual.resp) return;
    retoActual.resp = true;
    estado.intentos++;
    const ok = i === retoActual.r.a;
    if (ok) {
      estado.aciertos++;
      estado.retos.add(retoActual.zona.id);
      estado.retos.add(retoActual.zona.id + ":" + retoActual.k);
    }
    pintarReto(i);
    speak((ok ? "¡Correcto! " : "Casi. ") + retoActual.r.e);
    if (ok && [...estado.retos].filter(x => !x.includes(":")).length === zonas.length)
      setTimeout(() => mostrarTexto("¡Superaste un reto en cada época! Ya eres experto en la historia de los videojuegos. 🏆", 6000), 600);
  }

  // ── Paneles ──────────────────────────────────────────────────
  function abrirPanel(tipo) {
    overlay = tipo;
    window.__guiaBlocking = true;
    document.exitPointerLock?.();
    panel.style.display = "flex";
  }
  function cerrarPanel() {
    overlay = null;
    retoActual = null;
    window.__guiaBlocking = false;
    panel.style.display = "none";
  }

  // ── Teclado ──────────────────────────────────────────────────
  function onKey(e) {
    if (e.repeat) return;
    const tag = (e.target?.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea") return;
    if (e.code === "Escape" && overlay) { cerrarPanel(); return; }
    if (e.code === "KeyM") { overlay === "mapa" ? cerrarPanel() : abrirMapa(); return; }
    if (e.code === "KeyQ") { abrirReto(); return; }
    if (overlay === "mapa" && /^Digit[0-7]$/.test(e.code)) { viajar(+e.code.slice(5) - 1); return; }
    if (overlay === "reto" && /^Digit[1-3]$/.test(e.code)) { responder(+e.code.slice(5) - 1); return; }
    if (overlay) return;
    if (e.code === "KeyR") {
      const z = getZona() || zonas[0];
      const opciones = [...z.datos.map(d => d.d), ...CONSEJOS];
      decir(opciones[Math.floor(Math.random() * opciones.length)]);
    }
    if (e.code === "KeyB") {
      estado.brillo = (estado.brillo + 1) % 3;
      renderer.toneMappingExposure = baseExposure * [1, 1.3, 1.6][estado.brillo];
      mostrarTexto(`Brillo: ${["normal", "alto", "máximo"][estado.brillo]}.`, 1800);
    }
  }
  window.addEventListener("keydown", onKey);

  // ── Animación ────────────────────────────────────────────────
  const tmpR = new THREE.Vector3(), tmpF = new THREE.Vector3(), target = new THREE.Vector3();
  const colorObj = new THREE.Color(zonas[0].color);
  function update(dt, t) {
    camera.getWorldDirection(tmpF); tmpF.y = 0; tmpF.normalize();
    tmpR.set(-tmpF.z, 0, tmpF.x);                      // derecha de la mirada
    target.copy(camera.position).addScaledVector(tmpF, 2.0).addScaledVector(tmpR, 1.05);
    target.y = camera.position.y - 0.38 + Math.sin(t * 2.1) * 0.05;
    if (camera.position.x < -4) target.x = Math.max(-10.6, Math.min(-4.6, target.x));   // dentro de una sala de juego
    else if (camera.position.z < 30) target.x = Math.max(-3.3, Math.min(3.3, target.x));
    robot.group.position.lerp(target, 1 - Math.exp(-3.2 * dt));
    robot.group.lookAt(camera.position.x, camera.position.y - 0.1, camera.position.z);
    robot.group.rotateZ(Math.sin(t * 1.3) * 0.06);

    const hablando = isSpeaking();
    robot.mouth.scale.x = hablando ? 1 + Math.abs(Math.sin(t * 17)) * 1.6 : 1;
    robot.mouth.scale.y = hablando ? 1 + Math.abs(Math.sin(t * 23)) * 3 : 1;
    const parpadeo = (t % 4.2) < 0.12 ? 0.15 : 1;
    robot.eyes.forEach(e => (e.scale.y = parpadeo));
    robot.glow.emissiveIntensity = hablando ? 1.5 + Math.sin(t * 12) * 0.6 : 1.2 + Math.sin(t * 2) * 0.2;
    robot.tip.visible = (t % 1.2) < 0.9;
    robot.flame.scale.y = 0.8 + Math.abs(Math.sin(t * 9)) * 0.4;

    const z = getZona();
    if (z) {
      colorObj.lerp(new THREE.Color(z.color), 0.05);
      robot.glow.color.copy(colorObj); robot.glow.emissive.copy(colorObj);
      robot.flame.material.color.copy(colorObj);
      if (!estado.visitadas.has(z.id) && zonas.some(q => q.id === z.id)) estado.visitadas.add(z.id);
    }
  }

  // Saludo inicial: espera a que termine la narración de la primera zona
  let silencio = 0, saludoT;
  const saludo = () => {
    silencio = isSpeaking() ? 0 : silencio + 1;
    if (silencio >= 3) decir(tactil
      ? "¡Hola! Soy BIT, tu guía. Estás en el vestíbulo: cada portal lleva a una época, en el orden que quieras. Cada época tiene una sala de juego a la izquierda del pasillo. Usa el botón del mapa para saltar a cualquier lugar."
      : "¡Hola! Soy BIT, tu guía. Estás en el vestíbulo: cada portal lleva a una época, en el orden que quieras. Cada época tiene una sala de juego a la izquierda del pasillo. Pulsa M para el mapa, Q para un reto y R para hablar conmigo.");
    else saludoT = setTimeout(saludo, 500);
  };
  saludoT = setTimeout(saludo, 3000);

  return {
    update,
    say: mostrarTexto,
    registrarJuego(id) { estado.juegos.add(id); },
    snap() { robot.group.position.set(camera.position.x + 1, camera.position.y - 0.35, camera.position.z - 2); },
    destroy() {
      window.removeEventListener("keydown", onKey);
      clearTimeout(saludoT); clearTimeout(subtTimer);
      [subt, ayuda, panel, kbdStyle].forEach(n => n.remove());
      window.__guiaBlocking = false;
      scene.remove(robot.group);
    },
  };
}
