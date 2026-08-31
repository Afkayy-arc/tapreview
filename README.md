# TapReview

QR-to-Google-review flow for any local business — restaurants, clinics, salons, gyms, hotels, shops, auto workshops. A customer scans a QR code, rates their visit (half-stars supported), swipes through generated review suggestions matching their rating and the business type, edits if they like, then copies the text and jumps straight to the business's official Google review dialog.

No backend — a static site plus a JSON registry. Hosted free on GitHub Pages. Event logging via a free Google Apps Script + Sheet.

## How it works

1. **Scan** — the QR encodes `https://<host>/?id=<business-key>`.
2. **Rate** — tap or drag across the star bar (snaps to half-star steps, 1–5).
3. **Pick** — swipe (or use arrows) through 8 review suggestions assembled at random from sentence fragments matching the rating **and the business category**, so every visitor sees different text. A **Detailed / Short** toggle switches between full reviews and one-liners. Half ratings mix both neighboring tiers. `↻ Fresh suggestions` regenerates.
4. **Post** — edit the text, then **Copy & open Google Reviews** copies to clipboard and opens `https://search.google.com/local/writereview?placeid=…` where the customer pastes it. (Google doesn't allow pre-filling review text — the copy step is the workaround.)

English and Urdu (اردو) built in — toggle at the top right, remembered per device. (Category-specific detail sentences are English-only so far; Urdu uses the generic set for non-restaurant categories.)

## Adding a business

Open **`add.html`** on the deployed site, paste the business's website URL, and hit *Detect from website* — it guesses the category from the URL and homepage keywords (best-effort via a public CORS proxy), prefills the name from the site title, and generates a ready-to-paste `restaurants.json` snippet. Override anything before generating.

Or edit `restaurants.json` by hand:

```json
"smile-dental": {
  "name": "Smile Dental Care",
  "category": "clinic",
  "website": "https://smiledental.example",
  "placeId": "ChIJ...",
  "logo": "",
  "feedbackEmail": "",
  "privateBelow": 0
}
```

- **category** — `restaurant`, `clinic`, `salon`, `gym`, `hotel`, `shop`, `auto`, or `generic` (default). Picks the review fragment set.
- **placeId** — find it with Google's [Place ID Finder](https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder). Without it, the Google button falls back to a Maps search for the name.
- **logo** — optional image URL shown at the top of the page.
- **feedbackEmail + privateBelow** — optional low-rating routing (see below).

Then open `qr.html` on the deployed site to generate and download a printable QR code for the new business.

The app also works without the registry via raw URL params: `?r=Business%20Name&p=PLACE_ID&c=clinic`.

## Embedding on a business website

Businesses don't need the QR — they can put the flow on their own site.

**Floating "Rate us" button** (one line before `</body>`):

```html
<script src="https://afkayy-arc.github.io/tapreview/widget.js" data-business="demo"></script>
```

**Inline embed** (renders the flow inside the page):

```html
<div id="tapreview"></div>
<script src="https://afkayy-arc.github.io/tapreview/widget.js"
        data-business="demo" data-display="inline" data-target="#tapreview"></script>
```

Widget options: `data-accent="#2563EB"` (brand color), `data-theme="light|dark"`, `data-lang="en|ur"`, `data-label="…"` (button text), `data-position="left|right"`. The inline embed auto-sizes to its content via postMessage. A plain `<iframe src="…/?id=demo&embed=1">` also works. See `embed-demo.html` for a live example, and each business's `admin.html` shows their ready-made snippets.

## Theming

Per business in `restaurants.json`:

```json
"theme": { "accent": "#2563EB", "mode": "dark" }
```

`accent` recolors buttons/highlights (text contrast auto-adjusts); `mode` forces light or dark instead of following the visitor's system. URL params `?accent=2563EB&mode=dark&lang=ur` override, which is how the widget passes options through.

## Per-business admin analytics

Each business gets its own dashboard at `admin.html?business=<id>&key=<their-key>` — funnel, rating distribution, the reviews their customers kept, and their embed snippets. Access keys live in the **keys** sheet of the logging spreadsheet (one row per business: id, key) — hand each client their link.

Reads from the collector are key-protected: business keys only return that business's events; the `MASTER_KEY` set at the top of the Apps Script unlocks the all-business view in `logs.html` (asked for once, remembered in the browser). Event *writes* stay open — visitors' browsers post them anonymously.

## Logs

`logs.html` on the deployed site shows a per-business funnel (scans → ratings → avg rating → reviews kept → Google clicks → conversion) and a table of recent events including the exact review text each visitor kept.

It reads from the collector endpoint in `analyticsUrl`. One-time setup: create a Google Sheet → Extensions → Apps Script → paste `logging/apps-script.gs` → **change `MASTER_KEY`** → Deploy as Web app (execute as *Me*, access *Anyone*) → put the `/exec` URL into `"analyticsUrl"` in `restaurants.json`. Until that's configured, `logs.html` shows these setup steps and the app simply doesn't send events.

## Low-rating routing (off by default)

Set `"privateBelow": 4` and a `feedbackEmail` to send sub-4-star visitors to a private feedback form (delivered by email) instead of the review picker. A "Post on Google instead" escape hatch is always shown.

> ⚠️ Google's review policy prohibits "review gating" (soliciting only positive public reviews). Enabling this is a per-client business decision — make it an informed one.

## Analytics events

With `analyticsUrl` set, the app beacons JSON events: `scan`, `rate`, `shuffle`, `length`, `pick`, `copy`, `google_click`, `feedback_send` — with business id, category, rating, language, length mode, and (for pick/copy/google_click) the review text the visitor kept. Any POST endpoint works; the bundled Apps Script is the free default. Empty string disables logging entirely.

## Local development

```sh
cd tapreview
python3 -m http.server 8642
# open http://localhost:8642/?id=demo
```

Serving over HTTP matters — `restaurants.json` can't be fetched from a `file://` URL.

## Deploy

Pushed to `main` → GitHub Pages serves it automatically. QR codes generated on the live `qr.html` point at the live URL by default.

## Notes on review quality

Google filters duplicate and templated review text. The fragment-based generator gives each visitor different wording, and the app nudges people to edit before posting — both matter for reviews actually sticking. The strongest future version generates fully unique text per visitor (LLM API seeded with rating + quick taps like "food ✓ service ✓ parking ✗").
