# TapReview

QR-to-Google-review flow for restaurants. A diner scans a QR code at the table, rates their visit (half-stars supported), swipes through generated review suggestions matching their rating, edits if they like, then copies the text and jumps straight to the restaurant's official Google review dialog.

No backend — a static site plus a JSON registry. Hosted free on GitHub Pages.

## How it works

1. **Scan** — the QR encodes `https://<host>/?id=<restaurant-key>`.
2. **Rate** — tap or drag across the star bar (snaps to half-star steps, 1–5).
3. **Pick** — swipe (or use arrows) through 8 review suggestions assembled at random from sentence fragments matching the rating, so every visitor sees different text. Half ratings mix both neighboring tiers. `↻ Fresh suggestions` regenerates.
4. **Post** — edit the text, then **Copy & open Google Reviews** copies to clipboard and opens `https://search.google.com/local/writereview?placeid=…` where the diner pastes it. (Google doesn't allow pre-filling review text — the copy step is the workaround.)

English and Urdu (اردو) built in — toggle at the top right, remembered per device.

## Adding a restaurant

Edit `restaurants.json`:

```json
"karachi-kitchen": {
  "name": "Karachi Kitchen",
  "placeId": "ChIJ...",
  "logo": "",
  "feedbackEmail": "",
  "privateBelow": 0
}
```

- **placeId** — find it with Google's [Place ID Finder](https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder). Without it, the Google button falls back to a Maps search for the name.
- **logo** — optional image URL shown at the top of the page.
- **feedbackEmail + privateBelow** — optional low-rating routing (see below).

Then open `qr.html` on the deployed site to generate and download a printable QR code for the new restaurant.

The app also works without the registry via raw URL params: `?r=Restaurant%20Name&p=PLACE_ID`.

## Low-rating routing (off by default)

Set `"privateBelow": 4` and a `feedbackEmail` to send sub-4-star visitors to a private feedback form (delivered by email) instead of the review picker. A "Post on Google instead" escape hatch is always shown.

> ⚠️ Google's review policy prohibits "review gating" (soliciting only positive public reviews). Enabling this is a per-client business decision — make it an informed one.

## Analytics (off by default)

Set a top-level `"analyticsUrl"` in `restaurants.json` to receive JSON events (`scan`, `rate`, `shuffle`, `pick`, `copy`, `google_click`, `feedback_send`) via `sendBeacon` POSTs. Any endpoint works — a Cloudflare Worker, a Google Apps Script web app writing to a Sheet, etc. Empty string disables it.

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
