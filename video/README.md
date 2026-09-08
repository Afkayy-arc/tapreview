# TapReview · product video (39 s)

1920×1080 · 30 fps · music only, no voice. Rendered from `src/Video.tsx` with Remotion.

Every screen inside the phone is rebuilt in React from the real page's tokens (`--accent`, `--star`, Fraunces + Figtree), so it animates smoothly instead of using screenshots.

| # | Time | Scene | What happens |
|---|------|-------|--------------|
| 1 | 0:00–0:03 | Intro | Star spins in, wordmark wipes on. "More Google reviews. One scan." |
| 2 | 0:03–0:09 | Scan | A "Scan to rate us" standee builds its QR module by module. A phone slides in with the camera open, viewfinder corners lock on, the link toast appears, the app opens. |
| 3 | 0:09–0:15 | Rate | A finger drags across the star bar; stars fill to 4½, then nudge to 5 with a pop. "5 ★ · Amazing!" chip. |
| 4 | 0:15–0:22 | Pick | Two swipes through suggestion cards, Detailed → Short toggle, tap "Use this review". |
| 5 | 0:22–0:28 | Post | "Copy & open Google Reviews" pressed, "Copied ✓", Google's rate-and-review sheet slides up, the text pastes in, Post, "Thanks for your review". |
| 6 | 0:28–0:34 | Admin | Google rating counts 4.2 → 4.8 with stars filling, funnel bars grow: Scanned → Rated → Picked → Posted. |
| 7 | 0:34–0:39 | Close | "No app. No backend. Free to host." The one-line widget snippet types itself. Logo + URL. |

Music is synthesised in `scripts/music.mjs` (104 bpm, G major), nothing to licence.

```
npm install
npm run music    # → public/audio/music.mp3
npm run studio   # preview
npm run render   # → out/tapreview.mp4
```

Scene lengths are in `LEN` at the top of `src/Video.tsx`; each scene's beats are `S(seconds)` constants inside it.
