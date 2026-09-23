// museum_walk.js  v7 — optimizado FPS + audio + videos
// ─────────────────────────────────────────────────────
// OPTIMIZACIONES PRINCIPALES:
//  1. SpotLights eliminados (eran ~50+). Reemplazados con PointLights de bajo radio.
//  2. Bloom con resolución reducida a la mitad (Half-res) → ~4x más rápido.
//  3. Partículas: solo animan las de la zona actual, no las 6×110 = 660 a la vez.
//  4. floaters: se actualizan cada 2 frames los de tipo "ring/fog/glow/holo".
//  5. detectZone: solo re-evalúa si la cámara se movió (evita trabajo inútil).
//  6. Luces del corredor global: de 10 PointLights a 5.
//  7. Material compartido en estatuas, columnas y arcos (menos draw calls).
//  8. Audio: "unlocked" con el primer click del usuario → reproduce inmediatamente
//     al cruzar zona sin depender de gestos posteriores.
//  9. Videos: solo los 2 que existen + lazy-play (se activa al entrar en zona).
// ─────────────────────────────────────────────────────

import * as THREE from "three";
import { EffectComposer }  from "jsm/postprocessing/EffectComposer.js";
import { RenderPass }      from "jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "jsm/postprocessing/UnrealBloomPass.js";
import { GLTFLoader }      from "jsm/loaders/GLTFLoader.js";

const IS_MAC   = /Mac/i.test(navigator.platform ?? "");
const DPR      = Math.min(window.devicePixelRatio, 1.0); // cap duro en 1x
const L=310, W=8.0, H=5.6;

// ═══════════════════════════════════════════════════════
//  DATOS DE ZONAS
// ═══════════════════════════════════════════════════════
const ZONAS = [
  {
    id:"origen", titulo:"El Origen", subtitulo:"1950 – 1971",
    color:0xf0a030, hex:"#f0a030", fogHex:0x100900, bgHex:0x080500,
    audio:"assets/audio/pong.mp3", audioId:"track_origen",
    zStart:0, zEnd:-32,
    vitrinas:[
      { z:-11, x:-3.4, label:"Tennis for Two", year:"1958", sub:"W. Higinbotham · Brookhaven Lab",
        type:"orb", video:"assets/audio/Videos/Tennisfortwo.mp4", imdb:"7.4" },
      { z:-24, x:3.4,  label:"Spacewar!",       year:"1962", sub:"MIT · PDP-1 Computer",
        type:"orb", video:"assets/audio/Videos/Spaceward.mp4", imdb:"8.1" },
    ],
    datos:[
      { z:-8,  t:"🕹️ Tennis for Two (1958)", d:"Creado en un osciloscopio en Brookhaven. No era entretenimiento — era para demostrar que la ciencia podía ser divertida en una feria pública." },
      { z:-19, t:"🖥️ Spacewar! (1962)",      d:"Primer juego distribuido digitalmente entre universidades en cintas magnéticas. La PDP-1 que lo ejecutaba costaba $120,000 USD." },
      { z:-28, t:"Alan Turing y los juegos", d:"En 1950 Turing propuso que las máquinas podían aprender. Concibió un algoritmo de ajedrez y sentó las bases de la IA y los mundos virtuales." },
    ],
    graffiti:{ z:-16, x:-3.85, text:"GAME\nOVER?", color:"#f0a030" },
  },
  {
    id:"arcade", titulo:"La Era Arcade", subtitulo:"1972 – 1983",
    color:0xff4400, hex:"#ff4400", fogHex:0x150200, bgHex:0x0d0100,
    audio:"assets/audio/pacman.mp3", audioId:"track_arcade",
    zStart:-32, zEnd:-64,
    vitrinas:[
      { z:-42, x:-3.4, label:"Pong", year:"1972", sub:"Atari · El primer éxito comercial",
        type:"orb", video:"assets/audio/Videos/Pong.mp4", imdb:"7.9" },
      { z:-55, x:3.4,  label:"Space Invaders", year:"1978", sub:"Taito · El ícono del arcade",
        type:"arcade", video:"assets/audio/Videos/spaceinvaders.mp4", imdb:"8.3" },
      { z:-62, x:-3.4, label:"Pac-Man", year:"1980", sub:"Namco · El ícono eterno del arcade",
        type:"orb", video:"assets/audio/Videos/pacman.mp4", imdb:"8.5" },
    ],
    datos:[
      { z:-36, t:"Pong (1972)", d:"La primera máquina en un bar de California falló en días: estaba atascada de monedas. Atari vendió 8,000 unidades en 6 meses.", extra:"Los ingenieros de Atari no podían patentar el concepto de \"pelota rebotando\" porque ya existía en Magnavox Odyssey (1972). La industria de los videojuegos nació en litigios. Nolan Bushnell fundó Atari con solo $500 y lo vendió por $28 millones en 1976." },
      { z:-55, t:"Space Invaders (1978)", d:"Causó escasez nacional de monedas de ¥100 en Japón. Las ventas arcade alcanzaron $2.8B anuales.", extra:"Toshihiro Nishikado diseñó cada alien manualmente porque los chips de 1978 no podían hacer cálculos de física complejos. El juego se hace más rápido conforme eliminas aliens porque el CPU tiene menos que procesar, no por diseño. Fue un accidente que se convirtió en mecánica icónica." },
      { z:-63, t:"Pac-Man (1980)", d:"Diseñado para atraer a un público femenino a los arcades. Primer personaje de videojuego con identidad icónica reconocida globalmente. Vendió más de 400,000 máquinas.", extra:"Toru Iwatani se inspiró en una pizza con un trozo faltante. Los cuatro fantasmas tienen IA distinta: Blinky persigue, Pinky embosca, Inky es impredecible y Clyde actúa al azar. Esta fue la primera vez que NPCs tuvieron \"personalidades\" programadas." },
    ],
    graffiti:{ z:-50, x:3.85, text:"INSERT\nCOIN", color:"#ff4400" },
  },
  {
    id:"consolas", titulo:"La Revolución Doméstica", subtitulo:"1983 – 1995",
    color:0x44ff88, hex:"#44ff88", fogHex:0x001a08, bgHex:0x000f04,
    audio:"assets/audio/supermariobros.mp3", audioId:"track_consolas",
    zStart:-64, zEnd:-96,
    vitrinas:[
      { z:-74, x:-3.4, label:"Super Mario Bros", year:"1985", sub:"Nintendo 1985 · 40M copias en NES · Reinventó el gaming",
        type:"orb", video:"assets/audio/Videos/supermariobros.mp4", imdb:"9.0" },
      { z:-87, x:3.4,  label:"E.T. El Videojuego", year:"1982", sub:"Atari 1982 · El peor juego de la historia · 7M enterrados",
        type:"orb", video:"assets/audio/Videos/ET.mp4", imdb:"2.4" },
    ],
    datos:[
      { z:-67, t:"El Gran Crash (1983)",
        d:"La industria colapsó de $3.2B a $100M en solo 2 años. Atari fabricó 12 millones de cartuchos de E.T. — devolvieron 7 millones. Los enterraron en el desierto de Nuevo México. Nintendo salvó todo dos años después.",
        extra:"El Crash de 1983 fue tan severo que los distribuidores dejaron de aceptar videojuegos. Los vendían en baratillos junto a basura. Warner vendió Atari por $25M — lo había comprado por $28M. Muchos creyeron que los videojuegos eran una moda pasada. Nintendo tuvo que convencer a los retailers de que el NES era un 'juguete', no una consola, para conseguir distribución." },
      { z:-74, t:"Super Mario Bros (1985) — El salvador",
        d:"Nintendo diseñó el nivel 1-1 para enseñar sin palabras: el hongo enseña recompensa, el Goomba enseña peligro, el pozo enseña cuidado. En 30 segundos entiendes todo. 40 millones de copias en NES.",
        extra:"Miyamoto diseñó el nivel 1-1 con una metodología que hoy se enseña en game design: primero el hongo (reward), luego el koopa (riesgo), luego el pozo (obstáculo). Sin una sola palabra de texto, el juego enseña sus mecánicas en 30 segundos. El nivel fue diseñado para que el primer obstáculo fuera imposible de perder, generando confianza inmediata en el jugador." },
      { z:-87, t:"E.T. y el Game Boy (1982–1989)",
        d:"E.T. de Atari (1982) es considerado el peor juego de la historia — el protagonista del crash. Siete años después, el Game Boy (1989) demostró que el gaming podía ser portable. 118 millones de unidades vendidas.",
        extra:"El Game Boy usó una pantalla de baja resolución deliberadamente para reducir costos y consumo de batería. La pantalla 'borrosa' era una decisión económica, no técnica. Nintendo incluyó Tetris en lugar de Super Mario Land porque sabía que Tetris engancharía a cualquier persona, independientemente de si jugaba o no. La jugada fue correcta: Tetris vendió 35 millones de copias adicionales." },
    ],
    graffiti:{ z:-80, x:-3.85, text:"LEVEL\nUP!", color:"#44ff88" },
  },
  {
    id:"3d", titulo:"La Revolución 3D", subtitulo:"1995 – 2005",
    color:0x4488ff, hex:"#4488ff", fogHex:0x000518, bgHex:0x00020f,
    audio:"assets/audio/supermario64.mp3", audioId:"track_3d",
    zStart:-96, zEnd:-196,
    vitrinas:[
      { z:-108, x:-3.4, label:"PlayStation", year:"1994",
        sub:"Sony · 102 millones de unidades vendidas",
        type:"orb", video:"assets/audio/Videos/playstation1.mp4", imdb:"9.2" },
      { z:-122, x:3.4,  label:"Super Mario 64", year:"1996",
        sub:"Nintendo · El primer mundo 3D libre",
        type:"orb", video:"assets/audio/Videos/supermario64.mp4", imdb:"9.8" },
      { z:-136, x:-3.4, label:"Zelda: Ocarina of Time", year:"1998",
        sub:"Nintendo · Metacritic 99/100 — El mejor juego",
        type:"orb", video:"assets/audio/Videos/Zelda64.mp4", imdb:"9.9" },
      { z:-150, x:3.4,  label:"Metal Gear Solid", year:"1998",
        sub:"Konami · Inventó el stealth narrativo",
        type:"orb", video:"assets/audio/Videos/Metalgear1998.mp4", imdb:"9.6" },
      { z:-164, x:-3.4, label:"GoldenEye 007", year:"1997",
        sub:"Rare · Definió el FPS multijugador en consola",
        type:"orb", video:"assets/audio/Videos/goldeneye007.mp4", imdb:"9.2" },
      { z:-178, x:3.4,  label:"Halo: Combat Evolved", year:"2001",
        sub:"Bungie · Lanzó el FPS online en consola",
        type:"orb", video:"assets/audio/Videos/halo2001.mp4", imdb:"9.4" },
    ],
    datos:[
      { z:-100, t:"PlayStation (1994)", d:"Sony entró tras un acuerdo roto con Nintendo. El CD-ROM permitió bandas sonoras orquestales y FMV que transformaron la narrativa en los videojuegos." },
      { z:-115, t:"Super Mario 64 (1996)", d:"Metacritic 94/100 · IMDb 9.8/10. Inventó la cámara libre en 3D, el joystick analógico y el diseño de mundo abierto que todo juego posterior adoptó." },
      { z:-129, t:"Zelda: Ocarina of Time (1998)", d:"Metacritic 99/100 — la puntuación más alta de la historia. Inventó el Z-targeting para combate 3D y la narrativa cinematográfica que definió el estándar del género." },
      { z:-143, t:"Metal Gear Solid (1998)", d:"Hideo Kojima creó el primer juego que se anunciaba explícitamente como 'tactical espionage action'. Sus cutscenes de 10 minutos demostrarion que los videojuegos podían contar historias complejas." },
      { z:-157, t:"GoldenEye 007 (1997)", d:"El primer FPS exitoso en consola. Inventó el multijugador en pantalla dividida para 4 jugadores que dominó los salones de todo el mundo durante años." },
      { z:-171, t:"Halo: Combat Evolved (2001)", d:"Lanzado con Xbox, demostró que los FPS podían funcionar perfectamente en consola con joystick. Estableció el modelo de online gaming que dominó la siguiente década." },
      { z:-186, t:"Los primeros MMORPG (1999)", d:"EverQuest y luego World of Warcraft (2004) introdujeron mundos persistentes con millones de jugadores simultáneos. Psicólogos estudiaron la adicción a los mundos virtuales como fenómeno nuevo.", extra:"World of Warcraft en su pico (2010) tenía 12 millones de suscriptores pagando $15/mes = $180M al mes. El economista Eyjolfur Gudmundsson fue contratado por CCP Games como \"economista en jefe\" de EVE Online para analizar su economía virtual. Los MMORPG inventaron la economía digital antes que las criptomonedas." },
    ],
    graffiti:{ z:-142, x:-3.85, text:"3D\nWORLD", color:"#4488ff" },
  },
  {
    id:"online", titulo:"La Era Online", subtitulo:"2004 – 2015",
    color:0xcc44ff, hex:"#cc44ff", fogHex:0x0d0020, bgHex:0x080015,
    audio:"assets/audio/wowaudio.mp3", audioId:"track_online",
    zStart:-196, zEnd:-252,
    vitrinas:[
      { z:-205, x:-3.4, label:"World of Warcraft", year:"2004",
        sub:"Blizzard · 12M suscriptores · El MMORPG que lo cambió todo",
        type:"orb", video:"assets/audio/Videos/wowvideo.mp4", imdb:"9.4" },
      { z:-218, x:3.4,  label:"Call of Duty 4: Modern Warfare", year:"2007",
        sub:"Infinity Ward · Reinventó el multijugador online en consola",
        type:"orb", video:"assets/audio/Videos/modernwarfare4video.mp4", imdb:"9.4" },
      { z:-232, x:-3.4, label:"League of Legends", year:"2009",
        sub:"Riot Games · 100M jugadores · Nace el e-sport global",
        type:"orb", video:"assets/audio/Videos/lolvideo.mp4", imdb:"9.0" },
      { z:-246, x:3.4,  label:"Minecraft", year:"2011",
        sub:"Mojang · 238M copias · El juego más vendido de la historia",
        type:"orb", video:"assets/audio/Videos/minecraftvideo.mp4", imdb:"9.2" },
    ],
    datos:[
      { z:-200, t:"World of Warcraft (2004) — El boom online",
        d:"12 millones de suscriptores en su pico (2010). $10B en ingresos totales. WoW demostró que los mundos virtuales persistentes podían ser un negocio masivo y sostenido.",
        extra:"WoW tomó el concepto de MMORPG — ya existía EverQuest — y lo hizo accesible al público general. En su pico tenía 12 millones de suscriptores pagando $15/mes cada uno. El economista Eyjolfur Gudmundsson fue contratado por CCP (EVE Online) como 'economista en jefe' para gestionar su economía virtual. Los MMORPG inventaron la economía de suscripción digital antes que Netflix." },
      { z:-213, t:"Call of Duty 4: Modern Warfare (2007) — La revolución del FPS",
        d:"CoD4 inventó el sistema de progresión con XP, rangos y desbloqueos que toda la industria copió. 16 millones de copias. Redefinió el multijugador online en consola para siempre.",
        extra:"Infinity Ward lanzó CoD4 en 2007 con un modo multijugador que cambió todo. El sistema de XP, killstreaks, prestigio y personalización de clases fue copiado por todos los FPS siguientes. La campaña 'All Ghillied Up' es considerada una de las mejores misiones de la historia. CoD4 demostró que los videojuegos podían tener narrativa cinematográfica y multijugador adictivo al mismo tiempo.", extra:"Infinity Ward lanzó CoD4 en 2007 y revolucionó el género. Vendió 16 millones de copias. Su sistema de progresión XP, killstreaks y prestigio fue adoptado por prácticamente todos los shooters siguientes: Battlefield, Halo, Fortnite. La misión 'All Ghillied Up' es citada como obra maestra del diseño de niveles. El modo multijugador tuvo jugadores activos por más de 5 años." },
      { z:-225, t:"E-Sports — De hobby a industria (2009-2015)",
        d:"The International (Dota 2) 2013: primer premio de $2.8M en e-sports. 2019: $40M. El Mundial de LoL 2019: 100M de espectadores simultáneos.",
        extra:"League of Legends (2009) creó el modelo de 'free-to-play con cosméticos' que hoy domina la industria. En 2012, el gobierno de EEUU reconoció a los jugadores profesionales de LoL como atletas, otorgándoles visas P-1A (de atletas profesionales). En 2014, la Universidad de Robert Morris ofreció las primeras becas universitarias de e-sports del mundo." },
      { z:-238, t:"Minecraft (2011) — La creatividad sin límites",
        d:"238 millones de copias vendidas. 35 millones de estudiantes en 115 países usan Minecraft Education. El juego más vendido de la historia humana.",
        extra:"Notch creó Minecraft solo, en Java, en su tiempo libre. Lo vendió por $2.5B a Microsoft en 2014. Minecraft Education Edition se usa en 115 países para enseñar matemáticas, historia, arquitectura y programación. Roblox, inspirado en Minecraft, tiene 70 millones de usuarios diarios — la mayoría menores de 16 años. Estos juegos definieron cómo aprende la Generación Z." },

    ],
    graffiti:{ z:-222, x:3.85, text:"GG\nWP", color:"#cc44ff" },
  },
  {
    id:"futuro", titulo:"El Futuro", subtitulo:"2015 – Hoy",
    color:0x00ffee, hex:"#00ffee", fogHex:0x001518, bgHex:0x000d10,
    audio:"assets/audio/eldenringaudio.mp3", audioId:"track_futuro",
    zStart:-252, zEnd:-305,
    vitrinas:[
      { z:-262, x:-3.4, label:"PlayStation 5", year:"2020",
        sub:"Sony 2020 · 825GB SSD · Ray Tracing · 50M consolas vendidas",
        type:"orb", video:"assets/audio/Videos/playstation5video.mp4", imdb:"9.1" },
      { z:-275, x:3.4,  label:"Elden Ring",    year:"2022",
        sub:"FromSoftware · GOTY 2022 · Open world souls-like",
        type:"orb", video:"assets/audio/Videos/Eldenringvideo.mp4", imdb:"9.7" },
      { z:-288, x:-3.4, label:"Meta Quest 3",  year:"2023",
        sub:"Realidad mixta · Pasthrough 4K · Gaming espacial",
        type:"orb", video:"assets/audio/Videos/metavideo.mp4", imdb:"8.9" },
    ],
    datos:[
      { z:-262, t:"PlayStation 5 — La nueva generación (2020)", d:"825GB SSD con carga instantánea, Ray Tracing en tiempo real, haptic feedback. Sony vendió 50 millones de unidades. La brecha con el PC casi desapareció.", extra:"AppliedVR realizó el primer ensayo clínico randomizado de realidad virtual para dolor crónico (2021). 547 pacientes. Resultado: 65.7% reportaron reducción de dolor vs 40.7% en el grupo de control. La FDA aprobó el primer tratamiento de VR para dolor lumbar crónico en noviembre 2021." },
      { z:-275, t:"Elden Ring — GOTY 2022 (FromSoftware)", d:"George R.R. Martin coescribió el mundo. Fusionó mundo abierto con dificultad extrema. 20 millones de copias. Demostró que los jugadores quieren desafío real, no asistencia constante." },
      { z:-288, t:"El impacto total de los videojuegos", d:"$184B en 2023. Supera cine ($33B) y música ($26B) combinados. 3.2 mil millones de jugadores. El arte más influyente del siglo XXI.", extra:"En 2023, la industria del videojuego generó $184 mil millones — más que el cine ($33B) y la música ($26B) combinados. Hay 3.2 mil millones de jugadores activos. En Colombia, la industria creció 15% en 2023. Los videojuegos son el arte más influyente y rentable del siglo XXI." },
      { z:-300, t:"Fin del recorrido — 70 años en tus manos", d:"Recorriste desde 1952 hasta hoy. Este museo demuestra que los videojuegos son historia, ciencia cognitiva y cultura — no solo entretenimiento. Tu opinión ahora es parte de esta investigación.", extra:"Este museo interactivo fue desarrollado como Trabajo de Grado en Ingeniería Multimedia, Universidad de San Buenaventura Cali, para estudiar cómo una experiencia inmersiva cambia la percepción social sobre los videojuegos. Si aún no lo has hecho, completa la encuesta 'Participar en el Estudio' desde el menú principal — tu respuesta es un dato real para esta investigación académica." },
    ],
    graffiti:{ z:-251, x:-3.85, text:"THE\nFUTURE", color:"#00ffee" },
  },
];

