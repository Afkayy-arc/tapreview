import React from "react";
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadSerif } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadSans } from "@remotion/google-fonts/Figtree";
import { loadFont as loadMono } from "@remotion/google-fonts/GeistMono";

export const FPS = 30;
const S = (sec: number) => Math.round(sec * FPS);

const serif = loadSerif("normal", { weights: ["500", "600"], subsets: ["latin"] }).fontFamily;
const sans = loadSans("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] }).fontFamily;
const mono = loadMono("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;

// Tokens copied from index.html (light + dark themes)
const C = {
  bg: "#FAF7F2", surface: "#FFFFFF", ink: "#241D16", muted: "#6E6259", line: "#E7DFD4", accent: "#1E6B4E", accentSoft: "#E4F0EA",
  star: "#E8A23C", starEmpty: "#DDD3C6", dbg: "#171310", dsurface: "#211C17", dink: "#F2EBE2", dmuted: "#A3968A", dline: "#372F27", daccent: "#3FA97C", dstar: "#F0B356",
  google: "#1a73e8",
};
const DARK_BG = `radial-gradient(1200px 800px at 30% 20%, #241D16, ${C.dbg})`;

const LEN = { intro: S(3.5), scan: S(5.5), rate: S(6), pick: S(7), post: S(6), results: S(6), close: S(5) };
const START = (() => { let t = 0; const o = {} as Record<keyof typeof LEN, number>; for (const k of Object.keys(LEN) as (keyof typeof LEN)[]) { o[k] = t; t += LEN[k]; } return o; })();
export const DURATION = Object.values(LEN).reduce((a, b) => a + b, 0);

/* ---------- primitives ---------- */

const ease = (f: number, from: number, to: number, a = 0, b = 1) =>
  interpolate(f, [from, to], [a, b], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const Scene: React.FC<{ from: number; dur: number; bg: string; children: React.ReactNode }> = ({ from, dur, bg, children }) => (
  <Sequence from={from} durationInFrames={dur} premountFor={30}>
    <SceneBody dur={dur} bg={bg}>{children}</SceneBody>
  </Sequence>
);
const SceneBody: React.FC<{ dur: number; bg: string; children: React.ReactNode }> = ({ dur, bg, children }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 8, dur - 8, dur], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: bg }}><AbsoluteFill style={{ opacity: o, perspective: 2400 }}>{children}</AbsoluteFill></AbsoluteFill>;
};

const Title: React.FC<{ text: string; size?: number; color?: string; delay?: number; center?: boolean; width?: number; font?: string }> =
  ({ text, size = 84, color = C.ink, delay = 0, center, width, font = serif }) => {
    const f = useCurrentFrame(); const { fps } = useVideoConfig();
    return (
      <div style={{ fontFamily: font, fontSize: size, fontWeight: 600, color, letterSpacing: "-0.02em", lineHeight: 1.1, display: "flex", flexWrap: "wrap", columnGap: "0.24em", justifyContent: center ? "center" : "flex-start", textAlign: center ? "center" : "left", width }}>
        {text.split(" ").map((w, i) => {
          const s = spring({ frame: f - delay - i * 3, fps, config: { damping: 200 }, durationInFrames: 26 });
          return <span key={i} style={{ opacity: s, transform: `translateY(${(1 - s) * 28}px)`, filter: `blur(${(1 - s) * 10}px)` }}>{w}</span>;
        })}
      </div>
    );
  };
const Sub: React.FC<{ text: string; delay?: number; color?: string; size?: number; center?: boolean; width?: number }> = ({ text, delay = 0, color = C.muted, size = 28, center, width }) => {
  const f = useCurrentFrame(); const o = ease(f, delay, delay + 20);
  return <p style={{ fontFamily: sans, fontSize: size, color, lineHeight: 1.45, margin: 0, opacity: o, transform: `translateY(${(1 - o) * 16}px)`, textAlign: center ? "center" : "left", width }}>{text}</p>;
};
const Kicker: React.FC<{ text: string; delay?: number; color?: string }> = ({ text, delay = 0, color = C.accent }) => {
  const f = useCurrentFrame();
  return <div style={{ fontFamily: sans, fontSize: 22, fontWeight: 600, color, letterSpacing: "0.14em", textTransform: "uppercase", opacity: ease(f, delay, delay + 14) }}>{text}</div>;
};
const Copy: React.FC<{ kicker: string; title: string; sub: string; dark?: boolean; top?: number; width?: number }> = ({ kicker, title, sub, dark, top = 300, width = 820 }) => (
  <div style={{ position: "absolute", left: 140, top, width, display: "grid", gap: 26 }}>
    <Kicker text={kicker} color={dark ? C.daccent : C.accent} />
    <Title text={title} color={dark ? C.dink : C.ink} delay={4} />
    <Sub text={sub} color={dark ? C.dmuted : C.muted} delay={30} width={Math.min(640, width)} />
  </div>
);

