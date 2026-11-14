// VERSION and VERSION_CODE are the single source for the displayed version and Android's update counter.
// WAVE_REMOTE_VARIANT=preview (set by ./build.sh debug) renames the app and its package ID so a
// debug-signed test build installs beside the release instead of conflicting with its signature.
/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');

const read = (name) => fs.readFileSync(path.join(__dirname, name), 'utf8').trim();

module.exports = ({ config }) => {
  const variant = process.env.WAVE_REMOTE_VARIANT ?? '';
  if (!['', 'preview'].includes(variant)) throw new Error(`Unknown WAVE_REMOTE_VARIANT: ${variant}`);
  const preview = variant === 'preview';
  return {
    ...config,
    name: preview ? `${config.name} Preview` : config.name,
    version: read('VERSION'),
    android: {
      ...config.android,
      package: preview ? `${config.android.package}.preview` : config.android.package,
      versionCode: Number(read('VERSION_CODE')),
    },
  };
};
