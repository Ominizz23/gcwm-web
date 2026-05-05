# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite, hot reload)
npm run build     # Production build
npm run preview   # Preview production build locally
```

No linting or test scripts are configured.

## Architecture

Single-page React app for GCWM (Get Cosplayer With Me), a cosplay academy/marketplace targeting Argentina.

**Stack:** React 19 + Vite + Tailwind CSS v4 (via `@tailwindcss/vite`) + Framer Motion + Lucide React. No router — the entire site is one page.

**Entry chain:** `index.html` → `src/main.jsx` → `src/app.jsx` → `src/gcwm_homepage_boceto.jsx`

The entire homepage is implemented in `src/gcwm_homepage_boceto.jsx` (one large file with all sections and sub-components). Key constants at the top of that file:

- `WHATSAPP_NUMBER` — the business WhatsApp
- `SUBSCRIPTION_ENDPOINT` — Google Apps Script URL that appends rows to a Google Sheet; uses `mode: "no-cors"` + `Content-Type: text/plain` to bypass CORS preflight
- `SUBSCRIPTION_MODAL_DELAY_MS` — delay before the email capture modal appears (default 8s, shown once per browser via `localStorage`)

**Data layer** — static JS files in `src/data/`:

| File | Purpose |
|---|---|
| `categories.js` | The 4 cosplay disciplines (pelucas, electronica, tela, props) with colors, icons, and descriptions |
| `professionals.js` | Collaborating professionals — each has `image`, `carousel` (up to 5 featured photos), and `gallery` arrays with paths under `/public/pros/` |
| `tutorials.js` | Tutorial cards — `youtubeId` is empty until videos are published; empty string renders a "Próximamente" state |
| `products.js` | Shop items with ARS prices formatted via `Intl.NumberFormat("es-AR")` |

**Design system:** EVA-01 palette (Neon Genesis Evangelion). CSS custom properties defined in `src/style.css`:
- `--eva-green: #A8FF60` (primary accent)
- `--eva-purple: #5B2A86`
- `--eva-orange: #FF6B1A`
- `--eva-black: #050507` (background)

Fonts loaded from Google Fonts: **Bebas Neue** (display titles), **Space Mono** (technical/mono), **Inter Tight** (body). Tailwind v4 is configured via the Vite plugin — no `tailwind.config.js`.

**Static assets:** Professional photos go in `/public/pros/<professional-id>/` and are referenced with paths like `/pros/hana-crafts/featured-1.jpg`. The `public/pros/` directory is untracked.

**`scroll-behavior: smooth` is intentionally absent** from `style.css` — it was removed because it conflicted with `window.scrollTo({behavior:"smooth"})` calls in JS, causing scroll rebounding.
