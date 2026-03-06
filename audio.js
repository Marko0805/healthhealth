let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, type='sine', dur=0.15, vol=0.25, delay=0, attack=0.008, release=null) {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = Math.min(freq * 4, 8000);
    filter.Q.value = 0.7;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + delay);
    gain.gain.setValueAtTime(0, c.currentTime + delay);
    gain.gain.linearRampToValueAtTime(vol, c.currentTime + delay + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + (release || dur));
    osc.start(c.currentTime + delay);
    osc.stop(c.currentTime + delay + (release || dur) + 0.05);
  } catch(e) {}
}

function noise(dur=0.1, vol=0.08, delay=0, freq=2000) {
  try {
    const c = getCtx();
    const bufferSize = c.sampleRate * dur;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = c.createBufferSource();
    source.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 2;
    const gain = c.createGain();
    gain.gain.setValueAtTime(vol, c.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    source.start(c.currentTime + delay);
    source.stop(c.currentTime + delay + dur);
  } catch(e) {}
}

export function soundCheck() {
  // Crisp luxury click — two-tone bell
  tone(1318.5, 'sine', 0.12, 0.18, 0, 0.003);
  tone(2637,   'sine', 0.07, 0.09, 0.04, 0.003);
  noise(0.04, 0.05, 0, 3000);
}

export function soundUncheck() {
  tone(523, 'triangle', 0.1, 0.12, 0, 0.005);
  tone(311, 'triangle', 0.08, 0.08, 0.05, 0.005);
}

export function soundDayComplete() {
  // Cinematic rising arpeggio
  const notes = [523, 659, 784, 988, 1319];
  notes.forEach((f, i) => {
    tone(f, 'sine', 0.3, 0.22, i * 0.08, 0.008);
  });
  setTimeout(() => noise(0.15, 0.06, 0, 4000), 400);
}

export function soundLevelUp() {
  // Dramatic orchestral swell
  const notes = [261, 329, 392, 523, 659, 784, 1047];
  notes.forEach((f, i) => tone(f, 'sine', 0.4, 0.28, i * 0.065, 0.01, 0.35));
  setTimeout(() => {
    tone(1047, 'sine', 0.5, 0.35, 0, 0.02, 0.45);
    tone(1319, 'sine', 0.4, 0.28, 0.08, 0.01, 0.4);
    tone(1568, 'sine', 0.3, 0.2, 0.16, 0.01, 0.35);
    noise(0.2, 0.04, 0, 6000);
  }, 520);
}

export function soundGodMode() {
  // Royal fanfare
  [[523,659,784],[659,784,1047],[784,1047,1319]].forEach((chord, ci) => {
    chord.forEach(f => tone(f, 'sine', 0.7, 0.22, ci * 0.35, 0.02));
  });
  setTimeout(() => {
    [784,1047,1319,1568,2093].forEach((f,i) => tone(f,'sine',1.0,0.25,i*0.06,0.02,0.8));
    noise(0.3, 0.05, 0.1, 8000);
  }, 1100);
}

export function soundNewWeek() {
  [261,294,330,349,392,494,523].forEach((f,i) => tone(f,'triangle',0.25,0.22,i*0.055,0.01));
  setTimeout(() => noise(0.12, 0.04, 0, 3000), 350);
}

// ─── Voice synthesis ──────────────────────────────────────────────────────────
let voices = [];

function loadVoices() {
  voices = window.speechSynthesis?.getVoices() || [];
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function pickBestVoice() {
  const priority = [
    v => v.name.includes('Google UK English Male'),
    v => v.name.includes('Google US English'),
    v => v.name.includes('Daniel') && v.lang.startsWith('en'),
    v => v.name.includes('Alex'),
    v => v.name.includes('Fred'),
    v => v.name.includes('Tom'),
    v => v.name.toLowerCase().includes('male') && v.lang.startsWith('en'),
    v => v.lang.startsWith('en-GB'),
    v => v.lang.startsWith('en-US'),
    v => v.lang.startsWith('en'),
  ];
  if (!voices.length) loadVoices();
  for (const test of priority) {
    const found = voices.find(test);
    if (found) return found;
  }
  return voices[0] || null;
}

export function speakDuke(text) {
  try {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickBestVoice();
    if (voice) u.voice = voice;
    u.rate  = 0.88;
    u.pitch = 0.72;
    u.volume = 0.95;
    window.speechSynthesis.speak(u);
  } catch(e) {}
}
