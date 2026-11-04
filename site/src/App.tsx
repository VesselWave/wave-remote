import { useState } from 'react';
import { mdiArrowTopRight, mdiGamepadRoundOutline, mdiGestureTap, mdiTrayArrowDown } from '@mdi/js';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { FDROID_URL, REPO_URL, RELEASES_URL, megabytes, releaseDate, type Release } from '@/release';
import { cn } from '@/lib/utils';

type Mode = 'buttons' | 'touchpad';

const screens: Record<Mode, { src: string; alt: string }> = {
  buttons: {
    src: '/screens/buttons.webp',
    alt: 'Wave Remote in Buttons mode: power, inputs and mute, volume and channel rockers, apps, keyboard, playback, and a blue OK button inside the D-pad.',
  },
  touchpad: {
    src: '/screens/touchpad.webp',
    alt: 'Wave Remote in Touchpad mode: the same top controls above a large touchpad with a scroll strip on its right edge.',
  },
};

// The VesselWave mark, identical to vwave.me/favicon.svg.
function VesselWaveMark() {
  return (
    <svg width="34" height="26" viewBox="8 30 84 64" aria-hidden="true" shapeRendering="geometricPrecision">
      <defs>
        <linearGradient id="vesselwave-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
      </defs>
      <path d="M 15 52 Q 32.5 27, 50 52 T 85 52" fill="none" stroke="url(#vesselwave-grad)" strokeWidth="12" strokeLinecap="round" />
      <path d="M 15 72 Q 32.5 47, 50 72 T 85 72" fill="none" stroke="url(#vesselwave-grad)" strokeWidth="12" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function Icon({ path, className }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d={path} fill="currentColor" />
    </svg>
  );
}

export default function App({ release }: { release: Release | null }) {
  const [mode, setMode] = useState<Mode>('buttons');
  const facts = release ? `Version ${release.version} · ${megabytes(release.size)} · Android 7+` : 'Latest release · Android 7+';

  return (
    <div className="family-shell flex min-h-dvh flex-col">
      <header className="family-frame family-header">
        <a href="https://vwave.me" className="family-brand">
          <VesselWaveMark />
          VesselWave
        </a>
        <nav aria-label="Apps" className="family-nav">
          <a href="/" className="chip" aria-current="page">Remote</a>
          <a href="https://vpn.vwave.me" className="chip">VPN</a>
        </nav>
      </header>

      <main className="family-frame remote-hero flex-1">
        <div className="hero-col">
          <div className="hero-card">
            <h1 className="product-name">
              <img src="/icon.svg" alt="" width={64} height={64} />
              Wave Remote
            </h1>
            <div className="hero-rule" />
            <p className="lede text-balance">{'Control your LG\u00a0webOS\u00a0TV from your Android phone.'}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <a href="/download">
                  <Icon path={mdiTrayArrowDown} />
                  Download APK
                </a>
              </Button>
              <Button asChild size="lg" variant="soft">
                <a href={FDROID_URL}>Add to F-Droid</a>
              </Button>
            </div>
          </div>
          <div className="facts">
            <span className="fact">{facts}</span>
            <span className="fact">No account, no cloud, no ads</span>
          </div>
        </div>

        <figure className="flex flex-col items-center gap-5">
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(value: string) => value && setMode(value as Mode)}
            aria-label="Remote mode"
            className="w-[min(100%,300px)]"
          >
            <ToggleGroupItem value="buttons">
              <Icon path={mdiGamepadRoundOutline} />
              Buttons
            </ToggleGroupItem>
            <ToggleGroupItem value="touchpad">
              <Icon path={mdiGestureTap} />
              Touchpad
            </ToggleGroupItem>
          </ToggleGroup>
          <div className="rounded-[16px] bg-card p-1 shadow-[0_30px_70px_-24px_rgb(0_0_0/0.7)] ring-1 ring-[rgb(255_255_255/0.08)]">
            <div className="phone-screen relative aspect-[720/1447] overflow-hidden rounded-[12px] bg-background">
              {(Object.keys(screens) as Mode[]).map((key) => (
                <img
                  key={key}
                  src={screens[key].src}
                  alt={screens[key].alt}
                  aria-hidden={key !== mode}
                  width={720}
                  height={1447}
                  fetchPriority={key === 'buttons' ? 'high' : 'low'}
                  className={cn(
                    'absolute inset-0 size-full object-contain py-3 transition-[opacity,filter] duration-300 ease-out motion-reduce:transition-none',
                    key === mode ? 'opacity-100 blur-0' : 'opacity-0 blur-[6px]',
                  )}
                />
              ))}
            </div>
          </div>
        </figure>
      </main>

      <footer className="family-frame family-footer">
        {release ? (
          <a href={release.page}>Released {releaseDate(release.published)}</a>
        ) : (
          <a href={RELEASES_URL}>Release notes</a>
        )}
        {release?.sha256 ? (
          <span className="font-mono tabular-nums" title={release.sha256}>
            SHA-256 {release.sha256.slice(0, 8)}…{release.sha256.slice(-8)}
          </span>
        ) : null}
        <a href={REPO_URL}>Source</a>
        <a href="https://vwave.me">VesselWave<Icon path={mdiArrowTopRight} /></a>
        <span className="sm:ml-auto">Not affiliated with LG.</span>
      </footer>
    </div>
  );
}
