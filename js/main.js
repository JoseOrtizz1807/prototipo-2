import { initEarthBackdrop } from "./earthBackdrop.js";
import { initMuseumWalk }   from "./museum_walk.js?v=3200";
import { initMuseum }       from "./museum.js";
import { guardarRespuesta, escucharResenas, firebaseConfigurado } from "./firebase.js";

let earth    = null;
let museum   = null;
let timeline = null;

const menuUI     = document.getElementById("menuUI");
const museumUI   = document.getElementById("museumUI");
const timelineUI = document.getElementById("timelineUI");
const aboutPanel = document.getElementById("aboutPanel");
const earthCvs   = document.getElementById("earthScene");
const musCvs     = document.getElementById("museumCanvas");
const overlay    = document.getElementById("transOverlay");

function fade(fn) {
  overlay.classList.add("visible");
  setTimeout(() => { fn(); setTimeout(() => overlay.classList.remove("visible"), 220); }, 520);
}

// ── Menú ─────────────────────────────────────────────
function showMenu() {
  if (!earth) {
    earth = initEarthBackdrop({
      canvas: earthCvs,
      withOrbitingShapes: true,
      withMeteors: true,
      withSpaceship: false,
    });
  }
  menuUI.style.display   = "flex";
  museumUI.style.display = "none";
  timelineUI.style.display = "none";
  aboutPanel.classList.remove("active");
  earthCvs.style.display = "block";
  musCvs.style.display   = "none";
  document.body.classList.remove("museo-activo");
}

// ── Museo caminable ───────────────────────────────────
async function enterMuseum() {
  if (earth) { earth.destroy(); earth = null; }
  menuUI.style.display   = "none";
  museumUI.style.display = "flex";
  earthCvs.style.display = "none";
  musCvs.style.display   = "block";
  // initMuseumWalk es async (espera a que el usuario pulse "Entrar")
  museum = await initMuseumWalk({ canvas: musCvs });
}

// ── Línea de tiempo ───────────────────────────────────
function enterTimeline() {
  if (earth) { earth.destroy(); earth = null; }
  menuUI.style.display     = "none";
  timelineUI.style.display = "flex";
  earthCvs.style.display   = "none";
  musCvs.style.display     = "block";
  if (!timeline) timeline  = initMuseum({ canvas: musCvs });
}

// ── Panel Sobre mí ────────────────────────────────────
function openAbout() {
  aboutPanel.classList.add("active");
}
function closeAbout() {
  aboutPanel.classList.remove("active");
}

// ── Salidas ───────────────────────────────────────────
function exitMuseum() {
  document.exitPointerLock?.();
  if (museum) { museum.destroy(); museum = null; }
  showMenu();
}

// ── Créditos ──────────────────────────────────────────────
const creditsPanel = document.getElementById("creditsPanel");
const btnCredits   = document.getElementById("btnCredits");
const btnCloseCredits = document.getElementById("btnCloseCredits");

btnCredits?.addEventListener("click", e => {
  e.preventDefault();
  creditsPanel?.classList.add("active");
});
btnCloseCredits?.addEventListener("click", () => {
  creditsPanel?.classList.remove("active");
});


// ── Encuesta ──────────────────────────────────────────
const encuestaPanel = document.getElementById("encuestaPanel");
const btnEstudio    = document.getElementById("btnEstudio");
const btnCloseEnc   = document.getElementById("btnCloseEncuesta");
const encNext       = document.getElementById("enc-next");
const encPrev       = document.getElementById("enc-prev");
const progFill      = document.getElementById("enc-progress-fill");
const progText      = document.getElementById("enc-progress-text");
const TOTAL_STEPS   = 11;
let currentStep     = 0;
const answers       = {};

function encGetStep(n) { return document.querySelector(`.enc-step[data-step="${n}"]`); }

function encUpdateProgress() {
  const pct = currentStep === 0 ? 5 : Math.round((currentStep / (TOTAL_STEPS-1)) * 100);
  progFill.style.width = pct + "%";
  progText.textContent = currentStep === 0 ? "DATOS PERSONALES" : `PREGUNTA ${currentStep} DE ${TOTAL_STEPS-1}`;
  encPrev.style.display = currentStep > 0 ? "block" : "none";
  encNext.textContent   = currentStep === TOTAL_STEPS - 1 ? "ENVIAR ✓" : "SIGUIENTE →";
}

function encPrepararPasoFinal() {
  const wrap = document.getElementById("enc-nombre-wrap");
  if (!wrap) return;
  const tieneNombre = !!(answers.nombre || "").trim();
  wrap.style.display = tieneNombre ? "flex" : "none";
  if (tieneNombre) {
    const partes = answers.nombre.trim().split(/\s+/).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());
    document.getElementById("enc-nombre-preview").textContent = partes[0] + (partes.length > 1 ? " " + (partes.length >= 4 ? partes[2] : partes[1]).charAt(0) + "." : "");
  }
}