type Pose = { rx: number; ry: number; s: number; x: number; y: number };
const camera = (f: number, keys: [number, Pose][]) => {
  let a = keys[0], b = keys[0];
  for (const k of keys) { if (k[0] <= f) { a = k; b = k; } else { b = k; break; } }
  const t = a === b ? 1 : ease(f, a[0], b[0]);
  const m = (p: keyof Pose) => a[1][p] + (b[1][p] - a[1][p]) * t;
  return `translate(${m("x")}px, ${m("y")}px) scale(${m("s")}) rotateX(${m("rx")}deg) rotateY(${m("ry")}deg)`;
};

const STAR = "M12 2.5l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.3l-6 3.3 1.3-6.6L2.4 9.4l6.7-.8z";
/** Star with fractional fill (0..1), half-star capable. */
const Star: React.FC<{ size: number; fill: number; on?: string; off?: string }> = ({ size, fill, on = C.star, off = C.starEmpty }) => {
  const id = React.useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
      <defs><clipPath id={id}><rect x="0" y="0" width={24 * clamp01(fill)} height="24" /></clipPath></defs>
      <path d={STAR} fill={off} />
      <path d={STAR} fill={on} clipPath={`url(#${id})`} />
    </svg>
  );
};
const Stars: React.FC<{ value: number; size: number; gap?: number; on?: string; off?: string; pop?: number }> = ({ value, size, gap = 6, on, off, pop = 0 }) => (
  <div style={{ display: "flex", gap }}>
    {[0, 1, 2, 3, 4].map((i) => {
      const fill = clamp01(value - i); const bump = fill > 0 && fill < 1 ? 0 : pop;
      return <div key={i} style={{ transform: `scale(${1 + bump * (fill >= 1 ? 1 : 0)})` }}><Star size={size} fill={fill} on={on} off={off} /></div>;
    })}
  </div>
);

/** Deterministic QR-looking pattern (finders + timing + seeded noise). */
const QR: React.FC<{ size: number; reveal: number; dark?: string; light?: string }> = ({ size, reveal, dark = C.ink, light = "#fff" }) => {
  const N = 25, cell = size / N; let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const cells: [number, number][] = [];
  const finder = (x: number, y: number, i: number, j: number) => { const a = i - x, b = j - y; if (a < 0 || b < 0 || a > 6 || b > 6) return null; const ring = Math.max(Math.abs(a - 3), Math.abs(b - 3)); return ring === 3 || ring <= 1; };
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const fd = finder(0, 0, i, j) ?? finder(N - 7, 0, i, j) ?? finder(0, N - 7, i, j);
    const guard = (i < 8 && j < 8) || (i >= N - 8 && j < 8) || (i < 8 && j >= N - 8);
    let on: boolean;
    if (fd !== null) on = fd; else if (guard) on = false; else if (i === 6 || j === 6) on = (i + j) % 2 === 0; else on = rnd() < 0.45;
    if (on) cells.push([i, j]);
  }
  const shown = Math.floor(cells.length * clamp01(reveal));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", background: light }}>
      {cells.slice(0, shown).map(([i, j]) => <rect key={`${i}-${j}`} x={i * cell} y={j * cell} width={cell + 0.3} height={cell + 0.3} fill={dark} />)}
    </svg>
  );
};

/** Touch indicator. */
const Finger: React.FC<{ x: number; y: number; press?: number; visible?: boolean }> = ({ x, y, press = 0, visible = true }) => (
  <div style={{ position: "absolute", left: x - 22, top: y - 22, width: 44, height: 44, borderRadius: "50%", background: "rgba(36,29,22,.28)", border: "2px solid rgba(255,255,255,.9)", boxShadow: "0 4px 14px rgba(0,0,0,.25)", transform: `scale(${1 - press * 0.25})`, opacity: visible ? 1 : 0, pointerEvents: "none" }} />
);

