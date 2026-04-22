import * as THREE from "three";

export default function getStarfield({ numStars = 1600 } = {}) {
  function randomSpherePoint() {
    const radius = Math.random() * 25 + 25;
    const u = Math.random(), v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    return {
      pos: new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      ),
      hue: 0.6
    };
  }

  const verts = [], colors = [];
  for (let i = 0; i < numStars; i++) {
    const p = randomSpherePoint();
    const col = new THREE.Color().setHSL(p.hue, 0.2, Math.random());
    verts.push(p.pos.x, p.pos.y, p.pos.z);
    colors.push(col.r, col.g, col.b);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute("color",    new THREE.Float32BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.2, vertexColors: true,
    map: new THREE.TextureLoader().load("./textures/stars/circle.png"),
    transparent: true
  });
  return new THREE.Points(geo, mat);
}
