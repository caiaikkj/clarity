import { useRef, useState, type FormEvent } from 'react'
import { AlertTriangle, Clock3, Search, ShieldCheck, Sparkles } from 'lucide-react'
import type { MixVerdict } from '../types'
import { useI18n, type TKey } from '../i18n'
import { checkMixWithGemini } from '../lib/gemini'
import { checkMixLocally, type MixResult } from '../lib/mixCheck'
import { useData } from '../lib/store'
import { useGeminiConfig } from '../lib/useGemini'
import { Chip, Spinner, cx } from './ui'

const CHIPS: { key: TKey; query: string }[] = [
  { key: 'mix.chip.ibuprofen', query: 'Ibuprofeno' },
  { key: 'mix.chip.dipyrone', query: 'Dipirona' },
  { key: 'mix.chip.alcohol', query: 'Álcool' },
  { key: 'mix.chip.beer', query: 'Cerveja' },
  { key: 'mix.chip.coffee', query: 'Café' },
  { key: 'mix.chip.greenTea', query: 'Chá Verde' },
]

const VERDICT_STYLE: Record<MixVerdict, string> = {
  safe: 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100',
  space: 'border-amber-300/30 bg-amber-400/10 text-amber-50',
  avoid: 'border-rose-300/30 bg-rose-400/10 text-rose-100',
}

const VerdictIcon = ({ verdict }: { verdict: MixVerdict }) => {
  if (verdict === 'safe') return <ShieldCheck className="h-5 w-5 text-emerald-300" />
  if (verdict === 'space') return <Clock3 className="h-5 w-5 text-amber-300" />
  return <AlertTriangle className="h-5 w-5 text-rose-300" />
}

export const MixChecker = () => {
  const { data } = useData()
  const { t, lang } = useI18n()
  const gemini = useGeminiConfig()
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<MixResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const controller = useRef<AbortController>()

  const run = async (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    controller.current?.abort()
    const ctl = new AbortController()
    controller.current = ctl
    setBusy(true)
    setError(null)
    setQuery(trimmed)
    const local = checkMixLocally(trimmed, data.meds.filter((m) => !m.courseArchivedAt), lang)
    setResult(local)
    if (!gemini) {
      setBusy(false)
      return
    }
    try {
      const enhanced = await checkMixWithGemini(
        gemini,
        trimmed,
        data.meds
          .filter((m) => !m.courseArchivedAt)
          .map((m) => ({ name: m.name, strength: m.strength, activeIngredient: m.activeIngredient })),
        { verdict: local.verdict, title: local.title, explanation: local.explanation, known: local.known },
        ctl.signal,
      )
      if (ctl.signal.aborted) return
      const verdict = enhanced.verdict === 'safe' || enhanced.verdict === 'space' || enhanced.verdict === 'avoid' ? enhanced.verdict : local.verdict
      setResult({
        ...local,
        verdict,
        hours: verdict === 'space' ? Number(enhanced.hours) || local.hours : undefined,
        title: enhanced.title?.trim() || local.title,
        explanation: enhanced.explanation?.trim() || local.explanation,
        advice: enhanced.advice?.trim() || local.advice,
        source: 'gemini',
        known: true,
      })
    } catch (err) {
      if (!ctl.signal.aborted) setError(err instanceof Error ? err.message : t('mix.failed'))
    } finally {
      if (!ctl.signal.aborted) setBusy(false)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void run(query)
  }

  return (
    <section aria-label={t('mix.title')} className="glass space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-white">{t('mix.title')}</h2>
        <p className="mt-1 text-sm text-slate-400">{t('mix.subtitle')}</p>
      </div>

      <form onSubmit={onSubmit} className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] py-1.5 pl-4 pr-1.5 backdrop-blur-md">
        <Search className="h-4 w-4 shrink-0 text-sky-300" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('mix.placeholder')}
          aria-label={t('mix.title')}
          className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white outline-none placeholder:text-slate-500"
        />
        <button type="submit" className="btn btn-primary !rounded-full !px-4 !py-2 text-xs" disabled={!query.trim() || busy}>
          {busy ? <Spinner className="h-3.5 w-3.5" /> : t('mix.check')}
        </button>
      </form>

      <div className="flex flex-wrap gap-1.5">
        {CHIPS.map((chip) => (
          <button key={chip.key} type="button" onClick={() => void run(chip.query)} className="btn btn-ghost !rounded-full !px-3 !py-1 text-[11px] text-slate-300">
            {t(chip.key)}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-amber-300">{error}</p>}

      {result && (
        <article className={cx('animate-pop space-y-3 rounded-[22px] border p-4', VERDICT_STYLE[result.verdict])}>
          <div className="flex items-start gap-3">
            <VerdictIcon verdict={result.verdict} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone={result.verdict === 'safe' ? 'emerald' : result.verdict === 'space' ? 'amber' : 'rose'}>
                  {result.verdict === 'safe'
                    ? t('mix.verdict.safe')
                    : result.verdict === 'space'
                      ? result.hours
                        ? t('mix.verdict.space', { hours: result.hours })
                        : t('mix.verdict.spaceGeneric')
                      : t('mix.verdict.avoid')}
                </Chip>
                {result.source === 'gemini' && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-sky-200">
                    <Sparkles className="h-3 w-3" />
                    {t('mix.aiEnhanced')}
                  </span>
                )}
              </div>
              <h3 className="mt-2 text-sm font-semibold text-white">{result.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-200">{result.explanation}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">{result.advice}</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">{t('mix.disclaimer')}</p>
        </article>
      )}
    </section>
  )
}
