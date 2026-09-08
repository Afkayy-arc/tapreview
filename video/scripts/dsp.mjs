// Tiny audio toolkit on top of Remotion's bundled ffmpeg (decode/encode only; it ships no filters).
import { execFileSync, spawnSync } from "node:child_process";
export const FF = "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe";
export const SR = 48000;

export const decode = (file) => {
  const buf = execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-i", file, "-f", "wav", "-c:a", "pcm_s16le", "-ac", "1", "-ar", String(SR), "pipe:1"], { maxBuffer: 1 << 28 });
  const data = buf.indexOf("data") + 8; // skip RIFF/fmt chunks
  const i16 = new Int16Array(buf.buffer.slice(buf.byteOffset + data, buf.byteOffset + buf.length - ((buf.length - data) % 2)));
  return Float32Array.from(i16, (v) => v / 32768);
};
export const encode = (samples, file, channels = 1) => {
  const i16 = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) i16[i] = Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767)));
  const pcm = Buffer.from(i16.buffer), h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(channels, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * channels * 2, 28); h.writeUInt16LE(channels * 2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  const r = spawnSync(FF, ["-hide_banner", "-loglevel", "error", "-y", "-f", "wav", "-i", "pipe:0", "-c:a", "libmp3lame", "-b:a", "160k", file], { input: Buffer.concat([h, pcm]), maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(r.stderr.toString());
};
const rms = (x, a, b) => { let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i]; return Math.sqrt(s / Math.max(1, b - a)); };
export const trim = (x, dbFloor = -45, padSec = 0.08) => {
  const w = 480, thr = 10 ** (dbFloor / 20); let a = 0, b = x.length;
  while (a + w < x.length && rms(x, a, a + w) < thr) a += w;
  while (b - w > a && rms(x, b - w, b) < thr) b -= w;
  const pad = Math.round(padSec * SR), out = new Float32Array(b - a + 2 * pad); out.set(x.subarray(a, b), pad); return out;
};
export const normalize = (x, peakDb = -3) => { let p = 0; for (const v of x) p = Math.max(p, Math.abs(v)); const g = p ? 10 ** (peakDb / 20) / p : 1; return x.map((v) => v * g); };
// RBJ biquad.
export const biquad = (x, type, f0, q = 0.707) => {
  const w = 2 * Math.PI * f0 / SR, cs = Math.cos(w), al = Math.sin(w) / (2 * q); let b0, b1, b2;
  if (type === "lowpass") { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; } else { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; }
  const a0 = 1 + al, a1 = -2 * cs, a2 = 1 - al; b0 /= a0; b1 /= a0; b2 /= a0; const A1 = a1 / a0, A2 = a2 / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0; const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b1 * x1 + b2 * x2 - A1 * y1 - A2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
  return y;
};
/** Narrow-band "phone line": bandpass, saturate, a little hiss. */
export const phone = (x) => {
  let y = biquad(biquad(x, "highpass", 320, 0.9), "lowpass", 3300, 0.9);
  y = y.map((v) => Math.tanh(v * 2.6) * 0.75 + (Math.random() - 0.5) * 0.004);
  return biquad(y, "lowpass", 3600);
};
/** Per-video-frame loudness 0..1 (30 fps). */
export const levels = (x, fps = 30) => { const n = Math.round(SR / fps), out = []; for (let i = 0; i < x.length; i += n) { const db = 20 * Math.log10(rms(x, i, Math.min(x.length, i + n)) + 1e-6); out.push(+Math.min(1, Math.max(0, (db + 42) / 34)).toFixed(2)); } return out; };
export const sine = (f, sec, amp = 1) => Float32Array.from({ length: Math.round(sec * SR) }, (_, i) => amp * Math.sin(2 * Math.PI * f * i / SR));
export const mix = (...xs) => { const out = new Float32Array(Math.max(...xs.map((x) => x.length))); for (const x of xs) for (let i = 0; i < x.length; i++) out[i] += x[i]; return out; };
export const fade = (x, inSec, outSec) => { const a = Math.round(inSec * SR), b = Math.round(outSec * SR); return x.map((v, i) => v * Math.min(1, i / a, (x.length - i) / b)); };
