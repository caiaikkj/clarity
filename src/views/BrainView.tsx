import { useMemo, useState } from 'react'
import { BrainCircuit, X } from 'lucide-react'
import { useI18n, type TKey } from '../i18n'
import { useData } from '../lib/store'
import { buildItems, computeInteractions } from '../lib/interactions'
import { buildGraph, habitId, symptomId, type GraphNode } from '../lib/graph'
import { formatDateTime } from '../lib/dates'
import { InteractionGraph } from '../components/InteractionGraph'
import { InteractionChecker } from '../components/InteractionChecker'
import { Chip, EmptyState, GlassCard, IconButton, PageHeader, SeverityBadge, cx } from '../components/ui'

const LEGEND: { key: TKey; color: string }[] = [
  { key: 'category.prescription', color: '#818cf8' },
  { key: 'category.supplement', color: '#38bdf8' },
  { key: 'category.otc', color: '#c4b5fd' },
  { key: 'brain.legend.symptom', color: '#fb7185' },
  { key: 'brain.legend.habit', color: '#34d399' },
]

const NodeDetail = ({
  node,
  graph,
  onClose,
}: {
  node: GraphNode
  graph: ReturnType<typeof buildGraph>
  onClose: () => void
}) => {
  const { data } = useData()
  const { t, lang } = useI18n()
  const labelOf = new Map(graph.nodes.map((n) => [n.id, n.label]))
  const edges = graph.edges.filter((e) => e.source === node.id || e.target === node.id)

  const notes = data.notes
    .filter((n) => {
      if (node.kind === 'med') return n.medIds.includes(node.id)
      if (node.kind === 'symptom') return n.symptoms.some((s) => symptomId(s) === node.id)
      return n.habits.some((h) => habitId(h) === node.id)
    })
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 3)

  const kindLabel = t(`brain.kind.${node.kind}`)

  return (
    <div className="glass-soft animate-pop space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Chip tone={node.kind === 'symptom' ? 'rose' : node.kind === 'habit' ? 'emerald' : 'cyan'}>{kindLabel}</Chip>
          <h3 className="mt-2 text-lg font-semibold text-white">{node.label}</h3>
        </div>
        <IconButton label={t('brain.closeDetails')} onClick={onClose}>
          <X className="h-4 w-4" />
        </IconButton>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <p className="label">{t('brain.connections')}</p>
          {edges.length === 0 ? (
            <p className="text-sm text-slate-400">{t('brain.nothingLinked')}</p>
          ) : (
            edges.map((e) => {
              const otherId = e.source === node.id ? e.target : e.source
              return (
                <div key={e.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-slate-200">{labelOf.get(otherId)}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    {e.weight > 0 && <span className="num text-xs text-slate-400">{e.weight} {t('unit.note', { count: e.weight })}</span>}
                    {e.severity && <SeverityBadge severity={e.severity} />}
                  </span>
                </div>
              )
            })
          )}
        </div>
        <div className="space-y-2">
          <p className="label">{t('brain.recentNotes')}</p>
          {notes.length === 0 ? (
            <p className="text-sm text-slate-400">{t('brain.noNotes')}</p>
          ) : (
            notes.map((n) => (
              <div key={n.id} className="border-l-2 border-sky-300/40 pl-3">
                <p className="line-clamp-2 text-sm text-slate-300">{n.text}</p>
                <p className="num text-[11px] text-slate-500">{formatDateTime(n.occurredAt, lang)}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export const BrainView = () => {
  const { data } = useData()
  const { t, lang } = useI18n()
  const [showSymptoms, setShowSymptoms] = useState(true)
  const [showHabits, setShowHabits] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const interactions = useMemo(() => computeInteractions(buildItems(data.meds, data.notes, lang), lang), [data.meds, data.notes, lang])
  const graph = useMemo(
    () => buildGraph(data.meds, data.notes, interactions, { symptoms: showSymptoms, habits: showHabits }, lang),
    [data.meds, data.notes, interactions, showSymptoms, showHabits, lang],
  )
  const selected = graph.nodes.find((n) => n.id === selectedId) ?? null
  const flagged = interactions.filter((i) => i.known && i.severity !== 'safe').length
  const filterId = selected && selected.kind !== 'symptom' ? selected.id : null

  return (
    <>
      <PageHeader
        title={t('brain.title')}
        subtitle={`${t('brain.subtitle', { nodes: graph.nodes.length, edges: graph.edges.length })}${flagged ? t('brain.flagged', { n: flagged }) : ''}`}
      />

      {data.meds.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon={<BrainCircuit className="h-6 w-6" />}
            title={t('brain.emptyTitle')}
            body={t('brain.emptyBody')}
          />
        </GlassCard>
      ) : (
        <div className="space-y-6">
          <GlassCard className="overflow-hidden p-2 sm:p-3">
            <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                {LEGEND.map((l) => (
                  <span key={l.key} className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color, boxShadow: `0 0 8px ${l.color}` }} />
                    {t(l.key)}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <button type="button" className={cx('btn !px-3 !py-1 text-xs', showSymptoms && '!border-rose-300/40 !bg-rose-400/15 text-rose-100')} onClick={() => setShowSymptoms(!showSymptoms)}>
                  {t('brain.symptoms')}
                </button>
                <button type="button" className={cx('btn !px-3 !py-1 text-xs', showHabits && '!border-emerald-300/40 !bg-emerald-400/15 text-emerald-100')} onClick={() => setShowHabits(!showHabits)}>
                  {t('brain.habits')}
                </button>
              </div>
            </div>
            <div className="rounded-[22px] bg-black/20 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
              <InteractionGraph
                nodes={graph.nodes}
                edges={graph.edges}
                selectedId={selectedId}
                onSelect={setSelectedId}
                height={window.innerWidth < 640 ? 440 : 540}
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-3 pb-1 pt-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 rounded bg-rose-400" />{t('brain.legendInteraction')}</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-5 border-t-2 border-dotted border-sky-300" />{t('brain.legendNotes')}</span>
              <span>{t('brain.hint')}</span>
            </div>
          </GlassCard>

          {selected && (
            <NodeDetail node={selected} graph={graph} onClose={() => setSelectedId(null)} />
          )}

          <GlassCard className="space-y-5 p-5 sm:p-6" delay={80}>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-white">{t('brain.checkerTitle')}</h2>
              <p className="mt-1 text-sm text-slate-400">
                {filterId && selected ? t('brain.showingFor', { label: selected.label }) : t('brain.everyPair')}
              </p>
            </div>
            <InteractionChecker interactions={interactions} highlightId={filterId} />
          </GlassCard>
        </div>
      )}
    </>
  )
}