// ═══════════════════════════════════════════════════════
//  AUDIO MANAGER
//  La política de autoplay del navegador requiere un gesto del usuario.
//  Solución: guardamos el AudioContext en "suspended" y lo resumimos
//  en el primer gesto (click en el botón "Entrar al Museo").
//  Después de eso, cualquier play() funciona sin gestos adicionales.
// ═══════════════════════════════════════════════════════
class AudioManager {
  constructor() {
    this.ctx         = null;
    this.masterGain  = null;
    this.source      = null;
    this.bufferCache = {};
    this.unlocked    = false;
    this.currentId   = null;   // ID de zona actual
    this._targetVol  = 0.08;  // muy sutil — protagonista es el narrador/video
    this._xfadeTimer = null;   // timer del crossfade actual (cancelable)
  }

  async unlock(audioPath) {
    if (this.unlocked) return;
    try {
      this.ctx        = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      if (this.ctx.state === "suspended") await this.ctx.resume();
      this.unlocked = true;
      if (audioPath) await this._play(audioPath, true);
    } catch(e) { console.warn("Audio unlock:", e); }
  }

  play(zona) {
    if (!this.unlocked || !zona.audio) return;
    const id = zona.audioId || zona.audio;
    if (id === this.currentId) return;
    this.currentId   = id;
    this._targetVol  = 0.08; // volumen uniforme bajo para todas las zonas
    // Cancelar cualquier crossfade en curso y hacer transición limpia
    this._cancelXfade();
    this._crossfade(zona.audio);
  }

  _cancelXfade() {
    if (this._xfadeTimer) {
      clearTimeout(this._xfadeTimer);
      this._xfadeTimer = null;
    }
  }

  _crossfade(path) {
    // Fade out inmediato del actual
    if (this.source && this.ctx) {
      const g = this.masterGain.gain;
      const t = this.ctx.currentTime;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value || 0.0001, t);
      g.linearRampToValueAtTime(0.0001, t + 1.0);
    }
    // Cargar y reproducir nuevo tras 1.1s
    this._xfadeTimer = setTimeout(async () => {
      try {
        const buf = await this._load(path);
        if (!buf) return;
        // Parar source anterior
        try { this.source?.stop(0); } catch {}
        // Crear nuevo source
        const src     = this.ctx.createBufferSource();
        src.buffer    = buf;
        src.loop      = true;
        src.connect(this.masterGain);
        src.start(0);
        this.source = src;
        // Fade in suave
        const g = this.masterGain.gain;
        const t = this.ctx.currentTime;
        g.cancelScheduledValues(t);
        g.setValueAtTime(0.0001, t);
        g.linearRampToValueAtTime(this._targetVol, t + 1.5);
      } catch(e) { console.warn("Crossfade error:", e); }
      this._xfadeTimer = null;
    }, 1100);
  }

  async _load(path) {
    if (!this.bufferCache[path]) {
      try {
        const resp = await fetch(path);
        const arr  = await resp.arrayBuffer();
        this.bufferCache[path] = await this.ctx.decodeAudioData(arr);
      } catch(e) { console.warn("Load audio:", e); return null; }
    }
    return this.bufferCache[path];
  }

  async _play(path, isFirst) {
    const buf = await this._load(path);
    if (!buf) return;
    try { this.source?.stop(0); } catch {}
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    src.connect(this.masterGain); src.start(0);
    this.source = src;
    if (isFirst) {
      const g = this.masterGain.gain;
      const t = this.ctx.currentTime;
      g.cancelScheduledValues(t);
      g.setValueAtTime(0.0001, t);
      g.linearRampToValueAtTime(this._targetVol, t + 2.0);
    }
  }

  // Silenciar música de zona (cuando narrador o video habla)
  duck(factor=0.0) {
    if (!this.ctx || !this.masterGain) return;
    const g = this.masterGain.gain;
    const t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(Math.max(g.value, 0.0001), t);
    g.linearRampToValueAtTime(Math.max(this._targetVol * factor, 0.0001), t + 0.4);
  }

  unduck() { this.duck(1.0); }

  destroy() {
    this._cancelXfade();
    try { this.source?.stop(0); } catch {}
    try { this.ctx?.close(); }   catch {}
    this.unlocked = false;
  }
}

// ═══════════════════════════════════════════════════════
//  TEXTURAS PROCEDURALES (tamaños reducidos para más velocidad)
// ═══════════════════════════════════════════════════════
function makeNebulaTexture() {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256; // era 512×512
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#030409"; ctx.fillRect(0, 0, 256, 256);
  [{x:.3,y:.4,r:100,col:"rgba(15,4,70,0.55)"},{x:.72,y:.6,r:115,col:"rgba(0,35,60,0.5)"},
   {x:.5,y:.15,r:80,col:"rgba(50,8,8,0.45)"},{x:.85,y:.2,r:90,col:"rgba(10,35,20,0.35)"}
  ].forEach(n => {
    const g = ctx.createRadialGradient(n.x*256,n.y*256,0,n.x*256,n.y*256,n.r);
    g.addColorStop(0, n.col); g.addColorStop(1, "transparent");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  });
  for (let i = 0; i < 700; i++) { // era 1800
    const x=Math.random()*256, y=Math.random()*256, r=Math.random()*1.1;
    ctx.globalAlpha = 0.4+Math.random()*0.6;
    ctx.fillStyle = Math.random()>.7?"#aaddff":Math.random()>.5?"#ffd8aa":"#fff";
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.generateMipmaps = false; t.minFilter = THREE.LinearFilter;
  return t;
}

function makeMarbleTexture() {
  const c = document.createElement("canvas"); c.width = 128; c.height = 512; // era 256×1024
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#0d1018"; ctx.fillRect(0, 0, 128, 512);
  for (let i = 0; i < 8; i++) { // era 14
    const x0 = Math.random()*128, x1 = Math.random()*128;
    const g = ctx.createLinearGradient(x0,0,x1,512);
    g.addColorStop(0,"transparent");
    g.addColorStop(.25+Math.random()*.3,`rgba(200,168,75,${0.045+Math.random()*0.05})`);
    g.addColorStop(1,"transparent");
    ctx.strokeStyle = g; ctx.lineWidth = 0.8+Math.random()*1.5;
    ctx.beginPath(); ctx.moveTo(x0,0);
    ctx.bezierCurveTo(Math.random()*128,170,Math.random()*128,340,x1,512); ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, L/8);
  t.generateMipmaps = false; t.minFilter = THREE.LinearFilter;
  return t;
}

function makeGraffitiTexture(text, color) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 320;
  const ctx = c.getContext("2d"); ctx.clearRect(0,0,256,320);
  ctx.font = "bold 78px 'Orbitron',monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = color; ctx.shadowBlur = 16; ctx.fillStyle = color;
  text.split("\n").forEach((line,i) => ctx.fillText(line, 128, 80+i*110));
  ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1.5;
  text.split("\n").forEach((line,i) => ctx.strokeText(line, 128, 80+i*110));
  ctx.shadowBlur = 0; ctx.strokeStyle = color+"77"; ctx.lineWidth = 1.5;
  [[20,20,236,20],[20,300,236,300]].forEach(([x1,y1,x2,y2]) => {
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  });
  const t = new THREE.CanvasTexture(c);
  t.generateMipmaps = false; t.minFilter = THREE.LinearFilter;
  return t;
}

function makeZoneLabelTex(zona) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 100;
  const ctx = c.getContext("2d"); ctx.clearRect(0,0,512,100);
  ctx.font = "bold 38px 'Orbitron',monospace"; ctx.fillStyle = zona.hex; ctx.textAlign = "center";
  ctx.shadowColor = zona.hex; ctx.shadowBlur = 14; ctx.fillText(zona.titulo, 256, 46);
  ctx.shadowBlur = 0; ctx.font = "15px monospace"; ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText(zona.subtitulo, 256, 74);
  const t = new THREE.CanvasTexture(c);
  t.generateMipmaps = false; t.minFilter = THREE.LinearFilter;
  return t;
}

function makeFrameTex(label, year, sub, hex) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 380;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#07080e"; ctx.fillRect(0,0,512,380);
  ctx.fillStyle = hex; ctx.fillRect(0,0,512,4);
  ctx.font = "bold 68px 'Orbitron',monospace"; ctx.textAlign = "center";
  ctx.fillStyle = hex; ctx.shadowColor = hex; ctx.shadowBlur = 18;
  ctx.fillText(year, 256, 92);
  ctx.shadowBlur = 0; ctx.font = "bold 28px 'Orbitron',monospace";
  ctx.fillStyle = "#fff"; ctx.fillText(label, 256, 150);
  ctx.font = "14px monospace"; ctx.fillStyle = "rgba(166,182,176,0.8)"; ctx.fillText(sub, 256, 192);
  ctx.strokeStyle = hex+"44"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(70,218); ctx.lineTo(442,218); ctx.stroke();
  ctx.font = "10px monospace"; ctx.fillStyle = "rgba(166,182,176,0.35)";
  ctx.fillText("MUSEO INTERACTIVO · HISTORIA DE LOS VIDEOJUEGOS", 256, 265);
  const t = new THREE.CanvasTexture(c);
  t.generateMipmaps = false; t.minFilter = THREE.LinearFilter;
  return t;
}

function makePlateTex(label, year, hex) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 64;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "rgba(6,8,18,0.92)"; ctx.fillRect(0,0,512,64);
  ctx.strokeStyle = hex+"55"; ctx.lineWidth = 1; ctx.strokeRect(2,2,508,60);
  ctx.font = "bold 22px 'Orbitron',monospace"; ctx.textAlign = "center";
  ctx.fillStyle = hex; ctx.shadowColor = hex; ctx.shadowBlur = 8;
  ctx.fillText(`${label}  ·  ${year}`, 256, 40);
  const t = new THREE.CanvasTexture(c);
  t.generateMipmaps = false; t.minFilter = THREE.LinearFilter;
  return t;
}

// Título NEON vistoso para debajo de los videos
function makeNeonTitleTex(label, year, hex, imdb, imdbLabel) {
  const W=1024, H=imdb ? 268 : 200;
  const c = document.createElement("canvas"); c.width=W; c.height=H;
  const ctx = c.getContext("2d");

  // Fondo
  const bg = ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,"rgba(4,6,16,0.98)");
  bg.addColorStop(1,"rgba(1,2,6,0.98)");
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

  // Línea superior brillante
  ctx.shadowColor=hex; ctx.shadowBlur=20;
  ctx.fillStyle=hex; ctx.fillRect(0,0,W,3);
  ctx.fillRect(0,0,W,1);

  // Auto-fit tamaño de fuente
  const maxW = W*0.88;
  let fontSize = 72;
  ctx.font = `900 ${fontSize}px 'Orbitron',monospace`;
  while (ctx.measureText(label.toUpperCase()).width > maxW && fontSize > 28) {
    fontSize -= 3;
    ctx.font = `900 ${fontSize}px 'Orbitron',monospace`;
  }
  ctx.textAlign = "center";
  const textY = imdb ? 92 : 115;

  // Capas neon del título
  ctx.shadowColor=hex; ctx.shadowBlur=48; ctx.fillStyle=hex; ctx.globalAlpha=0.28;
  ctx.fillText(label.toUpperCase(), W/2, textY);
  ctx.shadowBlur=22; ctx.globalAlpha=0.5;
  ctx.fillText(label.toUpperCase(), W/2, textY);
  ctx.shadowBlur=10; ctx.fillStyle="#ffffff"; ctx.globalAlpha=1;
  ctx.fillText(label.toUpperCase(), W/2, textY);
  ctx.shadowBlur=4; ctx.fillStyle=hex; ctx.globalAlpha=0.16;
  ctx.fillText(label.toUpperCase(), W/2, textY);
  ctx.globalAlpha=1;

  // Año
  const yearY = imdb ? 134 : 158;
  ctx.font=`bold 24px 'Orbitron',monospace`;
  ctx.shadowBlur=10; ctx.shadowColor=hex; ctx.fillStyle=hex;
  ctx.fillText(year, W/2, yearY);

  // Líneas decorativas año
  ctx.shadowBlur=4; ctx.strokeStyle=hex+"55"; ctx.lineWidth=1.2;
  const yw=ctx.measureText(year).width; const gap=16;
  [[W/2-yw/2-gap-55,W/2-yw/2-gap],[W/2+yw/2+gap,W/2+yw/2+gap+55]].forEach(([x1,x2])=>{
    ctx.beginPath(); ctx.moveTo(x1,yearY-6); ctx.lineTo(x2,yearY-6); ctx.stroke();
  });

  // ── BADGE IMDb ───────────────────────────────────────────────
  if (imdb) {
    const bW=310, bH=66, bX=W/2-bW/2, bY=154, br=10;
    ctx.shadowBlur=0;

    // Fondo amarillo IMDb
    neonRect(ctx, bX, bY, bW, bH, br);
    ctx.fillStyle="#f5c518"; ctx.fill();

    // Texto "IMDb" en negro
    ctx.fillStyle="#000"; ctx.font="bold 28px 'Orbitron',monospace";
    ctx.textAlign="left"; ctx.shadowBlur=0;
    ctx.fillText(imdbLabel||"IMDb", bX+14, bY+44);

    // Divisor vertical
    ctx.fillStyle="rgba(0,0,0,0.25)"; ctx.fillRect(bX+92,bY+10,2,bH-20);

    // Calificación con estrella
    ctx.fillStyle="#000"; ctx.font="bold 32px 'Orbitron',monospace";
    ctx.textAlign="center"; ctx.shadowBlur=0;
    ctx.fillText(`⭐ ${imdb}/10`, bX+bW/2+50, bY+43);

    // Glow dorado exterior del badge
    ctx.shadowColor="#f5c518"; ctx.shadowBlur=30;
    ctx.strokeStyle="#f5c51866"; ctx.lineWidth=2;
    neonRect(ctx, bX-4, bY-4, bW+8, bH+8, br+4);
    ctx.stroke();
    ctx.shadowBlur=0;
  }

  // Línea inferior
  ctx.fillStyle=hex+"33"; ctx.fillRect(30,H-3,W-60,1);

  const t = new THREE.CanvasTexture(c);
  t.generateMipmaps=false; t.minFilter=THREE.LinearFilter;
  return t;
}

function neonRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}


function makeLetreroTex() {
  const c = document.createElement("canvas"); c.width = 512; c.height = 128;
  const ctx = c.getContext("2d"); ctx.clearRect(0,0,512,128);
  ctx.font = "bold 48px 'Orbitron',monospace"; ctx.textAlign = "center";
  ctx.fillStyle = "#c8a84b"; ctx.shadowColor = "#c8a84b"; ctx.shadowBlur = 18;
  ctx.fillText("MUSEO INTERACTIVO", 256, 54);
  ctx.shadowBlur = 0; ctx.font = "15px monospace"; ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("HISTORIA DE LOS VIDEOJUEGOS", 256, 88);
  const t = new THREE.CanvasTexture(c);
  t.generateMipmaps = false; t.minFilter = THREE.LinearFilter;
  return t;
}

// ═══════════════════════════════════════════════════════
//  MATERIALES COMPARTIDOS (menos draw calls)
// ═══════════════════════════════════════════════════════
const ORO_MAT   = new THREE.MeshStandardMaterial({color:0xc8a84b,roughness:0.2,metalness:0.92,emissive:0xc8a84b,emissiveIntensity:0.06});
const GRIS_MAT  = new THREE.MeshStandardMaterial({color:0x8899aa,roughness:0.3,metalness:0.55});
const OSCURO_MAT= new THREE.MeshStandardMaterial({color:0x111825,roughness:0.12,metalness:0.5});
const BASIC_GLOW= (col)=>new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:0.45,roughness:0.2,metalness:0.8});

