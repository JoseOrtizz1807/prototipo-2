// ═══════════════════════════════════════════════════════════════
//  MINIJUEGOS de las salas de juego (Canvas 2D, teclado, ratón y táctil)
//  oxo · pong · tetris · reflejos · snake · memoria
// ═══════════════════════════════════════════════════════════════
const css = (el, s) => { el.style.cssText = s; return el; };
const div = (s, html = "") => { const d = document.createElement("div"); css(d, s); d.innerHTML = html; return d; };
const TACTIL = matchMedia("(pointer: coarse)").matches || (navigator.maxTouchPoints > 0 && "ontouchstart" in window);

// ── Récords (por navegador) ────────────────────────────────────
const KEY = "museo_records_v1";
export function leerRecords() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } }
function guardar(r) { try { localStorage.setItem(KEY, JSON.stringify(r)); } catch {} }

// ── Sonido 8-bit ───────────────────────────────────────────────
let actx = null;
function beep(f = 440, d = 0.07, tipo = "square", vol = 0.05) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = tipo; o.frequency.value = f; g.gain.setValueAtTime(vol, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + d);
    o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + d + 0.02);
  } catch {}
}

let activo = null;
export const juegoAbierto = () => !!activo;

export function abrirJuego(id, { titulo = id, hex = "#00ffee", onFin } = {}) {
  if (activo || !JUEGOS[id]) return;
  const def = JUEGOS[id];
  window.__guiaBlocking = true; window.__juegoActivo = true;
  document.exitPointerLock?.();

  const ov = div(`position:fixed;inset:0;z-index:95;background:rgba(1,3,8,.95);display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:10px;padding:12px;font-family:'Space Mono',monospace;color:#e6f2ef;touch-action:none;user-select:none;cursor:auto`);
  const cab = div(`display:flex;align-items:center;gap:14px;width:min(640px,94vw)`);
  cab.innerHTML = `<b style="font:700 16px Orbitron,sans-serif;color:${hex};letter-spacing:.08em">${titulo}</b>
    <span id="mj-marcador" style="flex:1;text-align:center;font-size:13px"></span>
    <button id="mj-salir" style="background:transparent;border:1px solid ${hex}88;color:#e6f2ef;border-radius:8px;padding:6px 12px;
      font:11px 'Space Mono',monospace;cursor:pointer">✕ Salir${TACTIL ? "" : " (Esc)"}</button>`;
  const canvas = document.createElement("canvas");
  canvas.width = def.w; canvas.height = def.h;
  css(canvas, `max-width:94vw;max-height:${TACTIL ? 56 : 68}vh;width:auto;height:auto;border:1px solid ${hex}55;border-radius:10px;
    background:#02040a;box-shadow:0 0 40px ${hex}33;touch-action:none`);
  const ayuda = div(`font-size:11px;color:#9fb3ad;text-align:center;max-width:94vw`, TACTIL ? def.ayudaTactil : def.ayuda);
  const pad = div(`display:${TACTIL && def.pad ? "flex" : "none"};gap:10px;flex-wrap:wrap;justify-content:center`);
  ov.append(cab, canvas, ayuda, pad);
  document.body.appendChild(ov);
  const marcador = cab.querySelector("#mj-marcador");
  const ctx = canvas.getContext("2d");

  let juego = null, fin = null, raf = 0, last = performance.now();
  const api = {
    ctx, canvas, hex, beep,
    marcador: t => { marcador.textContent = t; },
    // posición del puntero en coordenadas del canvas
    pos(e) { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * canvas.width / r.width, y: (e.clientY - r.top) * canvas.height / r.height }; },
    terminar(res) { if (fin) return; fin = res; setTimeout(() => pantallaFinal(res), 500); },
  };

  function iniciar() {
    fin = null; pad.innerHTML = ""; finEl?.remove(); finEl = null;
    juego = def.crear(api);
    (def.pad || []).forEach(([txt, code]) => {
      const b = document.createElement("button"); b.textContent = txt;
      css(b, `min-width:62px;height:54px;font:700 20px Orbitron,sans-serif;color:#fff;background:${hex}22;border:1px solid ${hex}88;border-radius:12px;touch-action:none`);
      const down = e => { e.preventDefault(); juego?.tecla?.(code, true); };
      const up = e => { e.preventDefault(); juego?.tecla?.(code, false); };
      b.addEventListener("pointerdown", down); b.addEventListener("pointerup", up); b.addEventListener("pointerleave", up);
      pad.appendChild(b);
    });
  }

  let finEl = null;
  function pantallaFinal(res) {
    const recs = leerRecords(); const prev = recs[id];
    let nuevo = false;
    if (res.acumular) { recs[id] = (prev || 0) + (res.puntaje || 0); nuevo = res.puntaje > 0; }
    else if (res.puntaje != null && (prev == null || (def.menorMejor ? res.puntaje < prev : res.puntaje > prev))) { recs[id] = res.puntaje; nuevo = prev != null || res.puntaje > 0; }
    guardar(recs);
    res.record = recs[id]; res.nuevoRecord = nuevo && !res.acumular;
    finEl = div(`position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(1,3,8,.82)`);
    finEl.innerHTML = `<div style="width:min(440px,90vw);background:rgba(4,7,14,.98);border:1px solid ${hex}88;border-radius:18px;padding:22px;text-align:center">
      <div style="font:700 22px Orbitron,sans-serif;color:${hex}">${res.titulo}</div>
      <div style="margin:10px 0 4px;font-size:13px;line-height:1.6">${res.texto}</div>
      <div style="font-size:11px;color:#9fb3ad;margin-bottom:16px">${def.etiquetaRecord}: <b style="color:#fff">${recs[id] ?? "—"}${def.unidad || ""}</b>${res.nuevoRecord ? " · ¡nuevo récord!" : ""}</div>
      <button id="mj-otra" style="background:${hex};color:#02040a;border:0;border-radius:10px;padding:11px 18px;font:700 12px Orbitron,sans-serif;cursor:pointer;margin:4px">↻ Jugar otra vez</button>
      <button id="mj-volver" style="background:transparent;color:#e6f2ef;border:1px solid ${hex}88;border-radius:10px;padding:11px 18px;font:12px 'Space Mono',monospace;cursor:pointer;margin:4px">Volver al museo</button></div>`;
    ov.appendChild(finEl);
    finEl.querySelector("#mj-otra").onclick = iniciar;
    finEl.querySelector("#mj-volver").onclick = cerrar;
  }

  const onKeyDown = e => {
    e.stopImmediatePropagation();
    if (e.code === "Escape") { cerrar(); return; }
    if (/^(Arrow|Space)/.test(e.code)) e.preventDefault();
    if (finEl && (e.code === "Enter" || e.code === "Space")) { iniciar(); return; }
    juego?.tecla?.(e.code, true, e.repeat);
  };
  const onKeyUp = e => { e.stopImmediatePropagation(); juego?.tecla?.(e.code, false); };
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("keyup", onKeyUp, true);
  canvas.addEventListener("pointerdown", e => { e.preventDefault(); juego?.puntero?.("down", api.pos(e), e); });
  canvas.addEventListener("pointermove", e => { juego?.puntero?.("move", api.pos(e), e); });
  canvas.addEventListener("pointerup", e => { juego?.puntero?.("up", api.pos(e), e); });
  cab.querySelector("#mj-salir").onclick = cerrar;

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (juego && !fin) juego.update?.(dt);
    juego?.draw?.();
  }
  iniciar(); raf = requestAnimationFrame(loop);

  let resultadoFinal = null;
  function cerrar() {
    resultadoFinal = fin;
    cancelAnimationFrame(raf);
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("keyup", onKeyUp, true);
    ov.remove(); activo = null;
    window.__guiaBlocking = false; window.__juegoActivo = false;
    onFin?.(resultadoFinal, leerRecords()[id]);
  }
  activo = { cerrar };
}

