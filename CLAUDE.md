# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Marketing/lead-gen site for Klehomerie, a technical property audit and asset management business in Athens, Greece. Static site built with Eleventy (11ty), deployed to Netlify, content edited via a Decap CMS (git-gateway) admin UI.

## Commands

- `npm start` — build and serve locally with live reload (`npx @11ty/eleventy --serve`)
- `npm run build` — production build to `_site/` (`npx @11ty/eleventy`)

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
- **Passthrough copies** move `src/assets`, `src/admin`, root PDFs, `Press_Kit.zip`, and vanilla-cookieconsent's CSS/JS out of `node_modules` into `_site` verbatim. New static assets referenced by URL (not run through the image pipeline) need an explicit `addPassthroughCopy` line here.

**Content model**: `src/klab/posts/*.md` are blog articles (permalink/layout driven by `src/klab/posts/posts.json`, using `post.njk` as layout). Frontmatter fields (`title`, `summary`, `date`, `category`, `language`, `image`, `visual_module`, etc.) are defined by the Decap CMS schema in `src/admin/config.yml` — check that file when adding/changing frontmatter fields so the CMS editor UI stays in sync with what templates expect. `visual_module.type` (`Single Image` / `Comparison Slider` / `Image Carousel` / `None`) drives which media block `post.njk` renders above the article body.

Other CMS-managed data: `src/_data/testimonials.json` (client/contractor quotes, each with per-language short/full quotes: `_en`/`_fr`/`_el`) and `src/media/*.md` (press mentions, with a matching CMS collection in `config.yml`).

**Client-side i18n**: the site is one HTML build (English strings hardcoded in templates) with a JS-driven translation layer layered on top — there is no per-locale Eleventy build. `src/assets/js/content.js` exports `window.translations` with `en`/`fr`/`el` string tables keyed by translation key. `src/assets/js/script.js` reads `data-lang-key` attributes on elements (see `base.njk` nav, and dynamically-rendered package/FAQ cards) and swaps in `window.translations[currentLang]` on load and on language-switcher click, persisting the choice to `localStorage`. When adding UI text that should be translatable, add a `data-lang-key` attribute in the template *and* the corresponding key in all three locales in `content.js` — templates hardcode only the English fallback text.

**Templates**: `base.njk` is the single layout (nav, footer, global `<head>`/SEO/schema.org JSON-LD, cookie consent, GA4 with consent-mode defaults) wrapping every page. `post.njk` extends it for blog articles. Page-level `.njk` files (`index.njk`, `testimonials.njk`, `media.njk`, etc.) are mostly self-contained sections of the one-page site plus a few standalone routes (`/klab/`, `/testimonials/`, `/media/`, `/legal/*`).

Styling is Tailwind via the CDN script tag (`tailwind.config` inline in `base.njk`, `darkMode: 'class'`) plus a small custom stylesheet at `src/assets/css/style.css` for things Tailwind utilities don't cover (CSS custom properties like `--accent-color`, `--title-color`).

**Forms**: contact/lead forms post to Netlify Forms (`netlify` attribute, e.g. the checklist request form in `post.njk`) rather than a custom backend.