/* ---------- the phone and the app screens (390×844 css px, like the real page) ---------- */

const Phone: React.FC<{ transform: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ transform, children, style }) => (
  <div style={{ position: "absolute", width: 420, height: 874, borderRadius: 62, background: "#14110f", padding: 15, boxShadow: "0 70px 140px -40px rgba(36,29,22,.55), inset 0 0 0 2px #2b2521", transform, transformStyle: "preserve-3d", ...style }}>
    <div style={{ position: "relative", width: 390, height: 844, borderRadius: 48, overflow: "hidden", background: C.bg }}>
      {children}
      <div style={{ position: "absolute", top: 12, left: 0, right: 0, display: "flex", justifyContent: "center" }}><i style={{ width: 110, height: 32, borderRadius: 20, background: "#14110f" }} /></div>
    </div>
  </div>
);

const AppHeader: React.FC<{ step: 0 | 1 | 2 }> = ({ step }) => (
  <div style={{ padding: "58px 20px 0", textAlign: "center", position: "relative" }}>
    <div style={{ position: "absolute", right: 18, top: 58, display: "flex", borderRadius: 999, border: `1px solid ${C.line}`, overflow: "hidden", background: C.surface, fontFamily: sans, fontSize: 13, fontWeight: 600 }}>
      <span style={{ padding: "7px 12px", background: C.accent, color: "#fff" }}>EN</span><span style={{ padding: "7px 12px", color: C.ink }}>اردو</span>
    </div>
    <div style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", color: C.muted, marginTop: 8 }}>SHARE YOUR EXPERIENCE AT</div>
    <div style={{ fontFamily: serif, fontSize: 36, fontWeight: 600, color: C.ink, marginTop: 4 }}>Demo Bistro</div>
    <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 14 }}>
      {["RATE", "PICK", "POST"].map((s, i) => <span key={s} style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", padding: "6px 12px", borderRadius: 999, background: i === step ? C.accentSoft : "transparent", color: i === step ? C.accent : C.muted }}>{s}</span>)}
    </div>
  </div>
);
const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ margin: "18px 18px 0", background: C.surface, borderRadius: 26, boxShadow: "0 10px 30px rgba(36,29,22,.08)", border: `1px solid ${C.line}`, ...style }}>{children}</div>
);
const Btn: React.FC<{ text: string; kind?: "solid" | "outline" | "ghost"; press?: number; style?: React.CSSProperties }> = ({ text, kind = "solid", press = 0, style }) => (
  <div style={{ height: 50, borderRadius: 999, display: "grid", placeItems: "center", fontFamily: sans, fontSize: 17, fontWeight: 600, transform: `scale(${1 - press * 0.06})`, background: kind === "solid" ? C.accent : "transparent", color: kind === "solid" ? "#fff" : kind === "outline" ? C.ink : C.muted, border: kind === "outline" ? `1px solid ${C.line}` : "none", ...style }}>{text}</div>
);
const Footer = () => <div style={{ position: "absolute", bottom: 26, left: 0, right: 0, textAlign: "center", fontFamily: sans, fontSize: 14, color: C.muted }}>Powered by TapReview</div>;

const RateScreen: React.FC<{ value: number; pop?: number }> = ({ value, pop }) => (
  <>
    <AppHeader step={0} />
    <Card style={{ padding: "34px 20px 30px", textAlign: "center" }}>
      <div style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, color: C.ink }}>How was your visit?</div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 26 }}><Stars value={value} size={46} gap={10} pop={pop} /></div>
      <div style={{ fontFamily: sans, fontSize: 15, color: C.muted, marginTop: 26 }}>Tap or drag across the stars — halves count too</div>
    </Card>
    <Footer />
  </>
);

