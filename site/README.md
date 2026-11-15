# Download site

https://remote.vwave.me is the one-page download site: the APK download, an Add to F-Droid link with the official repository fingerprint, and the app's Buttons/Touchpad switch flipping between real screenshots.

- **Stack:** React 19, TypeScript, Tailwind CSS v4 and shadcn/ui components (`src/components/ui`, restyled in `src/styles.css`), built with Vite under Bun.
- **Design:** shared with https://vpn.vwave.me: a plain dark ground, Inter for all text, and a header linking VesselWave, Wave Remote and Wave VPN. The family block at the top of `src/styles.css` is kept identical in both sites. Inter is self-hosted under the SIL Open Font License; the notice is in `public/licenses/`.
- **Hosting:** Cloudflare Worker `wave-remote` on the `vwave.me` zone ([`wrangler.jsonc`](wrangler.jsonc)). Static files come from Vite's `dist/`.
- **Release data:** the publisher promotes `remote/latest.json` in the private
  `wave-releases` R2 bucket after verifying all artifacts and F-Droid publication.
  The Worker reads it directly, server-renders `/`, serves `/latest.json`, and
  redirects `/download` to the versioned `/downloads/vVERSION/FILENAME` route.
  Every artifact streams from R2 with HEAD, ETag and byte-range support. There
  is no GitHub API dependency at request time and no site sync Action or release
  commit. A missing manifest returns 503 for download endpoints.
- **Screenshots:** `public/screens/*.webp` are scaled from `../docs/screenshots`; refresh them when the UI changes. Their `.json` sidecars record where they came from.
- **Brand art:** [`og/card.html`](og/card.html) is the brand card, with the Buttons screenshot. After editing either, run `og/render.sh` (headless Chrome; set `CHROME` for another binary) to write `public/og.png` (1200×630 link preview) and `../docs/brand/cover.png` (README cover, 1600 px wide), and commit both PNGs.

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

Verify with `curl -fsS https://remote.vwave.me/latest.json` and `curl -fsSI https://remote.vwave.me/download`. The second should return a 302 to the same-origin R2 APK route.

## Automatic deployment

Cloudflare Workers Builds is connected to this GitHub repository. Pushes to
`main` deploy the production Worker `wave-remote` automatically. Configure it in
**Workers & Pages → wave-remote → Settings → Builds**.

- Root directory: `site`.
- Build command: `bun install --frozen-lockfile && bun run typecheck && bun run build`.
- Deploy command: `bunx wrangler deploy`.
- Build variable: `BUN_VERSION=1.4.2`.
- Dedicated build token managed by Cloudflare; no GitHub deployment secret required.

Local `bun run deploy` remains available with Wrangler login.

## Existing-release migration

Before deploying this Worker for the first time, mirror the current published
release and promote its pointer, so `/download` is ready immediately. For a
historical release without OpenPGP manifests, explicitly use `--legacy` and an
independently verified APK SHA-256 (for example the trusted signed F-Droid index):

```sh
python3 tools/publish-r2.py --version 0.6.8 --code 10020 --legacy --sha256 bd073edf862050b66f4f862cf51666bbbdbe510d9c576449f143c6e16b50a14f
python3 tools/release-pointer.py --version 0.6.8
```

Run these from the repository root. New releases use the coordinator instead.
Artifact objects and version manifests are immutable; only `remote/latest.json`
is mutable, with downgrade/conflict checks and read-back verification.
