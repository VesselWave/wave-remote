# Download site

https://remote.vwave.me is the one-page download site: the APK download, an Add to F-Droid link with the official repository fingerprint, and the app's Buttons/Touchpad switch flipping between real screenshots.

- **Stack:** React 19, TypeScript, Tailwind CSS v4 and shadcn/ui components (`src/components/ui`, restyled to the app's palette in `src/styles.css`), built with Vite under Bun.
- **Hosting:** Cloudflare Worker `wave-remote` on the `vwave.me` zone ([`wrangler.jsonc`](wrangler.jsonc)). Static files come from Vite's `dist/`.
- **Release data:** [`worker/index.tsx`](worker/index.tsx) reads the latest GitHub release through the GitHub API, cached at the edge for ten minutes. It server-renders `/` with that release and embeds it so React hydrates without a flash, redirects `/download` to the `wave-remote-v*.apk` asset, and serves `/latest.json`. If GitHub can't be reached, the page shows generic text and `/download` opens the releases page.
- **Screenshots:** `public/screens/*.webp` are scaled from `../docs/screenshots`; refresh them when the UI changes. Their `.json` sidecars record where they came from.
- **Link preview:** `public/og.png` (1200×630) is rendered from [`og/card.html`](og/card.html) with the Buttons screenshot. After editing either, start a Chromium with `--remote-debugging-port=9222`, run `node og/render.cjs` with `playwright-core` available (set `CDP_URL` for another host), and commit the PNG.

Run `bun run dev` from the repository root or this directory to develop the site at
http://localhost:4000. The Vite dev server renders the UI with generic release text;
use `bun run preview` in this directory to exercise the Worker and release endpoints.

New releases appear on their own. Redeploy only when the site changes:

```sh
cd site
bun install
bun run typecheck
bun run deploy        # vite build + wrangler deploy
```

`bun run preview` builds and serves the Worker locally with `wrangler dev`.

Verify with `curl -fsS https://remote.vwave.me/latest.json` and `curl -fsSI https://remote.vwave.me/download`. The second should return a 302 to the release APK.
