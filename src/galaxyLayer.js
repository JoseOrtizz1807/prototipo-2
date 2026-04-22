import * as THREE from "three";

/* Sprite circular generado en canvas: evita depender de archivos externos */
function makePointTexture(size = 128) {
  const cvs = document.createElement("canvas");
  cvs.width = cvs.height = size;
  const ctx = cvs.getContext("2d");
  const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  g.addColorStop(0.00, "rgba(255,255,255,1)");
  g.addColorStop(0.55, "rgba(255,255,255,0.25)");
  g.addColorStop(1.00, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(size/2, size/2, size/2, 0, Math.PI*2); ctx.fill();
  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Crea una galaxia espiral y la añade a la escena.
 * Devuelve { object, update(dt), dispose() }
 */
export function addGalaxyLayer(scene, options = {}) {
  const {
    count = 90000,
    radius = 24,
    branches = 6,
    spin = 1.8,
    randomness = 0.35,
    randomnessPow = 2.0,
    colorInside = 0xffa575,
    colorOutside = 0x311599,
    size = 0.08,
    position = new THREE.Vector3(0, -2, -40)
  } = options;

  const positions = new Float32Array(count * 3);
  const colors    = new Float32Array(count * 3);
  const cIn  = new THREE.Color(colorInside);
  const cOut = new THREE.Color(colorOutside);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r = Math.random() * radius;
    const branchAngle = (i % branches) / branches * Math.PI * 2;
    const spinAngle   = r * spin;

    const rand = Math.pow(Math.random(), randomnessPow) * randomness * r;
    const rndS = () => (Math.random() < 0.5 ? 1 : -1);

    positions[i3    ] = Math.cos(branchAngle + spinAngle) * r + rand * rndS();
    positions[i3 + 1] = rand * 0.5 * rndS();
    positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * r + rand * rndS();

    const mix = cIn.clone().lerp(cOut, r / radius);
    colors[i3    ] = mix.r;
    colors[i3 + 1] = mix.g;
    colors[i3 + 2] = mix.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color",    new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size,
    sizeAttenuation: true,
    map: makePointTexture(128),
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false
  });

  const pts = new THREE.Points(geo, mat);
  pts.rotation.x = Math.PI * 0.5; // disco en XZ

  const group = new THREE.Group();
  group.add(pts);
  group.position.copy(position);
  group.renderOrder = -20; // pinta antes que el resto (fondo)

  scene.add(group);

  return {
    object: group,
    update(dt) {
      pts.rotation.z += 0.00018; // giro suave
    },
    dispose() {
      scene.remove(group);
      pts.geometry.dispose();
      pts.material.map?.dispose?.();
      pts.material.dispose();
    }
  };
}
