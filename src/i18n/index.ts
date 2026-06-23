import { create } from 'zustand'
import { ALL, Lang, Translations } from './langs'

// Detecta el idioma del navegador (solo en client-side)
function detectLang(): Lang {
  if (typeof window === 'undefined') return 'es'   // Node.js server → default español
  const saved = localStorage.getItem('uno-lang') as Lang | null
  if (saved && ALL[saved]) return saved
  const browser = navigator.language.slice(0, 2)
  if (browser === 'pt') return 'pt'
  if (browser === 'es') return 'es'
  return 'en'
}

interface LangStore {
  lang: Lang
  setLang: (l: Lang) => void
}

export const useLangStore = create<LangStore>((set) => ({
  lang: detectLang(),
  setLang: (l) => {
    localStorage.setItem('uno-lang', l)
    set({ lang: l })
  },
}))

export function useT(): Translations {
  const lang = useLangStore(s => s.lang)
  return ALL[lang]
}

// Para el engine (fuera de React)
export function getT(): Translations {
  return ALL[useLangStore.getState().lang]
}
