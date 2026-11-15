// Versioned R2 release artifacts. GitHub remains the source of record, not a download hop.
export async function download(request: Request, bucket: R2Bucket): Promise<Response> {
  if (!['GET', 'HEAD'].includes(request.method)) {
    return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  const path = new URL(request.url).pathname;
  if (!/^\/downloads\/v\d+\.\d+(?:\.\d+)?\/[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(path)) {
    return new Response('Not found', { status: 404 });
  }
  const key = 'remote/' + path.slice('/downloads/'.length);
  const object = request.method === 'HEAD'
    ? await bucket.head(key)
    : await bucket.get(key, { range: request.headers, onlyIf: request.headers });
  if (!object) return new Response('Not found', { status: 404 });
  const headers = new Headers({ 'Accept-Ranges': 'bytes', 'X-Content-Type-Options': 'nosniff' });
  object.writeHttpMetadata(headers);
  headers.set('ETag', object.httpEtag);
  headers.set('Content-Disposition', `attachment; filename="${path.split('/').pop()}"`);
  if (request.method === 'HEAD') {
    headers.set('Content-Length', String(object.size));
    return new Response(null, { headers });
  }
  if (!('body' in object)) {
    return new Response(null, { status: request.headers.has('If-None-Match') ? 304 : 412, headers });
  }
  const range = object.range;
  if (request.headers.has('Range') && range && 'offset' in range && range.offset !== undefined && range.length !== undefined) {
    headers.set('Content-Range', `bytes ${range.offset}-${range.offset + range.length - 1}/${object.size}`);
    headers.set('Content-Length', String(range.length));
  } else {
    headers.set('Content-Length', String(object.size));
  }
  return new Response((object as R2ObjectBody).body, { status: headers.has('Content-Range') ? 206 : 200, headers });
}
