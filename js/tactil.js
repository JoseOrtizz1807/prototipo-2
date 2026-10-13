// ═══════════════════════════════════════════════════════════════
//  CONTROLES TÁCTILES (celular y tableta)
//  · Mitad izquierda: joystick virtual para caminar.
//  · Mitad derecha: arrastrar para mirar.
//  · Botones: mapa (M), reto (Q), hablar con BIT (R), brillo (B).
// ═══════════════════════════════════════════════════════════════
export const ES_TACTIL = matchMedia("(pointer: coarse)").matches || (navigator.maxTouchPoints > 0 && "ontouchstart" in window);

const pulsar = code => {
  window.dispatchEvent(new KeyboardEvent("keydown", { code, key: code, bubbles: true }));
  setTimeout(() => window.dispatchEvent(new KeyboardEvent("keyup", { code, key: code, bubbles: true })), 60);
};

export function crearControlesTactiles({ controls }) {
  if (!ES_TACTIL) return { destroy() {} };
  const capa = document.createElement("div");
  capa.id = "tactil";
  capa.style.cssText = "position:fixed;inset:0;z-index:45;touch-action:none;user-select:none;-webkit-user-select:none";
  const base = document.createElement("div");
  base.style.cssText = `position:fixed;width:120px;height:120px;border-radius:50%;border:2px solid rgba(0,255,238,.45);
    background:rgba(0,255,238,.07);display:none;pointer-events:none;z-index:46`;
  const palo = document.createElement("div");
  palo.style.cssText = `position:absolute;left:35px;top:35px;width:50px;height:50px;border-radius:50%;background:rgba(0,255,238,.55);
    box-shadow:0 0 18px rgba(0,255,238,.6)`;
  base.appendChild(palo);
  const pista = document.createElement("div");
  pista.style.cssText = `position:fixed;left:24px;bottom:96px;font:11px 'Space Mono',monospace;color:rgba(200,240,235,.75);pointer-events:none;
    background:rgba(0,0,0,.45);padding:6px 10px;border-radius:8px;z-index:46`;
  pista.textContent = "◐ Izquierda: caminar · Derecha: mirar";
  setTimeout(() => (pista.style.opacity = "0", pista.style.transition = "opacity 1s"), 9000);

  const botones = document.createElement("div");
  botones.style.cssText = "position:fixed;right:12px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:10px;z-index:47";
  [["🗺️", "KeyM", "Mapa"], ["❓", "KeyQ", "Reto"], ["💬", "KeyR", "BIT"], ["☀️", "KeyB", "Brillo"]].forEach(([ico, code, txt]) => {
    const b = document.createElement("button");
    b.innerHTML = `${ico}<span style="display:block;font:8px Orbitron,sans-serif;letter-spacing:.08em;margin-top:2px">${txt}</span>`;
    b.style.cssText = `width:56px;height:56px;border-radius:14px;border:1px solid rgba(0,255,238,.4);background:rgba(4,8,16,.7);
      color:#e6f2ef;font-size:20px;line-height:1;touch-action:manipulation;backdrop-filter:blur(6px)`;
    b.addEventListener("pointerdown", e => { e.stopPropagation(); e.preventDefault(); pulsar(code); });
    botones.appendChild(b);
  });
  document.body.append(capa, base, pista, botones);

  let mover = null, mirar = null;
  const R = 46;
  capa.addEventListener("pointerdown", e => {
    if (window.__guiaBlocking) return;
    if (e.clientX < innerWidth * 0.45 && !mover) {
      mover = { id: e.pointerId, x: e.clientX, y: e.clientY };
      base.style.left = e.clientX - 60 + "px"; base.style.top = e.clientY - 60 + "px"; base.style.display = "block";
    } else if (!mirar) mirar = { id: e.pointerId, x: e.clientX, y: e.clientY };
    capa.setPointerCapture?.(e.pointerId);
  });
  capa.addEventListener("pointermove", e => {
    if (mover && e.pointerId === mover.id) {
      let dx = e.clientX - mover.x, dy = e.clientY - mover.y; const d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      palo.style.transform = `translate(${dx}px,${dy}px)`;
      controls.setMover(dx / R, -dy / R);
    } else if (mirar && e.pointerId === mirar.id) {
      controls.mirar(e.clientX - mirar.x, e.clientY - mirar.y, 0.0042);
      mirar.x = e.clientX; mirar.y = e.clientY;
    }
  });
  const soltar = e => {
    if (mover && e.pointerId === mover.id) { mover = null; base.style.display = "none"; palo.style.transform = ""; controls.setMover(0, 0); }
    if (mirar && e.pointerId === mirar.id) mirar = null;
  };
  capa.addEventListener("pointerup", soltar);
  capa.addEventListener("pointercancel", soltar);

  // Ocultar la capa mientras hay paneles abiertos (mapa, retos, minijuegos) para que se puedan tocar
  const vigia = setInterval(() => {
    const bloq = !!window.__guiaBlocking;
    capa.style.pointerEvents = bloq ? "none" : "auto";
    botones.style.display = window.__juegoActivo ? "none" : "flex";
    if (bloq && mover) { mover = null; base.style.display = "none"; controls.setMover(0, 0); }
  }, 200);

  return {
    destroy() { clearInterval(vigia); [capa, base, pista, botones].forEach(n => n.remove()); },
  };
}
