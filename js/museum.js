import * as THREE from "three";
import { sala1Historia } from "./salas/sala1.js";
import { sala2Cognitivos } from "./salas/sala2.js";
import { sala3Sociales } from "./salas/sala3.js";
import { sala4Estadisticas } from "./salas/sala4.js";
import { sala5Galeria } from "./salas/sala5.js";

export function initMuseum({ canvas }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200);
  camera.position.set(0, 1.6, 6);

  const clock = new THREE.Clock();
  let raf;

  const salas = [sala1Historia, sala2Cognitivos, sala3Sociales, sala4Estadisticas, sala5Galeria];
  let salaActual = 0;
  let salaInstance = null;

  function limpiarEscena() {
    const toRemove = [];
    scene.traverse(obj => toRemove.push(obj));
    toRemove.forEach(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
    while (scene.children.length) scene.remove(scene.children[0]);
    scene.background = null;
    scene.fog = null;
  }

  function cargarSala(idx) {
    if (salaInstance?.dispose) salaInstance.dispose();
    limpiarEscena();

    camera.position.set(0, 1.6, 6);
    camera.lookAt(0, 1.2, 0);

    // Ocultar panel HTML anterior
    document.querySelectorAll(".sala-panel").forEach(p => p.style.display = "none");

    salaInstance = salas[idx](scene, camera, renderer);
    actualizarUI(idx);
  }

  const overlay = document.getElementById("transOverlay");

  function irA(idx) {
    overlay.classList.add("visible");
    setTimeout(() => {
      salaActual = idx;
      cargarSala(idx);
      setTimeout(() => overlay.classList.remove("visible"), 100);
    }, 500);
  }

  function actualizarUI(idx) {
    document.querySelectorAll(".dot").forEach((d, i) => d.classList.toggle("active", i === idx));
    document.getElementById("salaLabel").textContent = `${idx + 1} / ${salas.length}`;
    document.getElementById("btnPrev").disabled = idx === 0;
    document.getElementById("btnNext").disabled = idx === salas.length - 1;

    const nombres = ["Historia", "Cognitivo", "Social", "Estadísticas", "Galería"];
    document.getElementById("salaNombre").textContent = nombres[idx];
  }

  document.getElementById("btnPrev").addEventListener("click", () => { if (salaActual > 0) irA(salaActual - 1); });
  document.getElementById("btnNext").addEventListener("click", () => { if (salaActual < salas.length - 1) irA(salaActual + 1); });
  document.querySelectorAll(".dot").forEach((d, i) => d.addEventListener("click", () => irA(i)));

  window.addEventListener("keydown", e => {
    if (e.key === "ArrowRight" && salaActual < salas.length - 1) irA(salaActual + 1);
    if (e.key === "ArrowLeft"  && salaActual > 0) irA(salaActual - 1);
  });

  function animate() {
    raf = requestAnimationFrame(animate);
    const dt = clock.getDelta();
    const t  = clock.elapsedTime;
    if (salaInstance?.update) salaInstance.update(dt, t);
    renderer.render(scene, camera);
  }

  function onResize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
  }
  addEventListener("resize", onResize);

  cargarSala(0);
  animate();

  return {
    destroy() {
      cancelAnimationFrame(raf);
      removeEventListener("resize", onResize);
      if (salaInstance?.dispose) salaInstance.dispose();
      renderer.dispose();
    }
  };
}
