import { createContext, useContext } from 'react';
import { english } from './messages';

export const TranslationContext = createContext(english);
export const useTranslate = () => useContext(TranslationContext);