// ═══════════════════════════════════════════════════════════════
//  JUEGOS
// ═══════════════════════════════════════════════════════════════
const fondo = (ctx, w, h) => { ctx.fillStyle = "#02040a"; ctx.fillRect(0, 0, w, h); };
const texto = (ctx, t, x, y, size = 16, col = "#e6f2ef", font = "'Space Mono',monospace") => {
  ctx.fillStyle = col; ctx.font = `${size}px ${font}`; ctx.textAlign = "center"; ctx.fillText(t, x, y);
};

// ── OXO · tres en raya contra la máquina ───────────────────────
function oxo(api) {
  const { ctx, hex, beep } = api, S = 360, C = S / 3;
  const b = Array(9).fill(null); let turno = "X", msg = "Tu turno: eres X";
  const L3 = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const ganador = t => { for (const [a, c, d] of L3) if (t[a] && t[a] === t[c] && t[a] === t[d]) return t[a]; return t.every(Boolean) ? "=" : null; };
  function minimax(t, j) {
    const w = ganador(t); if (w === "O") return { s: 1 }; if (w === "X") return { s: -1 }; if (w === "=") return { s: 0 };
    let mejor = { s: j === "O" ? -2 : 2 };
    t.forEach((v, i) => { if (v) return; t[i] = j; const r = minimax(t, j === "O" ? "X" : "O"); t[i] = null;
      if (j === "O" ? r.s > mejor.s : r.s < mejor.s) mejor = { s: r.s, i }; });
    return mejor;
  }
  function revisar() {
    const w = ganador(b); if (!w) return false;
    if (w === "X") { msg = "¡Ganaste a la máquina!"; beep(880, .2); api.terminar({ titulo: "¡Victoria!", texto: "Le ganaste a la máquina. En 1952 casi nadie lo lograba contra la EDSAC.", puntaje: 1, acumular: true }); }
    else if (w === "O") { msg = "Ganó la máquina"; beep(160, .3, "sawtooth"); api.terminar({ titulo: "Ganó la máquina", texto: "La computadora anticipó tu jugada. Prueba bloquear sus líneas antes de atacar.", puntaje: 0, acumular: true }); }
    else { msg = "Empate"; api.terminar({ titulo: "Empate", texto: "Con juego perfecto, el tres en raya siempre termina en empate.", puntaje: 0, acumular: true }); }
    return true;
  }
  function jugar(i) {
    if (turno !== "X" || i < 0 || i > 8 || b[i]) return;
    b[i] = "X"; beep(520); if (revisar()) return;
    turno = "O"; msg = "La máquina piensa…";
    setTimeout(() => {
      const libres = b.map((v, k) => v ? -1 : k).filter(k => k >= 0);
      const i2 = Math.random() < 0.3 ? libres[Math.floor(Math.random() * libres.length)] : minimax(b, "O").i;
      b[i2] = "O"; beep(330); turno = "X"; msg = "Tu turno: eres X"; revisar();
    }, 450);
  }
  api.marcador("Tres en raya contra la EDSAC (1952)");
  return {
    tecla(code, down) { if (!down) return; const m = code.match(/^(Digit|Numpad)([1-9])$/); if (m) jugar(+m[2] - 1); },
    puntero(tipo, p) { if (tipo === "down") jugar(Math.floor(p.y / C) * 3 + Math.floor(p.x / C)); },
    draw() {
      fondo(ctx, S, S + 40);
      ctx.strokeStyle = hex; ctx.lineWidth = 4;
      for (let k = 1; k < 3; k++) { ctx.beginPath(); ctx.moveTo(k * C, 10); ctx.lineTo(k * C, S - 10); ctx.stroke(); ctx.beginPath(); ctx.moveTo(10, k * C); ctx.lineTo(S - 10, k * C); ctx.stroke(); }
      b.forEach((v, i) => {
        const x = (i % 3) * C + C / 2, y = Math.floor(i / 3) * C + C / 2;
        if (!v) { texto(ctx, String(i + 1), x, y + 6, 16, "#2a3a40"); return; }
        ctx.lineWidth = 8; ctx.strokeStyle = v === "X" ? "#ffffff" : hex; ctx.beginPath();
        if (v === "X") { ctx.moveTo(x - 32, y - 32); ctx.lineTo(x + 32, y + 32); ctx.moveTo(x + 32, y - 32); ctx.lineTo(x - 32, y + 32); }
        else ctx.arc(x, y, 34, 0, Math.PI * 2);
        ctx.stroke();
      });
      texto(ctx, msg, S / 2, S + 28, 16);
    },
  };
}

