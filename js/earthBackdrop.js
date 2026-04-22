import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { GLTFLoader }   from "jsm/loaders/GLTFLoader.js";
import getStarfield from "../src/getStarfield.js";
import { getFresnelMat } from "../src/getFresnelMat.js";



export function initEarthBackdrop({
  canvas = document.getElementById("earthScene"),
  withOrbitingShapes = true,
  withMeteors = true,
  withSpaceship = true,
  spaceshipUrl = "./models/spaceship.glb"
 
} = {}) {

  // Renderer transparente
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

  const scene = new THREE.Scene(); // sin background para ver el body
  const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 5);

  // —— AUDIO INTRO ÉPICO ——

// Crear listener y añadirlo a la cámara
const listener = new THREE.AudioListener();
camera.add(listener);

// Crear audio global
const introSound = new THREE.Audio(listener);

// Cargar audio con manejo robusto de carga asíncrona
const audioLoader = new THREE.AudioLoader();
let audioReady = false;
let pendingPlay = false;

audioLoader.load(
  "../assets/audio/halo.mp3",
  (buffer) => {
    introSound.setBuffer(buffer);
    introSound.setLoop(false);
    introSound.setVolume(0.6);
    audioReady = true;
    // Si el usuario ya hizo click antes de que terminara de cargar
    if (pendingPlay && !introSound.isPlaying) {
      if (listener.context.state === 'suspended') listener.context.resume();
      introSound.play();
    }
  },
  undefined,
  (err) => {
    console.error("Error cargando el audio:", err);
  }
);

// Función para iniciar audio tras interacción del usuario
function startIntroAudio() {
  if (listener.context.state === 'suspended') {
    listener.context.resume();
  }
  if (audioReady && !introSound.isPlaying) {
    introSound.play();
  } else if (!audioReady) {
    // Audio aún cargando — reproducir cuando esté listo
    pendingPlay = true;
  }
  window.removeEventListener("click", startIntroAudio);
}