function encGoTo(n) {
  encGetStep(currentStep).style.display = "none";
  currentStep = n;
  encGetStep(currentStep).style.display = "block";
  if (currentStep === TOTAL_STEPS - 1) encPrepararPasoFinal();
  encUpdateProgress();
}

function encCollectCurrent() {
  if(currentStep === 0) {
    const nombre = document.getElementById('enc-nombre')?.value?.trim();
    const edad   = document.getElementById('enc-edad')?.value?.trim();
    if(!edad) { alert('Por favor indica tu edad para continuar.'); return false; }
    answers.nombre = nombre || ""; answers.edad = edad;
    const gen = document.querySelector('input[name="genero"]:checked');
    if(gen) answers.genero = gen.value;
    return true;
  }
  const step = encGetStep(currentStep);
  const radios    = step.querySelectorAll(`input[type=radio]:checked`);
  const checks    = step.querySelectorAll(`input[type=checkbox]:checked`);
  const textarea  = step.querySelector("textarea");
  if (radios.length)  answers[`p${currentStep}`] = radios[0].value;
  if (checks.length)  answers[`p${currentStep}`] = [...checks].map(c=>c.value).join(",");
  if (textarea)       answers[`p${currentStep}`] = textarea.value;
  if (currentStep === TOTAL_STEPS - 1) {
    answers.publicar = !!document.getElementById("enc-publicar")?.checked;
    answers.mostrarNombre = answers.publicar && !!answers.nombre && !!document.getElementById("enc-mostrar-nombre")?.checked;
    // Aviso: escribió un comentario pero no autorizó publicarlo (solo la primera vez)
    const aviso = document.getElementById("enc-aviso");
    if ((answers[`p${currentStep}`] || "").trim() && !answers.publicar && aviso && aviso.style.display !== "block") {
      aviso.style.display = "block";
      return false;
    }
  }
}

encNext.addEventListener("click", () => {
  const ok = encCollectCurrent();
  if(ok === false) return;
  if (currentStep < TOTAL_STEPS - 1) {
    encGoTo(currentStep + 1);
  } else {
    // Enviar — copia local de respaldo + base de datos (Firebase)
    answers.timestamp = new Date().toISOString();
    try {
      const saved = JSON.parse(localStorage.getItem("enc_responses") || "[]");
      saved.push(answers);
      localStorage.setItem("enc_responses", JSON.stringify(saved));
    } catch (e) {}
    const estado = document.getElementById("enc-envio-estado");
    if (estado) estado.textContent = firebaseConfigurado() ? "Enviando respuestas…" : "";
    guardarRespuesta({ ...answers })
      .then(r => { if (estado && r.ok) estado.textContent = "✓ Respuestas guardadas en la base de datos del estudio."; })
      .catch(err => {
        console.warn("No se pudo guardar la encuesta:", err);
        if (estado) estado.textContent = "No se pudo conectar con el servidor; tus respuestas quedaron guardadas en este navegador.";
      });
    // Mostrar pantalla de gracias
    document.getElementById("enc-form").style.display = "none";
    encNext.style.display = "none";
    encPrev.style.display = "none";
    progFill.style.width  = "100%";
    progText.style.display = "none";
    document.getElementById("enc-result").style.display = "block";
  }
});

encPrev.addEventListener("click", () => {
  if (currentStep > 0) encGoTo(currentStep - 1);
});

btnEstudio?.addEventListener("click", e => {
  e.preventDefault();
  // Reset encuesta
  currentStep = 0;
  document.querySelectorAll(".enc-step").forEach((s,i) => s.style.display = i===0?"block":"none");
  document.getElementById("enc-form").style.display = "block";
  document.getElementById("enc-result").style.display = "none";
  encNext.style.display = "block";
  const pub = document.getElementById("enc-publicar"); if (pub) pub.checked = false;
  const mn = document.getElementById("enc-mostrar-nombre"); if (mn) mn.checked = false;
  const av = document.getElementById("enc-aviso"); if (av) av.style.display = "none";
  const est = document.getElementById("enc-envio-estado"); if (est) est.textContent = "";
  Object.keys(answers).forEach(k => delete answers[k]);
  encUpdateProgress();
  encuestaPanel.classList.add("active");
});

btnCloseEnc?.addEventListener("click", () => encuestaPanel.classList.remove("active"));

// ── Reseñas en tiempo real ────────────────────────────
const resenasPanel = document.getElementById("resenasPanel");
let _resUnsub = null, _resPrimera = true;
const _resLlegada = new Map();   // id → momento en que apareció (0 = ya estaba al abrir)

