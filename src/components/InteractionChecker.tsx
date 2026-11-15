import { useState } from 'react'
import { ArrowLeftRight, ShieldAlert, Sparkles } from 'lucide-react'
import type { Interaction, Medication, Severity } from '../types'
import { useI18n } from '../i18n'
import { useGeminiConfig } from '../lib/useGemini'
import { summarizeInteractionsWithGemini } from '../lib/gemini'
import { SeverityBadge, SpacingBadge, Spinner, cx } from './ui'

interface Props {
  meds: Medication[]
  interactions: Interaction[]
  highlightId?: string | null
}

type Filter = Severity | 'all' | 'spacing'

const FILTERS: Filter[] = ['all', 'caution', 'monitor', 'spacing', 'safe']

const BORDER: Record<Severity, string> = {
  safe: 'border-l-emerald-400/70',
  monitor: 'border-l-amber-400/70',
  caution: 'border-l-rose-400/80',
}

export const InteractionChecker = ({ meds, interactions, highlightId }: Props) => {
  const { t } = useI18n()
  const geminiConfig = useGeminiConfig()
  const [filter, setFilter] = useState<Filter>('all')
  const [summary, setSummary] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const counts = interactions.reduce(
    (acc, i) => ({ ...acc, [i.severity]: acc[i.severity] + 1 }),
    { safe: 0, monitor: 0, caution: 0 } as Record<Severity, number>,
  )

  const spacingCount = interactions.filter((i) => i.spacing?.conflict).length
  const matchesFilter = (i: Interaction) => {
    if (filter === 'all') return true
    if (filter === 'spacing') return Boolean(i.spacing?.conflict)
    return i.severity === filter
  }
  const visible = interactions.filter((i) => matchesFilter(i) && (!highlightId || i.aId === highlightId || i.bId === highlightId))
  const hasKey = geminiConfig !== null

  const summarize = async () => {
    if (!geminiConfig) return
    setBusy(true)
    setError(null)
    try {
      setSummary(await summarizeInteractionsWithGemini(geminiConfig, meds, interactions))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('checker.summaryError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cx('btn !px-3.5 !py-1.5 text-xs capitalize', filter === f && '!border-sky-300/50 !bg-sky-400/20 text-sky-100')}
            >
              {f === 'all'
                ? t('checker.filterAll', { n: interactions.length })
                : f === 'spacing'
                  ? t('checker.filterSpacing', { n: spacingCount })
                  : `${t(`severity.${f}`)} · ${counts[f]}`}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={summarize}
          disabled={busy || !hasKey || interactions.length === 0}
          title={hasKey ? undefined : t('checker.addKeyTitle')}
        >
          {busy ? <Spinner /> : <Sparkles className="h-4 w-4" />}
          {t('checker.explain')}
        </button>
      </div>

      {!hasKey && <p className="text-xs text-slate-500">{t('checker.addKeyHint')}</p>}
      {error && <p className="text-sm text-rose-300">{error}</p>}
      {summary && (
        <div className="glass-soft animate-pop space-y-1.5 !border-sky-300/25 !bg-sky-400/[0.07] p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-sky-300">
            <Sparkles className="h-3.5 w-3.5" />
            {t('checker.summaryTitle')}
          </p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-100">{summary}</p>
        </div>
      )}

      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          {interactions.length === 0 ? t('checker.needTwo') : t('checker.noMatch')}
        </p>
      ) : (
        <ul className="grid gap-3 xl:grid-cols-2">
          {visible.map((i) => (
            <li key={i.id} className={cx('glass-soft space-y-2.5 border-l-[3px] p-4', BORDER[i.severity])}>
              <div className="flex items-start justify-between gap-3">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-white">
                  {i.aLabel}
                  <ArrowLeftRight className="h-3.5 w-3.5 text-slate-500" />
                  {i.bLabel}
                </p>
                <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                  {i.spacing?.conflict && <SpacingBadge />}
                  <SeverityBadge severity={i.severity} />
                </div>
              </div>
              <p className="text-sm font-medium text-slate-100">{i.title}</p>
              <p className="text-sm leading-relaxed text-slate-300">{i.explanation}</p>
              <p className="text-xs leading-relaxed text-slate-400">
                <span className="font-semibold text-slate-300">{t('checker.whatToDo')}</span>
                {i.advice}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-start gap-2 text-xs text-slate-500">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t('checker.disclaimer')}
      </p>
    </div>
  )
}
