export default {
  async fetch(request, env) {
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    }
    const path = new URL(request.url).pathname;
    if (path.startsWith('/fdroid/repo/') && path.endsWith('.apk')) {
      const key = 'fdroid/' + path.slice('/fdroid/repo/'.length);
      const object = request.method === 'HEAD' ? await env.RELEASES.head(key)
        : await env.RELEASES.get(key, { range: request.headers, onlyIf: request.headers });
      if (!object) return new Response('Not found', { status: 404 });
      const headers = new Headers({ 'Accept-Ranges': 'bytes', 'X-Content-Type-Options': 'nosniff' });
      object.writeHttpMetadata(headers);
      headers.set('ETag', object.httpEtag);
      if (request.method === 'HEAD') {
        headers.set('Content-Length', String(object.size));
        return new Response(null, { headers });
      }
      if (!('body' in object)) return new Response(null, { status: request.headers.has('If-None-Match') ? 304 : 412, headers });
      const range = object.range;
      if (range && range.offset !== undefined && range.length !== undefined) {
        headers.set('Content-Range', `bytes ${range.offset}-${range.offset + range.length - 1}/${object.size}`);
        headers.set('Content-Length', String(range.length));
      } else headers.set('Content-Length', String(object.size));
      return new Response(object.body, { status: headers.has('Content-Range') ? 206 : 200, headers });
    }
    return env.ASSETS.fetch(request);
  },
};