// ═══════════════════════════════════════════════════════
//  CORREDOR PRINCIPAL
// ═══════════════════════════════════════════════════════
function buildCorridor(scene) {
  const zC = -L/2+2;
  const nebTex  = makeNebulaTexture();
  const mblTex  = makeMarbleTexture();

  // Suelo reflectante
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(W,L),
    new THREE.MeshStandardMaterial({color:0x020308,roughness:0.008,metalness:0.99}));
  suelo.rotation.x = -Math.PI/2;
  suelo.position.set(0,0,zC);
  scene.add(suelo);

  // Techo nebulosa
  const techo = new THREE.Mesh(new THREE.PlaneGeometry(W,L),
    new THREE.MeshStandardMaterial({map:nebTex,roughness:1,metalness:0,
      emissive:new THREE.Color(0x050a20),emissiveIntensity:0.45}));
  techo.rotation.x = Math.PI/2; techo.position.set(0,H,zC); scene.add(techo);

  // Paredes mármol (material compartido)
  const pMat = new THREE.MeshStandardMaterial({color:0x060810,map:mblTex,roughness:0.14,metalness:0.08});
  [[Math.PI/2,-W/2],[-Math.PI/2,W/2]].forEach(([ry,px])=>{
    const w = new THREE.Mesh(new THREE.PlaneGeometry(L,H),pMat);
    w.rotation.y=ry; w.position.set(px,H/2,zC); scene.add(w);
  });
  const wf = new THREE.Mesh(new THREE.PlaneGeometry(W,H),pMat);
  wf.position.set(0,H/2,-L+2); scene.add(wf);

  // Línea guía doble — línea central cyan + dos líneas laterales azul
  const guiaMat  = new THREE.MeshStandardMaterial({color:0x00ffee, emissive:0x00ffee, emissiveIntensity:1.8, roughness:0.02});
  const guiaMat2 = new THREE.MeshStandardMaterial({color:0x2244aa, emissive:0x3366cc, emissiveIntensity:0.8, roughness:0.05});
  const guia = new THREE.Mesh(new THREE.PlaneGeometry(0.04, L), guiaMat);
  guia.rotation.x=-Math.PI/2; guia.position.set(0,0.003,zC); scene.add(guia);
  // Líneas laterales paralelas
  [-1.2, 1.2].forEach(ox => {
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.02, L), guiaMat2);
    gl.rotation.x = -Math.PI/2; gl.position.set(ox, 0.002, zC); scene.add(gl);
  });

  // Columnas instanciadas — filtradas para no tapar vitrinas
  // Posiciones de vitrinas a evitar (±3u)
  const _vitrinaZ = [-11,-24,-29,-42,-55,-62,-74,-87,-108,-122,-136,-150,-164,-178,
                     -205,-218,-232,-246,-262,-275,-288];
  const _colPositions = [];
  for(let z=-1;z>-L;z-=13){
    const tooClose = _vitrinaZ.some(vz => Math.abs(z-vz) < 4);
    if(!tooClose) _colPositions.push(z);
  }
  const colCount = _colPositions.length * 2;
  const colIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045,0.055,H*0.85,8),ORO_MAT,colCount);
  const dum = new THREE.Object3D(); let ci=0;
  _colPositions.forEach(z=>{
    [-W/2+0.09,W/2-0.09].forEach(x=>{
      dum.position.set(x,H*0.43,z); dum.updateMatrix(); colIM.setMatrixAt(ci++,dum.matrix);
    });
  });
  colIM.instanceMatrix.needsUpdate=true; scene.add(colIM);

  // Franjas neon en paredes — azul/cyan futurista
  const franjaMat = new THREE.MeshStandardMaterial({color:0x0044aa, emissive:0x0044ff, emissiveIntensity:0.8, roughness:0.05});
  const franjaMat2 = new THREE.MeshStandardMaterial({color:0x00ffcc, emissive:0x00ffcc, emissiveIntensity:0.6, roughness:0.05});
  [-W/2+0.06,W/2-0.06].forEach(x=>{
    [[H-0.28, franjaMat],[0.28, franjaMat2]].forEach(([y,mat])=>{
      const f=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.03,L),mat);
      f.position.set(x,y,zC); scene.add(f);
    });
  });

  // Focos instanciados (cada 8 unidades en lugar de cada 6)
  const focoMat = new THREE.MeshStandardMaterial({color:0xaaddff,emissive:0x88ccff,emissiveIntensity:1.8});
  const focos = Math.floor(L/8)*2;
  const focoIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06,0.1,0.12,6),focoMat,focos);
  let fi=0;
  for(let z=-4;z>-L;z-=8)[-1.8,1.8].forEach(x=>{
    dum.position.set(x,H-0.06,z); dum.rotation.set(0,0,0);
    dum.updateMatrix(); focoIM.setMatrixAt(fi++,dum.matrix);
  });
  focoIM.instanceMatrix.needsUpdate=true; scene.add(focoIM);

  // God rays (reducidos — 1 cada 20 en lugar de 14)
  const rayMat=new THREE.MeshBasicMaterial({color:0x00ccff,transparent:true,opacity:0.026,side:THREE.BackSide});
  for(let z=-10;z>-L;z-=20)[-1.8,1.8].forEach(x=>{
    const ray=new THREE.Mesh(new THREE.CylinderGeometry(0.01,0.55,4,6,1,true),rayMat);
    ray.position.set(x,H-2.1,z); scene.add(ray);
  });


  // Líneas de acento laterales en el suelo — dan profundidad y perspectiva
  const accentMat = new THREE.MeshStandardMaterial({color:0x0033aa, emissive:0x0033ff, emissiveIntensity:0.5, roughness:0.05});
  [-1.8, 1.8].forEach(ax => {
    const acc = new THREE.Mesh(new THREE.PlaneGeometry(0.025, L), accentMat);
    acc.rotation.x = -Math.PI/2; acc.position.set(ax, 0.001, zC); scene.add(acc);
  });

  // Polvo cósmico (400 en lugar de 700)
  const dGeo=new THREE.BufferGeometry();
  const dPos=new Float32Array(400*3);
  for(let i=0;i<400;i++){
    dPos[i*3]=(Math.random()-.5)*W*.9;
    dPos[i*3+1]=Math.random()*H;
    dPos[i*3+2]=-Math.random()*L;
  }
  dGeo.setAttribute("position",new THREE.BufferAttribute(dPos,3));
  scene.add(new THREE.Points(dGeo, // partículas azules del espacio
    new THREE.PointsMaterial({size:0.022,color:0x8899cc,transparent:true,opacity:0.4,sizeAttenuation:true})));
}

// ═══════════════════════════════════════════════════════
//  ENTRADA DE MUSEO
// ═══════════════════════════════════════════════════════
function buildEntrance(scene, welcomeImg) {
  // Pilares entrada
  [-W/2+0.2,W/2-0.2].forEach(x=>{
    const p=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.22,H,8),OSCURO_MAT);
    p.position.set(x,H/2,2.5); scene.add(p);
    const cap=new THREE.Mesh(new THREE.BoxGeometry(0.45,0.15,0.45),ORO_MAT);
    cap.position.set(x,H-0.075,2.5); scene.add(cap);
    const base=new THREE.Mesh(new THREE.BoxGeometry(0.45,0.15,0.45),ORO_MAT);
    base.position.set(x,0.075,2.5); scene.add(base);
    // UNA sola luz en lugar de SpotLight
    const pl=new THREE.PointLight(0xfff8dc,1.2,7);
    pl.position.set(x,H-0.5,2.5); scene.add(pl);
  });
  const dintel=new THREE.Mesh(new THREE.BoxGeometry(W,0.18,0.18),ORO_MAT);
  dintel.position.set(0,H-0.09,2.5); scene.add(dintel);

  const letrero=new THREE.Mesh(new THREE.PlaneGeometry(3.5,0.9),
    new THREE.MeshBasicMaterial({map:makeLetreroTex(),transparent:true}));
  letrero.position.set(0,H-0.7,2.4); scene.add(letrero);

  // Suelo hexagonal
  const hexFloor=new THREE.Mesh(new THREE.CircleGeometry(3.5,6),
    new THREE.MeshStandardMaterial({color:0x0c1020,roughness:0.05,metalness:0.75}));
  hexFloor.rotation.x=-Math.PI/2; hexFloor.position.set(0,0.002,0); scene.add(hexFloor);

  // Aros de entrada
  [3.2,2.2].forEach((r,i)=>{
    const ring=new THREE.Mesh(new THREE.TorusGeometry(r,0.035,6,48),ORO_MAT);
    ring.rotation.x=Math.PI/2; ring.position.set(0,0.004,0); scene.add(ring);
  });

  // Modelo 3D de entrada — Armadura (armadura.glb)
  loadGLBModel(scene, "assets/modelados/armadura.glb", {
    x:0, z:-2, scale:2.2, rotY:Math.PI, color:0xc8a84b
  });

  // (las luces del modelo de entrada las genera loadGLBModel internamente)

  // Paneles bienvenida con imagen de fondo
  [-W/2+0.06,W/2-0.06].forEach((wx,i)=>{
    const rotY=i===0?Math.PI/2:-Math.PI/2;
    const CW=512, CH=768;
    const c=document.createElement("canvas"); c.width=CW; c.height=CH;
    const ctx=c.getContext("2d");

    function drawPanel(){
      ctx.clearRect(0,0,CW,CH);

      // Fondo: imagen o fallback negro estrellado
      if(welcomeImg){
        ctx.drawImage(welcomeImg, 0, 0, CW, CH);
      } else {
        ctx.fillStyle="#04060e"; ctx.fillRect(0,0,CW,CH);
        // Estrellas de fondo
        for(let s=0;s<120;s++){
          ctx.fillStyle=`rgba(255,255,255,${0.1+Math.random()*0.4})`;
          ctx.beginPath(); ctx.arc(Math.random()*CW,Math.random()*CH,Math.random()*1.2,0,Math.PI*2); ctx.fill();
        }
      }

      // Overlay oscuro degradado encima de la imagen
      const ov=ctx.createLinearGradient(0,0,0,CH);
      ov.addColorStop(0,"rgba(4,6,18,0.60)");
      ov.addColorStop(0.4,"rgba(4,6,18,0.78)");
      ov.addColorStop(1,"rgba(4,6,18,0.96)");
      ctx.fillStyle=ov; ctx.fillRect(0,0,CW,CH);

      // Marco dorado exterior
      ctx.strokeStyle="rgba(200,168,75,0.60)"; ctx.lineWidth=3;
      ctx.strokeRect(12,12,CW-24,CH-24);
      ctx.strokeStyle="rgba(200,168,75,0.20)"; ctx.lineWidth=1;
      ctx.strokeRect(20,20,CW-40,CH-40);

      // Esquinas decorativas doradas
      const cs=26;
      [[[12,12],[12+cs,12],[12,12+cs]],[[CW-12,12],[CW-12-cs,12],[CW-12,12+cs]],
       [[12,CH-12],[12+cs,CH-12],[12,CH-12-cs]],[[CW-12,CH-12],[CW-12-cs,CH-12],[CW-12,CH-12-cs]]]
      .forEach(pts=>{
        ctx.strokeStyle="rgba(200,168,75,0.95)"; ctx.lineWidth=2.5;
        ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]);
        ctx.lineTo(pts[1][0],pts[1][1]); ctx.moveTo(pts[0][0],pts[0][1]);
        ctx.lineTo(pts[2][0],pts[2][1]); ctx.stroke();
      });

      // Badge superior
      ctx.fillStyle="rgba(200,168,75,0.14)"; ctx.fillRect(CW/2-115,36,230,28);
      ctx.strokeStyle="rgba(200,168,75,0.40)"; ctx.lineWidth=1; ctx.strokeRect(CW/2-115,36,230,28);
      ctx.font="9px 'Orbitron',monospace"; ctx.fillStyle="rgba(200,168,75,0.88)"; ctx.textAlign="center";
      ctx.fillText("MUSEO INTERACTIVO · VIDEOJUEGOS",CW/2,55);

      // Título principal BIENVENIDO
      ctx.shadowColor="#c8a84b"; ctx.shadowBlur=26;
      ctx.font="bold 52px 'Orbitron',monospace"; ctx.fillStyle="#c8a84b";
      ctx.fillText("BIENVENIDO",CW/2,148);
      ctx.shadowBlur=0;

      // Subtítulo
      ctx.font="bold 19px 'Orbitron',monospace"; ctx.fillStyle="rgba(255,255,255,0.92)";
      ctx.shadowColor="#fff8"; ctx.shadowBlur=5;
      ctx.fillText("al Museo del Gaming",CW/2,192);
      ctx.shadowBlur=0;

      // Línea separadora
      ctx.strokeStyle="rgba(200,168,75,0.45)"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(55,218); ctx.lineTo(CW-55,218); ctx.stroke();

      // 6 épocas como lista visual
      const epocas=[
        ["#f0a030","◆  El Origen","1950–1971"],
        ["#ff4400","◆  La Era Arcade","1972–1983"],
        ["#44ff88","◆  Revolución Doméstica","1983–1995"],
        ["#4488ff","◆  La Revolución 3D","1995–2005"],
        ["#cc44ff","◆  La Era Online","2005–2015"],
        ["#00ffee","◆  El Futuro","2015–Hoy"],
      ];
      epocas.forEach(([col,titulo,years],j)=>{
        const rowY=238+j*72;
        ctx.fillStyle=col+"1a"; ctx.fillRect(44,rowY-16,CW-88,54);
        ctx.strokeStyle=col+"55"; ctx.lineWidth=1; ctx.strokeRect(44,rowY-16,CW-88,54);
        ctx.shadowColor=col; ctx.shadowBlur=8;
        ctx.fillStyle=col; ctx.font="bold 14px 'Orbitron',monospace"; ctx.textAlign="left";
        ctx.fillText(titulo,62,rowY+12);
        ctx.shadowBlur=0; ctx.fillStyle="rgba(255,255,255,0.42)";
        ctx.font="11px monospace"; ctx.textAlign="right";
        ctx.fillText(years,CW-60,rowY+12);
      });

      // Instrucciones
      ctx.fillStyle="rgba(166,182,176,0.52)"; ctx.font="11px monospace";
      ctx.textAlign="center"; ctx.shadowBlur=0;
      ctx.fillText("WASD / Flechas · Ratón · ESC",CW/2,CH-42);

      tex.needsUpdate=true;
    }

    const tex=new THREE.CanvasTexture(c);
    tex.generateMipmaps=false; tex.minFilter=THREE.LinearFilter;
    drawPanel(); // imagen ya está cargada (await en initMuseumWalk)

    const panel=new THREE.Mesh(new THREE.PlaneGeometry(2.2,3.6),
      new THREE.MeshBasicMaterial({map:tex,transparent:true}));
    panel.rotation.y=rotY; panel.position.set(wx+(i===0?0.05:-0.05),2.4,-5); scene.add(panel);
  });
}

// ═══════════════════════════════════════════════════════
//  CARGA DE MODELOS GLB — Altar futurista
// ═══════════════════════════════════════════════════════
const _gltfLoader = new GLTFLoader();


// ═══════════════════════════════════════════════════════
//  MONUMENTO FINAL — cierre visual del recorrido
// ═══════════════════════════════════════════════════════
function buildMonumentoFinal(scene, z) {
  const x = 0;
  const color = 0xffffff;

  // Base circular elevada
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.8, 0.14, 48),
    new THREE.MeshStandardMaterial({color:0x05070e, roughness:0.05, metalness:0.95})
  );
  base.position.set(x, 0.07, z); scene.add(base);

  // 5 anillos concéntricos crecientes — representan las 5 salas del recorrido
  const ringColors = [0xf0a030, 0xff4400, 0x44ff88, 0x4488ff, 0xcc44ff, 0x00ffee];
  const monRings = [];
  ringColors.forEach((col, i) => {
    const r = 0.9 + i * 0.42;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.028, 10, 72),
      new THREE.MeshStandardMaterial({color:col, emissive:col, emissiveIntensity:1.6, roughness:0.05, metalness:0.9})
    );
    ring.rotation.x = Math.PI/2;
    ring.position.set(x, 1.6, z);
    scene.add(ring);
    monRings.push({mesh:ring, phase:i*0.6, speed:0.15 + i*0.04, baseR:r});
  });

  // Esfera central brillante — el "núcleo" del museo
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.5, 3),
    new THREE.MeshStandardMaterial({color:0xffffff, emissive:0xffffff, emissiveIntensity:0.9, roughness:0.1, metalness:0.6})
  );
  core.position.set(x, 1.6, z); scene.add(core);

  // Halo de luz
  const coreLight = new THREE.PointLight(0xffffff, 10.0, 12.0);
  coreLight.position.set(x, 1.6, z); scene.add(coreLight);

  // Luces de acento de cada color rotando alrededor
  const accentLights = ringColors.slice(0,4).map((col, i) => {
    const pl = new THREE.PointLight(col, 3.5, 6.0);
    scene.add(pl);
    return {light:pl, phase:i*1.5, speed:0.3+i*0.1, r:2.2};
  });

  // Beam vertical hacia arriba — más alto que los del altar normal
  const beamMat = new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0.06, side:THREE.DoubleSide, depthWrite:false});
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.5, 6.5, 10, 1, true), beamMat);
  beam.position.set(x, 3.3, z); scene.add(beam);

  // Texto "FIN DEL RECORRIDO" — placa neon
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 0.85),
    new THREE.MeshBasicMaterial({ map: makeNeonTitleTex("Gracias por explorar", "1952—2023", "#ffffff", null, null), transparent:true })
  );
  plate.position.set(x, 3.9, z - 0.02);
  scene.add(plate);

  // Partículas ascendentes alrededor del monumento
  const pCount = 120;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(pCount*3);
  const pSpeed = new Float32Array(pCount);
  for (let i=0;i<pCount;i++){
    const ang = Math.random()*Math.PI*2, r = 1.0 + Math.random()*2.4;
    pPos[i*3]   = x + Math.cos(ang)*r;
    pPos[i*3+1] = Math.random()*4.5;
    pPos[i*3+2] = z + Math.sin(ang)*r;
    pSpeed[i]   = 0.004 + Math.random()*0.008;
  }
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos,3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({size:0.035, color:0xffffff, transparent:true, opacity:0.5}));
  scene.add(particles);

  floaters.push({
    obj: { update(t){
      monRings.forEach(r=>{
        r.mesh.rotation.z += r.speed * 0.016;
        r.mesh.material.emissiveIntensity = 1.2 + Math.sin(t*1.2+r.phase)*0.5;
      });
      core.rotation.y += 0.006; core.rotation.x += 0.003;
      core.material.emissiveIntensity = 0.7 + Math.sin(t*1.5)*0.3;
      coreLight.intensity = 8 + Math.sin(t*1.3)*3;
      accentLights.forEach(a=>{
        const ang = t*a.speed + a.phase;
        a.light.position.set(x+Math.cos(ang)*a.r, 1.6+Math.sin(t*0.6+a.phase)*0.5, z+Math.sin(ang)*a.r);
      });
      const pos = pGeo.attributes.position.array;
      for(let i=0;i<pCount;i++){ pos[i*3+1]+=pSpeed[i]; if(pos[i*3+1]>4.5) pos[i*3+1]=0; }
      pGeo.attributes.position.needsUpdate = true;
    }},
    baseY:0, phase:0, speed:0, type:"monumento"
  });
}

