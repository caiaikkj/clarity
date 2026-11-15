import type { AppData, Interaction } from '../types'
import { adherence, daysOfSupply, frequencyLabel, isLowStock, streak } from './schedule'
import { formatClock, formatDateTime } from './dates'
import { tagLabel } from './knowledge'
import { localizeAdminRule } from '../i18n/adminRules'
import { translate, type Lang, type TKey, type TVars } from '../i18n/translations'

const DOSE_WINDOW_MS = 2 * 3_600_000

export interface Correlation {
  key: string
  label: string
  count: number
  lastAt: string
  meds: { name: string; count: number }[]
  habits: { label: string; count: number }[]
}

const tally = <T extends string>(values: T[]) => {
  const map = new Map<T, number>()
  values.forEach((v) => map.set(v, (map.get(v) ?? 0) + 1))
  return [...map.entries()].sort((a, b) => b[1] - a[1])
}

export const symptomCorrelations = ({ meds, logs, notes }: AppData, lang: Lang): Correlation[] => {
  const symptoms = new Map<string, typeof notes>()
  notes.forEach((n) => n.symptoms.forEach((s) => symptoms.set(s, [...(symptoms.get(s) ?? []), n])))

  return [...symptoms.entries()]
    .map(([key, list]) => {
      const medNames: string[] = []
      const habitLabels: string[] = []
      list.forEach((n) => {
        const occurred = new Date(n.occurredAt).getTime()
        const ids = new Set(n.medIds)
        logs.forEach((l) => {
          const t = new Date(l.takenAt).getTime()
          if (t <= occurred && occurred - t <= DOSE_WINDOW_MS) ids.add(l.medId)
        })
        ids.forEach((id) => {
          const m = meds.find((x) => x.id === id)
          if (m) medNames.push(m.name)
        })
        n.habits.forEach((h) => habitLabels.push(tagLabel(h, lang)))
      })
      return {
        key,
        label: tagLabel(key, lang),
        count: list.length,
        lastAt: list.map((n) => n.occurredAt).sort().at(-1) ?? '',
        meds: tally(medNames).map(([name, count]) => ({ name, count })),
        habits: tally(habitLabels).map(([label, count]) => ({ label, count })),
      }
    })
    .sort((a, b) => b.count - a.count || b.lastAt.localeCompare(a.lastAt))
}

export interface BriefingData {
  generatedAt: Date
  week: ReturnType<typeof adherence>
  month: ReturnType<typeof adherence>
  streakDays: number
  regimen: {
    id: string
    name: string
    strength: string
    form: string
    category: string
    schedule: string
    supply: string
    adherencePct: number | null
    low: boolean
    instructions: string
    activeIngredient?: string
    adminRule?: string
  }[]
  flags: Interaction[]
  correlations: Correlation[]
  recentNotes: AppData['notes']
}

export const buildBriefing = (data: AppData, interactions: Interaction[], now: Date, lang: Lang): BriefingData => ({
  generatedAt: now,
  week: adherence(data.meds, data.logs, 7, now),
  month: adherence(data.meds, data.logs, 30, now),
  streakDays: streak(data.meds, data.logs, now),
  regimen: data.meds.map((m) => {
    const days = daysOfSupply(m)
    return {
      id: m.id,
      name: m.name,
      strength: m.strength,
      form: m.form,
      category: translate(lang, `category.${m.category}`),
      schedule: m.asNeeded
        ? translate(lang, 'freq.asNeeded')
        : `${frequencyLabel(m, lang)} (${m.times.map((time) => formatClock(time, lang)).join(', ')})`,
      supply: `${translate(lang, 'briefing.supplyLeft', { n: m.stock })}${days !== null ? translate(lang, 'briefing.supplyDays', { n: days }) : ''}`,
      adherencePct: m.asNeeded ? null : adherence([m], data.logs, 30, now).pct,
      low: isLowStock(m),
      instructions: m.instructions,
      activeIngredient: m.activeIngredient,
      adminRule: localizeAdminRule(m.adminRule, lang),
    }
  }),
  flags: interactions.filter((i) => i.known && i.severity !== 'safe'),
  correlations: symptomCorrelations(data, lang),
  recentNotes: [...data.notes].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 8),
})

export const briefingToText = (b: BriefingData, lang: Lang) => {
  const t = (key: TKey, vars?: TVars) => translate(lang, key, vars)
  const lines: string[] = []
  lines.push(t('briefing.text.title'))
  lines.push(t('briefing.text.generated', { date: b.generatedAt.toLocaleString(lang) }))
  lines.push('')
  lines.push(t('briefing.text.regimen'))
  if (b.regimen.length === 0) lines.push(t('briefing.text.noMeds'))
  b.regimen.forEach((r) => {
    lines.push(`- ${r.name} ${r.strength} (${r.category}, ${r.form}) — ${r.schedule}; ${r.supply}${r.low ? t('briefing.text.lowStock') : ''}`)
    if (r.activeIngredient) lines.push(`    ${t('briefing.text.active', { value: r.activeIngredient })}`)
    if (r.adminRule) lines.push(`    ${t('briefing.text.admin', { value: r.adminRule })}`)
    if (r.instructions) lines.push(`    ${r.instructions}`)
  })
  lines.push('')
  lines.push(t('briefing.text.adherence'))
  lines.push(t('briefing.text.last7', { pct: b.week.pct, taken: b.week.taken, expected: b.week.expected }))
  lines.push(t('briefing.text.last30', { pct: b.month.pct, taken: b.month.taken, expected: b.month.expected }))
  lines.push(t('briefing.text.streak', { n: b.streakDays }))
  lines.push('')
  lines.push(t('briefing.text.flags'))
  if (b.flags.length === 0) lines.push(t('briefing.text.noFlags'))
  b.flags.forEach((f) =>
    lines.push(
      `- [${t(`severity.${f.severity}`).toUpperCase()}${f.spacing?.conflict ? t('briefing.text.spaceDoses') : ''}] ${f.aLabel} + ${f.bLabel}: ${f.title}. ${f.explanation}`,
    ),
  )
  lines.push('')
  lines.push(t('briefing.text.symptoms'))
  if (b.correlations.length === 0) lines.push(t('briefing.text.noSymptoms'))
  b.correlations.forEach((c) => {
    const parts = [...c.meds.map((m) => `${m.name} ×${m.count}`), ...c.habits.map((h) => `${h.label} ×${h.count}`)]
    const alongside = parts.length ? t('briefing.text.alongside', { items: parts.join(', ') }) : ''
    lines.push(`- ${c.label}: ${t('briefing.lastLog', { count: c.count, when: formatDateTime(c.lastAt, lang) })}${alongside}`)
  })
  lines.push('')
  lines.push(t('briefing.text.recentNotes'))
  b.recentNotes.forEach((n) => lines.push(`- ${formatDateTime(n.occurredAt, lang)}: ${n.text}`))
  return lines.join('\n')
}