const REVIEWS = [
  "Demo Bistro completely won us over. The food came out fresh and full of flavor, and the staff made us feel so welcome. Highly recommend — don’t think twice, just go.",
  "One of the best meals I’ve had in a while. Every dish was spot on, service was quick, and the prices felt fair for the quality. Already planning my next visit!",
  "Absolutely loved Demo Bistro. Warm welcome, clean space, and food that genuinely exceeded expectations. This place deserves all five stars.",
];
const SHORT = ["Fresh food, friendly staff, fair prices. Five stars.", "Best meal in ages. Go.", "Loved it. Back soon with friends."];
const PickScreen: React.FC<{ index: number; shift: number; short: boolean; press?: number }> = ({ index, shift, short, press = 0 }) => {
  const texts = short ? SHORT : REVIEWS;
  return (
    <>
      <AppHeader step={1} />
      <Card style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Stars value={5} size={24} gap={4} />
        <span style={{ fontFamily: sans, fontSize: 14, color: C.muted, textAlign: "right", width: 160 }}>5 ★ · Amazing! Glad you loved it</span>
      </Card>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
        <div style={{ display: "flex", borderRadius: 999, border: `1px solid ${C.line}`, overflow: "hidden", background: C.surface, fontFamily: sans, fontSize: 15, fontWeight: 600 }}>
          <span style={{ padding: "9px 26px", background: short ? "transparent" : C.accent, color: short ? C.ink : "#fff" }}>Detailed</span>
          <span style={{ padding: "9px 26px", background: short ? C.accent : "transparent", color: short ? "#fff" : C.ink }}>Short</span>
        </div>
      </div>
      <div style={{ position: "relative", height: 330, marginTop: 16, overflow: "hidden" }}>
        {[-1, 0, 1].map((k) => {
          const i = (index + k + texts.length) % texts.length; const x = 18 + (k - shift) * 372;
          return (
            <div key={k} style={{ position: "absolute", left: x, top: 0, width: 354, background: C.surface, borderRadius: 26, border: `1px solid ${C.line}`, boxShadow: "0 10px 30px rgba(36,29,22,.08)", padding: "22px 26px", display: "grid", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Stars value={5} size={18} gap={3} /><span style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: C.ink }}>5</span></div>
              <div style={{ fontFamily: sans, fontSize: 17, lineHeight: 1.5, color: C.ink, minHeight: short ? 60 : 180 }}>{texts[i]}</div>
              <Btn text="Use this review" press={k === 0 ? press : 0} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 14 }}>{[0, 1, 2, 3, 4, 5, 6, 7].map((d) => <i key={d} style={{ width: 8, height: 8, borderRadius: 4, background: d === index ? C.accent : C.line }} />)}</div>
      <div style={{ fontFamily: sans, fontSize: 14, color: C.muted, textAlign: "center", marginTop: 16 }}>↻ Fresh suggestions</div>
      <Footer />
    </>
  );
};

const PostScreen: React.FC<{ press?: number; copied?: number }> = ({ press = 0, copied = 0 }) => (
  <>
    <AppHeader step={2} />
    <Card style={{ padding: "20px 20px 22px", display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Stars value={5} size={18} gap={3} /><span style={{ fontFamily: sans, fontSize: 14, color: C.muted }}>Edit if you like</span></div>
      <div style={{ border: `1px solid ${C.line}`, borderRadius: 16, padding: 14, fontFamily: sans, fontSize: 16, lineHeight: 1.5, color: C.ink, minHeight: 150 }}>{REVIEWS[0]}</div>
      <div style={{ position: "relative" }}>
        <Btn text="Copy & open Google Reviews ↗" press={press} />
        <div style={{ position: "absolute", left: 0, right: 0, top: -46, display: "flex", justifyContent: "center", opacity: copied, transform: `translateY(${(1 - copied) * 8}px)` }}>
          <span style={{ background: C.ink, color: "#fff", fontFamily: sans, fontSize: 14, fontWeight: 600, padding: "8px 14px", borderRadius: 999 }}>Copied ✓</span>
        </div>
      </div>
      <Btn text="Copy text only" kind="outline" />
      <Btn text="← Pick a different review" kind="ghost" style={{ height: 36 }} />
    </Card>
    <Footer />
  </>
);

/** Google's "Rate and review" sheet, as the customer sees it after the jump. */
const GoogleSheet: React.FC<{ pasted: number; press?: number; posted?: number }> = ({ pasted, press = 0, posted = 0 }) => {
  const chars = Math.floor(REVIEWS[0].length * clamp01(pasted));
  return (
    <div style={{ position: "absolute", inset: 0, background: "#fff", fontFamily: "Roboto, Arial, sans-serif" }}>
      <div style={{ padding: "60px 22px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 20, background: "#e8f0fe", display: "grid", placeItems: "center", color: C.google, fontWeight: 700, fontSize: 18 }}>G</div>
          <div><div style={{ fontSize: 18, fontWeight: 500, color: "#202124" }}>Demo Bistro</div><div style={{ fontSize: 13, color: "#5f6368" }}>Posting publicly across Google</div></div>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 24 }}><Stars value={5} size={40} gap={6} on="#fbbc04" off="#dadce0" /></div>
        <div style={{ marginTop: 22, border: "1px solid #dadce0", borderRadius: 8, padding: 14, minHeight: 190, fontSize: 16, lineHeight: 1.5, color: "#202124" }}>
          {chars === 0 ? <span style={{ color: "#80868b" }}>Share details of your own experience at this place</span> : REVIEWS[0].slice(0, chars)}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <span style={{ padding: "10px 18px", borderRadius: 6, color: C.google, fontWeight: 500, fontSize: 15 }}>Cancel</span>
          <span style={{ padding: "10px 22px", borderRadius: 6, background: C.google, color: "#fff", fontWeight: 500, fontSize: 15, transform: `scale(${1 - press * 0.06})` }}>Post</span>
        </div>
      </div>
      <div style={{ position: "absolute", inset: 0, background: "#fff", display: "grid", placeItems: "center", alignContent: "center", gap: 18, opacity: posted }}>
        <div style={{ width: 96, height: 96, borderRadius: 48, background: "#e6f4ea", display: "grid", placeItems: "center" }}>
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#1e8e3e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </div>
        <div style={{ fontSize: 20, fontWeight: 500, color: "#202124" }}>Thanks for your review</div>
        <div style={{ fontSize: 14, color: "#5f6368" }}>It’s now live on Google Maps</div>
      </div>
    </div>
  );
};

/* ---------- scenes ---------- */

const Intro = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const s = spring({ frame: f - 4, fps, config: { damping: 14, stiffness: 120 } });
  const word = spring({ frame: f - 18, fps, config: { damping: 200 }, durationInFrames: 24 });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 34 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
        <div style={{ transform: `scale(${s}) rotate(${(1 - s) * -90}deg)` }}><Star size={140} fill={1} on={C.dstar} off={C.dstar} /></div>
        <div style={{ fontFamily: serif, fontSize: 150, fontWeight: 600, letterSpacing: "-0.02em", color: C.dink, opacity: word, clipPath: `inset(0 ${(1 - word) * 100}% 0 0)`, transform: `translateX(${(1 - word) * -20}px)` }}>TapReview</div>
      </div>
      <Title text="More Google reviews. One scan." size={56} color={C.dmuted} delay={50} center font={sans} />
    </AbsoluteFill>
  );
};

const Scan = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const standee = spring({ frame: f - 2, fps, config: { damping: 200 }, durationInFrames: 26 });
  const phone = camera(f, [[10, { rx: 8, ry: -30, s: 0.92, x: 420, y: 360 }], [S(1.6), { rx: 4, ry: -22, s: 0.92, x: 80, y: 120 }], [S(4.2), { rx: 4, ry: -22, s: 0.92, x: 80, y: 120 }], [S(5.5), { rx: 2, ry: -8, s: 0.94, x: 0, y: 40 }]]);
  const lock = ease(f, S(2.0), S(2.6)); const found = ease(f, S(2.9), S(3.3)); const app = ease(f, S(4.3), S(4.9));
  const corner = (x: number, y: number, r: number) => <div style={{ position: "absolute", left: x, top: y, width: 44, height: 44, borderTop: `4px solid ${C.daccent}`, borderLeft: `4px solid ${C.daccent}`, transform: `rotate(${r}deg)`, borderRadius: 4 }} />;
  const inset = 70 - lock * 30;
  return (
    <>
      <Copy kicker="01 · Scan" title="Scan the code on the table." sub="A QR standee, a sticker, or a line on the receipt. No app to install." width={520} />
      {/* the standee */}
      <div style={{ position: "absolute", left: 740, top: 300, width: 330, padding: 26, borderRadius: 22, background: "#fff", boxShadow: "0 40px 80px -30px rgba(36,29,22,.35)", border: `1px solid ${C.line}`, opacity: standee, transform: `translateY(${(1 - standee) * 40}px) rotate(-6deg)`, display: "grid", gap: 16, justifyItems: "center" }}>
        <div style={{ fontFamily: serif, fontSize: 30, fontWeight: 600, color: C.ink }}>Enjoyed it?</div>
        <QR size={240} reveal={ease(f, 10, 34)} />
        <div style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, letterSpacing: "0.12em", color: C.accent }}>SCAN TO RATE US</div>
        <div style={{ fontFamily: sans, fontSize: 14, color: C.muted, marginTop: -8 }}>Demo Bistro</div>
      </div>
      {/* the phone, camera open, then the app */}
      <Phone transform={phone} style={{ left: 1120, top: 100, transformOrigin: "50% 50%" }}>
        <div style={{ position: "absolute", inset: 0, background: "#1a1614", opacity: 1 - app }}>
          <div style={{ position: "absolute", left: 60, top: 250, transform: `rotate(-6deg) scale(${1 + (1 - lock) * 0.08})`, opacity: 0.85 }}><QR size={270} reveal={1} light="#f3efe8" /></div>
          {corner(inset, 200 + inset, 0)}{corner(390 - inset - 44, 200 + inset, 90)}{corner(390 - inset - 44, 540 - inset - 44, 180)}{corner(inset, 540 - inset - 44, 270)}
          <div style={{ position: "absolute", left: 24, right: 24, top: 610, padding: "14px 18px", borderRadius: 16, background: "rgba(255,255,255,.96)", display: "flex", alignItems: "center", gap: 12, opacity: found, transform: `translateY(${(1 - found) * 14}px)` }}>
            <span style={{ width: 34, height: 34, borderRadius: 17, background: C.accentSoft, display: "grid", placeItems: "center", color: C.accent, fontFamily: sans, fontWeight: 700 }}>↗</span>
            <span style={{ fontFamily: mono, fontSize: 13, color: C.ink }}>afkayy-arc.github.io/tapreview/?id=demo</span>
          </div>
          <div style={{ position: "absolute", bottom: 70, left: 0, right: 0, display: "flex", justifyContent: "center" }}><i style={{ width: 70, height: 70, borderRadius: 35, border: "4px solid #fff" }} /></div>
        </div>
        <div style={{ position: "absolute", inset: 0, opacity: app }}><RateScreen value={0} /></div>
      </Phone>
    </>
  );
};

