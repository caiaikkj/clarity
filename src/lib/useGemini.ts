import { useMemo } from 'react'
import { useI18n } from '../i18n'
import type { GeminiConfig } from './gemini'
import { useData } from './store'

export const useGeminiConfig = (): GeminiConfig | null => {
  const { settings } = useData()
  const { lang } = useI18n()
  return useMemo(
    () => (settings.geminiKey ? { apiKey: settings.geminiKey, model: settings.model, language: lang } : null),
    [settings.geminiKey, settings.model, lang],
  )
}
