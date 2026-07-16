# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Marketing/lead-gen site for Klehomerie, a technical property audit and asset management business in Athens, Greece. Static site built with Eleventy (11ty), deployed to Netlify, content edited via a Decap CMS (git-gateway) admin UI.

## Commands

- `npm start` — runs Eleventy's dev server and the Tailwind CLI in `--watch` mode concurrently (via `concurrently`), with live reload
- `npm run build` — production build: `npx @11ty/eleventy` then `npx tailwindcss -i src/assets/css/style.css -o _site/assets/css/style.css --minify`

There is no test suite, linter, or type checker configured. Verify changes by running `npm start` and checking the page in a browser.

Netlify runs `npm run build` and publishes `_site`. A GitHub Action (`.github/workflows/weekly-rebuild.yml`) pings the Netlify build hook every 2 days so date-gated content (see Future Guard below) goes live without a manual deploy.

## Architecture

**Eleventy config is centralized in `.eleventy.js`.** It sets `src` as input and `_site` as output, and does several non-obvious things worth knowing before editing templates or images:

- **Future-dated content guard**: `eleventyComputed.permalink` skips HTML generation entirely for any content whose `date` is in the future, and the `posts` collection filter (`addCollection("posts", ...)`) additionally drops future-dated posts from the collection/listing. This lets editors queue up blog posts in the CMS that won't appear until their date passes (surfaced by the periodic Netlify rebuild).
- **Image pipeline**: all images go through `@11ty/eleventy-img`, invoked three different ways:
  - `socialImg` filter — generates the OG/social preview JPEG for a page (used in `base.njk` head tags), falls back to `/assets/images/hero-athens-view.webp` if the source is missing.
  - `optimizedImage` async shortcode — used directly in `.njk` templates (hero images, visual modules in `post.njk`) to emit responsive `<picture>`-style HTML.
  - A custom `markdown-it` renderer override (`mdLib.renderer.rules.image`) — rewrites every `![]()` image inside markdown post bodies to run through `eleventy-img` (via `Image.statsSync`, since markdown-it rendering is synchronous) and get the same responsive/lazy-loaded treatment plus prose CSS classes. This is why post body images look and behave differently from a plain `<img>` tag.
  - All three silently fall back to the raw/default image and log a `⚠️` warning if the source file doesn't exist on disk — don't be surprised by missing-image console noise during builds.
- **Passthrough copies** move `src/assets/images`, `src/assets/js`, `src/admin`, root PDFs, `Press_Kit.zip`, and vanilla-cookieconsent's CSS/JS out of `node_modules` into `_site` verbatim. New static assets referenced by URL (not run through the image pipeline) need an explicit `addPassthroughCopy` line here. **`src/assets/css` is deliberately excluded** — `style.css` is the Tailwind build entry point and is compiled straight into `_site/assets/css/style.css` by the `tailwindcss` CLI step in `npm start`/`npm run build`, not copied verbatim (see Styling below).

**Content model**: `src/klab/posts/*.md` are blog articles (permalink/layout driven by `src/klab/posts/posts.json`, using `post.njk` as layout). Frontmatter fields (`title`, `summary`, `date`, `category`, `language`, `image`, `visual_module`, etc.) are defined by the Decap CMS schema in `src/admin/config.yml` — check that file when adding/changing frontmatter fields so the CMS editor UI stays in sync with what templates expect. `visual_module.type` (`Single Image` / `Comparison Slider` / `Image Carousel` / `None`) drives which media block `post.njk` renders above the article body.

Other CMS-managed data: `src/_data/testimonials.json` (client/contractor quotes, each with per-language short/full quotes: `_en`/`_fr`/`_el`) and `src/media/*.md` (press mentions, with a matching CMS collection in `config.yml`).

**Client-side i18n**: the site is one HTML build (English strings hardcoded in templates) with a JS-driven translation layer layered on top — there is no per-locale Eleventy build. `src/assets/js/content.js` exports `window.translations` with `en`/`fr`/`el` string tables keyed by translation key. `src/assets/js/script.js` reads `data-lang-key` attributes on elements (see `base.njk` nav, and dynamically-rendered package/FAQ cards) and swaps in `window.translations[currentLang]` on load and on language-switcher click, persisting the choice to `localStorage`. When adding UI text that should be translatable, add a `data-lang-key` attribute in the template *and* the corresponding key in all three locales in `content.js` — templates hardcode only the English fallback text.

**Templates**: `base.njk` is the single layout (nav, footer, global `<head>`/SEO/schema.org JSON-LD, cookie consent, GA4 with consent-mode defaults) wrapping every page. `post.njk` extends it for blog articles. Page-level `.njk` files (`index.njk`, `testimonials.njk`, `media.njk`, etc.) are mostly self-contained sections of the one-page site plus a few standalone routes (`/klab/`, `/testimonials/`, `/media/`, `/legal/*`).

**Styling**: Tailwind is a real build step (`tailwind.config.js` at the repo root, `darkMode: 'class'`, `@tailwindcss/typography` plugin for `prose` classes used on blog posts and the legal pages) — not the CDN script anymore (removed because `cdn.tailwindcss.com` JIT-compiles in the browser on every load, which was costing ~900ms of render-blocking time on mobile). `src/assets/css/style.css` is both the Tailwind entry point (`@tailwind base/components/utilities` at the top) *and* where hand-written CSS lives (custom properties like `--accent-color`, `--title-color`, plus one-off component styles Tailwind utilities don't cover) — the Tailwind CLI compiles this one file in place into `_site/assets/css/style.css`. `tailwind.config.js`'s `content` globs (`src/**/*.njk`, `src/**/*.md`, `src/assets/js/*.js`, `.eleventy.js`) must cover any file containing literal Tailwind class strings, including JS-templated markup (`script.js`, `content.js`) and the `CTA_RED_FLAG` shortcode HTML in `.eleventy.js` — the class scanner only matches literal substrings, so runtime-interpolated class names (e.g. `` `bg-${color}-500` ``) would silently fail to compile; the codebase currently has none of these, but keep it that way or add to a `safelist`.

**Forms**: contact/lead forms post to Netlify Forms (`netlify` attribute, e.g. the checklist request form in `post.njk`) rather than a custom backend.