// Drag path across the star bar (screen coords). Stars sit at x 71..319 (5 × 46 + gaps), y ≈ 288.
const STAR_X0 = 71, STAR_W = 262, STAR_Y = 289;
const Rate = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const t = camera(f, [[0, { rx: 2, ry: -8, s: 0.94, x: 0, y: 40 }], [LEN.rate, { rx: 1, ry: -3, s: 0.97, x: -20, y: 30 }]]);
  const drag = ease(f, S(0.9), S(3.0)); // 0 → 4.5 stars
  const settle = ease(f, S(3.6), S(3.9)); // nudge 4.5 → 5
  const value = drag * 4.5 + settle * 0.5;
  const fx = STAR_X0 + STAR_W * clamp01(value / 5), fy = STAR_Y + Math.sin(drag * Math.PI) * 6;
  const pop = spring({ frame: f - S(3.9), fps, config: { damping: 10, stiffness: 160 } }) * 0.12 * (1 - ease(f, S(4.4), S(4.7)));
  const chip = spring({ frame: f - S(4.0), fps, config: { damping: 200 }, durationInFrames: 18 });
  const visible = f > S(0.6) && f < S(4.6);
  return (
    <>
      <Copy kicker="02 · Rate" title="Rate the visit." sub="Tap or drag across the stars. Half stars count, so a 4½ is a 4½." />
      <Phone transform={t} style={{ left: 1120, top: 100, transformOrigin: "50% 50%" }}>
        <RateScreen value={value} pop={pop} />
        <div style={{ position: "absolute", left: 40, right: 40, top: 470, display: "flex", justifyContent: "center", opacity: chip, transform: `translateY(${(1 - chip) * 10}px)` }}>
          <span style={{ background: C.accentSoft, color: C.accent, fontFamily: sans, fontSize: 15, fontWeight: 600, padding: "10px 18px", borderRadius: 999 }}>5 ★ · Amazing! Glad you loved it</span>
        </div>
        <Finger x={fx} y={fy} press={drag > 0 && drag < 1 ? 0.6 : 0} visible={visible} />
      </Phone>
    </>
  );
};

