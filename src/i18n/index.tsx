import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_LANG, LANGS, translate, type Lang, type TKey, type TVars } from './translations'

export { LANGS, LANG_NAME, LANG_SHORT, DEFAULT_LANG, translate } from './translations'
export type { Lang, TKey, TVars } from './translations'

const LANG_KEY = 'clarity:lang:v1'

export const isLang = (value: unknown): value is Lang => LANGS.includes(value as Lang)

export const readStoredLang = (): Lang => {
  try {
    const stored = localStorage.getItem(LANG_KEY)
    return isLang(stored) ? stored : DEFAULT_LANG
  } catch {
    return DEFAULT_LANG
  }
}

interface I18nApi {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: TKey, vars?: TVars) => string
}

const I18nContext = createContext<I18nApi | null>(null)

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(readStoredLang)

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang)
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next: Lang) => setLangState(next), [])
  const t = useCallback((key: TKey, vars?: TVars) => translate(lang, key, vars), [lang])
  const api = useMemo<I18nApi>(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <I18nContext.Provider value={api}>{children}</I18nContext.Provider>
}

export const useI18n = () => {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
