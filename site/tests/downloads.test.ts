import { describe, expect, test } from 'bun:test';
import { download } from '../worker/downloads';

const url = 'https://remote.vwave.me/downloads/v0.6.9/wave-remote-v0.6.9.apk';
function object(extra = {}) {
  return { size: 8, httpEtag: '"etag"', body: 'testdata', writeHttpMetadata: (headers: Headers) => {
    headers.set('Content-Type', 'application/vnd.android.package-archive');
  }, ...extra };
}
function bucket(value: unknown) {
  return { get: async () => value, head: async () => value } as unknown as R2Bucket;
}

describe('R2 release downloads', () => {
  test('streams bytes without a GitHub redirect', async () => {
    const response = await download(new Request(url), bucket(object()));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('testdata');
    expect(response.headers.get('Location')).toBeNull();
    expect(response.headers.get('Content-Length')).toBe('8');
  });
  test('HEAD returns size and ETag without body', async () => {
    const response = await download(new Request(url, { method: 'HEAD' }), bucket(object()));
    expect(await response.text()).toBe('');
    expect(response.headers.get('Content-Length')).toBe('8');
    expect(response.headers.get('ETag')).toBe('"etag"');
  });
  test('resumed downloads return a byte range', async () => {
    const response = await download(new Request(url, { headers: { Range: 'bytes=4-7' } }), bucket(object({ body: 'data', range: { offset: 4, length: 4 } })));
    expect(response.status).toBe(206);
    expect(response.headers.get('Content-Range')).toBe('bytes 4-7/8');
    expect(await response.text()).toBe('data');
  });
  test('matching conditional GET is bodyless', async () => {
    const value = object();
    const { body: _, ...metadata } = value;
    const response = await download(new Request(url, { headers: { 'If-None-Match': '"etag"' } }), bucket(metadata));
    expect(response.status).toBe(304);
    expect(await response.text()).toBe('');
  });
  test('missing objects and invalid paths do not redirect', async () => {
    expect((await download(new Request(url), bucket(null))).status).toBe(404);
    expect((await download(new Request('https://remote.vwave.me/downloads/private.key'), bucket(object()))).status).toBe(404);
    expect((await download(new Request(url, { method: 'POST' }), bucket(object()))).status).toBe(405);
  });
});
