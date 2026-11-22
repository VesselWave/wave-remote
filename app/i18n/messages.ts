import { russian } from './ru';

type Message = keyof typeof russian;
type Values = Record<string, string | number>;
export type Translate = (message: Message, values?: Values) => string;

function format(message: string, values?: Values) {
  return values ? message.replace(/\{(\w+)\}/g, (placeholder, key: string) => String(values[key] ?? placeholder)) : message;
}

export const english: Translate = format;
export const translateRussian: Translate = (message, values) => format(russian[message], values);

export function translatorFor(locales: readonly { languageCode: string | null }[]): Translate {
  return locales.find(({ languageCode }) => languageCode === 'en' || languageCode === 'ru')?.languageCode === 'ru'
    ? translateRussian : english;
}

export function isMessage(text: string): text is Message {
  return Object.prototype.hasOwnProperty.call(russian, text);
}
