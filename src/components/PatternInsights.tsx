import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Activity, Clock, Sparkles } from 'lucide-react'
import { useI18n } from '../i18n'
import { formatCountdown } from '../lib/dates'
import { generateInsightObservations } from '../lib/gemini'
import {
  AI_DIGEST_DAYS,
  PATTERN_DAYS,
  SIGNIFICANT_DELAY_MINUTES,
  adherenceWindowInsight,
  buildAiDigest,
  symptomPatterns,
  type WindowStat,
} from '../lib/insights'
import { isActiveCabinetMed } from '../lib/course'
import { useData } from '../lib/store'
import { useGeminiConfig } from '../lib/useGemini'
import { Chip, Spinner, cx } from './ui'

const STAGGER_MS = 70
const MIN_DOSES_HINT = 3

interface InsightCardProps {
  icon: ReactNode
  title: string
  index: number
  children: ReactNode
  footnote?: string
}

const InsightCard = ({ icon, title, index, children, footnote }: InsightCardProps) => (
  <article className="glass-soft animate-rise flex flex-col gap-4 p-5" style={{ animationDelay: `${index * STAGGER_MS}ms` }}>
    <header className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] text-sky-300">{icon}</span>
      <h3 className="text-sm font-semibold leading-snug text-white">{title}</h3>
    </header>
    <div className="flex-1 space-y-3">{children}</div>
    {footnote && <p className="text-[11px] leading-relaxed text-slate-500">{footnote}</p>}
  </article>
)

const WindowRow = ({ stat, tone }: { stat: WindowStat; tone: 'best' | 'late' | 'plain' }) => {
  const { t } = useI18n()
  const late = stat.averageDelay >= SIGNIFICANT_DELAY_MINUTES
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
        <span className="flex items-center gap-2 font-medium text-slate-200">
          {t(`block.${stat.window}`)}
          {tone === 'best' && <Chip tone="emerald" className="whitespace-nowrap">{t('insights.window.tagBest')}</Chip>}
          {tone === 'late' && <Chip tone="amber" className="whitespace-nowrap">{t('insights.window.tagLate')}</Chip>}
        </span>
        <span className="num flex flex-wrap items-center gap-x-2 text-slate-400">
          <span className="whitespace-nowrap">{t('insights.window.onTime', { rate: stat.onTimeRate })}</span>
          {late && <span className="whitespace-nowrap text-amber-300">{t('insights.window.avgDelay', { delay: formatCountdown(stat.averageDelay) })}</span>}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={cx(
            'h-full rounded-full transition-all duration-700 ease-smooth',
            tone === 'late' ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-sky-400 to-indigo-500',
          )}
          style={{ width: `${stat.onTimeRate}%` }}
        />
      </div>
    </div>
  )
}

type AiState = { status: 'idle' } | { status: 'loading' } | { status: 'done'; lang: string; observations: string[] } | { status: 'error'; message: string }

