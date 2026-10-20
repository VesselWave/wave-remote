import downloads from './downloads.json' with { type: 'json' };

export default {
  async fetch(request, env) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    }
    const target = downloads[new URL(request.url).pathname];
    if (target) return Response.redirect(target, 302);
    return env.ASSETS.fetch(request);
  },
};
