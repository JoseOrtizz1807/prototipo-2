import { initEarthBackdrop } from "./earthBackdrop.js";
import { initMuseumWalk }   from "./museum_walk.js?v=3200";
import { initMuseum }       from "./museum.js";

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
// URL de la aplicación web de Google Apps Script (ver INSTRUCCIONES_GOOGLE_SHEETS.md).
// Déjala vacía ("") para guardar solo en el navegador.
const SHEETS_URL    = "";  // ← pega aquí la URL /exec de tu Apps Script
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

function encGoTo(n) {
  encGetStep(currentStep).style.display = "none";
  currentStep = n;
  encGetStep(currentStep).style.display = "block";
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
}

encNext.addEventListener("click", () => {
  const ok = encCollectCurrent();
  if(ok === false) return;
  if (currentStep < TOTAL_STEPS - 1) {
    encGoTo(currentStep + 1);
  } else {
    // Enviar — copia local de respaldo + envío a Google Sheets
    answers.timestamp = new Date().toISOString();
    answers.userAgent  = navigator.userAgent;
    try {
      const saved = JSON.parse(localStorage.getItem("enc_responses") || "[]");
      saved.push(answers);
      localStorage.setItem("enc_responses", JSON.stringify(saved));
    } catch (e) {}
    if (SHEETS_URL) {
      fetch(SHEETS_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(answers)
      }).catch(err => console.warn("No se pudo enviar la encuesta:", err));
    }
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
  encUpdateProgress();
  encuestaPanel.classList.add("active");
});

btnCloseEnc?.addEventListener("click", () => encuestaPanel.classList.remove("active"));

}
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