function _estrellas(v) {
  const n = Math.round(v || 0);
  let h = "";
  for (let i = 1; i <= 5; i++) h += i <= n ? "★" : '<span class="off">★</span>';
  return h;
}
function _hace(ts) {
  const d = ts?.toDate ? ts.toDate() : (ts ? new Date(ts) : new Date());
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1) return "hace un momento";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60); if (h < 24) return `hace ${h} h`;
  const dd = Math.floor(h / 24); return dd === 1 ? "hace 1 día" : `hace ${dd} días`;
}
const _REC = { si_definitivamente: "Lo recomienda totalmente", si_probablemente: "Probablemente lo recomienda", tal_vez: "Tal vez lo recomiende", no: "No lo recomendaría" };

function _pintarResenas(docs) {
  const total = docs.length;
  const vals = docs.map(d => d.valoracion).filter(v => v > 0);
  const prom = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  const recs = docs.filter(d => d.recomienda).length;
  const si = docs.filter(d => (d.recomienda || "").startsWith("si")).length;
  document.getElementById("res-total").textContent = total;
  document.getElementById("res-prom").textContent = vals.length ? prom.toFixed(1) + "★" : "–";
  document.getElementById("res-rec").textContent = recs ? Math.round(si / recs * 100) + "%" : "–";

  docs.forEach(d => { if (!_resLlegada.has(d.id)) _resLlegada.set(d.id, _resPrimera ? 0 : Date.now()); });
  const lista = document.getElementById("res-lista");
  const conTexto = docs.filter(d => (d.comentario || "").trim());
  lista.innerHTML = "";
  if (!conTexto.length) {
    lista.innerHTML = '<p class="res-vacio">Todavía no hay comentarios publicados. ¡Recorre el museo y sé el primero en dejar tu reseña desde «Participar en el Estudio»!</p>';
  }
  conTexto.forEach(d => {
    const card = document.createElement("div");
    const t0 = _resLlegada.get(d.id);
    card.className = "res-card" + (t0 && Date.now() - t0 < 10000 ? " nueva" : "");
    const top = document.createElement("div"); top.className = "res-top";
    const st = document.createElement("div"); st.className = "res-stars"; st.innerHTML = _estrellas(d.valoracion);
    const meta = document.createElement("div"); meta.className = "res-meta";
    meta.textContent = `${d.autor || "Visitante"}${d.rangoEdad ? " · " + d.rangoEdad + " años" : ""} · ${_hace(d.fecha)}`;
    top.append(st, meta);
    const txt = document.createElement("div"); txt.className = "res-txt"; txt.textContent = d.comentario;
    card.append(top, txt);
    if (_REC[d.recomienda]) { const b = document.createElement("span"); b.className = "res-badge"; b.textContent = _REC[d.recomienda]; card.append(b); }
    lista.append(card);
  });
  _resPrimera = false;
}

async function abrirResenas() {
  resenasPanel.classList.add("active");
  if (_resUnsub) return;
  const dot = document.getElementById("res-live-dot"), txt = document.getElementById("res-live-text");
  _resUnsub = await escucharResenas(docs => {
    dot.classList.add("res-live"); txt.textContent = "EN VIVO · SE ACTUALIZA AUTOMÁTICAMENTE";
    _pintarResenas(docs);
  }, err => {
    _resUnsub = null;
    txt.textContent = err === "sin-config" ? "BASE DE DATOS NO CONFIGURADA" : "SIN CONEXIÓN";
    document.getElementById("res-lista").innerHTML = err === "sin-config"
      ? '<p class="res-vacio">Las reseñas estarán disponibles cuando se configure la base de datos del estudio (ver FIREBASE_SETUP.md).</p>'
      : '<p class="res-vacio">No se pudieron cargar las reseñas. Revisa tu conexión e inténtalo de nuevo.</p>';
  });
}

document.getElementById("btnResenas")?.addEventListener("click", e => { e.preventDefault(); abrirResenas(); });
document.getElementById("btnVerResenas")?.addEventListener("click", () => { encuestaPanel.classList.remove("active"); abrirResenas(); });
document.getElementById("btnCloseResenas")?.addEventListener("click", () => resenasPanel.classList.remove("active"));
document.addEventListener("keydown", e => { if (e.key === "Escape") resenasPanel?.classList.remove("active"); });

function exitTimeline() {
  if (timeline) { timeline.destroy(); timeline = null; }
  document.querySelectorAll(".sala-panel").forEach(p => p.style.display = "none");
  showMenu();
}

// ── Eventos ───────────────────────────────────────────
document.getElementById("btnStart").addEventListener("click", e => {
  e.preventDefault(); fade(enterMuseum);
});
document.getElementById("btnTimeline").addEventListener("click", e => {
  e.preventDefault(); fade(enterTimeline);
});
document.getElementById("btnAbout").addEventListener("click", e => {
  e.preventDefault(); openAbout();
});
document.getElementById("btnCloseAbout").addEventListener("click", closeAbout);
document.getElementById("btnBackMenu").addEventListener("click", () => fade(exitMuseum));
document.getElementById("btnBackMenuTimeline").addEventListener("click", () => fade(exitTimeline));

// Cerrar panel con ESC
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && aboutPanel.classList.contains("active")) closeAbout();
});

showMenu();
