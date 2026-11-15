import type { FdaInfo } from '../types'
import { translate, type Lang } from '../i18n/translations'
import { lookupBrBridge } from './brazil'
import {
  type GeminiConfig,
  type LabelExcerpt,
  generateNotes,
  localizeLabel,
  normalizeBrazilianMedication,
} from './gemini'
import { SUPPLEMENT_CLASSES, classesOfText } from './knowledge'
import { lookupDrugLabel } from './openfda'

export interface EnrichResult {
  activeIngredient?: string
  adminRule?: string
  strength?: string
  fda: FdaInfo
  steps: string[]
  warnings: string[]
}

interface Bridge {
  activeIngredient?: string
  inn: string[]
  brazilianOnly: boolean
  adminRule?: string
  strength?: string
}

const MAX_INGREDIENTS = 4
const MAX_ENGLISH_TEXT = 1800

const unique = (values: string[]) => [...new Set(values.map((v) => v.trim()).filter(Boolean))]

const joinText = (parts: (string | undefined)[]) => {
  const text = parts.filter(Boolean).join(' ')
  return text ? text.slice(0, MAX_ENGLISH_TEXT) : undefined
}

const mergeLabels = (infos: FdaInfo[]): FdaInfo => {
  const multi = infos.length > 1
  const tag = (info: FdaInfo, text?: string) => (text && multi ? `[${info.genericName ?? info.ingredients[0]}] ${text}` : text)
  return {
    source: 'openFDA',
    brandName: infos[0].brandName,
    genericName: infos[0].genericName,
    manufacturer: infos[0].manufacturer,
    ingredients: unique(infos.flatMap((i) => i.ingredients)),
    purpose: joinText(infos.map((i) => tag(i, i.purpose))),
    prescriptionOnly: infos.some((i) => i.prescriptionOnly),
    warnings: joinText(infos.map((i) => tag(i, i.warnings))),
    interactions: joinText(infos.map((i) => tag(i, i.interactions))),
  }
}

const describeError = (error: unknown, lang: Lang) => (error instanceof Error ? error.message : translate(lang, 'common.geminiFailed'))

const resolveBridge = async (name: string, gemini: GeminiConfig | null, lang: Lang, warnings: string[]): Promise<Bridge | null> => {
  const local = lookupBrBridge(name, lang)
  let remote: Bridge | null = null

  if (gemini) {
    try {
      const result = await normalizeBrazilianMedication(gemini, name)
      const inn = unique(result.innEn ?? []).map((n) => n.toLowerCase())
      if (result.recognized !== false && (inn.length > 0 || result.activeIngredientPt)) {
        remote = {
          activeIngredient: result.activeIngredientPt?.trim() || undefined,
          inn,
          brazilianOnly: Boolean(result.brazilianOnly),
          adminRule: result.suggestedAdminRule?.trim() || undefined,
          strength: result.strength?.trim() || undefined,
        }
      }
    } catch (error) {
      warnings.push(`${describeError(error, lang)} ${translate(lang, 'enrich.builtInFallback')}`)
    }
  }

  if (remote) {
    return {
      ...remote,
      inn: remote.inn.length ? remote.inn : (local?.inn ?? []),
      activeIngredient: remote.activeIngredient ?? local?.activeIngredient,
      adminRule: remote.adminRule ?? local?.adminRule,
    }
  }
  return local ? { ...local, inn: [...local.inn] } : null
}

export const enrichMedication = async (name: string, gemini: GeminiConfig | null, lang: Lang): Promise<EnrichResult> => {
  const steps: string[] = []
  const warnings: string[] = []
  const bridge = await resolveBridge(name, gemini, lang, warnings)

  const inn = (bridge?.inn ?? []).slice(0, MAX_INGREDIENTS)
  if (bridge) {
    const active = translate(lang, 'enrich.bridge', { active: bridge.activeIngredient ?? inn.join(', ') })
    steps.push(inn.length ? `${active}${translate(lang, 'enrich.inn', { inn: inn.join(', ') })}.` : `${active}.`)
  } else if (!gemini) {
    steps.push(translate(lang, 'enrich.needKey'))
  }

  const supplementLike = classesOfText([name, ...inn].join(' ')).some((c) => SUPPLEMENT_CLASSES.includes(c))
  const queries = inn.length ? inn : [name]
  const skipFda = bridge?.brazilianOnly === true

  let labels: FdaInfo[] = []
  if (!skipFda) {
    const results = await Promise.all(queries.map((q) => lookupDrugLabel(q, undefined, supplementLike)))
    labels = results.filter((r) => r.source === 'openFDA')
    if (labels.length === 0 && inn.length > 0 && !supplementLike) {
      const direct = await lookupDrugLabel(name)
      if (direct.source === 'openFDA') labels = [direct]
    }
  } else {
    steps.push(translate(lang, 'enrich.brOnly'))
  }

  const activeIngredient = bridge?.activeIngredient
  const base = { activeIngredient, adminRule: bridge?.adminRule, strength: bridge?.strength, steps, warnings }

  if (labels.length > 0) {
    const merged: FdaInfo = { ...mergeLabels(labels), inn }
    steps.push(translate(lang, 'enrich.matched', { name: merged.genericName ?? merged.ingredients.join(', ') }))
    if (gemini) {
      const excerpts: LabelExcerpt[] = labels.map((l) => ({
        ingredient: l.genericName ?? l.ingredients[0] ?? name,
        purpose: l.purpose,
        warnings: l.warnings,
        interactions: l.interactions,
      }))
      try {
        const localized = await localizeLabel(gemini, name, excerpts)
        merged.summaryPt = localized.summary?.trim() || undefined
        merged.warningsPt = localized.warnings?.trim() || undefined
        merged.interactionsPt = localized.interactions?.trim() || undefined
        merged.localizedLang = lang
        steps.push(translate(lang, 'enrich.translated'))
      } catch (error) {
        warnings.push(`${describeError(error, lang)} ${translate(lang, 'enrich.keepEnglish')}`)
      }
    }
    return { ...base, fda: merged }
  }

  if (gemini && bridge) {
    try {
      const notes = await generateNotes(gemini, name, bridge.activeIngredient ?? '', inn)
      steps.push(translate(lang, skipFda ? 'enrich.notesBrOnly' : 'enrich.notesNoLabel'))
      return {
        ...base,
        fda: {
          source: 'gemini',
          ingredients: inn.map((i) => i.toUpperCase()),
          inn,
          summaryPt: notes.summary?.trim() || undefined,
          warningsPt: notes.warnings?.trim() || undefined,
          interactionsPt: notes.interactions?.trim() || undefined,
          localizedLang: lang,
        },
      }
    } catch (error) {
      warnings.push(describeError(error, lang))
    }
  }

  if (!skipFda) steps.push(translate(lang, 'enrich.notListed', { name }))
  return { ...base, fda: { source: 'none', ingredients: inn.map((i) => i.toUpperCase()), inn } }
}