// ── PONG ───────────────────────────────────────────────────────
function pong(api) {
  const { ctx, hex, beep } = api, W = 640, H = 400, PH = 74, PW = 10, META = 5;
  let yJ = H / 2, yC = H / 2, objetivo = null, pj = 0, pc = 0, arriba = false, abajo = false, pausa = 1;
  const bola = { x: W / 2, y: H / 2, vx: 300, vy: 120 };
  const saque = dir => { Object.assign(bola, { x: W / 2, y: H / 2, vx: 300 * dir, vy: (Math.random() * 2 - 1) * 160 }); pausa = 0.9; };
  saque(Math.random() < .5 ? 1 : -1);
  const marc = () => api.marcador(`TÚ ${pj}  —  ${pc} MÁQUINA · gana quien llegue a ${META}`);
  marc();
  return {
    tecla(code, down) { if (/KeyW|ArrowUp/.test(code)) arriba = down; if (/KeyS|ArrowDown/.test(code)) abajo = down; if (down) objetivo = null; },
    puntero(tipo, p) { if (tipo !== "up") objetivo = p.y; },
    update(dt) {
      if (arriba) yJ -= 420 * dt; if (abajo) yJ += 420 * dt;
      if (objetivo != null) yJ += Math.max(-520 * dt, Math.min(520 * dt, objetivo - yJ));
      yJ = Math.max(PH / 2, Math.min(H - PH / 2, yJ));
      const meta = bola.vx > 0 ? bola.y : H / 2;
      yC += Math.max(-250 * dt, Math.min(250 * dt, meta - yC)); yC = Math.max(PH / 2, Math.min(H - PH / 2, yC));
      if (pausa > 0) { pausa -= dt; return; }
      bola.x += bola.vx * dt; bola.y += bola.vy * dt;
      if (bola.y < 6 || bola.y > H - 6) { bola.vy *= -1; bola.y = Math.max(6, Math.min(H - 6, bola.y)); beep(260, .04); }
      const golpe = (py, lado) => { const off = (bola.y - py) / (PH / 2); bola.vx = -bola.vx * 1.06; bola.vy = off * 330; bola.x = lado; beep(lado < W / 2 ? 520 : 440, .05); };
      if (bola.vx < 0 && bola.x < 30 && bola.x > 14 && Math.abs(bola.y - yJ) < PH / 2 + 6) golpe(yJ, 30);
      if (bola.vx > 0 && bola.x > W - 30 && bola.x < W - 14 && Math.abs(bola.y - yC) < PH / 2 + 6) golpe(yC, W - 30);
      if (bola.x < -10) { pc++; beep(140, .25, "sawtooth"); marc(); saque(1); }
      if (bola.x > W + 10) { pj++; beep(880, .15); marc(); saque(-1); }
      if (pj >= META) api.terminar({ titulo: "¡Ganaste!", texto: `Ganaste ${pj} a ${pc}. Así se jugaba en los bares de 1972.`, puntaje: 1, acumular: true });
      else if (pc >= META) api.terminar({ titulo: "Ganó la máquina", texto: `${pj} a ${pc}. Pista: golpea la pelota con el borde de la paleta para darle ángulo.`, puntaje: 0, acumular: true });
    },
    draw() {
      fondo(ctx, W, H);
      ctx.setLineDash([8, 12]); ctx.strokeStyle = "#ffffff33"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]);
      texto(ctx, pj, W / 2 - 60, 60, 44, "#ffffff55", "Orbitron,Arial"); texto(ctx, pc, W / 2 + 60, 60, 44, "#ffffff55", "Orbitron,Arial");
      ctx.fillStyle = "#fff"; ctx.fillRect(16, yJ - PH / 2, PW, PH); ctx.fillStyle = hex; ctx.fillRect(W - 26, yC - PH / 2, PW, PH);
      ctx.fillStyle = "#fff"; ctx.fillRect(bola.x - 6, bola.y - 6, 12, 12);
    },
  };
}