export const PatternInsights = () => {
  const { data } = useData()
  const { t, lang } = useI18n()
  const gemini = useGeminiConfig()
  const [ai, setAi] = useState<AiState>({ status: 'idle' })
  const controller = useRef<AbortController>()

  const activeMeds = useMemo(() => data.meds.filter(isActiveCabinetMed), [data.meds])
  const windowInsight = useMemo(() => adherenceWindowInsight(activeMeds, data.logs, new Date()), [activeMeds, data.logs])
  const patterns = useMemo(() => symptomPatterns(data.logs, data.notes, new Date(), lang), [data.logs, data.notes, lang])
  const medName = useMemo(() => new Map(activeMeds.map((m) => [m.id, m.name])), [activeMeds])

  useEffect(() => () => controller.current?.abort(), [])

  const runDeepDive = async () => {
    if (!gemini) return
    controller.current?.abort()
    const ctl = new AbortController()
    controller.current = ctl
    setAi({ status: 'loading' })
    try {
      const digest = buildAiDigest(activeMeds, data.logs, data.notes, new Date(), gemini.language)
      const observations = await generateInsightObservations(gemini, digest, ctl.signal)
      if (!ctl.signal.aborted) setAi({ status: 'done', lang: gemini.language, observations })
    } catch (err) {
      if (!ctl.signal.aborted) setAi({ status: 'error', message: err instanceof Error ? err.message : t('insights.ai.failed') })
    }
  }

  const loading = ai.status === 'loading'
  const result = ai.status === 'done' && ai.lang === lang ? ai.observations : null
  const showAiCard = loading || result !== null || ai.status === 'error'

  return (
    <section aria-label={t('insights.title')} className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-white">{t('insights.title')}</h2>
          <p className="mt-1 text-sm text-slate-400">{gemini ? t('insights.subtitle', { days: PATTERN_DAYS }) : t('insights.ai.needsKey')}</p>
        </div>
        <button
          type="button"
          onClick={() => void runDeepDive()}
          disabled={!gemini || loading}
          title={gemini ? undefined : t('insights.ai.needsKey')}
          className="btn !rounded-full !px-4 !py-2 text-xs"
        >
          {loading ? <Spinner className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5 text-sky-300" />}
          {loading ? t('insights.ai.working') : t('insights.ai.button')}
        </button>
      </div>

      <div className={cx('grid gap-4 md:grid-cols-2', showAiCard && 'xl:grid-cols-3')}>
        <InsightCard icon={<Clock className="h-4 w-4" />} title={t('insights.window.title')} index={0} footnote={windowInsight ? t('insights.window.footnote') : undefined}>
          {windowInsight ? (
            <>
              <p className="text-sm leading-relaxed text-slate-200">
                {windowInsight.balanced
                  ? t('insights.window.balanced', { rate: windowInsight.strongest?.onTimeRate ?? 0 })
                  : windowInsight.strongest && t('insights.window.strongest', { window: t(`block.${windowInsight.strongest.window}`), rate: windowInsight.strongest.onTimeRate })}
                {windowInsight.mostDelayed &&
                  ` ${t('insights.window.delayed', { window: t(`block.${windowInsight.mostDelayed.window}`), delay: formatCountdown(windowInsight.mostDelayed.averageDelay) })}`}
              </p>
              <div className="space-y-3">
                {windowInsight.windows.map((stat) => (
                  <WindowRow
                    key={stat.window}
                    stat={stat}
                    tone={
                      !windowInsight.balanced && stat.window === windowInsight.strongest?.window
                        ? 'best'
                        : stat.window === windowInsight.mostDelayed?.window
                          ? 'late'
                          : 'plain'
                    }
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-slate-400">{t('insights.window.empty', { n: MIN_DOSES_HINT })}</p>
          )}
        </InsightCard>

        <InsightCard
          icon={<Activity className="h-4 w-4" />}
          title={t('insights.corr.title')}
          index={1}
          footnote={patterns.length > 0 ? t('insights.corr.footnote', { days: PATTERN_DAYS }) : undefined}
        >
          {patterns.length > 0 ? (
            <ul className="space-y-3">
              {patterns.map((pattern) => (
                <li key={pattern.key} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <Chip tone="rose">{pattern.label}</Chip>
                    <span className="num text-xs text-slate-400">
                      {pattern.occurrences} {t('unit.note', { count: pattern.occurrences })}
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-slate-300">
                    {pattern.linkedMedId
                      ? t('insights.corr.linked', {
                          med: medName.get(pattern.linkedMedId) ?? '',
                          count: pattern.linkedCount,
                          total: pattern.occurrences,
                        })
                      : t('insights.corr.unlinked')}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm leading-relaxed text-slate-400">{t('insights.corr.empty')}</p>
          )}
        </InsightCard>

        {showAiCard && (
          <InsightCard icon={<Sparkles className="h-4 w-4" />} title={t('insights.ai.title')} index={2} footnote={t('insights.ai.disclaimer', { days: AI_DIGEST_DAYS })}>
            {loading && (
              <div className="animate-pulse space-y-2.5" aria-hidden>
                <div className="h-3 w-full rounded-full bg-white/10" />
                <div className="h-3 w-5/6 rounded-full bg-white/[0.07]" />
                <div className="h-3 w-full rounded-full bg-white/10" />
                <div className="h-3 w-2/3 rounded-full bg-white/[0.07]" />
              </div>
            )}
            {!loading && ai.status === 'error' && <p className="text-sm text-rose-200">{ai.message}</p>}
            {!loading && result && (
              <ol className="space-y-3">
                {result.map((item, i) => (
                  <li key={item} className="flex gap-3 text-[13px] leading-relaxed text-slate-200">
                    <span className="num mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-sky-300/30 bg-sky-400/10 text-[11px] font-semibold text-sky-200">
                      {i + 1}
                    </span>
                    <span className="min-w-0 break-words">{item}</span>
                  </li>
                ))}
              </ol>
            )}
          </InsightCard>
        )}
      </div>
    </section>
  )
}