const Pick = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const t = camera(f, [[0, { rx: 1, ry: -3, s: 0.97, x: -20, y: 30 }], [LEN.pick, { rx: 1, ry: 3, s: 0.99, x: -40, y: 20 }]]);
  // two swipes, a toggle to Short, then tap "Use this review"
  const sw1 = ease(f, S(1.0), S(1.5)), sw2 = ease(f, S(2.2), S(2.7));
  const index = (sw1 >= 1 ? 1 : 0) + (sw2 >= 1 ? 1 : 0); const shift = (sw1 < 1 ? sw1 : 0) + (sw2 < 1 ? sw2 : 0);
  const short = f >= S(3.7);
  const press = spring({ frame: f - S(5.3), fps, config: { damping: 12, stiffness: 200 } }) * (1 - ease(f, S(5.6), S(5.8)));
  // finger: swipe from right to left twice, then to the toggle, then to the button
  let fx = 300, fy = 470, vis = false;
  if (f >= S(0.8) && f < S(1.6)) { vis = true; fx = 300 - 220 * sw1; }
  else if (f >= S(2.0) && f < S(2.8)) { vis = true; fx = 300 - 220 * sw2; }
  else if (f >= S(3.3) && f < S(4.0)) { vis = true; fx = 235; fy = 283; }
  else if (f >= S(4.9) && f < S(5.9)) { vis = true; fx = 195; fy = short ? 520 : 640; }
  const pressF = (f >= S(3.65) && f < S(3.8)) || (f >= S(5.25) && f < S(5.5)) ? 0.6 : 0;
  return (
    <>
      <Copy kicker="03 · Pick" title="Pick a review. Or swipe for another." sub="Eight suggestions, assembled from fragments that match the rating and the type of business. Every visitor sees different text." />
      <Phone transform={t} style={{ left: 1120, top: 100, transformOrigin: "50% 50%" }}>
        <PickScreen index={index} shift={shift} short={short} press={press} />
        <Finger x={fx} y={fy} press={pressF} visible={vis} />
      </Phone>
    </>
  );
};