// ── TETRIS ─────────────────────────────────────────────────────
function tetris(api) {
  const { ctx, hex, beep } = api, CW = 10, CH = 20, T = 24, W = CW * T, H = CH * T;
  const PIEZAS = {
    I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], O: [[1,1],[1,1]], T: [[0,1,0],[1,1,1],[0,0,0]],
    S: [[0,1,1],[1,1,0],[0,0,0]], Z: [[1,1,0],[0,1,1],[0,0,0]], J: [[1,0,0],[1,1,1],[0,0,0]], L: [[0,0,1],[1,1,1],[0,0,0]],
  };
  const COL = { I: "#00e5ff", O: "#ffd400", T: "#c04bff", S: "#44ff88", Z: "#ff4466", J: "#4488ff", L: "#ff9a2e" };
  const tab = Array.from({ length: CH }, () => Array(CW).fill(null));
  let bolsa = [], p = null, caida = 0, lineasT = 0, puntos = 0, abajo = false;
  const nueva = () => { if (!bolsa.length) bolsa = Object.keys(PIEZAS).sort(() => Math.random() - .5); const k = bolsa.pop(); return { k, m: PIEZAS[k].map(r => r.slice()), x: 3, y: k === "I" ? -1 : 0 }; };
  const choca = (m, x, y) => m.some((r, i) => r.some((v, j) => v && (x + j < 0 || x + j >= CW || y + i >= CH || (y + i >= 0 && tab[y + i][x + j]))));
  const nivel = () => 1 + Math.floor(lineasT / 8);
  const marc = () => api.marcador(`PUNTOS ${puntos} · LÍNEAS ${lineasT} · NIVEL ${nivel()}`);
  function fijar() {
    p.m.forEach((r, i) => r.forEach((v, j) => { if (v && p.y + i >= 0) tab[p.y + i][p.x + j] = p.k; }));
    let n = 0;
    for (let i = CH - 1; i >= 0; i--) if (tab[i].every(Boolean)) { tab.splice(i, 1); tab.unshift(Array(CW).fill(null)); n++; i++; }
    if (n) { lineasT += n; puntos += [0, 100, 300, 500, 800][n] * nivel(); beep(660 + n * 110, .12); } else beep(200, .03);
    marc(); p = nueva();
    if (choca(p.m, p.x, p.y)) api.terminar({ titulo: "Fin del juego", texto: `${puntos} puntos y ${lineasT} líneas. Rotar piezas mentalmente es entrenamiento visoespacial.`, puntaje: puntos });
  }
  const mover = (dx, dy) => { if (!choca(p.m, p.x + dx, p.y + dy)) { p.x += dx; p.y += dy; return true; } return false; };
  function rotar() {
    const m = p.m[0].map((_, j) => p.m.map(r => r[j]).reverse());
    for (const dx of [0, -1, 1, -2, 2]) if (!choca(m, p.x + dx, p.y)) { p.m = m; p.x += dx; beep(400, .03); return; }
  }
  p = nueva(); marc();
  return {
    tecla(code, down) {
      if (/ArrowDown|KeyS/.test(code)) abajo = down;
      if (!down || !p) return;
      if (/ArrowLeft|KeyA/.test(code)) mover(-1, 0);
      else if (/ArrowRight|KeyD/.test(code)) mover(1, 0);
      else if (/ArrowUp|KeyW|KeyX/.test(code)) rotar();
      else if (code === "Space") { while (mover(0, 1)); fijar(); }
    },
    update(dt) {
      caida += dt * (abajo ? 12 : 1);
      const vel = Math.max(0.08, 0.75 - (nivel() - 1) * 0.07);
      if (caida > vel) { caida = 0; if (!mover(0, 1)) fijar(); }
    },
    draw() {
      fondo(ctx, W, H);
      ctx.strokeStyle = "#ffffff0d";
      for (let i = 0; i <= CW; i++) { ctx.beginPath(); ctx.moveTo(i * T, 0); ctx.lineTo(i * T, H); ctx.stroke(); }
      for (let i = 0; i <= CH; i++) { ctx.beginPath(); ctx.moveTo(0, i * T); ctx.lineTo(W, i * T); ctx.stroke(); }
      const celda = (x, y, c, a = 1) => { ctx.globalAlpha = a; ctx.fillStyle = c; ctx.fillRect(x * T + 1, y * T + 1, T - 2, T - 2); ctx.fillStyle = "#ffffff44"; ctx.fillRect(x * T + 2, y * T + 2, T - 4, 4); ctx.globalAlpha = 1; };
      tab.forEach((r, i) => r.forEach((v, j) => v && celda(j, i, COL[v])));
      if (p) {
        let gy = p.y; while (!choca(p.m, p.x, gy + 1)) gy++;
        p.m.forEach((r, i) => r.forEach((v, j) => { if (v) { celda(p.x + j, gy + i, COL[p.k], .2); if (p.y + i >= 0) celda(p.x + j, p.y + i, COL[p.k]); } }));
      }
    },
  };
}

