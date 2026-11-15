import type { Interaction, Medication, MixVerdict, Severity } from '../types'
import type { Lang } from '../i18n/translations'
import { translate } from '../i18n/translations'
import { buildItems, computeInteractions, type InteractionItem } from './interactions'
import { classesOfText, HABIT_CLASSES } from './knowledge'

export interface MixResult {
  query: string
  verdict: MixVerdict
  hours?: number
  title: string
  explanation: string
  advice: string
  hits: Interaction[]
  source: 'local' | 'gemini'
  known: boolean
}

const verdictOf = (severity: Severity, spacingHours?: number): MixVerdict => {
  if (severity === 'caution') return 'avoid'
  if (severity === 'monitor' || (spacingHours && spacingHours > 0)) return 'space'
  return 'safe'
}

const queryItem = (query: string): InteractionItem => {
  const classes = classesOfText(query)
  const habit = Object.entries(HABIT_CLASSES).find(([, list]) => list.some((c) => classes.includes(c)))
  return {
    id: 'mix:query',
    label: query.trim(),
    kind: habit ? 'habit' : 'med',
    classes: classes.length ? classes : habit ? HABIT_CLASSES[habit[0]] : [],
    times: [],
    asNeeded: true,
  }
}

export const checkMixLocally = (query: string, meds: Medication[], lang: Lang): MixResult => {
  const trimmed = query.trim()
  const probe = queryItem(trimmed)
  const items = [...buildItems(meds, [], lang).filter((i) => i.kind === 'med'), probe]
  const hits = computeInteractions(items, lang)
    .filter((i) => i.aId === probe.id || i.bId === probe.id)
    .filter((i) => i.known || i.spacing)
    .sort((a, b) => {
      const rank = { caution: 2, monitor: 1, safe: 0 }
      return rank[b.severity] - rank[a.severity]
    })

  if (probe.classes.length === 0) {
    return {
      query: trimmed,
      verdict: 'safe',
      title: translate(lang, 'mix.unknownTitle'),
      explanation: translate(lang, 'mix.unknownBody'),
      advice: translate(lang, 'mix.unknownAdvice'),
      hits: [],
      source: 'local',
      known: false,
    }
  }

  if (hits.length === 0) {
    return {
      query: trimmed,
      verdict: 'safe',
      title: translate(lang, 'mix.safeTitle'),
      explanation: translate(lang, 'mix.safeBody', { query: trimmed }),
      advice: translate(lang, 'mix.safeAdvice'),
      hits: [],
      source: 'local',
      known: true,
    }
  }

  const top = hits[0]
  const hours = top.spacing?.requiredHours
  const verdict = top.spacing?.conflict === false ? 'safe' : verdictOf(top.severity, hours)
  return {
    query: trimmed,
    verdict,
    hours: verdict === 'space' ? hours : undefined,
    title: top.title,
    explanation: top.explanation,
    advice: top.advice,
    hits,
    source: 'local',
    known: top.known,
  }
}
