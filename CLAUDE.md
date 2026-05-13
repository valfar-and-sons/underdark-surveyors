# Loremaster Marketing Website

## About this repo
This is the marketing website for Loremaster, an AI-powered platform for tabletop RPG campaigns built by Valfar and Sons, Inc. The site is built with Astro + Tailwind v4 and deployed to GitHub Pages via GitHub Actions.

## Tech stack
- **Framework:** Astro v6 (static site generation)
- **Styling:** Tailwind CSS v4 via `@tailwindcss/vite`
- **Deploy:** GitHub Pages via `.github/workflows/deploy.yml`
- **Domain:** www.askloremaster.com

## Project structure
- `src/pages/` - Site pages (each `.astro` file becomes a route)
- `src/layouts/` - BaseLayout (shared shell) and LegalLayout (for policy pages)
- `src/components/` - Reusable components (Header, Footer, GlassCard, FeatureCard, etc.)
- `src/styles/global.css` - Design system tokens, animations, utility classes
- `public/` - Static assets served as-is (images, CNAME, legacy HTML pages)
- `scripts/` - Site build helpers only (e.g. `fetch-release-notes.mjs` runs as `prebuild`)
- `marketing/` - Auxiliary marketing collateral (flyers, decks, social assets). **Not** part of the public site. Each artifact lives in its own folder with everything needed to build it. See `marketing/README.md`.
- `TODO.md` - Outstanding work items for this redesign

## Marketing collateral
- Anything intended for outreach, events, or physical handouts (not the live site) goes under `marketing/<artifact-type>/<name>/`.
- Builds output to a local `dist/` inside each artifact folder (git-ignored by the global `dist/` rule).
- Shared brand assets (fonts, logos) are pulled from the site's `public/` directory so the brand stays in sync — do not duplicate them under `marketing/`.
- Do **not** put marketing artifacts under `scripts/` or `src/pages/`.

## Design system
The website's visual design is ported from the Loremaster React app (`~/projects/loremaster`). The source of truth for design tokens is the app's `frontend/src/index.css`. Key elements:
- **Palette:** Deep plum background (#0a090c) with gold accent (#daa040)
- **Fonts:** Familjen Grotesk (UI), Literata (narrative/voice text)
- **Cards:** Glassmorphism with gold-tinted borders and backdrop blur
- **Effects:** Noise overlay texture, voice text shimmer animation

## Branding rules
- **User-facing copy** should reference "Loremaster", not "Valfar and Sons"
- **Legal documents and footer copyright** should use the full legal entity name "Valfar and Sons, Inc."
- The app URL is `app.askloremaster.com`

## Copy guidelines
- Avoid obvious signs of AI-generated text. Specifically:
  - Do not use emdashes. Use commas, colons, periods, or parentheses instead.
  - Avoid filler phrases like "it's worth noting", "importantly", "in fact", "essentially"
  - Keep sentences direct and natural. Prefer short, clear statements over long compound sentences.
  - Write for a tabletop gaming audience. Be warm and inviting, not corporate.
- Legal page content comes from Google Drive drafts in the `Drive/Legal` folder and should be kept in sync. Versioning is tracked via git, not in the document text.

## Commands
- `npm run dev` - Start local dev server
- `npm run build` - Build static site to `dist/`
- `npm run preview` - Preview the built site locally
