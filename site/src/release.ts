export type Release = {
  version: string;
  tag: string;
  file: string;
  size: number;
  sha256: string;
  published: string;
  url: string;
  page: string;
};

export const REPO_URL = 'https://github.com/VesselWave/wave-remote';
export const RELEASES_URL = `${REPO_URL}/releases/latest`;
export const FDROID_URL = 'https://f-droid.vwave.me/fdroid/repo?fingerprint=47841BF725DA7B106B2D05DF097E4898C7B5576411804A23D6A5505C5AD17933';

export function megabytes(bytes: number) {
  return bytes < 1048576 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
}

export function releaseDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}