function loadGLBModel(scene, path, {x=0, z=0, scale=1, rotY=0, color=0xffffff} = {}) {

  // ── ALTAR FUTURISTA 3 NIVELES ────────────────────────
  [[0.92, 1.00, 0.06, 0x05070e],
   [0.72, 0.80, 0.10, 0x080c18],
   [0.52, 0.58, 0.14, 0x0c1220]].forEach(([rt, rb, h, c], i) => {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(rt, rb, h, 24),
      new THREE.MeshStandardMaterial({color:c, roughness:0.04, metalness:0.95})
    );
    m.position.set(x, h/2 + [0, 0.06, 0.16][i], z);
    scene.add(m);
  });

  // Aros concéntricos con brillo pulsante
  [[0.88, 0.022, 0.07, 1.5, 1.0],
   [0.70, 0.014, 0.13, 1.8, 1.4],
   [0.50, 0.010, 0.22, 2.5, 1.8]].forEach(([r, t, y, ei, sp], i) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, t, 8, 64),
      new THREE.MeshStandardMaterial({color, emissive:color, emissiveIntensity:ei, roughness:0.05, metalness:0.95})
    );
    ring.rotation.x = Math.PI/2;
    ring.position.set(x, y, z); scene.add(ring);
    floaters.push({obj:ring, baseY:y, phase:Math.random()*Math.PI*2+i*0.8, speed:sp, type:"glow"});
  });

  // Disco de luz en el suelo
  const discMat = new THREE.MeshBasicMaterial({color, transparent:true, opacity:0.40});
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.85, 40), discMat);
  disc.rotation.x = -Math.PI/2;
  disc.position.set(x, 0.012, z); scene.add(disc);
  floaters.push({obj:{material:discMat}, baseY:0, phase:Math.random()*Math.PI*2+2, speed:0.9, type:"glow"});

  // Beam de luz hacia arriba — delgado
  const beamMat = new THREE.MeshBasicMaterial({color, transparent:true, opacity:0.05, side:THREE.DoubleSide, depthWrite:false});
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.28, 2.8, 8, 1, true), beamMat);
  beam.position.set(x, 1.4, z); scene.add(beam);
  floaters.push({obj:{material:beamMat}, baseY:0, phase:Math.random()*Math.PI*2+3, speed:0.5, type:"glow"});

  // 4 pilares con tope brillante
  const pillarMat = new THREE.MeshStandardMaterial({color:0x0a0f1a, roughness:0.05, metalness:0.90, emissive:new THREE.Color(color), emissiveIntensity:0.10});
  [0, Math.PI/2, Math.PI, Math.PI*1.5].forEach((ang, i) => {
    const px = x + Math.cos(ang)*0.82, pz = z + Math.sin(ang)*0.82;
    scene.add(new THREE.Mesh(new THREE.CylinderGeometry(0.020,0.025,0.38,6), pillarMat));
    const last = scene.children[scene.children.length-1];
    last.position.set(px, 0.275, pz);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.038,8,8),
      new THREE.MeshStandardMaterial({color, emissive:color, emissiveIntensity:3.0, roughness:0.1, metalness:0.9}));
    cap.position.set(px, 0.57, pz); scene.add(cap);
    floaters.push({obj:cap, baseY:0.57, phase:ang*0.8, speed:2.2, type:"glow"});
  });

  // 8 chispas orbitando
  for(let i=0;i<4;i++){
    const ang=(i/8)*Math.PI*2;
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.016,5,5),
      new THREE.MeshBasicMaterial({color, transparent:true, opacity:0.95}));
    spark.position.set(x+Math.cos(ang)*0.88, 0.07, z+Math.sin(ang)*0.88);
    scene.add(spark);
    floaters.push({obj:spark, baseY:0.07, phase:ang, speed:2.5+i*0.15, type:"glow"});
  }

  // ── ILUMINACIÓN THREE-POINT CINEMATOGRÁFICA ──────────
  // KEY LIGHT: frontal-superior, blanca cálida, dominante
  const keyLight = new THREE.PointLight(0xfff8f0, 14.0, 12.0);
  keyLight.position.set(x + 1.2, 3.6, z + 2.2); scene.add(keyLight);

  // FILL LIGHT: lateral izquierda, más suave, rellena sombras
  const fillLight = new THREE.PointLight(0xdde8ff, 6.5, 8.5);
  fillLight.position.set(x - 2.2, 2.5, z + 1.0); scene.add(fillLight);

  // RIM LIGHT: desde atrás con color de zona — da silueta dramática
  const rimLight = new THREE.PointLight(color, 7.5, 7.5);
  rimLight.position.set(x, 2.8, z - 2.5); scene.add(rimLight);
  floaters.push({obj:rimLight, baseY:2.8, phase:Math.random()*Math.PI*2, speed:0.8, type:"light"});

  // GROUND LIGHT: desde abajo con color zona — efecto altar
  const groundLight = new THREE.PointLight(color, 4.5, 4.5);
  groundLight.position.set(x, 0.08, z); scene.add(groundLight);
  floaters.push({obj:groundLight, baseY:0.08, phase:Math.random()*Math.PI*2+1, speed:1.1, type:"light"});

  // HERO LIGHT: cenital blanca, define mejor la silueta del modelo
  const heroLight = new THREE.PointLight(0xffffff, 5.0, 6.0);
  heroLight.position.set(x, 6.0, z + 0.3); scene.add(heroLight);

  // ── CARGA GLB ───────────────────────────────────────
  _gltfLoader.load(
    path,
    (gltf) => {
      const model = gltf.scene;
      scene.add(model);
      model.updateMatrixWorld(true);

      const boxRaw = new THREE.Box3().setFromObject(model);
      const sizeRaw = new THREE.Vector3();
      boxRaw.getSize(sizeRaw);
      const maxDim = Math.max(sizeRaw.x, sizeRaw.y, sizeRaw.z);
      const autoScale = scale / maxDim;
      model.scale.setScalar(autoScale);
      model.updateMatrixWorld(true);

      const boxScaled = new THREE.Box3().setFromObject(model);
      const centerScaled = new THREE.Vector3();
      boxScaled.getCenter(centerScaled);

      model.position.x += x - centerScaled.x;
      model.position.z += z - centerScaled.z;
      model.position.y  = 0.22 - boxScaled.min.y + model.position.y;
      model.rotation.y  = rotY;
      model.updateMatrixWorld(true);

      model.traverse(child => {
        if (!child.isMesh) return;
        child.castShadow = false;
        child.receiveShadow = false;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(m => {
          if (!m) return;
          if (m.isMeshBasicMaterial) {
            // Preservar textura original + añadir recepción de luz
            child.material = new THREE.MeshStandardMaterial({
              map:               m.map,
              color:             m.color,
              roughness:         0.26,
              metalness:         0.24,
              emissive:          m.color,
              emissiveIntensity: 0.46, // brillo propio fuerte — visible aunque las luces no lleguen bien
            });
          } else if (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) {
            m.roughness         = Math.min(m.roughness ?? 0.6, 0.30);
            m.metalness         = Math.max(m.metalness ?? 0.0, 0.20);
            m.emissiveIntensity = 0.42; // brillo propio fuerte, estilo estatua futurista
            m.needsUpdate       = true;
          }
        });
      });

      floaters.push({obj:model, baseY:model.position.y, phase:Math.random()*Math.PI*2, speed:0.25, type:"model"});
    },
    undefined,
    (err) => {
      console.error(`[GLB ERROR] No se pudo cargar: "${path}"`, err);
      buildStatua(scene, x, z, color);
    }
  );
}

function buildStatua(scene, x, z, color) {
  const mat = new THREE.MeshStandardMaterial({color:0x8899aa,roughness:0.3,metalness:0.55,
    emissive:new THREE.Color(color),emissiveIntensity:0.06});
  [
    [new THREE.CylinderGeometry(0.45,0.5,0.25,8), OSCURO_MAT, 0,0.125],
    [new THREE.CylinderGeometry(0.12,0.15,1.0,8), mat,        0,0.75 ],
    [new THREE.CylinderGeometry(0.18,0.22,0.55,8),mat,        0,1.55 ],
    [new THREE.IcosahedronGeometry(0.22,1),        mat,        0,2.05 ],
  ].forEach(([geo,m,ox,oy])=>{
    const mesh=new THREE.Mesh(geo,m); mesh.position.set(x+ox,oy,z); scene.add(mesh);
  });
  [-0.45,0.45].forEach(bx=>{
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.042,0.052,0.6,6),mat);
    arm.rotation.z=Math.PI/2; arm.position.set(x+bx,1.72,z); scene.add(arm);
  });
  // PointLight en lugar de SpotLight (mucho más barato)
  const pl=new THREE.PointLight(new THREE.Color(color),1.0,4.5);
  pl.position.set(x,2.5,z); scene.add(pl);
}

// ═══════════════════════════════════════════════════════
//  ARCOS DE ZONA
// ═══════════════════════════════════════════════════════
function buildZoneArch(scene, zona) {
  const col=zona.color;
  const eMat=BASIC_GLOW(col);
  const zp=zona.zStart-0.5;
  const pilL=new THREE.Mesh(new THREE.BoxGeometry(0.13,H,0.13),eMat);
  pilL.position.set(-W/2+0.12,H/2,zp); scene.add(pilL);
  const pilR=new THREE.Mesh(new THREE.BoxGeometry(0.13,H,0.13),eMat);
  pilR.position.set(W/2-0.12,H/2,zp); scene.add(pilR);
  const dintel=new THREE.Mesh(new THREE.BoxGeometry(W,0.13,0.13),eMat);
  dintel.position.set(0,H-0.065,zp); scene.add(dintel);
  const banda=new THREE.Mesh(new THREE.PlaneGeometry(W,0.1),
    new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:0.7}));
  banda.rotation.x=-Math.PI/2; banda.position.set(0,0.003,zp); scene.add(banda);
  const field=new THREE.Mesh(new THREE.PlaneGeometry(W,H),
    new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.03,side:THREE.DoubleSide}));
  field.position.set(0,H/2,zp); scene.add(field);
  const lm=new THREE.Mesh(new THREE.PlaneGeometry(4,0.8),
    new THREE.MeshBasicMaterial({map:makeZoneLabelTex(zona),transparent:true}));
  lm.position.set(0,H-0.78,zp); scene.add(lm);
}

// ═══════════════════════════════════════════════════════
//  GRAFFITI
// ═══════════════════════════════════════════════════════
function buildGraffiti(scene, zona) {
  const g=zona.graffiti; if(!g) return;
  const wallX=g.x>0?W/2-0.06:-W/2+0.06;
  const rotY=g.x>0?-Math.PI/2:Math.PI/2;
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.8),
    new THREE.MeshBasicMaterial({map:makeGraffitiTexture(g.text,g.color),transparent:true,opacity:0.85}));
  plane.rotation.y=rotY; plane.position.set(wallX+(g.x>0?-0.01:0.01),2.4,g.z); scene.add(plane);
  // Sin PointLight extra para el graffiti (ahorro)
}

// ═══════════════════════════════════════════════════════
//  PANELES HOLOGRÁFICOS (simplificados, sin PointLight)
// ═══════════════════════════════════════════════════════
const holoFloaters=[];
function buildHoloPanels(scene) {
  const holoZ=[-16,-48,-80,-146,-215,-252];
  const holoCols=["#f0a030","#ff4400","#44ff88","#4488ff","#cc44ff","#00ffee"];
  const holoTitles=["EL ORIGEN","LA ARCADE","HOME","3D WORLD","ONLINE","FUTURO"];
  holoZ.forEach((z,i)=>{
    const c=document.createElement("canvas"); c.width=256; c.height=256;
    const ctx=c.getContext("2d"); ctx.clearRect(0,0,256,256);
    ctx.strokeStyle=holoCols[i]+"77"; ctx.lineWidth=1.5;
    [80,95,108].forEach(r=>{ctx.beginPath();ctx.arc(128,128,r,0,Math.PI*2);ctx.stroke();});
    ctx.font="bold 24px 'Orbitron',monospace"; ctx.textAlign="center";
    ctx.fillStyle=holoCols[i]; ctx.shadowColor=holoCols[i]; ctx.shadowBlur=12;
    ctx.fillText(holoTitles[i],128,128);
    const tex=new THREE.CanvasTexture(c); tex.generateMipmaps=false; tex.minFilter=THREE.LinearFilter;
    const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:0.45,side:THREE.DoubleSide});
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(1.3,1.3),mat);
    panel.position.set(0,H-0.45,z); panel.rotation.x=Math.PI/2; scene.add(panel);
    holoFloaters.push({obj:panel,mat,phase:i*1.1,speed:0.35});
  });
  // Marcadores de zona en suelo
  [-32,-64,-96,-196,-234].forEach((z,i)=>{
    const col=[0xf0a030,0xff4400,0x44ff88,0x4488ff,0xcc44ff][i];
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1.1,0.018,6,40),
      new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:0.55}));
    ring.rotation.x=Math.PI/2; ring.position.set(0,0.005,z); scene.add(ring);
  });
}

// ═══════════════════════════════════════════════════════
//  MURAL EN TECHO
// ═══════════════════════════════════════════════════════
function buildCeilingArt(scene, zona) {
  const zC=(zona.zStart+zona.zEnd)/2;
  const c=document.createElement("canvas"); c.width=256; c.height=128; // reducido
  const ctx=c.getContext("2d");
  const g=ctx.createRadialGradient(128,64,5,128,64,100);
  g.addColorStop(0,zona.hex+"30"); g.addColorStop(1,"transparent");
  ctx.fillStyle=g; ctx.fillRect(0,0,256,128);
  ctx.strokeStyle=zona.hex+"44"; ctx.lineWidth=1;
  [30,50,68].forEach(r=>{ctx.beginPath();ctx.arc(128,64,r,0,Math.PI*2);ctx.stroke();});
  ctx.font="bold 14px monospace"; ctx.textAlign="center";
  ctx.fillStyle=zona.hex+"88"; ctx.fillText(zona.titulo.toUpperCase(),128,62);
  ctx.font="9px monospace"; ctx.fillStyle=zona.hex+"55"; ctx.fillText(zona.subtitulo,128,78);
  const tex=new THREE.CanvasTexture(c); tex.generateMipmaps=false; tex.minFilter=THREE.LinearFilter;
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(Math.abs(zona.zEnd-zona.zStart)*0.65,W*0.45),
    new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:0.32}));
  panel.rotation.x=Math.PI/2; panel.position.set(0,H-0.01,zC); scene.add(panel);
}

// ═══════════════════════════════════════════════════════
//  VITRINAS
//  · Con video   → solo pantalla en pared + luz + placa. Sin cápsula, sin farola, sin marco 3D.
//  · Sin video   → cápsula + farola + imagen estática
// ═══════════════════════════════════════════════════════
const floaters=[];
const videoElements=[];

