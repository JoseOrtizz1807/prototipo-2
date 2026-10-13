// ═══════════════════════════════════════════════════════════════
//  VOZ DE BIT — elige la voz en español más natural del dispositivo
//  · Prioriza voces neuronales ("Natural"/"Neural", p. ej. Microsoft
//    Salomé o Gonzalo de Colombia en Edge) y luego las voces de Google.
//  · Habla a velocidad y tono naturales (sin distorsionar el tono, que
//    es lo que hacía sonar robótica la voz anterior).
//  · Divide el texto en frases para evitar el corte de ~15 s de Chrome.
//  · Si el dispositivo no tiene voces en español, usa ResponsiveVoice.
// ═══════════════════════════════════════════════════════════════
const synth = window.speechSynthesis;
let voz = null, puntaje = -1, cola = [], hablandoRV = false, gen = 0;

const MASC = /gonzalo|jorge|alvaro|álvaro|pablo|raul|raúl|tomas|tomás|lorenzo|emilio|gerardo|andres|andrés|alonso|diego|enrique|juan|carlos|male|hombre/i;

function puntuar(v) {
  if (!/^es([-_]|$)/i.test(v.lang)) return -1;
  let s = 10;
  if (/natural|neural/i.test(v.name)) s += 100;
  else if (/premium|enhanced|mejorad/i.test(v.name)) s += 80;
  else if (/online/i.test(v.name)) s += 70;
  else if (/google/i.test(v.name)) s += 55;
  if (/es[-_]CO/i.test(v.lang)) s += 25;
  else if (/es[-_](MX|US|419|AR|CL|PE|VE|EC)/i.test(v.lang)) s += 15;
  else if (/es[-_]ES/i.test(v.lang)) s += 8;
  if (MASC.test(v.name)) s += 4;                 // BIT: voz masculina si hay empate
  return s;
}

function elegir() {
  if (!synth) return;
  const vs = synth.getVoices();
  voz = null; puntaje = -1;
  for (const v of vs) { const p = puntuar(v); if (p > puntaje) { puntaje = p; voz = v; } }
  if (voz) console.info(`[BIT] Voz: ${voz.name} (${voz.lang})`);
}
if (synth) { elegir(); synth.addEventListener?.("voiceschanged", elegir); }

export const nombreVoz = () => (voz ? `${voz.name}` : window.responsiveVoice ? "ResponsiveVoice" : "sin voz");

function frases(texto) {
  const partes = texto.replace(/\s+/g, " ").match(/[^.!?¡¿;:]+[.!?;:]*|[¡¿][^.!?]+[.!?]*/g) || [texto];
  const out = []; let buf = "";
  for (const p of partes) {
    if ((buf + p).length > 180 && buf) { out.push(buf.trim()); buf = ""; }
    buf += p;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

export function callar() {
  cola = []; gen++;
  try { synth?.cancel(); } catch {}
  try { window.responsiveVoice?.cancel?.(); } catch {}
  hablandoRV = false;
}

export function hablar(texto, { rate = 1.0, pitch = 1.0, volume = 0.95 } = {}) {
  if (!texto) return;
  callar();
  if (!voz && synth?.getVoices().length === 0) elegir();
  // Sin voz en español en el dispositivo → ResponsiveVoice (servicio externo)
  if ((!voz || puntaje < 10) && window.responsiveVoice) {
    hablandoRV = true;
    window.responsiveVoice.speak(texto, "Spanish Latin American Male", { rate, pitch, volume, onend: () => (hablandoRV = false) });
    return;
  }
  if (!synth) return;
  cola = frases(texto);
  const mia = gen;
  const siguiente = () => {
    if (mia !== gen) return;               // una frase cancelada no debe reanudar otra cola
    const f = cola.shift(); if (!f) return;
    const u = new SpeechSynthesisUtterance(f);
    if (voz) { u.voice = voz; u.lang = voz.lang; } else u.lang = "es-CO";
    // Las voces neuronales ya suenan naturales a 1.0; las básicas se entienden mejor un poco más lentas
    u.rate = puntaje >= 60 ? rate : rate * 0.95; u.pitch = pitch; u.volume = volume;
    u.onend = siguiente; u.onerror = siguiente;
    synth.speak(u);
  };
  siguiente();
}

export const hablando = () => !!(synth?.speaking || synth?.pending || cola.length || hablandoRV || window.responsiveVoice?.isPlaying?.());
