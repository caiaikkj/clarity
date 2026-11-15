import type { Interaction, Medication, Note, SpacingInfo } from '../types'
import type { Lang } from '../i18n/translations'
import { translate } from '../i18n/translations'
import { adminRuleHours } from '../i18n/adminRules'
import {
  HABIT_CLASSES,
  MINERAL_CLASSES,
  RULES,
  SEVERITY_RANK,
  SPACING_RULES,
  classesOf,
  interactionRuleId,
  ruleCopy,
  tagLabel,
} from './knowledge'
import { minutesOf } from './dates'

export interface InteractionItem {
  id: string
  label: string
  kind: 'med' | 'habit'
  classes: string[]
  times: string[]
  asNeeded: boolean
  adminHours?: number
}

const HABIT_WINDOW_DAYS = 30
const DAY_MINUTES = 24 * 60

export const buildItems = (meds: Medication[], notes: Note[], lang: Lang, now = new Date()): InteractionItem[] => {
  const medItems: InteractionItem[] = meds.map((m) => ({
    id: m.id,
    label: m.name,
    kind: 'med',
    classes: classesOf(m),
    times: m.times,
    asNeeded: m.asNeeded,
    adminHours: adminRuleHours(m.adminRule),
  }))
  const cutoff = now.getTime() - HABIT_WINDOW_DAYS * 86_400_000
  const habitKeys = new Set<string>()
  notes.forEach((n) => {
    if (new Date(n.occurredAt).getTime() >= cutoff) n.habits.forEach((h) => habitKeys.add(h))
  })
  const habitItems: InteractionItem[] = [...habitKeys]
    .filter((k) => HABIT_CLASSES[k])
    .map((k) => ({
      id: `habit:${k}`,
      label: tagLabel(k, lang),
      kind: 'habit',
      classes: HABIT_CLASSES[k],
      times: [],
      asNeeded: false,
    }))
  return [...medItems, ...habitItems]
}

const hasPair = (a: string[], b: string[], ra: string, rb: string) =>
  (a.includes(ra) && b.includes(rb)) || (a.includes(rb) && b.includes(ra))

const anyOf = (classes: string[], wanted: string[]) => wanted.some((w) => classes.includes(w))

const minGapMinutes = (a: string[], b: string[]) => {
  let best: number | null = null
  a.forEach((ta) =>
    b.forEach((tb) => {
      const diff = Math.abs(minutesOf(ta) - minutesOf(tb))
      const gap = Math.min(diff, DAY_MINUTES - diff)
      if (best === null || gap < best) best = gap
    }),
  )
  return best
}

const formatGap = (minutes: number, lang: Lang) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return translate(lang, 'ix.gapMinutes', { m })
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

interface SpacingMatch {
  hours: number
  title: string
  explanation: string
  advice: string
}

const findSpacing = (a: InteractionItem, b: InteractionItem, lang: Lang): SpacingMatch | null => {
  if (a.kind !== 'med' || b.kind !== 'med') return null
  let match: SpacingMatch | null = null
  const consider = (candidate: SpacingMatch) => {
    if (!match || candidate.hours > match.hours) match = candidate
  }

  SPACING_RULES.forEach((r) => {
    const forward = anyOf(a.classes, r.a) && anyOf(b.classes, r.b)
    const backward = anyOf(b.classes, r.a) && anyOf(a.classes, r.b)
    if (forward || backward) consider({ hours: r.hours, ...ruleCopy(r.id, r, lang) })
  })

  const customRule = (holder: InteractionItem, other: InteractionItem) => {
    if (holder.adminHours && anyOf(other.classes, MINERAL_CLASSES) && !anyOf(holder.classes, MINERAL_CLASSES)) {
      const vars = { label: holder.label, other: other.label, hours: holder.adminHours }
      consider({
        hours: holder.adminHours,
        title: translate(lang, 'ix.customTitle', vars),
        explanation: translate(lang, 'ix.customExplanation', vars),
        advice: translate(lang, 'ix.customAdvice', vars),
      })
    }
  }
  customRule(a, b)
  customRule(b, a)
  return match
}

const spacingEntry = (a: InteractionItem, b: InteractionItem, lang: Lang): Interaction | null => {
  const rule = findSpacing(a, b, lang)
  if (!rule) return null
  const scheduled = !a.asNeeded && !b.asNeeded && a.times.length > 0 && b.times.length > 0
  const gap = scheduled ? minGapMinutes(a.times, b.times) : null
  const required = rule.hours * 60
  const conflict = gap === null || gap < required
  const spacing: SpacingInfo = { requiredHours: rule.hours, gapMinutes: gap, conflict }

  const timing =
    gap === null
      ? translate(lang, 'ix.timingAsNeeded', { hours: rule.hours })
      : conflict
        ? translate(lang, 'ix.timingConflict', { gap: formatGap(gap, lang), hours: rule.hours })
        : translate(lang, 'ix.timingOk', { gap: formatGap(gap, lang), hours: rule.hours })

  return {
    id: `${a.id}|${b.id}|spacing`,
    aId: a.id,
    bId: b.id,
    aLabel: a.label,
    bLabel: b.label,
    severity: conflict ? 'monitor' : 'safe',
    title: conflict ? rule.title : translate(lang, 'ix.spacedTitle'),
    explanation: `${rule.explanation} ${timing}`,
    advice: conflict ? rule.advice : translate(lang, 'ix.spacedAdvice'),
    known: true,
    spacing,
  }
}

export const computeInteractions = (items: InteractionItem[], lang: Lang): Interaction[] => {
  const out: Interaction[] = []
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]
      const b = items[j]
      if (a.kind === 'habit' && b.kind === 'habit') continue

      const matches = RULES.filter((r) => hasPair(a.classes, b.classes, r.a, r.b)).filter(
        (r) => r.a !== r.b || (a.classes.includes(r.a) && b.classes.includes(r.b)),
      )
      const spacing = spacingEntry(a, b, lang)

      if (matches.length > 0) {
        const best = matches.reduce((acc, r) => (SEVERITY_RANK[r.severity] > SEVERITY_RANK[acc.severity] ? r : acc))
        const copy = ruleCopy(interactionRuleId(best), best, lang)
        out.push({
          id: `${a.id}|${b.id}`,
          aId: a.id,
          bId: b.id,
          aLabel: a.label,
          bLabel: b.label,
          severity: best.severity,
          title: copy.title,
          explanation: copy.explanation,
          advice: copy.advice,
          known: true,
        })
      }
      if (spacing) out.push(spacing)

      if (matches.length === 0 && !spacing && a.kind === 'med' && b.kind === 'med') {
        out.push({
          id: `${a.id}|${b.id}`,
          aId: a.id,
          bId: b.id,
          aLabel: a.label,
          bLabel: b.label,
          severity: 'safe',
          title: translate(lang, 'ix.noneTitle'),
          explanation: translate(lang, 'ix.noneExplanation'),
          advice: translate(lang, 'ix.noneAdvice'),
          known: false,
        })
      }
    }
  }
  return out.sort((x, y) => SEVERITY_RANK[y.severity] - SEVERITY_RANK[x.severity])
}
