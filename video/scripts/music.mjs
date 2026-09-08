// Synthesised music bed (no licence to worry about). Run: npm run music
// 104 bpm, G major, I–V–vi–IV. Pad + sub bass + soft pluck arpeggio + a felt kick. Stereo via a short delay on the right.
import { encode, biquad, SR } from "./dsp.mjs";
const BPM = 104, BEAT = 60 / BPM, BARS = 18, LEN = Math.round(BARS * 4 * BEAT * SR);
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
// G  D/F#  Em  C   (midi: G4=67)
const chords = [[67, 71, 74, 79], [66, 69, 74, 78], [64, 67, 71, 76], [60, 64, 67, 72]];
const roots = [43, 38, 40, 36]; // G2 D2 E2 C2
const L = new Float32Array(LEN), R = new Float32Array(LEN);
const add = (buf, start, sig) => { for (let i = 0; i < sig.length && start + i < buf.length; i++) buf[start + i] += sig[i]; };
const tone = (f, sec, env, harmonics = [1]) => {
  const n = Math.round(sec * SR), out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; let v = 0; for (let h = 0; h < harmonics.length; h++) v += harmonics[h] * Math.sin(2 * Math.PI * f * (h + 1) * t + h); out[i] = v * env(t, sec); }
  return out;
};
const adsr = (a, r) => (t, len) => Math.min(1, t / a, (len - t) / r);
const pluckEnv = (t) => Math.exp(-t * 7);

for (let bar = 0; bar < BARS; bar++) {
  const chord = chords[bar % 4], root = roots[bar % 4], barStart = Math.round(bar * 4 * BEAT * SR), barLen = 4 * BEAT;
  // pad: each chord note, two slightly detuned voices, slow swell
  for (const m of chord) for (const det of [-0.15, 0.15]) {
    const sig = tone(hz(m + det / 12), barLen + 0.6, adsr(0.9, 0.9), [0.5, 0.22, 0.1, 0.05]);
    add(L, barStart, sig.map((v) => v * (det < 0 ? 0.11 : 0.08))); add(R, barStart, sig.map((v) => v * (det < 0 ? 0.08 : 0.11)));
  }
  // sub bass on beats 1 and 3
  for (const beat of [0, 2]) { const s = tone(hz(root), BEAT * 1.8, (t) => Math.min(1, t / 0.02) * Math.exp(-t * 1.6), [0.35, 0.06]); add(L, barStart + Math.round(beat * BEAT * SR), s); add(R, barStart + Math.round(beat * BEAT * SR), s); }
  // pluck arpeggio on 8ths: root, fifth, octave, third, ... (comes in from bar 2, drops out on the last bar)
  if (bar >= 2 && bar < BARS - 1) {
    const pattern = [chord[0] + 12, chord[2] + 12, chord[3] + 12, chord[1] + 12, chord[0] + 24, chord[2] + 12, chord[3] + 12, chord[1] + 12];
    pattern.forEach((m, i) => {
      const at = barStart + Math.round(i * BEAT / 2 * SR), s = tone(hz(m), 0.5, pluckEnv, [0.18, 0.05, 0.02]);
      add(L, at, s); add(R, at + Math.round(0.19 * SR), s.map((v) => v * 0.55)); add(R, at, s.map((v) => v * 0.6)); add(L, at + Math.round(0.19 * SR), s.map((v) => v * 0.35));
    });
  }
  // felt kick on every beat from bar 4
  if (bar >= 4 && bar < BARS - 1) for (let beat = 0; beat < 4; beat++) {
    const n = Math.round(0.18 * SR), k = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / SR; k[i] = Math.sin(2 * Math.PI * (48 + 90 * Math.exp(-t * 30)) * t) * Math.exp(-t * 18) * 0.5; }
    add(L, barStart + Math.round(beat * BEAT * SR), k); add(R, barStart + Math.round(beat * BEAT * SR), k);
  }
}
// gentle tone shaping + fade out at the end
const shape = (x) => biquad(biquad(x, "lowpass", 5200, 0.6), "highpass", 38);
const l = shape(L), r = shape(R);
let peak = 0; for (let i = 0; i < LEN; i++) peak = Math.max(peak, Math.abs(l[i]), Math.abs(r[i]));
const g = 10 ** (-3 / 20) / peak, tail = Math.round(3 * SR);
const inter = new Float32Array(LEN * 2);
for (let i = 0; i < LEN; i++) { const f = i > LEN - tail ? (LEN - i) / tail : 1; inter[2 * i] = l[i] * g * f; inter[2 * i + 1] = r[i] * g * f; }
encode(inter, "public/audio/music.mp3", 2);
console.log("music.mp3", (LEN / SR).toFixed(1) + "s");
