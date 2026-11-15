import type { Category, Interaction, Medication, Note, Severity } from '../types'
import type { Lang } from '../i18n/translations'
import { SEVERITY_RANK, tagLabel } from './knowledge'

export type NodeKind = 'med' | 'symptom' | 'habit'

export interface GraphNode {
  id: string
  label: string
  kind: NodeKind
  category?: Category
  count: number
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  weight: number
  severity?: Severity
  title?: string
}

const WINDOW_DAYS = 60

export const symptomId = (key: string) => `symptom:${key}`
export const habitId = (key: string) => `habit:${key}`

export const buildGraph = (
  meds: Medication[],
  notes: Note[],
  interactions: Interaction[],
  show: { symptoms: boolean; habits: boolean },
  lang: Lang,
  now = new Date(),
) => {
  const cutoff = now.getTime() - WINDOW_DAYS * 86_400_000
  const recent = notes.filter((n) => new Date(n.occurredAt).getTime() >= cutoff)
  const nodes = new Map<string, GraphNode>()
  const edges = new Map<string, GraphEdge>()

  meds.forEach((m) => nodes.set(m.id, { id: m.id, label: m.name, kind: 'med', category: m.category, count: 0 }))

  const bump = (id: string, label: string, kind: NodeKind) => {
    const existing = nodes.get(id)
    if (existing) existing.count++
    else nodes.set(id, { id, label, kind, count: 1 })
  }

  const edgeKey = (a: string, b: string) => (a < b ? `${a}~${b}` : `${b}~${a}`)

  const link = (a: string, b: string) => {
    const key = edgeKey(a, b)
    const existing = edges.get(key)
    if (existing) existing.weight++
    else edges.set(key, { id: key, source: a, target: b, weight: 1 })
  }

  recent.forEach((n) => {
    const ids: string[] = []
    n.medIds.filter((id) => nodes.has(id)).forEach((id) => {
      nodes.get(id)!.count++
      ids.push(id)
    })
    if (show.symptoms)
      n.symptoms.forEach((s) => {
        bump(symptomId(s), tagLabel(s, lang), 'symptom')
        ids.push(symptomId(s))
      })
    if (show.habits)
      n.habits.forEach((h) => {
        bump(habitId(h), tagLabel(h, lang), 'habit')
        ids.push(habitId(h))
      })

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = nodes.get(ids[i])!
        const b = nodes.get(ids[j])!
        if (a.kind === 'med' && b.kind === 'med') continue
        link(a.id, b.id)
      }
    }
  })

  interactions
    .filter((i) => i.known && nodes.has(i.aId) && nodes.has(i.bId))
    .forEach((i) => {
      const key = edgeKey(i.aId, i.bId)
      const existing = edges.get(key)
      if (existing) {
        if (!existing.severity || SEVERITY_RANK[i.severity] > SEVERITY_RANK[existing.severity]) {
          existing.severity = i.severity
          existing.title = i.title
        }
      } else {
        edges.set(key, { id: key, source: i.aId, target: i.bId, weight: 0, severity: i.severity, title: i.title })
      }
    })

  return { nodes: [...nodes.values()], edges: [...edges.values()] }
}
