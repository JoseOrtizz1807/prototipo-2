// ═══════════════════════════════════════════════════════════════
//  Conexión con Firebase Firestore
//  - "respuestas": respuestas completas de la encuesta (privadas; solo
//    el administrador puede leerlas, desde admin.html).
//  - "resenas": datos públicos y anónimos que alimentan el panel de
//    Reseñas (valoración, recomendación y comentario si el participante
//    autorizó publicarlo). Se actualiza en tiempo real.
//  Instrucciones de configuración: FIREBASE_SETUP.md
// ═══════════════════════════════════════════════════════════════

// ▼▼▼ Pega aquí la configuración de tu proyecto (Firebase → Configuración del proyecto → Tus apps) ▼▼▼
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCePAbZboBBCn3dFmqg9m8tdEXbqZPGZbc",
  authDomain: "museo-videojuegos.firebaseapp.com",
  projectId: "museo-videojuegos",
  storageBucket: "museo-videojuegos.firebasestorage.app",
  messagingSenderId: "698392303852",
  appId: "1:698392303852:web:3e46e2c034001a14702dc9"
};
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
export const firebaseConfigurado = () => Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);

let _fs = null;   // { db, mod }
async function firestore() {
  if (_fs) return _fs;
  const { initializeApp } = await import(SDK + "firebase-app.js");
  const mod = await import(SDK + "firebase-firestore.js");
  const app = initializeApp(FIREBASE_CONFIG);
  _fs = { db: mod.getFirestore(app), mod };
  return _fs;
}

// Filtro básico de lenguaje ofensivo para los comentarios públicos
const GROSERIAS = ["hijueputa","hp","gonorrea","malparido","marica","puta","mierda","verga","pendejo","idiota","estupido","estúpido","imbecil","imbécil","culo","perra"];
export function comentarioLimpio(txt) {
  const t = (txt || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return !GROSERIAS.some(g => new RegExp(`\\b${g.normalize("NFD").replace(/[̀-ͯ]/g, "")}\\b`).test(t));
}

function rangoEdad(edad) {
  const e = Number(edad);
  if (!e) return "";
  if (e <= 12) return "9–12";
  if (e <= 17) return "13–17";
  if (e <= 35) return "18–35";
  return "36+";
}

/** Guarda la respuesta completa (privada) y su reseña pública. */
export async function guardarRespuesta(ans) {
  if (!firebaseConfigurado()) return { ok: false, motivo: "sin-config" };
  const { db, mod } = await firestore();
  const { collection, addDoc, serverTimestamp } = mod;

  const num = k => (ans[k] ? Number(ans[k]) : null);
  await addDoc(collection(db, "respuestas"), {
    nombre: ans.nombre || "",
    edad: ans.edad ? Number(ans.edad) : null,
    genero: ans.genero || "",
    p1: ans.p1 || "", p2: ans.p2 || "",
    p3: num("p3"), p4: num("p4"), p5: num("p5"), p6: num("p6"), p7: num("p7"),
    p8: ans.p8 || "", p9: ans.p9 || "", p10: ans.p10 || "",
    publicar: Boolean(ans.publicar),
    fecha: serverTimestamp()
  });

  const vals = [num("p5"), num("p6"), num("p7")].filter(v => v);
  const valoracion = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0;
  const comentario = (ans.publicar && comentarioLimpio(ans.p10)) ? (ans.p10 || "").trim().slice(0, 500) : "";
  await addDoc(collection(db, "resenas"), {
    valoracion,
    recomienda: ans.p9 || "",
    comentario,
    rangoEdad: rangoEdad(ans.edad),
    fecha: serverTimestamp()
  });
  return { ok: true };
}

/** Escucha la colección de reseñas en tiempo real. Devuelve la función para dejar de escuchar. */
export async function escucharResenas(callback, onError) {
  if (!firebaseConfigurado()) { onError?.("sin-config"); return () => {}; }
  const { db, mod } = await firestore();
  const { collection, query, orderBy, onSnapshot } = mod;
  const q = query(collection(db, "resenas"), orderBy("fecha", "desc"));
  return onSnapshot(q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => { console.warn("Reseñas:", err); onError?.(err.message || "error"); });
}
