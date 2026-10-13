// ═══════════════════════════════════════════════════════════════
//  VESTÍBULO — sala circular de inicio con un portal por época.
//  Convierte el recorrido en una estructura en estrella: el visitante
//  elige por qué época empezar, puede volver al vestíbulo desde el
//  inicio de cada zona y saltar a otra en cualquier orden.
// ═══════════════════════════════════════════════════════════════
import * as THREE from "three";

export const HUB = { x: 0, z: 70, r: 9 };          // centro y radio de la sala
export const HUB_SPAWN = { x: 0, z: HUB.z + 5.5 }; // punto de aparición (mirando al -Z)

function labelTex(titulo, sub, items, hex) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "rgba(3,6,12,0.88)"; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = hex; g.lineWidth = 4; g.strokeRect(6, 6, 500, 244);
  g.fillStyle = hex; g.font = "700 46px Orbitron, Arial"; g.textAlign = "center";
  g.fillText(titulo.toUpperCase(), 256, 82);
  g.fillStyle = "#e6f2ef"; g.font = "30px 'Space Mono', monospace"; g.fillText(sub, 256, 128);
  g.fillStyle = "#9fb3ad"; g.font = "22px 'Space Mono', monospace";
  items.slice(0, 3).forEach((t, i) => g.fillText(t, 256, 172 + i * 28));
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function titleTex() {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 220;
  const g = c.getContext("2d");
  g.textAlign = "center";
  g.fillStyle = "#00ffee"; g.font = "700 64px Orbitron, Arial"; g.fillText("VESTÍBULO", 512, 90);
  g.fillStyle = "#e6f2ef"; g.font = "32px 'Space Mono', monospace";
  g.fillText("Elige por qué época empezar: camina hacia un portal", 512, 150);
  g.fillStyle = "#9fb3ad"; g.font = "26px 'Space Mono', monospace";
  g.fillText("M: mapa  ·  Q: reto  ·  R: BIT  ·  E: jugar en las salas", 512, 198);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildVestibulo(scene, zonas, H) {
  const grp = new THREE.Group(); grp.position.set(HUB.x, 0, HUB.z); scene.add(grp);

  // Suelo, paredes y techo
  const floor = new THREE.Mesh(new THREE.CircleGeometry(HUB.r, 64),
    new THREE.MeshStandardMaterial({ color: 0x03050b, roughness: 0.05, metalness: 0.95 }));
  floor.rotation.x = -Math.PI / 2; grp.add(floor);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(HUB.r, HUB.r, H, 64, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x070a14, roughness: 0.4, metalness: 0.3, side: THREE.BackSide }));
  wall.position.y = H / 2; grp.add(wall);
  const ceil = new THREE.Mesh(new THREE.CircleGeometry(HUB.r, 64),
    new THREE.MeshStandardMaterial({ color: 0x02040a, emissive: 0x050a20, emissiveIntensity: 0.6 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = H; grp.add(ceil);
  [[0.02, 0x00ffee, 1.6], [H - 0.3, 0x2244ff, 1.2]].forEach(([y, c, e]) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(HUB.r - 0.05, 0.03, 8, 96),
      new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: e }));
    ring.rotation.x = Math.PI / 2; ring.position.y = y; grp.add(ring);
  });

  // Holograma central (globo de alambre que gira) + rótulo
  const holo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 2),
    new THREE.MeshBasicMaterial({ color: 0x00ffee, wireframe: true, transparent: true, opacity: 0.35 }));
  holo.position.set(0, 0.62, 0); grp.add(holo);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.05, 0.12, 48),
    new THREE.MeshStandardMaterial({ color: 0x05070e, roughness: 0.05, metalness: 0.95 }));
  base.position.y = 0.06; grp.add(base);
  const title = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1),
    new THREE.MeshBasicMaterial({ map: titleTex(), transparent: true }));
  title.position.set(0, 3.55, 0.2); grp.add(title);

  const luz = new THREE.PointLight(0x66ccff, 3.0, 16); luz.position.set(0, H - 0.6, 0); grp.add(luz);

  // Portales: semicírculo frente al punto de aparición
  const portales = [];
  const n = zonas.length + 1;                       // 6 épocas + monumento final
  for (let i = 0; i < n; i++) {
    const zona = zonas[i];
    const ang = THREE.MathUtils.degToRad(-80 + (160 * i) / (n - 1));
    const R = HUB.r - 1.25;
    const px = Math.sin(ang) * R, pz = -Math.cos(ang) * R;
    const col = zona ? zona.color : 0xc8a84b, hex = zona ? zona.hex : "#e8c870";
    const pg = new THREE.Group(); pg.position.set(px, 0, pz); pg.lookAt(0, 0, 0); grp.add(pg);

    const arco = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.07, 10, 48, Math.PI),
      new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.1 }));
    arco.position.y = 1.35; pg.add(arco);
    [-1.05, 1.05].forEach(x => {
      const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.35, 10),
        new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.1 }));
      pil.position.set(x, 0.675, 0); pg.add(pil);
    });
    const velo = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.35),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }));
    velo.position.y = 1.18; pg.add(velo);
    const cartel = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.95), new THREE.MeshBasicMaterial({
      map: labelTex(zona ? zona.titulo : "Final", zona ? zona.subtitulo : "Monumento de cierre",
        zona ? zona.vitrinas.map(v => v.label) : ["Gracias por explorar"], hex), transparent: true }));
    cartel.position.set(0, 3.0, 0.02); pg.add(cartel);

    portales.push({ i, x: HUB.x + px, z: HUB.z + pz, velo, arco });
  }

  function update(t) {
    holo.rotation.y = t * 0.35; holo.rotation.x = Math.sin(t * 0.3) * 0.2;
    portales.forEach((p, k) => { p.velo.material.opacity = 0.08 + Math.sin(t * 2 + k) * 0.04; });
  }
  return { portales, update };
}

// Portal de regreso al vestíbulo al inicio de cada zona (pared derecha, libre de vitrinas)
export function buildPortalesRegreso(scene, zonas, W) {
  const tex = (() => {
    const c = document.createElement("canvas"); c.width = 512; c.height = 160;
    const g = c.getContext("2d"); g.textAlign = "center";
    g.fillStyle = "rgba(3,6,12,.85)"; g.fillRect(0, 0, 512, 160);
    g.strokeStyle = "#00ffee"; g.lineWidth = 4; g.strokeRect(5, 5, 502, 150);
    g.fillStyle = "#00ffee"; g.font = "700 44px Orbitron, Arial"; g.fillText("↩ VESTÍBULO", 256, 72);
    g.fillStyle = "#c8dcd6"; g.font = "24px 'Space Mono', monospace"; g.fillText("acércate para cambiar de época", 256, 120);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const out = [];
  zonas.forEach(z => {
    const zz = z.zStart - 6;
    const g = new THREE.Group(); g.position.set(W / 2 - 0.05, 0, zz); g.rotation.y = -Math.PI / 2; scene.add(g);
    const marco = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.05, 8, 40, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x00ffee, emissive: 0x00ffee, emissiveIntensity: 2 }));
    marco.position.y = 1.15; g.add(marco);
    const velo = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.95),
      new THREE.MeshBasicMaterial({ color: 0x00ffee, transparent: true, opacity: 0.12, depthWrite: false }));
    velo.position.y = 0.98; g.add(velo);
    const cartel = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.47), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    cartel.position.y = 2.35; g.add(cartel);
    out.push({ z: zz });
  });
  return out;
}
