// Render current release data from R2 and stream all downloads from the same bucket.
import { renderToString } from 'react-dom/server';
import App from '../src/App';
import { download } from './downloads';
import { type Release } from '../src/release';

type Env = { ASSETS: Fetcher; RELEASES: R2Bucket };


// Matches public/_headers, which covers the static files.
const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' https://static.cloudflareinsights.com",
    "connect-src 'self' https://cloudflareinsights.com",
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function secured(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

// The publisher promotes this pointer only after verifying immutable artifacts and F-Droid.
async function latest(env: Env): Promise<Release | null> {
  try {
    const object = await env.RELEASES.get('remote/latest.json');
    if (!object) return null;
    const release = await object.json<Release>();
    if (!/^v\d+\.\d+(?:\.\d+)?$/.test(release.tag)
      || release.tag !== `v${release.version}`
      || !/^wave-remote-v[\d.]+\.apk$/.test(release.file)
      || release.url !== `https://remote.vwave.me/downloads/${release.tag}/${release.file}`
      || !/^[a-f0-9]{64}$/.test(release.sha256)) return null;
    return release;
  } catch {
    return null;
  }
}

async function respond(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname.startsWith('/downloads/')) return download(request, env.RELEASES);

  if (url.pathname === '/latest.json') {
    const release = await latest(env);
    if (!release) return new Response('Latest release unavailable', { status: 503 });
    return Response.json(release, { headers: { 'Cache-Control': 'max-age=300' } });
  }

  if (url.pathname === '/download') {
    const release = await latest(env);
    return release ? Response.redirect(release.url, 302) : new Response('Release mirror unavailable', { status: 503 });
  }

  const [template, release] = await Promise.all([
    env.ASSETS.fetch(new URL('/', url)).then((response) => response.text()),
    latest(env),
  ]);
  const json = JSON.stringify(release).replace(/</g, '\\u003c');
  const html = template
    .replace('<!--app-->', renderToString(<App release={release} />))
    .replace('<!--release-->', `<script id="release" type="application/json">${json}</script>`);
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'max-age=300' },
  });
}

export default {
  async fetch(request, env) {
    return secured(await respond(request, env));
  },
} satisfies ExportedHandler<Env>;