// ── REFLEJOS (tiempo de reacción) ──────────────────────────────
function reflejos(api) {
  const { ctx, hex, beep } = api, W = 640, H = 360, RONDAS = 5;
  let estado = "inicio", espera = 0, t0 = 0, tiempos = [], ultimo = null, aviso = "";
  const marc = () => api.marcador(`Intento ${Math.min(tiempos.length + 1, RONDAS)} de ${RONDAS}`);
  const preparar = () => { estado = "espera"; espera = 1.2 + Math.random() * 2.3; aviso = ""; marc(); };
  function accion() {
    if (estado === "inicio" || estado === "resultado") { preparar(); return; }
    if (estado === "espera") { aviso = "¡Muy pronto! Espera el verde."; beep(150, .2, "sawtooth"); preparar(); aviso = "¡Muy pronto! Espera el verde."; return; }
    if (estado === "verde") {
      ultimo = Math.round(performance.now() - t0); tiempos.push(ultimo); beep(880, .08);
      if (tiempos.length >= RONDAS) {
        const prom = Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length);
        estado = "fin";
        api.terminar({ titulo: `${prom} ms de promedio`, texto: `Mejor intento: ${Math.min(...tiempos)} ms. La reacción visual simple suele estar entre 200 y 300 ms; los juegos de acción se asocian con respuestas más rápidas sin perder precisión (Dye, Green y Bavelier, 2009).`, puntaje: prom });
      } else estado = "resultado";
    }
  }
  marc();
  return {
    tecla(code, down, rep) { if (down && !rep && (code === "Space" || code === "Enter")) accion(); },
    puntero(tipo) { if (tipo === "down") accion(); },
    update(dt) { if (estado === "espera") { espera -= dt; if (espera <= 0) { estado = "verde"; t0 = performance.now(); } } },
    draw() {
      const col = estado === "verde" ? "#1fd16b" : estado === "espera" ? "#b3172f" : "#02040a";
      ctx.fillStyle = col; ctx.fillRect(0, 0, W, H);
      if (estado === "inicio") { texto(ctx, "Cuando la pantalla se ponga VERDE,", W / 2, 150, 20); texto(ctx, TACTIL ? "toca la pantalla lo más rápido que puedas." : "pulsa Espacio o haz clic lo más rápido que puedas.", W / 2, 182, 18); texto(ctx, TACTIL ? "Toca para empezar" : "Clic o Espacio para empezar", W / 2, 250, 16, hex); }
      if (estado === "espera") { texto(ctx, "Espera…", W / 2, 170, 40, "#fff", "Orbitron,Arial"); if (aviso) texto(ctx, aviso, W / 2, 220, 16, "#ffd1d8"); }
      if (estado === "verde") texto(ctx, "¡YA!", W / 2, 195, 64, "#02130a", "Orbitron,Arial");
      if (estado === "resultado" || estado === "fin") { texto(ctx, `${ultimo} ms`, W / 2, 170, 56, hex, "Orbitron,Arial"); if (estado === "resultado") texto(ctx, TACTIL ? "Toca para el siguiente intento" : "Clic o Espacio para el siguiente intento", W / 2, 230, 16); }
      tiempos.forEach((t, i) => texto(ctx, `${t}`, 80 + i * 120, H - 24, 14, "#ffffffaa"));
    },
  };
}

