import { afterEach, describe, expect, test } from 'bun:test';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const appConfig = require('../../app.config.js');
const { expo } = JSON.parse(fs.readFileSync(path.resolve(import.meta.dir, '../../app.json'), 'utf8'));
const resolve = () => appConfig({ config: expo });
const saved = process.env.WAVE_REMOTE_VARIANT;

afterEach(() => {
  if (saved === undefined) delete process.env.WAVE_REMOTE_VARIANT;
  else process.env.WAVE_REMOTE_VARIANT = saved;
});

describe('app config variants', () => {
  test('release keeps the published name and package ID', () => {
    delete process.env.WAVE_REMOTE_VARIANT;
    const config = resolve();
    expect(config.name).toBe('Wave Remote');
    expect(config.android.package).toBe('me.vwave.remote');
    expect(config.android.versionCode).toBeGreaterThan(0);
  });
  test('preview installs beside the release under its own name and package ID', () => {
    process.env.WAVE_REMOTE_VARIANT = 'preview';
    const config = resolve();
    expect(config.name).toBe('Wave Remote Preview');
    expect(config.android.package).toBe('me.vwave.remote.preview');
    expect(config.android.permissions).toEqual(expo.android.permissions);
  });
  test('rejects an unknown variant instead of silently building the release', () => {
    process.env.WAVE_REMOTE_VARIANT = 'staging';
    expect(resolve).toThrow('Unknown WAVE_REMOTE_VARIANT');
  });
});
