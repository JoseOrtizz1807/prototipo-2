import { initEarthBackdrop } from "./earthBackdrop.js";
import { initMuseumWalk }   from "./museum_walk.js";
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