// ── SNAKE ──────────────────────────────────────────────────────
function snake(api) {
  const { ctx, hex, beep } = api, N = 20, T = 20, S = N * T;
  let cuerpo = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }], dir = { x: 1, y: 0 }, cola = [], fruta = null, acum = -1.5, puntos = 0, inicio = null;
  const ponerFruta = () => { do fruta = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) }; while (cuerpo.some(c => c.x === fruta.x && c.y === fruta.y)); };
  ponerFruta();
  const marc = () => api.marcador(`MANZANAS ${puntos}`); marc();
  const girar = (x, y) => { const ref = cola.length ? cola[cola.length - 1] : dir; if (ref.x === -x && ref.y === -y) return; if (cola.length < 3) cola.push({ x, y }); };
  const MAPA = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
  return {
    tecla(code, down) { if (down && MAPA[code]) girar(...MAPA[code]); },
    puntero(tipo, p) {
      if (tipo === "down") inicio = p;
      if (tipo === "move" && inicio) { const dx = p.x - inicio.x, dy = p.y - inicio.y; if (Math.hypot(dx, dy) > 24) { Math.abs(dx) > Math.abs(dy) ? girar(Math.sign(dx), 0) : girar(0, Math.sign(dy)); inicio = p; } }
      if (tipo === "up") inicio = null;
    },
    update(dt) {
      acum += dt; const paso = Math.max(0.065, 0.13 - puntos * 0.003);
      if (acum < paso) return; acum = 0;
      if (cola.length) dir = cola.shift();
      const cab = { x: cuerpo[0].x + dir.x, y: cuerpo[0].y + dir.y };
      if (cab.x < 0 || cab.y < 0 || cab.x >= N || cab.y >= N || cuerpo.some(c => c.x === cab.x && c.y === cab.y)) {
        beep(120, .35, "sawtooth");
        api.terminar({ titulo: "¡Choque!", texto: `Comiste ${puntos} manzanas. Snake puso un videojuego en millones de teléfonos Nokia desde 1997.`, puntaje: puntos });
        return;
      }
      cuerpo.unshift(cab);
      if (cab.x === fruta.x && cab.y === fruta.y) { puntos++; beep(700, .06); marc(); ponerFruta(); } else cuerpo.pop();
    },
    draw() {
      ctx.fillStyle = "#0b1a0f"; ctx.fillRect(0, 0, S, S);
      ctx.fillStyle = "#ff4466"; ctx.fillRect(fruta.x * T + 4, fruta.y * T + 4, T - 8, T - 8);
      cuerpo.forEach((c, i) => { ctx.fillStyle = i ? hex : "#ffffff"; ctx.fillRect(c.x * T + 1, c.y * T + 1, T - 2, T - 2); });
      if (acum < 0) texto(ctx, "¡PREPÁRATE!", S / 2, S / 2 - 40, 28, "#ffffff", "Orbitron,Arial");
    },
  };
}