const Post = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const t = camera(f, [[0, { rx: 1, ry: 3, s: 0.99, x: -40, y: 20 }], [LEN.post, { rx: 0, ry: 0, s: 1.0, x: -60, y: 20 }]]);
  const press = spring({ frame: f - S(1.2), fps, config: { damping: 12, stiffness: 200 } }) * (1 - ease(f, S(1.5), S(1.7)));
  const copied = ease(f, S(1.35), S(1.6)) * (1 - ease(f, S(2.4), S(2.7)));
  const sheet = ease(f, S(2.5), S(3.1));
  const pasted = ease(f, S(3.2), S(4.0));
  const gpress = spring({ frame: f - S(4.5), fps, config: { damping: 12, stiffness: 200 } }) * (1 - ease(f, S(4.8), S(5.0)));
  const posted = ease(f, S(4.9), S(5.3));
  let fx = 195, fy = 545, vis = false;
  if (f >= S(0.7) && f < S(1.9)) vis = true;
  if (f >= S(4.0) && f < S(5.0)) { vis = true; fx = 318; fy = 520; }
  const pressF = (f >= S(1.15) && f < S(1.4)) || (f >= S(4.45) && f < S(4.7)) ? 0.6 : 0;
  return (
    <>
      <Copy kicker="04 · Post" title="Post it on Google." sub="One tap copies the text and opens the official Google review dialog. Paste, post, done." />
      <Phone transform={t} style={{ left: 1120, top: 100, transformOrigin: "50% 50%" }}>
        <PostScreen press={press} copied={copied} />
        <div style={{ position: "absolute", inset: 0, transform: `translateY(${(1 - sheet) * 100}%)` }}><GoogleSheet pasted={pasted} press={gpress} posted={posted} /></div>
        <Finger x={fx} y={fy} press={pressF} visible={vis} />
      </Phone>
    </>
  );
};