function buildVitrina(scene, zona, cfg) {
  const {z, x, label, year, sub, type, video, imdb, imdbLabel} = cfg;
  const col  = zona.color;
  const wallX = x > 0 ?  W/2 - 0.04 : -W/2 + 0.04;
  const rotY  = x > 0 ? -Math.PI/2   :  Math.PI/2;
  const sd    = x > 0 ? -0.015 : 0.015;   // offset mínimo desde la pared

  if (video) {
    // ════════════════════════════════════════════════════
    //  MODO VIDEO — limpio, sin nada que obstruya
    // ════════════════════════════════════════════════════
    const fW = 3.4, fH = 2.2, fY = 2.9;

    // 1. Fondo negro (pegado a la pared)
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(fW + 0.1, fH + 0.1),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    bg.rotation.y = rotY;
    bg.position.set(wallX, fY, z);
    scene.add(bg);

    // 2. Pantalla de video — lazy + canvas intermediario para mejor FPS
    const videoEl = document.createElement("video");
    videoEl.loop = true;
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.crossOrigin = "anonymous";
    videoEl.style.display = "none";
    videoEl.preload = "none";
    // Atributos que ayudan al decodificador a mantener FPS estable
    videoEl.setAttribute("playsinline", "");
    videoEl.setAttribute("webkit-playsinline", "");
    videoEl.disablePictureInPicture = true;
    document.body.appendChild(videoEl);

    // Canvas intermediario 640×360 — el navegador decodifica a resolución reducida
    // y la textura de Three.js es más liviana. Mejora FPS en pantallas con video 1080p
    const vCanvas = document.createElement("canvas");
    vCanvas.width = 640; vCanvas.height = 360;
    const vCtx2d = vCanvas.getContext("2d");

    // VideoTexture sobre el canvas (no el video directo)
    const vTex = new THREE.CanvasTexture(vCanvas);
    vTex.minFilter = THREE.LinearFilter;
    vTex.magFilter = THREE.LinearFilter;
    vTex.colorSpace = THREE.SRGBColorSpace;

    // Función para copiar frame del video al canvas
    let _vFramePending = false;
    const _updateVFrame = () => {
      if (videoEl.readyState >= 2 && !videoEl.paused) {
        vCtx2d.drawImage(videoEl, 0, 0, 640, 360);
        vTex.needsUpdate = true;
      }
      _vFramePending = false;
    };
    // Guardar referencia en el video element para llamar desde el loop
    videoEl._updateFrame = _updateVFrame;
    videoEl._framePending = () => _vFramePending;
    videoEl._setFramePending = (v) => { _vFramePending = v; };

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(fW, fH),
      new THREE.MeshBasicMaterial({ map: vTex })
    );
    screen.rotation.y = rotY;
    screen.position.set(wallX + sd, fY, z);
    scene.add(screen);

    // 3. Borde de color del cuadro — 4 PlaneGeometry planos (sin profundidad)
    const bMat = new THREE.MeshBasicMaterial({ color: col });
    const bT = 0.06; // grosor del borde
    [
      // [ancho, alto, desplazamiento Y, desplazamiento Z]
      [fW + bT*2, bT,  fH/2 + bT/2,  0      ],  // arriba
      [fW + bT*2, bT, -fH/2 - bT/2,  0      ],  // abajo
      [bT,  fH + bT*2, 0,             fW/2 + bT/2 ],  // derecha (en Z)
      [bT,  fH + bT*2, 0,            -fW/2 - bT/2 ],  // izquierda (en Z)
    ].forEach(([pw, ph, dy, dz]) => {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), bMat.clone());
      b.rotation.y = rotY;
      b.position.set(wallX + sd * 0.5, fY + dy, z + dz);
      scene.add(b);
    });

    // 4. Título NEON debajo del video — grande y llamativo
    const plateH = imdb ? 0.75 : 0.52;
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(fW * 0.92, plateH),
      new THREE.MeshBasicMaterial({ map: makeNeonTitleTex(label, year, zona.hex, imdb, imdbLabel), transparent: true })
    );
    plate.rotation.y = rotY;
    plate.position.set(wallX + sd, fY - fH / 2 - plateH/2 - 0.12, z);
    scene.add(plate);

    // 5. Dos luces — una general y una de acento de color
    const mainL = new THREE.PointLight(0xfff8ee, 1.2, 5);
    mainL.position.set(wallX + (x > 0 ? -1.0 : 1.0), fY + 0.8, z);
    scene.add(mainL);

    const colL = new THREE.PointLight(col, 0.4, 3);
    colL.position.set(wallX + (x > 0 ? -0.5 : 0.5), fY - 0.5, z);
    scene.add(colL);

    // Posición 3D de la pantalla para cálculo de distancia real
    const screenPosX = wallX;
    const screenPosZ = z;
    videoElements.push({
      videoEl, texture: vTex, zoneId: zona.id,
      src: video, videoZ: z, videoX: x,
      screenX: screenPosX, screenZ: screenPosZ,
      label,           // para que updateGaze identifique qué panel es
      active: false, buffering: false,
      gainNode: null, sourceNode: null,
      volume: 0,
    });

  } else {
    // ════════════════════════════════════════════════════
    //  MODO SIN VIDEO — cápsula + farola + imagen
    // ════════════════════════════════════════════════════
    const capX = x > 0 ? W/2 - 2.2 : -W/2 + 2.2;

    // Pedestal
    const pedMat = new THREE.MeshStandardMaterial({color:0x0e1422,roughness:0.1,metalness:0.4});
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.48,0.54,1.0,8),pedMat);
    ped.position.set(capX,0.5,z); scene.add(ped);

    const ringG = new THREE.Mesh(new THREE.TorusGeometry(0.5,0.018,6,36),ORO_MAT);
    ringG.rotation.x=Math.PI/2; ringG.position.set(capX,1.01,z); scene.add(ringG);

    // Cápsula
    const cH = 1.6;
    const glassMat = new THREE.MeshPhysicalMaterial({
      color:0xaaccff,transparent:true,opacity:0.07,
      roughness:0,metalness:0,transmission:0.88,thickness:0.4,side:THREE.DoubleSide
    });
    const capsule = new THREE.Mesh(new THREE.CylinderGeometry(0.44,0.44,cH,10,1,true),glassMat);
    capsule.position.set(capX,1.01+cH/2,z); scene.add(capsule);
    [[-Math.PI/2,cH],[Math.PI/2,0]].forEach(([rx,dy])=>{
      const d=new THREE.Mesh(new THREE.CircleGeometry(0.44,10),glassMat.clone());
      d.rotation.x=rx; d.position.set(capX,1.01+dy,z); scene.add(d);
    });

    // Aro pulsante
    const ringCol=new THREE.Mesh(new THREE.TorusGeometry(0.46,0.014,6,36),
      new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:0.6,roughness:0.15,metalness:0.7}));
    ringCol.rotation.x=Math.PI/2; ringCol.position.set(capX,1.01+cH*0.5,z); scene.add(ringCol);
    floaters.push({obj:ringCol,baseY:ringCol.position.y,phase:Math.random()*Math.PI*2,speed:0.85,type:"ring"});

    // Objeto
    const objY=1.01+cH*0.38;
    if      (type==="arcade") buildArcadeObj(scene,capX,objY,z,col);
    else if (type==="phone")  buildPhoneObj (scene,capX,objY,z,col);
    else                      buildOrbObj   (scene,capX,objY,z,col);

    // Farola
    const poleX=wallX*0.78;
    const armDir=x>0?-1:1;
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.028,H*0.78,8),ORO_MAT);
    pole.position.set(poleX,H*0.39,z); scene.add(pole);
    const bCurve=new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(poleX,H*0.82,z),
      new THREE.Vector3(poleX+armDir*0.6,H*0.88,z),
      new THREE.Vector3(capX,H*0.82,z)
    );
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(bCurve,6,0.014,4),ORO_MAT));
    const lampY=H*0.61;
    const shade=new THREE.Mesh(new THREE.ConeGeometry(0.30,0.28,8,1,true),
      new THREE.MeshStandardMaterial({color:0x1a1008,roughness:0.35,metalness:0.65,side:THREE.DoubleSide}));
    shade.rotation.x=Math.PI; shade.position.set(capX,lampY+0.14,z); scene.add(shade);
    const bulb=new THREE.Mesh(new THREE.SphereGeometry(0.06,6,6),
      new THREE.MeshStandardMaterial({color:0xfff8dc,emissive:0xfff8dc,emissiveIntensity:2.5}));
    bulb.position.set(capX,lampY,z); scene.add(bulb);
    // PointLight simple en vez de SpotLight — mucho más barato
    const lampL=new THREE.PointLight(0xfff5e0,2.5,5.5);
    lampL.position.set(capX,lampY,z); scene.add(lampL);
    const accent=new THREE.PointLight(col,0.4,3.0);
    accent.position.set(capX,1.5,z); scene.add(accent);

    // Imagen estática en pared
    const fW=3.2, fH=2.1, fY=2.8;
    const bg2=new THREE.Mesh(new THREE.PlaneGeometry(fW,fH),
      new THREE.MeshBasicMaterial({color:0x000000}));
    bg2.rotation.y=rotY; bg2.position.set(wallX,fY,z); scene.add(bg2);
    const interior=new THREE.Mesh(new THREE.PlaneGeometry(fW,fH),
      new THREE.MeshBasicMaterial({map:makeFrameTex(label,year,sub,zona.hex),transparent:true}));
    interior.rotation.y=rotY; interior.position.set(wallX+sd,fY,z); scene.add(interior);

    // Luz sobre el cuadro estático — solo en vitrinas con video, las sin video tienen la farola
    if(video){
    const picL=new THREE.PointLight(0xfff8ee,0.7,4);
    picL.position.set(wallX+(x>0?-0.8:0.8),fY+0.6,z); scene.add(picL);
    }
  }
}

// Panel de video independiente en pared (sin vitrina, solo pantalla + marco)
function buildVideoPanel(scene, {z, x, rotY, video, label, year, hex}) {
  const fW=2.4, fH=1.6, fY=2.5;
  const wallX = x > 0 ? W/2-0.04 : -W/2+0.04;
  const sd = x > 0 ? -0.015 : 0.015;
  const col = new THREE.Color(hex);

  // Fondo negro detrás del video
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(fW+0.06, fH+0.06),
    new THREE.MeshBasicMaterial({color:0x000000}));
  bg.rotation.y=rotY; bg.position.set(wallX+sd*0.3, fY, z); scene.add(bg);

  // Marco: 4 barras PlaneGeometry planas (SIN profundidad, nunca tapan)
  const bT = 0.055;
  const bMat = new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:0.55,roughness:0.15});
  [
    [fW+bT*2, bT,   fH/2+bT/2,  0         ],  // arriba
    [fW+bT*2, bT,  -fH/2-bT/2,  0         ],  // abajo
    [bT, fH+bT*2,   0,           fW/2+bT/2 ],  // derecha
    [bT, fH+bT*2,   0,          -fW/2-bT/2 ],  // izquierda
  ].forEach(([pw, ph, dy, dz])=>{
    const b = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), bMat.clone());
    b.rotation.y = rotY;
    b.position.set(wallX+sd*0.5, fY+dy, z+dz);
    scene.add(b);
  });

  // Esquinas doradas
  const cornerMat = new THREE.MeshStandardMaterial({color:0xc8a84b,emissive:0xc8a84b,emissiveIntensity:0.4,roughness:0.2,metalness:0.9});
  [[fH/2, fW/2],[fH/2,-fW/2],[-fH/2, fW/2],[-fH/2,-fW/2]].forEach(([dy,dz])=>{
    const c2 = new THREE.Mesh(new THREE.PlaneGeometry(0.12,0.12),cornerMat);
    c2.rotation.y=rotY; c2.position.set(wallX+sd*0.6, fY+dy, z+dz); scene.add(c2);
  });

  // Video — lazy load + canvas intermediario
  const videoEl=document.createElement("video");
  videoEl.loop=true; videoEl.muted=true;
  videoEl.playsInline=true; videoEl.crossOrigin="anonymous";
  videoEl.preload="none";
  videoEl.setAttribute("playsinline","");
  videoEl.disablePictureInPicture=true;
  videoEl.style.display="none"; document.body.appendChild(videoEl);
  const vCanvas=document.createElement("canvas"); vCanvas.width=640; vCanvas.height=360;
  const vCtx2d=vCanvas.getContext("2d");
  const vTex=new THREE.CanvasTexture(vCanvas);
  vTex.minFilter=THREE.LinearFilter; vTex.magFilter=THREE.LinearFilter;
  vTex.colorSpace=THREE.SRGBColorSpace;
  const _upF=()=>{if(videoEl.readyState>=2&&!videoEl.paused){vCtx2d.drawImage(videoEl,0,0,640,360);vTex.needsUpdate=true;}};
  videoEl._updateFrame=_upF;
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(fW,fH),
    new THREE.MeshBasicMaterial({map:vTex}));
  screen.rotation.y=rotY; screen.position.set(wallX+sd, fY, z); scene.add(screen);

  // Placa NEON debajo
  const plateH = 0.48;
  const plate=new THREE.Mesh(new THREE.PlaneGeometry(fW*0.88, plateH),
    new THREE.MeshBasicMaterial({map:makeNeonTitleTex(label, year, hex), transparent:true}));
  plate.rotation.y=rotY; plate.position.set(wallX+sd, fY-fH/2-plateH/2-0.1, z); scene.add(plate);

  // Luz suave sobre el cuadro
  const pl = new THREE.PointLight(col, 0.6, 4);
  pl.position.set(wallX+(x>0?-0.8:0.8), fY+0.6, z); scene.add(pl);

  videoElements.push({
    videoEl, texture:vTex, zoneId:"panel",
    src:video, videoZ:z, videoX:x,
    screenX: wallX, screenZ: z,
    active:false,
    gainNode:null, sourceNode:null, volume:0,
    noAudio: true,  // Alan Turing: solo video, sin audio — el narrador habla por él
    label: label,   // para updateGaze
  });
}

function buildOrbObj(scene,x,y,z,col){
  const m=new THREE.Mesh(new THREE.IcosahedronGeometry(0.36,1),
    new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:0.5,roughness:0.15,metalness:0.7}));
  m.position.set(x,y,z); scene.add(m);
  floaters.push({obj:m,baseY:y,phase:Math.random()*Math.PI*2,speed:0.6,type:"model"});
}
function buildArcadeObj(scene,x,y,z,col){
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.68,1.45,0.46),
    new THREE.MeshStandardMaterial({color:0x080808,roughness:0.5}));
  body.position.set(x,y+.72,z); scene.add(body);
  const scr=new THREE.Mesh(new THREE.PlaneGeometry(0.42,0.35),
    new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:1.0}));
  scr.position.set(x,y+1.08,z+.24); scene.add(scr);
  floaters.push({obj:body,baseY:body.position.y,phase:Math.random()*Math.PI*2,speed:0.5,type:"model"});
}
function buildPhoneObj(scene,x,y,z,col){
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.62,0.048),
    new THREE.MeshStandardMaterial({color:0x111111,roughness:0.2,metalness:0.8}));
  body.position.set(x,y+.31,z); scene.add(body);
  const scr=new THREE.Mesh(new THREE.PlaneGeometry(0.24,0.54),
    new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:0.75}));
  scr.position.set(x,y+.31,z+.026); scene.add(scr);
  floaters.push({obj:body,baseY:body.position.y,phase:Math.random()*Math.PI*2,speed:0.5,type:"model"});
}

// ═══════════════════════════════════════════════════════
//  PARTÍCULAS — solo la zona actual animada
// ═══════════════════════════════════════════════════════
function buildZoneParticles(scene, zona) {
  const count=40; // reducido de 70
  const geo=new THREE.SphereGeometry(0.022,3,3); // 3 segmentos en vez de 4
  const mat=new THREE.MeshBasicMaterial({color:zona.color,transparent:true,opacity:0.40});
  const im=new THREE.InstancedMesh(geo,mat,count);
  const dum=new THREE.Object3D();
  const range=Math.abs(zona.zEnd-zona.zStart);
  const pos=[];
  for(let i=0;i<count;i++){
    const px=(Math.random()-.5)*(W-1.2);
    const py=0.3+Math.random()*(H-0.8);
    const pz=zona.zStart-Math.random()*range;
    pos.push(px,py,pz);
    dum.position.set(px,py,pz); dum.updateMatrix(); im.setMatrixAt(i,dum.matrix);
  }
  im.instanceMatrix.needsUpdate=true; scene.add(im);
  return{im,pos,count,zona};
}

// ═══════════════════════════════════════════════════════
//  ILUMINACIÓN BASE (reducida — 5 luces en vez de 10)
// ═══════════════════════════════════════════════════════
function buildLighting(scene) {
  scene.add(new THREE.AmbientLight(0x0a1428,2.2));       // ambient reducido — más contraste dramático
  scene.add(new THREE.HemisphereLight(0x1a2a50,0x030509,0.75));
  for(let z=-10;z>-L;z-=55){
    // Alternar entre azul y cyan para dar variedad atmosférica
    const col = Math.abs(z/55)%2===0 ? 0x4466ff : 0x00aacc;
    const pl=new THREE.PointLight(col,1.0,26);
    pl.position.set(0,H-0.3,z); scene.add(pl);
  }
}

// ═══════════════════════════════════════════════════════
//  PANTALLA DE INTRO
// ═══════════════════════════════════════════════════════
function showIntroScreen(onEnterClick) {
  return new Promise(resolve=>{
    const ov=document.createElement("div");
    ov.id="museum-intro";
    ov.style.cssText=`position:fixed;inset:0;z-index:200;display:flex;flex-direction:column;
      align-items:center;justify-content:center;
      font-family:'Orbitron',sans-serif;color:#fff;transition:opacity .8s;
      overflow:hidden;`;

    // Imagen de fondo con overlay oscuro
    ov.innerHTML=`
      <div id="intro-bg" style="position:absolute;inset:0;z-index:0;
        background:url('assets/imagenes/imagen1.png') center/cover no-repeat;
        filter:brightness(0.38) saturate(1.1);"></div>
      <div style="position:absolute;inset:0;z-index:1;
        background:linear-gradient(to bottom, rgba(4,6,12,0.55) 0%, rgba(4,6,12,0.82) 60%, rgba(4,6,12,0.97) 100%);"></div>

      <div style="position:relative;z-index:2;text-align:center;max-width:660px;padding:32px 28px">

        <div style="font-size:10px;letter-spacing:.35em;color:#58f0c4;margin-bottom:14px;opacity:.8;
          text-shadow:0 0 12px #58f0c4aa">MUSEO INTERACTIVO · HISTORIA DE LOS VIDEOJUEGOS</div>

        <h1 style="font-size:clamp(26px,5vw,52px);font-weight:900;margin-bottom:10px;
          background:linear-gradient(90deg,#58f0c4,#ffffff,#58f0c4);
          -webkit-background-clip:text;background-clip:text;color:transparent;
          line-height:1.1;text-shadow:none;filter:drop-shadow(0 0 18px #58f0c466)">
          Bienvenido al<br/>Museo del Gaming</h1>

        <p style="font-size:13px;color:#c8d8d2;font-family:'Space Mono',monospace;
          line-height:1.8;margin-bottom:26px;text-shadow:0 1px 8px rgba(0,0,0,0.9)">
          Recorre <strong style="color:#58f0c4;text-shadow:0 0 8px #58f0c488">6 épocas</strong>
          de la historia de los videojuegos.<br/>
          Acércate a las vitrinas para descubrir datos históricos.<br/>
          <strong style="color:#f5c518;text-shadow:0 0 8px #f5c51877">
            🔊 El audio se activa al hacer clic en "Entrar".</strong>
        </p>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;
          margin-bottom:28px;max-width:480px;margin-left:auto;margin-right:auto">
          ${[["W / ↑","Avanzar",0],["S / ↓","Retroceder",60],
             ["A / ←","Izquierda",120],["D / →","Derecha",180],
             ["🖱️ Ratón","Mirar",240],["ESC","Cursor",300]].map(([k,d,dl])=>`
            <div style="display:flex;flex-direction:column;align-items:center;gap:5px;
              background:rgba(88,240,196,.07);border:1px solid rgba(88,240,196,.18);
              border-radius:10px;padding:9px 10px;
              opacity:0;animation:fadeUp .4s ease ${dl}ms forwards;
              backdrop-filter:blur(8px);">
              <span style="font-family:'Space Mono',monospace;font-size:11px;color:#58f0c4;
                background:rgba(88,240,196,.12);border:1px solid rgba(88,240,196,.35);
                border-radius:5px;padding:3px 8px;white-space:nowrap;
                text-shadow:0 0 6px #58f0c4">${k}</span>
              <span style="font-family:'Space Mono',monospace;font-size:10px;color:#a6b6b0">${d}</span>
            </div>`).join("")}
        </div>

        <button id="btn-entrar" style="font-family:'Orbitron',sans-serif;font-size:15px;font-weight:700;
          background:linear-gradient(135deg,#0f6b4f,#58f0c4);color:#041008;border:0;
          border-radius:14px;padding:17px 58px;cursor:pointer;letter-spacing:.06em;
          box-shadow:0 0 40px rgba(88,240,196,.5),0 14px 40px rgba(0,0,0,.6);
          opacity:0;animation:fadeUp .5s ease 380ms forwards;
          transition:transform .2s,box-shadow .2s;">
          🏛️ &nbsp;Entrar al Museo</button>

      </div>
      <style>
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
      </style>`;
    document.body.appendChild(ov);
    const btn=ov.querySelector("#btn-entrar");
    btn.addEventListener("mouseenter",()=>{btn.style.transform="translateY(-2px)";btn.style.boxShadow="0 20px 50px rgba(88,240,196,.55)";});
    btn.addEventListener("mouseleave",()=>{btn.style.transform="";btn.style.boxShadow="0 14px 40px rgba(88,240,196,.4)";});
    btn.addEventListener("click",()=>{
      // onEnter se llama SINCRÓNICAMENTE dentro del handler del click
      // para cumplir con la política de autoplay del navegador
      if(typeof onEnterClick === "function") onEnterClick();
      ov.style.opacity="0";
      setTimeout(()=>{ov.remove();resolve();},800);
    });
  });
}