// ── MEMORIA (tipo Simon) ───────────────────────────────────────
function memoria(api) {
  const { ctx, beep } = api, S = 400;
  const PADS = [{ c: "#2ecc71", f: 330 }, { c: "#e74c3c", f: 392 }, { c: "#f1c40f", f: 494 }, { c: "#3498db", f: 587 }];
  let sec = [], paso = 0, fase = "mostrar", luz = -1, reloj = 0, idx = 0;
  const marc = () => api.marcador(`SECUENCIA ${sec.length} · repite las luces en el mismo orden`);
  const agregar = () => { sec.push(Math.floor(Math.random() * 4)); fase = "mostrar"; idx = 0; reloj = -0.6; marc(); };
  agregar();
  function pulsar(i) {
    if (fase !== "jugar") return;
    luz = i; reloj = 0; beep(PADS[i].f, .25, "triangle", .08);
    if (i !== sec[paso]) {
      fase = "fin"; beep(110, .5, "sawtooth");
      api.terminar({ titulo: `Secuencia de ${sec.length - 1}`, texto: `Recordaste ${sec.length - 1} pasos seguidos. La memoria de trabajo de un adulto suele retener entre 4 y 7 elementos a la vez.`, puntaje: sec.length - 1 });
      return;
    }
    paso++;
    if (paso >= sec.length) { fase = "espera"; setTimeout(agregar, 700); }
  }
  return {
    tecla(code, down) { const m = code.match(/^(Digit|Numpad)([1-4])$/); if (down && m) pulsar(+m[2] - 1); },
    puntero(tipo, p) { if (tipo === "down") pulsar((p.y > S / 2 ? 2 : 0) + (p.x > S / 2 ? 1 : 0)); },
    update(dt) {
      reloj += dt;
      if (fase === "mostrar") {
        const t = reloj; if (t < 0) { luz = -1; return; }
        const k = Math.floor(t / 0.6), dentro = (t % 0.6) < 0.42;
        if (k >= sec.length) { fase = "jugar"; paso = 0; luz = -1; return; }
        if (dentro && luz !== sec[k]) { luz = sec[k]; beep(PADS[luz].f, .35, "triangle", .08); }
        if (!dentro) luz = -1;
      } else if (fase === "jugar" && reloj > 0.25) luz = -1;
    },
    draw() {
      fondo(ctx, S, S);
      PADS.forEach((p, i) => {
        const x = (i % 2) * S / 2, y = Math.floor(i / 2) * S / 2;
        ctx.globalAlpha = luz === i ? 1 : 0.28; ctx.fillStyle = p.c; ctx.fillRect(x + 8, y + 8, S / 2 - 16, S / 2 - 16);
        ctx.globalAlpha = 1; texto(ctx, String(i + 1), x + S / 4, y + S / 4 + 8, 22, "#02040a", "Orbitron,Arial");
      });
      ctx.fillStyle = "#02040a"; ctx.beginPath(); ctx.arc(S / 2, S / 2, 56, 0, Math.PI * 2); ctx.fill();
      texto(ctx, fase === "mostrar" || fase === "espera" ? "MIRA" : fase === "jugar" ? "TU TURNO" : "", S / 2, S / 2 + 6, 15, "#fff", "Orbitron,Arial");
    },
  };
}