const funnel = [["Scanned", 312], ["Rated", 261], ["Picked", 224], ["Posted on Google", 187]] as const;
const Results = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const rating = 4.2 + 0.6 * ease(f, S(1.2), S(3.6));
  const count = Math.round(187 * ease(f, S(1.2), S(3.6)));
  const panel = spring({ frame: f - 6, fps, config: { damping: 200 }, durationInFrames: 26 });
  return (
    <>
      <Copy kicker="Admin" title="See what happens after the scan." sub="A private dashboard per business: funnel, rating spread, the reviews customers kept." dark />
      <div style={{ position: "absolute", left: 1060, top: 170, width: 720, display: "grid", gap: 22, opacity: panel, transform: `translateY(${(1 - panel) * 40}px)` }}>
        <div style={{ background: C.dsurface, border: `1px solid ${C.dline}`, borderRadius: 26, padding: 32, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: sans, fontSize: 16, color: C.dmuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>Google rating</div>
            <div style={{ fontFamily: serif, fontSize: 96, fontWeight: 600, color: C.dink, lineHeight: 1, marginTop: 8, fontVariantNumeric: "tabular-nums" }}>{rating.toFixed(1)}</div>
          </div>
          <div style={{ display: "grid", gap: 12, justifyItems: "end" }}>
            <Stars value={rating} size={40} gap={6} on={C.dstar} off={C.dline} />
            <div style={{ fontFamily: sans, fontSize: 20, color: C.daccent, fontWeight: 600 }}>+{count} reviews this month</div>
          </div>
        </div>
        <div style={{ background: C.dsurface, border: `1px solid ${C.dline}`, borderRadius: 26, padding: 32, display: "grid", gap: 18 }}>
          {funnel.map(([name, n], i) => {
            const w = ease(f, 20 + i * 8, 60 + i * 8) * (n / 312);
            return (
              <div key={name} style={{ display: "grid", gridTemplateColumns: "190px 1fr 60px", alignItems: "center", gap: 16, fontFamily: sans }}>
                <span style={{ fontSize: 19, color: C.dink }}>{name}</span>
                <div style={{ height: 18, borderRadius: 9, background: C.dline, overflow: "hidden" }}><div style={{ width: `${w * 100}%`, height: "100%", background: i === 3 ? C.dstar : C.daccent, borderRadius: 9 }} /></div>
                <span style={{ fontSize: 19, color: C.dmuted, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{Math.round(n * ease(f, 20 + i * 8, 60 + i * 8))}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

const SNIPPET = `<script src="https://afkayy-arc.github.io/tapreview/widget.js" data-business="your-id"></script>`;
const Close = () => {
  const f = useCurrentFrame();
  const chars = Math.floor(SNIPPET.length * ease(f, S(1.6), S(3.4)));
  const url = ease(f, S(3.6), S(4.0));
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 36 }}>
      <Title text="No app. No backend. Free to host." size={76} color={C.dink} center />
      <Sub text="Works from a QR code, or drop one line on your website." color={C.dmuted} delay={26} center />
      <div style={{ marginTop: 10, padding: "18px 26px", borderRadius: 16, background: C.dsurface, border: `1px solid ${C.dline}`, fontFamily: mono, fontSize: 22, color: C.daccent, minWidth: 1180, minHeight: 66, opacity: ease(f, S(1.4), S(1.7)) }}>{SNIPPET.slice(0, chars)}<span style={{ opacity: Math.floor(f / 8) % 2 ? 0 : 1 }}>▍</span></div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 18, opacity: url }}>
        <Star size={40} fill={1} on={C.dstar} off={C.dstar} />
        <span style={{ fontFamily: serif, fontSize: 44, fontWeight: 600, color: C.dink }}>TapReview</span>
        <span style={{ fontFamily: mono, fontSize: 22, color: C.dmuted, marginLeft: 12 }}>afkayy-arc.github.io/tapreview</span>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- timeline ---------- */

export const Video = () => (
  <AbsoluteFill style={{ background: C.dbg }}>
    <Scene from={START.intro} dur={LEN.intro} bg={DARK_BG}><Intro /></Scene>
    <Scene from={START.scan} dur={LEN.scan} bg={C.bg}><Scan /></Scene>
    <Scene from={START.rate} dur={LEN.rate} bg={C.bg}><Rate /></Scene>
    <Scene from={START.pick} dur={LEN.pick} bg={C.bg}><Pick /></Scene>
    <Scene from={START.post} dur={LEN.post} bg={C.bg}><Post /></Scene>
    <Scene from={START.results} dur={LEN.results} bg={DARK_BG}><Results /></Scene>
    <Scene from={START.close} dur={LEN.close} bg={DARK_BG}><Close /></Scene>
    <Audio src={staticFile("audio/music.mp3")} volume={(f) => 0.6 * interpolate(f, [0, 20, DURATION - 60, DURATION], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
  </AbsoluteFill>
);
