import { adminRuleFor, englishGenerics, findAnvisaMed, type AnvisaMed } from '../data/anvisaMeds'
import type { Lang } from '../i18n/translations'

export interface BrBridge {
  activeIngredient: string
  inn: string[]
  brazilianOnly: boolean
  adminRule?: string
}

export const bridgeFromMed = (med: AnvisaMed, lang: Lang): BrBridge => ({
  activeIngredient: med.activeIngredient,
  inn: englishGenerics(med),
  brazilianOnly: med.brazilianOnly === true,
  adminRule: adminRuleFor(med, lang) || undefined,
})

export const lookupBrBridge = (name: string, lang: Lang): BrBridge | null => {
  const med = findAnvisaMed(name)
  return med ? bridgeFromMed(med, lang) : null
}