// ═══════════════════════════════════════════════════════
//  UI
// ═══════════════════════════════════════════════════════
function createUI() {
  const card=document.createElement("div"); card.id="museum-card";
  card.style.cssText=`position:fixed;bottom:90px;left:50%;transform:translateX(-50%) translateY(22px);
    width:min(600px,92vw);background:rgba(4,6,12,.96);border:1px solid rgba(255,255,255,.09);
    border-radius:20px;padding:20px 24px;backdrop-filter:blur(22px);
    box-shadow:0 20px 70px rgba(0,0,0,.92);opacity:0;
    transition:opacity .45s,transform .45s;pointer-events:all;z-index:50;font-family:'Space Mono',monospace;`;
  document.body.appendChild(card);

  const hud=document.createElement("div"); hud.id="museum-hud";
  hud.style.cssText=`position:fixed;top:70px;right:22px;background:rgba(4,6,12,.9);
    border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:13px 18px;
    backdrop-filter:blur(14px);font-family:'Orbitron',sans-serif;text-align:right;
    z-index:50;min-width:185px;transition:border-color .7s;`;
  document.body.appendChild(hud);

  const barW=document.createElement("div");
  barW.style.cssText=`position:fixed;bottom:0;left:0;right:0;height:3px;background:rgba(255,255,255,.06);z-index:50;`;
  const fill=document.createElement("div"); fill.id="hud-fill";
  fill.style.cssText=`height:100%;width:0%;transition:width .5s,background .7s;border-radius:2px;`;
  barW.appendChild(fill); document.body.appendChild(barW);
  return{card,hud,fill};
}

let _cardVisible=false;
let _cardAnimFrame=null;

function showCard(card, titulo, texto, hex, extra){
  // Cancelar animación previa si existe
  if(_cardAnimFrame){ cancelAnimationFrame(_cardAnimFrame); _cardAnimFrame=null; }

  const esBeneficio = titulo.toLowerCase().includes("cognitivo") ||
                      titulo.toLowerCase().includes("científico") ||
                      titulo.toLowerCase().includes("beneficio");

  card.innerHTML = esBeneficio
    ? _buildCognCard(titulo, texto, hex, extra)
    : _buildNormalCard(titulo, texto, hex, extra);

  card.style.borderColor = hex+"55";
  card.style.opacity     = "1";
  card.style.transform   = "translateX(-50%) translateY(0)";
  _cardVisible = true;

  // Si es beneficio cognitivo, animar el canvas de fondo
  if(esBeneficio){
    const cvs = card.querySelector("#cog-bg");
    if(cvs) _animCognBg(cvs, hex);
  }
}

function _buildNormalCard(titulo, texto, hex, extra){
  return `<div style="position:relative;overflow:hidden">
    <div style="font-size:8px;letter-spacing:.28em;color:${hex};font-family:'Orbitron',sans-serif;
      margin-bottom:7px;opacity:.75">MUSEO · DATO HISTÓRICO</div>
    <div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:8px;
      font-family:'Orbitron',sans-serif;line-height:1.35;
      text-shadow:0 0 12px ${hex}55">${titulo}</div>
    <div style="font-size:12px;color:#c8d4ce;line-height:1.82">${texto}</div>
    <div style="margin-top:11px;height:1.5px;
      background:linear-gradient(90deg,${hex},${hex}44,transparent);border-radius:2px;"></div>

  </div>`;
}

function _buildCognCard(titulo, texto, hex, extra){
  return `<div style="position:relative;max-height:62vh;overflow-y:auto;scrollbar-width:thin;scrollbar-color:${hex} transparent">

    <!-- Canvas wireframe de fondo -->
    <canvas id="cog-bg" width="530" height="200"
      style="position:absolute;inset:0;width:100%;height:100%;opacity:0.18;pointer-events:none;"></canvas>

    <!-- Contenido -->
    <div style="position:relative;z-index:2">
      <!-- Badge superior -->
      <div style="display:inline-flex;align-items:center;gap:7px;
        background:linear-gradient(90deg,${hex}22,transparent);
        border:1px solid ${hex}44;border-radius:20px;
        padding:4px 13px;margin-bottom:10px">
        <span style="font-family:'Orbitron',sans-serif;font-size:10px;font-weight:900;letter-spacing:.12em">COGN</span>
        <span style="font-size:8px;letter-spacing:.28em;color:${hex};
          font-family:'Orbitron',sans-serif;font-weight:700">BENEFICIOS COGNITIVOS</span>
      </div>

      <div style="font-size:15px;font-weight:900;color:#fff;margin-bottom:12px;
        font-family:'Orbitron',sans-serif;line-height:1.3;
        text-shadow:0 0 16px ${hex}66">${titulo}</div>

      <!-- Métricas en grid -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">
        ${[["👁️","58%","Resolución visual"],["⚡","25%","Velocidad cognitiva"],["🎯","12+","Países replicado"]]
          .map(([ic,val,lab])=>`
          <div style="background:${hex}11;border:1px solid ${hex}33;border-radius:10px;
            padding:8px 6px;text-align:center">
            <div style="font-size:16px">${ic}</div>
            <div style="font-size:18px;font-weight:900;color:${hex};font-family:'Orbitron',sans-serif;
              text-shadow:0 0 10px ${hex}">${val}</div>
            <div style="font-size:9px;color:#a6b6b0;font-family:'Space Mono',monospace;
              margin-top:2px">${lab}</div>
          </div>`).join("")}
      </div>

      <div style="font-size:11.5px;color:#c8d4ce;line-height:1.85;
        border-left:2px solid ${hex}66;padding-left:10px">${texto}</div>

      <div style="margin-top:10px;font-size:9px;color:${hex}88;font-family:'Orbitron',monospace;
        letter-spacing:.15em">FUENTE: U. ROCHESTER · BAVELIER LAB · 2012</div>
      ${extra ? `
      <div id="card-extra-btn" onclick="
        var ex=document.getElementById('card-extra-text');
        var btn=document.getElementById('card-extra-btn');
        if(ex.style.display==='none'||!ex.style.display){
          ex.style.display='block'; btn.textContent='CERRAR';
          btn.style.background='${hex}33';
        } else {
          ex.style.display='none'; btn.textContent='SABER MAS +';
          btn.style.background='transparent';
        }
      " style="margin-top:10px;cursor:pointer;font-family:'Orbitron',sans-serif;
        font-size:8px;letter-spacing:.2em;color:${hex};border:1px solid ${hex}44;
        border-radius:6px;padding:5px 12px;display:inline-block;
        transition:background .2s;background:transparent;user-select:none">SABER MAS +</div>
      <div id="card-extra-text" style="display:none;margin-top:10px;
        font-size:11px;color:#b0c4bc;line-height:1.8;
        border-left:2px solid ${hex}44;padding-left:10px">${extra}</div>
      ` : ''}
    </div>
  </div>`;
}

// Canvas animado tipo wireframe para la card cognitiva
function _animCognBg(cvs, hex){
  const ctx2 = cvs.getContext("2d");
  const W2=cvs.width, H2=cvs.height;
  const pts = Array.from({length:22},()=>({
    x:Math.random()*W2, y:Math.random()*H2,
    vx:(Math.random()-.5)*0.4, vy:(Math.random()-.5)*0.4
  }));
  let t2=0;
  function frame(){
    ctx2.clearRect(0,0,W2,H2);
    pts.forEach(p=>{ p.x+=p.vx; p.y+=p.vy;
      if(p.x<0||p.x>W2) p.vx*=-1;
      if(p.y<0||p.y>H2) p.vy*=-1;
    });
    // Líneas entre puntos cercanos
    ctx2.strokeStyle=hex;
    pts.forEach((a,i)=>pts.slice(i+1).forEach(b=>{
      const d=Math.hypot(a.x-b.x,a.y-b.y);
      if(d<110){
        ctx2.globalAlpha=(1-d/110)*0.6;
        ctx2.lineWidth=0.7;
        ctx2.beginPath(); ctx2.moveTo(a.x,a.y); ctx2.lineTo(b.x,b.y); ctx2.stroke();
      }
    }));
    // Puntos
    ctx2.globalAlpha=0.7; ctx2.fillStyle=hex;
    pts.forEach(p=>{ ctx2.beginPath(); ctx2.arc(p.x,p.y,1.5,0,Math.PI*2); ctx2.fill(); });
    ctx2.globalAlpha=1;
    t2++;
    _cardAnimFrame = requestAnimationFrame(frame);
  }
  frame();
}

function hideCard(card){
  if(!_cardVisible)return;
  _cardVisible=false;
  if(_cardAnimFrame){ cancelAnimationFrame(_cardAnimFrame); _cardAnimFrame=null; }
  card.style.opacity="0";
  card.style.transform="translateX(-50%) translateY(22px)";
}

function updateHUD(hud,fill,zona,prog){
  hud.innerHTML=`
    <div style="font-size:9px;letter-spacing:.2em;color:${zona.hex};opacity:.7;margin-bottom:4px">ZONA ACTUAL</div>
    <div style="font-size:13px;font-weight:900;color:#fff;margin-bottom:2px">${zona.titulo}</div>
    <div style="font-size:10px;color:#a6b6b0">${zona.subtitulo}</div>`;
  hud.style.borderColor=zona.hex+"44";
  fill.style.width=Math.min(100,prog*100)+"%";
  fill.style.background=`linear-gradient(90deg,${zona.hex},#fff)`;
}

// ═══════════════════════════════════════════════════════
//  CONTROLES
// ═══════════════════════════════════════════════════════
function createControls(camera,canvas){
  const keys={};
  let yaw=0,pitch=0,locked=false;
  const fwd=new THREE.Vector3(), rt=new THREE.Vector3();
  canvas.addEventListener("click",()=>canvas.requestPointerLock());
  document.addEventListener("pointerlockchange",()=>{
    locked=document.pointerLockElement===canvas;
    document.body.classList.toggle("museo-activo",locked);
  });
  document.addEventListener("mousemove",e=>{
    if(!locked)return;
    yaw-=e.movementX*.0016; pitch-=e.movementY*.0016;
    pitch=Math.max(-.55,Math.min(.45,pitch));
    camera.rotation.order="YXZ"; camera.rotation.y=yaw; camera.rotation.x=pitch;
  });
  const kd=e=>{keys[e.code]=true;}; const ku=e=>{keys[e.code]=false;};
  window.addEventListener("keydown",kd); window.addEventListener("keyup",ku);
  function update(dt){
    fwd.set(-Math.sin(yaw),0,-Math.cos(yaw)); rt.set(Math.cos(yaw),0,-Math.sin(yaw));
    const dir=new THREE.Vector3();
    if(keys["KeyW"]||keys["ArrowUp"])   dir.add(fwd);
    if(keys["KeyS"]||keys["ArrowDown"]) dir.sub(fwd);
    if(keys["KeyA"]||keys["ArrowLeft"]) dir.sub(rt);
    if(keys["KeyD"]||keys["ArrowRight"])dir.add(rt);
    if(dir.lengthSq()>0){
      dir.normalize().multiplyScalar(5.5*dt);
      camera.position.add(dir);
      camera.position.x=Math.max(-2.8,Math.min(2.8,camera.position.x));
      camera.position.z=Math.max(-L+3,Math.min(1.8,camera.position.z));
      camera.position.y=1.72;
    }
  }
  return{update,destroy(){window.removeEventListener("keydown",kd);window.removeEventListener("keyup",ku);}};
}

// ═══════════════════════════════════════════════════════
//  INIT PRINCIPAL
// ═══════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════
//  FLECHAS NEON EN EL SUELO — guían al usuario
// ═══════════════════════════════════════════════════════
const ARROW_INTERVAL = 22; // cada 22u
const ARROW_TOTAL    = 12; // sets de 3 flechas
const _arrowMeshes   = []; // { meshes:[], z }

function buildFloorArrows(scene) {
  // Materiales compartidos para las 3 flechas de cada set
  // Color neutro blanco — se tiñe con emissive
  const arrowShape = new THREE.Shape();
  // rotation.x=-PI/2 mapea Y_local → +Z_mundo, Y-_local → -Z_mundo (adelante)
  // Por eso la punta va en Y- y la cola en Y+
  arrowShape.moveTo( 0,    -0.35); // PUNTA → apunta hacia -Z (adelante)
  arrowShape.lineTo( 0.22,  0);
  arrowShape.lineTo( 0.10,  0);
  arrowShape.lineTo( 0.10,  0.30); // cola
  arrowShape.lineTo(-0.10,  0.30);
  arrowShape.lineTo(-0.10,  0);
  arrowShape.lineTo(-0.22,  0);
  arrowShape.closePath();

  const arrowGeo = new THREE.ShapeGeometry(arrowShape);

  for(let s = 0; s < ARROW_TOTAL; s++) {
    const zPos = -8 - s * ARROW_INTERVAL;
    const setMeshes = [];

    // 3 flechas escalonadas en Z (efecto secuencial al parpadear)
    for(let a = 0; a < 3; a++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(arrowGeo, mat);
      mesh.rotation.x = -Math.PI / 2; // plano horizontal
      mesh.rotation.z = 0;            // punta hacia -Z (adelante en Three.js)
      mesh.position.set(0, 0.035, zPos - a * 0.55);
      scene.add(mesh);
      setMeshes.push({ mesh, mat, phase: a });
    }
    _arrowMeshes.push({ meshes: setMeshes, z: zPos });
  }
}

function updateArrows(t, camZ, zonaColor) {
  // Color de la zona actual
  const c = new THREE.Color(zonaColor ?? 0x58f0c4);

  _arrowMeshes.forEach(set => {
    // Solo animar si está cerca (< 30u)
    if(Math.abs(set.z - camZ) > 30) {
      set.meshes.forEach(({mat}) => { mat.opacity = 0; });
      return;
    }

    set.meshes.forEach(({mesh, mat, phase}) => {
      // Parpadeo secuencial: cada flecha desfasada 0.35s
      const pulse = (Math.sin((t * 2.8) - phase * 1.1) + 1) / 2;
      mat.color.copy(c);
      mat.opacity = 0.15 + pulse * 0.65;
    });
  });
}

// ═══════════════════════════════════════════════════════
//  SISTEMA DE MONEDAS COLECCIONABLES
// ═══════════════════════════════════════════════════════
const COINS_CONFIG = [
  { z:-8,   color:0xf0a030, label:"Origen"  },
  { z:-22,  color:0xf0a030, label:"Origen"  },
  { z:-38,  color:0xff4400, label:"Arcade"  },
  { z:-52,  color:0xff4400, label:"Arcade"  },
  { z:-60,  color:0xff4400, label:"Arcade"  },
  { z:-72,  color:0x44ff88, label:"Consolas"},
  { z:-85,  color:0x44ff88, label:"Consolas"},
  { z:-112, color:0x4488ff, label:"3D"      },
  { z:-130, color:0x4488ff, label:"3D"      },
  { z:-148, color:0x4488ff, label:"3D"      },
  { z:-162, color:0x4488ff, label:"3D"      },
  { z:-176, color:0x4488ff, label:"3D"      },
  { z:-202, color:0xcc44ff, label:"Online"  },
  { z:-218, color:0xcc44ff, label:"Online"  },
  { z:-240, color:0x00ffee, label:"Futuro"  },
  { z:-255, color:0x00ffee, label:"Futuro"  },
];

const _coinMeshes = [];
let _coinsCollected = 0;
const _COIN_RADIUS = 3.0; // radio generoso para detección fiable

function buildCoins(scene) {
  COINS_CONFIG.forEach((cfg, i) => {
    const col = new THREE.Color(cfg.color);
    const side = (i % 2 === 0) ? -1.8 : 1.8;

    // Mini-planeta esférico con anillo — el coleccionable del museo
    const coinMat = new THREE.MeshStandardMaterial({
      color:cfg.color, emissive:cfg.color, emissiveIntensity:0.55,
      metalness:0.4, roughness:0.25
    });
    const coin = new THREE.Mesh(new THREE.SphereGeometry(0.22,16,16), coinMat);
    coin.position.set(side, 1.25, cfg.z);
    scene.add(coin);

    // Aro de zona
    const ringMat = new THREE.MeshStandardMaterial({
      color:cfg.color, emissive:cfg.color, emissiveIntensity:2.2,
      metalness:0.9, roughness:0.05
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34,0.02,8,32), ringMat);
    ring.position.copy(coin.position);
    ring.rotation.x = Math.PI/2.6; // ligera inclinación tipo Saturno
    scene.add(ring);

    // Luz suave
    const light = new THREE.PointLight(cfg.color, 1.0, 2.2);
    light.position.copy(coin.position);
    scene.add(light);

    _coinMeshes.push({ coin, ring, light, collected:false, cfg });
  });
}

function _playCoinSound(ctx) {  // sonido de recolección de planeta
  if (!ctx) return;
  const t = ctx.currentTime;
  [0, 0.09].forEach((delay, i) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880 + i*440, t+delay);
    osc.frequency.exponentialRampToValueAtTime(1760 + i*440, t+delay+0.07);
    gain.gain.setValueAtTime(0.20, t+delay);
    gain.gain.exponentialRampToValueAtTime(0.001, t+delay+0.14);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t+delay); osc.stop(t+delay+0.16);
  });
}

function _updateCoinHUD() {
  const total = COINS_CONFIG.length;
  let el = document.getElementById('coin-counter');
  if (!el) {
    el = document.createElement('div');
    el.id = 'coin-counter';
    el.style.cssText = [
      'position:fixed','top:74px','right:220px',
      'font-family:Orbitron,sans-serif','font-size:10px',
      'letter-spacing:.14em','color:#ffd700',
      'z-index:60','opacity:.88','pointer-events:none',
      'text-shadow:0 0 8px #ffd70088'
    ].join(';');
    document.body.appendChild(el);
  }
  if (_coinsCollected >= total) {
    el.style.color = '#fff';
    el.style.textShadow = '0 0 14px #ffd700';
    el.textContent = total + '/' + total + ' PLANETAS COMPLETADO!';
    _mostrarRetroalimentacion();
  } else {
    el.textContent = _coinsCollected + '/' + total + ' PLANETAS';
  }

  // Toast de recogida individual
  let toast = document.getElementById('coin-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'coin-toast';
    toast.style.cssText = [
      'position:fixed','top:78px','left:50%',
      'transform:translateX(-50%)',
      'background:rgba(255,215,0,.12)',
      'border:1px solid rgba(255,215,0,.45)',
      'border-radius:10px','padding:6px 20px',
      'font-family:Orbitron,sans-serif','font-size:10px',
      'letter-spacing:.16em','color:#ffd700',
      'z-index:60','opacity:0',
      'transition:opacity .3s','pointer-events:none'
    ].join(';');
    document.body.appendChild(toast);
  }
  if (_coinsCollected < total) {
    toast.textContent = 'PLANETA ' + _coinsCollected + '/' + total + ' DESCUBIERTO';
    toast.style.opacity = '1';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toast.style.opacity = '0'; }, 1600);
  }
}