// Espera click para evitar bloqueo de autoplay
window.addEventListener("click", startIntroAudio);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.enablePan = false;
  controls.minDistance = 3.5;    controls.maxDistance = 8;

  const clock = new THREE.Clock();

  // Tierra
  const earthGroup = new THREE.Group();
  earthGroup.rotation.z = -23.4 * Math.PI/180;
  scene.add(earthGroup);

  const loader = new THREE.TextureLoader();
  const geom = new THREE.IcosahedronGeometry(1, 12);

  const matEarth = new THREE.MeshPhongMaterial({
    map:         loader.load("./textures/00_earthmap1k.jpg"),
    specularMap: loader.load("./textures/02_earthspec1k.jpg"),
    bumpMap:     loader.load("./textures/01_earthbump1k.jpg"),
    bumpScale:   0.04
  });
  const earthMesh = new THREE.Mesh(geom, matEarth);
  earthGroup.add(earthMesh);

  const matLights = new THREE.MeshBasicMaterial({
    map: loader.load("./textures/03_earthlights1k.jpg"),
    blending: THREE.AdditiveBlending
  });
  const lightsMesh = new THREE.Mesh(geom, matLights);
  earthGroup.add(lightsMesh);

  const matClouds = new THREE.MeshStandardMaterial({
    map: loader.load("./textures/04_earthcloudmap.jpg"),
    transparent:true, opacity:0.8,
    blending: THREE.AdditiveBlending,
    alphaMap: loader.load("./textures/05_earthcloudmaptrans.jpg")
  });
  const cloudsMesh = new THREE.Mesh(geom, matClouds);
  cloudsMesh.scale.setScalar(1.003);
  earthGroup.add(cloudsMesh);

  const fresnelMat = getFresnelMat();
  const glowMesh = new THREE.Mesh(geom, fresnelMat);
  glowMesh.scale.setScalar(1.01);
  earthGroup.add(glowMesh);

  // Estrellas 3D
  const stars = getStarfield({ numStars: 1600 });
  scene.add(stars);

  // Luz sol
  const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
  sunLight.position.set(-2, 0.5, 1.5);
  scene.add(sunLight);

  // Figuras orbitando (estética menú)
  let shapesGroup;
  if (withOrbitingShapes) {
    shapesGroup = new THREE.Group(); scene.add(shapesGroup);
    const geos = [
      new THREE.TorusGeometry(0.6, 0.2, 16, 100),
      new THREE.IcosahedronGeometry(0.75, 0),
      new THREE.TorusKnotGeometry(0.6, 0.18, 120, 18),
      new THREE.BoxGeometry(0.85, 0.85, 0.85)
    ];
    const colors = [0x1D8F6E, 0x58f0c4, 0x16906a, 0x94ffe4];
    for (let i=0;i<8;i++){
      const m = new THREE.Mesh(
        geos[i%geos.length],
        new THREE.MeshStandardMaterial({
          color: colors[i%colors.length],
          metalness:.55, roughness:.28,
          emissive: 0x003b2e, emissiveIntensity: .18
        })
      );
      const a = Math.random()*Math.PI*2;
      m.userData = { r: 4.5+Math.random()*2.5, a, s:.2+Math.random()*.5, h:.6+Math.random()*2 };
      m.position.set(Math.cos(a)*m.userData.r, .8+m.userData.h, Math.sin(a)*m.userData.r);
      shapesGroup.add(m);
    }
  }

  // —— Meteoritos (InstancedMesh) ——
  let meteorsIMesh = null, meteorsState = [];
  const tmpObj = new THREE.Object3D();

  function createMeteors({ count = 70 } = {}) {
    const g = new THREE.IcosahedronGeometry(0.22, 0);
    const m = new THREE.MeshStandardMaterial({
      color:0x7a8b88, roughness:.95, metalness:.05,
      emissive:0x111111, emissiveIntensity:.08
    });
    meteorsIMesh = new THREE.InstancedMesh(g, m, count);
    meteorsIMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(meteorsIMesh);

    meteorsState = Array.from({length:count}, () => {
      const r = 6 + Math.random()*6;
      const a = Math.random()*Math.PI*2;
      return {
        r, a,
        y:(Math.random()-0.5)*4,
        spinX:(Math.random()*2-1)*1.5,
        spinY:(Math.random()*2-1)*1.5,
        w:0.2+Math.random()*0.6,
        scale:0.6+Math.random()*1.2
      };
    });
  }
  function updateMeteors(dt){
    if(!meteorsIMesh) return;
    for (let i=0; i<meteorsState.length; i++){
      const s = meteorsState[i];
      s.a += s.w*dt;
      const x = Math.cos(s.a)*s.r;
      const z = Math.sin(s.a)*s.r;
      const y = 0.4 + s.y + Math.sin(s.a*0.9)*0.2;
      tmpObj.position.set(x,y,z);
      tmpObj.rotation.x += s.spinX*dt;
      tmpObj.rotation.y += s.spinY*dt;
      tmpObj.scale.setScalar(s.scale);
      tmpObj.updateMatrix();
      meteorsIMesh.setMatrixAt(i, tmpObj.matrix);
    }
    meteorsIMesh.instanceMatrix.needsUpdate = true;
  }

  if (withMeteors) createMeteors({ count: 70 });

  // —— Nave espacial (GLB) ——
  let spaceship = null, shipState = null;
  async function createSpaceship(url){
    const gltf = await new GLTFLoader().loadAsync(url);
    spaceship = gltf.scene;
    spaceship.traverse(o=>{
      if(o.isMesh){
        o.castShadow = o.receiveShadow = false;
        if(o.material?.emissive) o.material.emissiveIntensity = 0.3;
      }
    });
    spaceship.scale.setScalar(0.6);
    scene.add(spaceship);
    shipState = { t: Math.random()*Math.PI*2, w:0.25, r1:5.0, r2:7.5, tilt: 20*Math.PI/180 };
  }
  function updateSpaceship(dt){
    if(!spaceship || !shipState) return;
    shipState.t += shipState.w*dt;
    const x = Math.cos(shipState.t)*shipState.r1;
    const z = Math.sin(shipState.t)*shipState.r2;
    const y = Math.sin(shipState.t*0.8)*0.8 + 1.2;

    const c = Math.cos(shipState.tilt), s = Math.sin(shipState.tilt);
    const xr = x*c;
    const yr = y*c - z*s;
    const zr = y*s + z*c;

    spaceship.position.set(xr, yr, zr);
    const lookAhead = new THREE.Vector3(
      Math.cos(shipState.t+0.1)*shipState.r1,
      Math.sin((shipState.t+0.1)*0.8)*0.8+1.2,
      Math.sin(shipState.t+0.1)*shipState.r2
    );
    spaceship.lookAt(lookAhead);
    spaceship.rotateZ(0.02);
  }
  if (withSpaceship) createSpaceship(spaceshipUrl);

  // —— Estrellas 2D (twinkle) ——
  const stars2D = document.getElementById("stars");
  const ctx = stars2D?.getContext?.("2d");
  let W=innerWidth, H=innerHeight; if(stars2D){ stars2D.width=W; stars2D.height=H; }
  const N=240;
  const twinkle = ctx ? Array.from({length:N},()=>({
    x:Math.random()*W, y:Math.random()*H, r:Math.random()*1.2+.2,
    s:Math.random()*0.006+0.001, p:Math.random()*Math.PI*2
  })) : [];
  let raf2D;
  function draw2D(t){
    if(!ctx) return;
    ctx.clearRect(0,0,W,H);
    for(const st of twinkle){
      const a = 0.3 + (Math.sin(t*st.s+st.p)*.35+.35);
      ctx.globalAlpha = a*.9;
      const g = ctx.createRadialGradient(st.x,st.y,0,st.x,st.y,st.r*3);
      g.addColorStop(0,'rgba(154,245,219,1)');
      g.addColorStop(1,'rgba(154,245,219,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(st.x,st.y,st.r*3,0,Math.PI*2); ctx.fill();
    }
    raf2D = requestAnimationFrame(draw2D);
  }
  if(ctx) requestAnimationFrame(draw2D);

  // —— LOOP —— 
  let raf3D;
  function animate(){
    const dt = clock.getDelta();
    const t  = clock.elapsedTime;

    earthMesh.rotation.y  += 0.002;
    lightsMesh.rotation.y += 0.002;
    cloudsMesh.rotation.y += 0.0023;
    glowMesh.rotation.y   += 0.002;

    stars.rotation.y      -= 0.0002;

    if (withOrbitingShapes){
      shapesGroup.children.forEach((m,i)=>{
        m.userData.a += m.userData.s*0.01;
        m.position.x = Math.cos(m.userData.a)*m.userData.r;
        m.position.z = Math.sin(m.userData.a)*m.userData.r;
        m.position.y = .8+m.userData.h + Math.sin(t*0.9+i)*.12;
        m.rotation.x += .004; m.rotation.y += .007;
      });
    }

    updateMeteors(dt);
    updateSpaceship(dt);

    controls.update();
    renderer.render(scene, camera);
    raf3D = requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  // —— RESIZE ——
  function onResize(){
    const w = innerWidth, h = innerHeight;
    camera.aspect = w/h; camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x000000, 0);
    if(stars2D){ W=w; H=h; stars2D.width=W; stars2D.height=H; }
  }
  addEventListener("resize", onResize);

  // —— destroy() ——
  function destroy(){
    cancelAnimationFrame(raf3D);
    if(raf2D) cancelAnimationFrame(raf2D);
    removeEventListener("resize", onResize);
    window.removeEventListener("click", startIntroAudio); // limpieza audio
    if(introSound.isPlaying) introSound.stop();
    controls.dispose();
    renderer.dispose();

    if (meteorsIMesh){
      meteorsIMesh.geometry?.dispose();
      if (meteorsIMesh.material?.dispose) meteorsIMesh.material.dispose();
      scene.remove(meteorsIMesh);
      meteorsIMesh = null; meteorsState = [];
    }
    if (spaceship){
      spaceship.traverse(o=>{
        if(o.isMesh){
          o.geometry?.dispose();
          if(o.material?.dispose) o.material.dispose();
        }
      });
      scene.remove(spaceship);
      spaceship = null; shipState = null;
    }

    scene.traverse(o=>{
      if(o.geometry) o.geometry.dispose();
      if(o.material){
        if(Array.isArray(o.material)) o.material.forEach(m=>m.dispose());
        else o.material.dispose();
      }
    });
  }

  return { destroy, renderer, scene, camera };
}
