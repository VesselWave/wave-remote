import { expect, test } from 'bun:test';
import { english, translateRussian, translatorFor } from '../../app/i18n/messages';
import { russian } from '../../app/i18n/ru';
import { connectionLabel, diagnostic } from '../../app/lib/remote';

test('follows the first supported Android language and defaults to English', () => {
  const select = (...codes: string[]) => translatorFor(codes.map(languageCode => ({ languageCode })));
  expect(select('fr', 'ru', 'en')('Pick your TV')).toBe('Выберите телевизор');
  expect(select('en', 'ru')).toBe(english);
  expect(select('fr')).toBe(english);
  expect(select()).toBe(english);
});

test('preserves all substitutions and leaves inserted device names intact', () => {
  const slots = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
  for (const [source, translation] of Object.entries(russian)) {
    expect(translation.trim()).not.toBe('');
    expect(slots(translation)).toEqual(slots(source));
  }
  expect(translateRussian('Open {name}', { name: '$1 {name}' })).toBe('Открыть «$1 {name}»');
});

test('translates connection details and preserves the original text of unknown TV errors', () => {
  const state = { waking: true, detail: 'Bluetooth is off' } as Parameters<typeof connectionLabel>[0];
  expect(connectionLabel(state, translateRussian)).toBe('Включение телевизора · Bluetooth выключен');
  expect(diagnostic('Handshake refused: HTTP 403', translateRussian)).toBe('Отказ при установке соединения: HTTP 403');
  expect(diagnostic('403 denied by TV', translateRussian)).toBe('403 denied by TV');
});