function _mostrarRetroalimentacion() {
  if (document.getElementById('coins-final-panel')) return;
  document.body.style.cursor = 'default'; // mostrar cursor para interactuar con el panel

  // Fondo oscuro
  const overlay = document.createElement('div');
  overlay.id = 'coins-final-panel';
  overlay.style.cssText = [
    'position:fixed','inset:0','background:rgba(0,0,0,0.88)',
    'z-index:200','display:flex','align-items:center','justify-content:center',
    'flex-direction:column','animation:coinsFadeIn .6s ease','pointer-events:all'
  ].join(';');

  overlay.innerHTML = `
    <style>
      @keyframes coinsFadeIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
      @keyframes coinsGold{0%,100%{text-shadow:0 0 20px #ffd700}50%{text-shadow:0 0 40px #ffd700,0 0 80px #ffd70088}}
      .crf-inner{
        background:linear-gradient(160deg,rgba(8,6,0,.98),rgba(20,15,0,.96));
        border:1px solid rgba(255,215,0,0.4);border-radius:24px;
        padding:36px 42px;max-width:560px;width:90%;text-align:center;
        box-shadow:0 0 80px rgba(255,215,0,0.15),0 32px 80px rgba(0,0,0,0.9);
        font-family:'Space Mono',monospace;
      }
      .crf-icon{font-size:56px;display:block;margin-bottom:12px;animation:coinsGold 2s infinite;}
      .crf-title{font-family:'Orbitron',sans-serif;font-size:22px;font-weight:900;
                 color:#ffd700;margin-bottom:6px;letter-spacing:.08em;}
      .crf-sub{font-size:11px;color:rgba(255,215,0,0.6);letter-spacing:.18em;
               font-family:'Orbitron',sans-serif;margin-bottom:20px;}
      .crf-msg{font-size:12px;color:rgba(210,185,140,0.85);line-height:1.8;
               margin-bottom:22px;border-left:3px solid rgba(255,215,0,0.3);
               padding-left:14px;text-align:left;}
      .crf-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:24px;}
      .crf-stat{background:rgba(255,215,0,0.06);border:1px solid rgba(255,215,0,0.2);
                border-radius:12px;padding:12px 8px;}
      .crf-stat-num{font-family:'Orbitron',sans-serif;font-size:22px;font-weight:900;
                    color:#ffd700;display:block;text-shadow:0 0 12px #ffd70088;}
      .crf-stat-lbl{font-size:9px;color:rgba(255,215,0,0.5);line-height:1.4;margin-top:3px;}
      .crf-btn{font-family:'Orbitron',sans-serif;font-size:11px;letter-spacing:.2em;
               background:linear-gradient(135deg,rgba(60,40,0,.8),rgba(40,28,0,.9));
               border:1px solid rgba(255,215,0,0.5);color:#ffd700;
               border-radius:12px;padding:12px 32px;cursor:pointer;
               transition:all .2s;margin-top:4px;}
      .crf-btn:hover{background:rgba(255,215,0,0.15);box-shadow:0 0 20px rgba(255,215,0,0.2);}
    </style>
    <div class="crf-inner" style="position:relative">
      <button onclick="
        document.getElementById('coins-final-panel').style.display='none';
        document.body.style.cursor='none';
      " style="position:absolute;top:-8px;right:-8px;width:32px;height:32px;
        border-radius:50%;background:rgba(255,215,0,.15);border:1px solid rgba(255,215,0,.5);
        color:#ffd700;font-size:16px;cursor:pointer;display:flex;align-items:center;
        justify-content:center;font-family:monospace;line-height:1;z-index:10">✕</button>
      <span class="crf-icon">★</span>
      <div class="crf-title">COLECCIÓN COMPLETA</div>
      <div class="crf-sub">16 / 16 PLANETAS DESCUBIERTOS</div>
      <p class="crf-msg">
        Exploraste 70 años de historia del videojuego de principio a fin. 
        Desde los osciloscopios de 1952 hasta la realidad virtual de 2023, 
        recorriste cada zona y descubriste los hitos que construyeron 
        la industria de entretenimiento más grande del siglo XXI.<br/><br/>
        Has demostrado que los videojuegos son historia, cultura y ciencia — 
        no solo entretenimiento.
      </p>
      <div class="crf-stats">
        <div class="crf-stat"><span class="crf-stat-num">6</span><div class="crf-stat-lbl">Zonas exploradas</div></div>
        <div class="crf-stat"><span class="crf-stat-num">70+</span><div class="crf-stat-lbl">Años de historia</div></div>
        <div class="crf-stat"><span class="crf-stat-num">16</span><div class="crf-stat-lbl">Planetas · Hitos</div></div>
      </div>
      <button class="crf-btn" onclick="
        document.getElementById('coins-final-panel').style.display='none';
        document.body.style.cursor='none';
      ">CONTINUAR EXPLORANDO</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

function updateCoins(camera, audioCtx) {
  const camPos = camera.position;
  const t = performance.now() * 0.001;

  _coinMeshes.forEach((c, i) => {
    if (c.collected) return;

    // Animación flotante + giro
    c.coin.rotation.y = t * 2.4 + i * 1.1;
    c.ring.rotation.y = t * 1.9 + i * 1.1;
    const fy = 1.25 + Math.sin(t * 2.2 + i * 0.9) * 0.11;
    c.coin.position.y = fy;
    c.ring.position.y = fy;
    c.light.position.y = fy;
    c.light.intensity = 0.7 + Math.sin(t * 2.8 + i) * 0.35;

    // Colisión
    const dist = camPos.distanceTo(c.coin.position);
    if (dist < _COIN_RADIUS) {
      c.collected = true;
      _coinsCollected++;
      c.coin.visible = false;
      c.ring.visible = false;
      c.light.intensity = 0;
      _playCoinSound(audioCtx);
      _updateCoinHUD();
    }
  });
}



// ═══════════════════════════════════════════════════════
//  NARRADOR — Web Speech API
//  Narra la experiencia de forma inmersiva al entrar en cada zona
// ═══════════════════════════════════════════════════════
const NARRACIONES = {
  origen: "Bienvenido. Año 1952. Los primeros juegos no tenían pantallas de colores ni sonido. Solo osciloscopios y transistores. Pero algo comenzó aquí que cambiaría para siempre la historia de la humanidad.",
  arcade: "Década de los 70. Las monedas de 25 centavos alimentaban máquinas que nunca dormían. Los salones recreativos eran el corazón de la cultura juvenil. Pong. Space Invaders. Pac-Man. Nació una industria.",
  consolas: "1983. El gran crash casi destruyó todo. Pero Nintendo lo resucitó con un italiano que saltaba sobre hongos. La consola doméstica llegó para quedarse. El gaming entró al hogar para siempre.",
  "3d": "1994. PlayStation. El CD-ROM. La tercera dimensión. Por primera vez, los mundos virtuales tenían profundidad real. Mario corrió libre en el espacio. Zelda redefinió la aventura. Fue una revolución total.",
  online: "2004. World of Warcraft conectó millones de jugadores en un mundo compartido. El gaming dejó de ser solitario para siempre. Nació el e-sport. Nació la comunidad global. Nació una nueva forma de existir.",
  futuro: "Hoy. La realidad se mezcla con lo virtual. La inteligencia artificial genera mundos infinitos. Ciento ochenta y cuatro mil millones de dólares. Tres mil millones de jugadores. El arte más importante del siglo veintiuno.",
};


// ── NARRACIONES DE PANELES ─────────────────────────────────────────
const PANEL_NARRACIONES = {
  "__cierre_museo__": "Has llegado al final del recorrido. Setenta años de historia, desde un osciloscopio en mil novecientos cincuenta y dos hasta la realidad virtual de hoy. Los videojuegos no son solo entretenimiento: son ciencia, cultura y el arte más influyente del siglo veintiuno. Gracias por explorar. Si aún no lo has hecho, cuéntanos tu experiencia en la encuesta del estudio.",
  "Alan Turing": "Mil novecientos cincuenta. Alan Turing propuso que las máquinas podían aprender y jugar. Diseñó un algoritmo de ajedrez antes de que existieran computadoras capaces de ejecutarlo. Turing sentó las bases matemáticas de la inteligencia artificial y los mundos virtuales.",

  "Tennis for Two": "Mil novecientos cincuenta y ocho. William Higinbotham diseñó este juego de tenis en un osciloscopio para el Día Abierto del Laboratorio Brookhaven. Nadie imaginó que estaba inventando una industria.",
  "Spacewar!": "Mil novecientos sesenta y dos. Estudiantes del MIT crearon Spacewar! en una computadora del tamaño de una habitación. Fue el primer juego distribuido digitalmente entre universidades.",
  "Pong": "Mil novecientos setenta y dos. Atari. La primera máquina fue instalada en un bar. En dos semanas estaba atascada de monedas. Nació la industria del videojuego.",
  "Space Invaders": "Mil novecientos setenta y ocho. Taito. Space Invaders agotó las monedas de cien yenes en Japón. Fue el primer ícono cultural global de los videojuegos.",
  "Pac-Man": "Mil novecientos ochenta. Namco. Toru Iwatani se inspiró en una pizza. Los cuatro fantasmas tienen inteligencia artificial distinta. Pac-Man fue el primer videojuego con merchandising masivo.",
  "Super Mario Bros": "Mil novecientos ochenta y cinco. Nintendo salvó la industria tras el gran crash. Mario corrió, saltó y definió lo que significa un buen diseño de niveles. Noventa millones de copias.",
  "E.T. El Videojuego": "Mil novecientos ochenta y dos. El peor videojuego de la historia. Atari fabricó doce millones de cartuchos y no vendió ni la mitad. Los enterró en el desierto de Nuevo México. Esto causó el Gran Crash de 1983.",
  "PlayStation": "Mil novecientos noventa y cuatro. Sony entró al mercado con el CD-ROM. La tercera dimensión se hizo accesible. Ciento dos millones de consolas vendidas. El gaming llegó a los adultos.",
  "Super Mario 64": "Mil novecientos noventa y seis. Mario corrió libre en el espacio tridimensional por primera vez. Inventó la cámara libre, el joystick analógico y el diseño de mundo abierto. Es la obra maestra de Miyamoto.",
  "Zelda: Ocarina of Time": "Mil novecientos noventa y ocho. Nintendo. Metacritic noventa y nueve sobre cien. El mejor juego de la historia según la crítica. Ocarina of Time inventó el apuntado con botón Z, el sistema de tiempo y la narrativa épica en 3D.",
  "Metal Gear Solid": "Mil novecientos noventa y ocho. Konami. Hideo Kojima demostró que los videojuegos podían tener narrativa cinematográfica. Inventó el género stealth. Un juego sobre la guerra que criticaba la guerra.",
  "GoldenEye 007": "Mil novecientos noventa y siete. Rare. Nueve universitarios que nunca habían hecho un juego crearon el FPS que definió una generación. El multijugador en pantalla dividida se convirtió en rito social.",
  "Halo: Combat Evolved": "Dos mil uno. Bungie. Lanzado con Xbox, demostró que los shooters funcionaban perfectamente en consola. Estableció el modelo del FPS online que dominó la siguiente década.",
  "World of Warcraft": "Dos mil cuatro. Blizzard. Doce millones de suscriptores en su pico. World of Warcraft demostró que los mundos virtuales persistentes podían conectar a millones. Inventó la economía de suscripción digital.",
  "Call of Duty 4: Modern Warfare": "Dos mil siete. Infinity Ward. Call of Duty cuatro reinventó el multijugador online con el sistema de experiencia, rangos y killstreaks. Cada shooter que vino después lo copió. Dieciséis millones de copias.",
  "League of Legends": "Dos mil nueve. Riot Games. League of Legends creó el modelo free-to-play con cosméticos que hoy domina la industria. El Mundial de dos mil diecinueve: cien millones de espectadores simultáneos.",
  "Minecraft": "Dos mil once. Mojang. Un solo programador, en Java, en su tiempo libre. Doscientos treinta y ocho millones de copias. El juego más vendido de la historia humana. Hoy enseña matemáticas y arquitectura en ciento quince países.",
  "PlayStation 5": "Dos mil veinte. Sony. La siguiente generación llegó con unidad de estado sólido de ochocientos veinticinco gigabytes, ray tracing en tiempo real y carga instantánea. El futuro del gaming ya está aquí.",
  "Elden Ring": "Dos mil veintidós. FromSoftware y George R. R. Martin. Juego del Año dos mil veintidós. Fusionó el mundo abierto con la dificultad extrema. Demostró que los videojuegos son la nueva literatura épica.",
  "Meta Quest 3": "Dos mil veintitrés. Meta. La realidad mixta permite superponer mundos virtuales sobre el real. El gaming ya no está en una pantalla. Está en todas partes. El futuro comenzó."
};

// Sistema de detección de mirada fija a un panel
let _gazeTimer    = null;   // setTimeout de 2.5s
let _gazeTarget   = null;   // label del panel que se está mirando
let _lastNarrPanel= "";     // último panel narrado (evitar repetición)
const GAZE_TIME   = 2500;   // ms que hay que mirar antes de narrar
const GAZE_DOT    = 0.65;   // dot product mínimo (mirando bastante directo)
const GAZE_DIST   = 11;     // distancia máxima para detectar mirada

function _narrarPanel(label) {
  if (!_narratorActive) return;
  if (label === _lastNarrPanel) return;
  const texto = PANEL_NARRACIONES[label];
  if (!texto) return;

  _lastNarrPanel = label;

  // Cancelar narración de zona en curso para dar paso al panel
  if (window.responsiveVoice) window.responsiveVoice.cancel();
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  if (_currentUtterance) { try { _currentUtterance.onend = null; } catch(e){} }

  setTimeout(() => {
    if (window.responsiveVoice) {
      window.responsiveVoice.speak(texto, "Spanish Male", {
        pitch: 0.82, rate: 0.83, volume: 0.88
      });
      return;
    }
    if (!window.speechSynthesis) return;
    const _sp = () => {
      const utt = new SpeechSynthesisUtterance(texto);
      utt.lang = "es-ES"; utt.rate = 0.84; utt.pitch = 0.90; utt.volume = 0.90;
      const voices = window.speechSynthesis.getVoices();
      const esV = voices.find(v => v.lang.startsWith("es") && /male|jorge|pablo/i.test(v.name))
               || voices.find(v => v.lang === "es-ES") || voices[0];
      if (esV) utt.voice = esV;
      _currentUtterance = utt;
      window.speechSynthesis.speak(utt);
    };
    window.speechSynthesis.getVoices().length > 0 ? _sp()
      : (window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.onvoiceschanged=null; _sp(); });
  }, 300);
}

// _camDir ya declarado arriba en el módulo (para updateVideos)
const _camDirGaze = new THREE.Vector3();

function updateGaze(videoEls, camera) {
  if (!_narratorActive) return;
  camera.getWorldDirection(_camDirGaze);

  // Buscar panel que esté siendo mirado fijamente
  let gazeLabel = null;
  let gazeDist  = Infinity;

  videoEls.forEach(v => {
    if (!v.active) return;
    const dx = (v.screenX ?? v.videoX) - camera.position.x;
    const dz  = v.videoZ - camera.position.z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    if (dist > GAZE_DIST) return;

    // Vector normalizado cámara→panel
    const len = Math.sqrt(dx*dx + dz*dz) || 1;
    const dot = (_camDirGaze.x*(dx/len) + _camDirGaze.z*(dz/len));
    if (dot > GAZE_DOT && dist < gazeDist) {
      gazeLabel = v.label;
      gazeDist  = dist;
    }
  });

  if (gazeLabel && gazeLabel !== _gazeTarget) {
    // Nuevo panel en el crosshair — iniciar temporizador
    _gazeTarget = gazeLabel;
    clearTimeout(_gazeTimer);
    _gazeTimer = setTimeout(() => {
      if (_gazeTarget === gazeLabel) _narrarPanel(gazeLabel);
    }, GAZE_TIME);
  } else if (!gazeLabel && _gazeTarget) {
    // Dejó de mirar — cancelar temporizador
    _gazeTarget = null;
    clearTimeout(_gazeTimer);
  }
}

let _narratorActive = true;
let _lastNarratedZone = "";
let _finalNarrated = false;
let _currentUtterance = null;

function narrarZona(zonaId) {
  if (!_narratorActive) return;
  if (zonaId === _lastNarratedZone) return;
  if (!NARRACIONES[zonaId]) return;

  _lastNarratedZone = zonaId;
  const texto = NARRACIONES[zonaId];

  // Cancelar cualquier narración en curso
  if(window.speechSynthesis) window.speechSynthesis.cancel();
  if(_currentUtterance) { try{_currentUtterance.onend=null;}catch(e){} }

  setTimeout(() => {
    // Método 1: ResponsiveVoice (CDN gratuito, voz de alta calidad)
    if (window.responsiveVoice && window.responsiveVoice.isPlaying) {
      window.responsiveVoice.cancel();
    }
    if (window.responsiveVoice) {
      window.responsiveVoice.speak(texto, "Spanish Male", {
        pitch: 0.8, rate: 0.85, volume: 0.85
      });
      return;
    }

    // Método 2: Web Speech API con carga robusta de voces
    if (!window.speechSynthesis) return;

    const _speak = () => {
      const utt = new SpeechSynthesisUtterance(texto);
      utt.lang   = "es-ES";
      utt.rate   = 0.86;
      utt.pitch  = 0.92;
      utt.volume = 0.88;

      const voices = window.speechSynthesis.getVoices();
      // Prioridad: voz masculina española > cualquier español > cualquier voz
      const esVoice =
        voices.find(v => v.lang.startsWith("es") && /male|hombre|jorge|pablo|miguel/i.test(v.name)) ||
        voices.find(v => v.lang === "es-ES") ||
        voices.find(v => v.lang.startsWith("es")) ||
        voices[0];
      if (esVoice) utt.voice = esVoice;

      _currentUtterance = utt;
      window.speechSynthesis.speak(utt);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      _speak();
    } else {
      // Las voces aún no cargaron — esperar el evento
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        _speak();
      };
      // Timeout de seguridad: hablar igual si las voces no llegan en 2s
      setTimeout(() => { if(!_currentUtterance) _speak(); }, 2000);
    }
  }, 1200);
}

// Botón de toggle narrador (se añade al HUD del museo)
function buildNarratorToggle() {
  const btn = document.createElement("button");
  btn.id = "narrator-btn";
  btn.textContent = "NARRADOR: ON";
  btn.style.cssText = [
    "position:fixed","bottom:18px","right:18px",
    "background:rgba(0,0,0,0.6)","border:1px solid rgba(255,255,255,0.2)",
    "border-radius:8px","color:rgba(200,220,210,0.7)",
    "font-family:Orbitron,sans-serif","font-size:9px",
    "letter-spacing:.14em","padding:6px 12px",
    "cursor:pointer","z-index:60",
    "transition:all .2s","pointer-events:all"
  ].join(";");
  btn.onclick = () => {
    _narratorActive = !_narratorActive;
    if (!_narratorActive) {
      window.speechSynthesis.cancel();
      btn.textContent = "NARRADOR: OFF";
      btn.style.opacity = "0.4";
    } else {
      btn.textContent = "NARRADOR: ON";
      btn.style.opacity = "1";
      _lastNarratedZone = ""; // reiniciar para que narre la zona actual
    }
  };
  document.body.appendChild(btn);
}

export async function initMuseumWalk({canvas}){
  // Crear audioMgr ANTES de la intro para poder pasarlo como callback
  const audioMgr = new AudioManager();

  // El unlock DEBE ocurrir sincrónicamente en el click del botón
  // Le pasamos la función que se llama cuando el usuario pulsa "Entrar"
  await showIntroScreen(() => {
    // Este callback se ejecuta DENTRO del handler del click → contexto de usuario válido
    audioMgr.unlock(ZONAS[0].audio).then(() => {
      // Reconectar videos activos que no tenían AudioContext todavía
      videoElements.forEach(v => {
        if (v.active && !v.gainNode && audioMgr.ctx) _conectarAudioVideo(v);
      });
    });
  });

  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:"high-performance"});
  renderer.setPixelRatio(DPR);
  renderer.setSize(innerWidth,innerHeight,false);
  renderer.shadowMap.enabled=false;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.22;
  renderer.outputColorSpace=THREE.SRGBColorSpace;

  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x030408);
  scene.fog=new THREE.Fog(0x030408,9,28);       // niebla ligeramente más cercana — más profundidad cinematográfica

  const camera=new THREE.PerspectiveCamera(68,innerWidth/innerHeight,0.1,40); // far 52→40
  camera.position.set(0,1.72,1.6);

  // Bloom a CUARTO de resolución → ~8× más rápido que full-res
  const halfW=Math.round(innerWidth/4), halfH=Math.round(innerHeight/4);
  const composer=new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene,camera));
  const bloom=new UnrealBloomPass(new THREE.Vector2(halfW,halfH),0.62,0.40,0.86);
  composer.addPass(bloom);

  // Construir mundo
  buildLighting(scene);
  buildCorridor(scene);

  // Pre-cargar imagen del panel de bienvenida antes de construir la entrada
  const welcomeImg = await new Promise(res=>{
    const img = new Image();
    img.onload = ()=>res(img);
    img.onerror = ()=>res(null);
    img.src = "assets/imagenes/imagen1.png";
  });
  buildEntrance(scene, welcomeImg);
  buildHoloPanels(scene);
  buildCoins(scene);           // Monedas coleccionables
  buildNarratorToggle();        // Botón del narrador
  buildFloorArrows(scene);      // Flechas neon en el suelo
  setTimeout(_updateCoinHUD, 1200); // Mostrar contador inicial

  ZONAS.forEach((zona,i)=>{
    buildZoneArch(scene,zona);
    buildGraffiti(scene,zona);
    zona.vitrinas.forEach(cfg=>buildVitrina(scene,zona,cfg));
    buildCeilingArt(scene,zona);
    if(i<ZONAS.length-1){
      const midZ=(zona.zEnd+ZONAS[i+1].zStart)/2;
      if(i===0){
        // Transición Origen → Arcade: Nintendo NES
        loadGLBModel(scene,"assets/modelados/nintendo_nes_original.glb",{
          x:0, z:midZ, scale:1.8, rotY:Math.PI*0.25, color:0xff4400
        });
      } else if(i===1){
        // Transición Arcade → Consolas: Game Boy
        loadGLBModel(scene,"assets/modelados/nintendo_game_boy_original_1989.glb",{
          x:0, z:midZ, scale:1.6, rotY:-Math.PI*0.2, color:0x44ff88
        });
      } else if(i===2){
        // Transición Consolas → 3D: NES como puente hacia PlayStation
        loadGLBModel(scene,"assets/modelados/nintendo_nes_original.glb",{
          x:0, z:midZ, scale:2.0, rotY:Math.PI*0.75, color:0x4488ff
        });
      } else if(i===3){
        // Transición 3D → Online: Darius con color online
        loadGLBModel(scene,"assets/modelados/darius.glb",{
          x:0, z:midZ, scale:2.2, rotY:Math.PI*0.5, color:0xcc44ff
        });
      } else if(i===4){
        // Transición Online → Futuro: armadura con color futuro
        loadGLBModel(scene,"assets/modelados/armadura.glb",{
          x:0, z:midZ, scale:2.0, rotY:-Math.PI*0.3, color:0x00ffee
        });
      } else {
        buildStatua(scene,0,midZ,zona.color);
      }
    }
  });

  // Gaming Setup — en la posición del dato MMORPG (z=-186, zona 3D)
  // Reemplaza el Darius duplicado — modelo de setup gamer moderno
  loadGLBModel(scene, "assets/modelados/niknet_art-gamer-2746.glb", {
    x: 1.2, z: -186, scale: 1.8, rotY: -Math.PI * 0.4, color: 0x4488ff
  });

  // Panel especial de Alan Turing — pared izquierda, al fondo de la zona Origen
  buildVideoPanel(scene, {
    z: -29, x: -3.85, rotY: Math.PI/2,
    video: "assets/audio/Videos/Alan turing.mp4",
    label: "Alan Turing", year: "1950",
    hex: "#f0a030"
  });

  // Monumento final — cierre visual y narrativo del recorrido
  buildMonumentoFinal(scene, -300);

  const particleSystems=ZONAS.map(z=>buildZoneParticles(scene,z));
  const {card,hud,fill}=createUI();
  const controls=createControls(camera,canvas);

  let zonaActual=ZONAS[0];
  const fogTarget=new THREE.Color(ZONAS[0].fogHex);
  const bgTarget =new THREE.Color(ZONAS[0].bgHex);
  updateHUD(hud,fill,ZONAS[0],0);

  // Última posición Z para no re-calcular si no se movió
  let lastZ=999;

  

function detectZone(){
    const z=camera.position.z;
    if(Math.abs(z-lastZ)<0.08) return;
    lastZ=z;
    const zona=ZONAS.find(z0=>z<=z0.zStart&&z>=z0.zEnd);
    if(zona&&zona!==zonaActual){
      zonaActual=zona;
      fogTarget.set(zona.fogHex); bgTarget.set(zona.bgHex);
      audioMgr.play(zona);
      hideCard(card);
      narrarZona(zona.id);  // Narrador inmersivo al entrar en zona
    }
    updateHUD(hud,fill,zonaActual,Math.abs(z)/(L-5));

    // Narración de cierre — una sola vez al llegar al monumento final
    if (!_finalNarrated && z < -296) {
      _finalNarrated = true;
      _narrarPanel("__cierre_museo__");
    }

    // Buscar el dato más cercano en TODA la lista (radio 3.5 unidades)
    let bestDist=3.5, bestDato=null, bestZona=null;
    ZONAS.forEach(z0=>z0.datos.forEach(d=>{
      const dist=Math.abs(z-d.z);
      if(dist<bestDist){ bestDist=dist; bestDato=d; bestZona=z0; }
    }));
    if(bestDato){
      const key=`${bestZona.id}_${bestDato.z}`;
      if(key!==_lastCardKey){
        _lastCardKey=key;
        showCard(card,bestDato.t,bestDato.d,bestZona.hex,bestDato.extra);
      }
    }
  }
  let _lastCardKey="";

  // ── SISTEMA DE VIDEO/AUDIO POR MIRADA DIRECTA ────────────────
  // Solo hay audio o video reproduciéndose si el jugador está
  // MIRANDO DIRECTAMENTE ese panel específico. Si no lo mira,
  // ese panel queda completamente en silencio y pausado.
  const VID_LOOK_DIST  = 6.5;   // distancia máxima para poder activar el panel
  const VID_LOOK_DOT   = 0.66;  // qué tan directo debe apuntar la mirada (más alto = más estricto)
  const AUD_FULL_DIST  = 2.8;   // distancia para volumen máximo del video
  const AUD_START_DIST = 5.5;   // distancia donde empieza a subir el volumen
  const AUD_MAX_VOL    = 0.55;  // volumen máximo del audio de video

  const _vDir = new THREE.Vector3();

  // Función para conectar el GainNode de un video al AudioContext
  function _conectarAudioVideo(v) {
    const ctx = audioMgr?.ctx;
    if (!ctx || !v.videoEl || v.gainNode) return; // ya conectado
    if (v.noAudio) return; // panel sin audio (ej: Alan Turing — narrador lo cubre)
    try {
      v.sourceNode = ctx.createMediaElementSource(v.videoEl);
      v.gainNode   = ctx.createGain();
      v.gainNode.gain.setValueAtTime(0, ctx.currentTime);
      v.sourceNode.connect(v.gainNode);
      v.gainNode.connect(ctx.destination);
      v.videoEl.muted = false;
    } catch(e) {
      console.warn('[VideoAudio] No se pudo conectar:', e.message);
    }
  }

  // Retorna {looking:bool, dist:number} — ¿el jugador mira directamente este panel?
  function _isLookingAt(v) {
    camera.getWorldDirection(_vDir);
    const dx   = (v.screenX ?? v.videoX) - camera.position.x;
    const dz   = v.videoZ - camera.position.z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    if (dist > VID_LOOK_DIST) return { looking: false, dist };
    const len = dist || 1;
    const dot = _vDir.x*(dx/len) + _vDir.z*(dz/len);
    return { looking: dot > VID_LOOK_DOT, dist, dot };
  }

  let _wasVideoAudible = false; // para unduck cuando deja de haber video

  function updateVideos() {
    const ctx = audioMgr?.ctx;

    // PRE-BUFFER silencioso: preparar videos cercanos sin reproducirlos
    videoElements.forEach(v => {
      const dz = Math.abs(camera.position.z - v.videoZ);
      if (dz < 14 && !v.buffering && !v.videoEl.src) {
        v.buffering = true;
        v.videoEl.src     = v.src;
        v.videoEl.preload = "auto";
        v.videoEl.load();
      }
    });

    const narratorSpeaking =
      (window.responsiveVoice?.isPlaying?.()) ||
      (window.speechSynthesis?.speaking);

    // ── DETERMINAR CUÁL PANEL MIRA EL JUGADOR ──
    // El video se activa VISUALMENTE siempre que se mire,
    // sin importar si el narrador está hablando. Solo el AUDIO
    // del video se silencia mientras el narrador tiene la palabra.
    let focusedVideo  = null;
    let focusedDist   = Infinity;

    videoElements.forEach(v => {
      const { looking, dist } = _isLookingAt(v);

      if (looking) {
        if (!v.active) {
          v.active = true;
          const doPlay = () => { if (v.active) v.videoEl.play().catch(()=>{}); };
          if (v.videoEl.readyState >= 2) doPlay();
          else v.videoEl.addEventListener('canplay', doPlay, { once: true });
          if (ctx && ctx.state !== 'suspended' && !narratorSpeaking) _conectarAudioVideo(v);
        }
        if (dist < focusedDist) { focusedDist = dist; focusedVideo = v; }
      } else {
        if (v.active) {
          v.active = false;
          v.buffering = false;
          if (v.gainNode && ctx) {
            v.gainNode.gain.cancelScheduledValues(ctx.currentTime);
            v.gainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
            v.volume = 0;
          }
          setTimeout(() => {
            if (!v.active) {
              v.videoEl.pause();
              v.videoEl.preload = "none";
              v.videoEl.src = "";
              v.videoEl.load();
            }
          }, 500);
        }
        if (v.gainNode && ctx && (v.volume ?? 0) > 0.005) {
          v.gainNode.gain.cancelScheduledValues(ctx.currentTime);
          v.gainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
          v.volume = 0;
        }
      }
    });

    // ── AUDIO DEL PANEL EN FOCO — silenciado solo si narra ──
    if (focusedVideo && focusedVideo.gainNode && ctx) {
      let targetVol = 0;
      if (!narratorSpeaking) {
        if (focusedDist <= AUD_FULL_DIST) {
          targetVol = AUD_MAX_VOL;
        } else if (focusedDist < AUD_START_DIST) {
          const t = (focusedDist - AUD_FULL_DIST) / (AUD_START_DIST - AUD_FULL_DIST);
          targetVol = AUD_MAX_VOL * (1 - t*t*(3-2*t));
        }
        // Conectar audio si el jugador empezó a mirar mientras narraba
        if (!focusedVideo.sourceNode && ctx.state !== 'suspended') _conectarAudioVideo(focusedVideo);
      }

      if (Math.abs(targetVol - (focusedVideo.volume ?? 0)) > 0.01) {
        focusedVideo.volume = targetVol;
        focusedVideo.gainNode.gain.cancelScheduledValues(ctx.currentTime);
        focusedVideo.gainNode.gain.setTargetAtTime(
          targetVol, ctx.currentTime, targetVol > 0.01 ? 0.4 : 0.15
        );
      }

      if (!narratorSpeaking) {
        if (!_wasVideoAudible) { audioMgr?.duck?.(0.15); _wasVideoAudible = true; }
      } else {
        audioMgr?.duck?.(0.3);
        _wasVideoAudible = false;
      }
    } else {
      if (narratorSpeaking) {
        audioMgr?.duck?.(0.3);
        _wasVideoAudible = false;
      } else if (_wasVideoAudible) {
        audioMgr?.unduck?.();
        _wasVideoAudible = false;
      }
    }
  }

  // Pre-cargar voces TTS
  if(window.speechSynthesis) window.speechSynthesis.getVoices();

  const clock=new THREE.Clock();
  const dum=new THREE.Object3D();
  let raf,frameN=0;

  function animate(){
    raf=requestAnimationFrame(animate);
    const dt=Math.min(clock.getDelta(),0.05);
    const t=clock.elapsedTime;
    frameN++;

    controls.update(dt);
    detectZone();
    const camZ=camera.position.z;          // debe estar antes de updateArrows y floaters
    if(frameN%6===0) updateVideos();
    if(frameN%8===0) updateGaze(videoElements, camera);
    // Actualizar frames de canvas de video — cada 2 frames para suavidad
    if(frameN%2===0){
      videoElements.forEach(v=>{
        if(v.active && v.videoEl?._updateFrame) v.videoEl._updateFrame();
      });
    }
    if(frameN%2===0) updateArrows(t, camZ, zonaActual?.color);
    if(frameN%3===0) updateCoins(camera, audioMgr?.ctx);  // colisión cada 3f = ~50ms a 60fps
    scene.fog.color.lerp(fogTarget,.02);
    scene.background.lerp(bgTarget,.02);

    // Floaters: solo los que están a menos de 18u de la cámara
    if(frameN%3===0){
      floaters.forEach(f=>{
        if(!f.obj) return;
        if(f.type==="monumento"){ f.obj.update(t); return; }
        if(f.obj.position && Math.abs(f.obj.position.z-camZ)>18) return;
        if(f.type==="model"||f.type==="ring"||f.type==="fog"){
          f.obj.position.y=f.baseY+Math.sin(t*f.speed+f.phase)*.085;
          if(f.type==="model") f.obj.rotation.y+=0.008;
        }
      });
    }
    if(frameN%4===0){
      floaters.forEach(f=>{
        if(!f.obj) return;
        if(f.obj.position && Math.abs(f.obj.position.z-camZ)>18) return;
        if(f.type==="glow"){
          // obj puede ser un mesh real o un pseudo-objeto {material:...}
          const mat = f.obj.material ?? f.obj;
          if(mat && mat.emissiveIntensity!==undefined)
            mat.emissiveIntensity=0.22+Math.sin(t*1.5+f.phase)*.14;
          else if(mat && mat.opacity!==undefined)
            mat.opacity=Math.max(0.01, mat.opacity*0.98+Math.sin(t*f.speed+f.phase)*0.015);
        }
        else if(f.type==="light"){
          const base=f.obj.intensity>1.5?2.0:0.5;
          f.obj.intensity=base+Math.sin(t*1.8+f.phase)*.22;
        }
      });
    }
    // Holos: cada 6 frames
    if(frameN%6===0){
      holoFloaters.forEach(f=>{
        f.obj.rotation.z+=0.012; // compensar frecuencia más baja
        f.mat.opacity=0.32+Math.sin(t*0.6+f.phase)*0.12;
      });
    }

    // Partículas: SOLO zona actual, cada 5 frames
    if(frameN%8===0){
      const ps=particleSystems.find(p=>p.zona===zonaActual);
      if(ps){
        for(let i=0;i<ps.count;i++){
          dum.position.set(ps.pos[i*3],ps.pos[i*3+1]+Math.sin(t*.4+i*.5)*.05,ps.pos[i*3+2]);
          dum.updateMatrix(); ps.im.setMatrixAt(i,dum.matrix);
        }
        ps.im.instanceMatrix.needsUpdate=true;
      }
    }

    composer.render();
  }

  function onResize(){
    camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight,false); composer.setSize(innerWidth,innerHeight);
  }
  window.addEventListener("resize",onResize);
  animate();

  return{
    destroy(){
      cancelAnimationFrame(raf); window.removeEventListener("resize",onResize);
      controls.destroy(); audioMgr.destroy(); document.exitPointerLock?.();
      document.body.classList.remove("museo-activo");
      document.getElementById("museum-intro")?.remove();
      ["museum-card","museum-hud"].forEach(id=>document.getElementById(id)?.remove());
      document.getElementById("hud-fill")?.parentElement?.remove();
      floaters.length=0; holoFloaters.length=0;
      videoElements.forEach(({videoEl,texture})=>{
        videoEl.pause(); videoEl.src=""; videoEl.remove(); texture.dispose();
      });
      videoElements.length=0;
      scene.traverse(o=>{
        o.geometry?.dispose();
        if(o.material) Array.isArray(o.material)?o.material.forEach(m=>m.dispose()):o.material.dispose();
      });
      composer.dispose(); renderer.dispose();
    }
  };
}