const JUEGOS = {
  oxo: { w: 360, h: 400, crear: oxo, etiquetaRecord: "Victorias acumuladas",
    ayuda: "Haz clic en una casilla o usa las teclas 1–9. La máquina juega con O.", ayudaTactil: "Toca una casilla. La máquina juega con O." },
  pong: { w: 640, h: 400, crear: pong, etiquetaRecord: "Victorias acumuladas",
    ayuda: "Mueve tu paleta (izquierda) con W/S, las flechas ↑/↓ o el ratón.", ayudaTactil: "Desliza el dedo sobre la pantalla para mover tu paleta." },
  tetris: { w: 240, h: 480, crear: tetris, etiquetaRecord: "Récord", unidad: " pts",
    ayuda: "← → mover · ↑ girar · ↓ bajar rápido · Espacio soltar", ayudaTactil: "Usa los botones para mover, girar y soltar.",
    pad: [["◀", "ArrowLeft"], ["⟳", "ArrowUp"], ["▶", "ArrowRight"], ["▼", "ArrowDown"], ["⤓", "Space"]] },
  reflejos: { w: 640, h: 360, crear: reflejos, etiquetaRecord: "Mejor promedio", unidad: " ms", menorMejor: true,
    ayuda: "Espera a que la pantalla se ponga verde y reacciona con clic o Espacio.", ayudaTactil: "Espera el verde y toca la pantalla." },
  snake: { w: 400, h: 400, crear: snake, etiquetaRecord: "Récord", unidad: " manzanas",
    ayuda: "Flechas o WASD para girar. No choques con los bordes ni contigo.", ayudaTactil: "Desliza el dedo o usa los botones para girar.",
    pad: [["◀", "ArrowLeft"], ["▲", "ArrowUp"], ["▼", "ArrowDown"], ["▶", "ArrowRight"]] },
  memoria: { w: 400, h: 400, crear: memoria, etiquetaRecord: "Secuencia más larga",
    ayuda: "Observa la secuencia y repítela con clic o con las teclas 1–4.", ayudaTactil: "Observa la secuencia y repítela tocando los colores." },
};
