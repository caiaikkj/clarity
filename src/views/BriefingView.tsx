import { useMemo, useState, type ReactNode } from 'react'
import { Check, ClipboardCopy, Printer, Sparkles } from 'lucide-react'
import { useI18n } from '../i18n'
import { useData, useNow } from '../lib/store'
import { useGeminiConfig } from '../lib/useGemini'
import { buildItems, computeInteractions } from '../lib/interactions'
import { briefingToText, buildBriefing } from '../lib/briefing'
import { summarizeBriefingWithGemini } from '../lib/gemini'
import { formatDateTime } from '../lib/dates'
import { PageHeader, Spinner, cx } from '../components/ui'

const SEVERITY_PRINT = {
  safe: 'bg-emerald-100 text-emerald-800',
  monitor: 'bg-amber-100 text-amber-800',
  caution: 'bg-rose-100 text-rose-800',
}

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="break-inside-avoid">
    <h2 className="mb-3 border-b border-slate-200 pb-1.5 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{title}</h2>
    {children}
  </section>
)

export const BriefingView = () => {
  const { data } = useData()
  const { t, lang } = useI18n()
  const geminiConfig = useGeminiConfig()
  const now = useNow(60_000)
  const [copied, setCopied] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const interactions = useMemo(() => computeInteractions(buildItems(data.meds, data.notes, lang, now), lang), [data.meds, data.notes, lang, now])
  const briefing = useMemo(() => buildBriefing(data, interactions, now, lang), [data, interactions, now, lang])
  const hasKey = geminiConfig !== null

  const copy = async () => {
    const text = `${briefingToText(briefing, lang)}${summary ? `\n\n${t('briefing.text.summary')}\n${summary}` : ''}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError(t('briefing.clipboardBlocked'))
    }
  }

  const generate = async () => {
    if (!geminiConfig) return
    setBusy(true)
    setError(null)
    try {
      setSummary(await summarizeBriefingWithGemini(geminiConfig, briefingToText(briefing, lang)))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('briefing.summaryError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="no-print">
        <PageHeader
          title={t('briefing.title')}
          subtitle={t('briefing.subtitle')}
          actions={
            <>
              {hasKey && (
                <button type="button" className="btn" onClick={generate} disabled={busy}>
                  {busy ? <Spinner /> : <Sparkles className="h-4 w-4" />}
                  <span className="hidden sm:inline">{t('briefing.aiSummary')}</span>
                </button>
              )}
              <button type="button" className="btn" onClick={copy}>
                {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <ClipboardCopy className="h-4 w-4" />}
                {copied ? t('common.copied') : t('common.copy')}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                {t('common.print')}
              </button>
            </>
          }
        />
        {error && <p className="mb-4 text-sm text-rose-300">{error}</p>}
      </div>

      <article className="print-sheet mx-auto max-w-4xl animate-rise space-y-8 rounded-[28px] bg-white p-6 text-slate-800 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] sm:p-10">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-900 pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-600">Clarity</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{t('briefing.docTitle')}</h1>
          </div>
          <p className="num text-right text-sm text-slate-500">
            {t('briefing.generated')}
            <br />
            {briefing.generatedAt.toLocaleDateString(lang, { dateStyle: 'long' })}
          </p>
        </header>

        {summary && (
          <Section title={t('briefing.summary')}>
            <p className="text-sm leading-relaxed text-slate-700">{summary}</p>
          </Section>
        )}

        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: t('briefing.adherence7'), value: briefing.week.expected === 0 ? '—' : `${briefing.week.pct}%`, sub: t('briefing.dosesOf', { taken: briefing.week.taken, expected: briefing.week.expected }) },
            { label: t('briefing.adherence30'), value: briefing.month.expected === 0 ? '—' : `${briefing.month.pct}%`, sub: t('briefing.dosesOf', { taken: briefing.month.taken, expected: briefing.month.expected }) },
            { label: t('briefing.currentStreak'), value: `${briefing.streakDays}`, sub: t('unit.day', { count: briefing.streakDays }) },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{s.label}</p>
              <p className="num mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">{s.value}</p>
              <p className="num text-xs text-slate-500">{s.sub}</p>
            </div>
          ))}
        </div>

        <Section title={t('briefing.regimen')}>
          {briefing.regimen.length === 0 ? (
            <p className="text-sm text-slate-500">{t('briefing.noMeds')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-slate-500">
                    <th className="pb-2 font-semibold">{t('briefing.colMedication')}</th>
                    <th className="pb-2 font-semibold">{t('briefing.colSchedule')}</th>
                    <th className="pb-2 font-semibold">{t('briefing.colSupply')}</th>
                    <th className="pb-2 text-right font-semibold">{t('briefing.colAdherence')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {briefing.regimen.map((r) => (
                    <tr key={r.id} className="align-top">
                      <td className="py-2.5 pr-3">
                        <p className="font-semibold text-slate-900">
                          {r.name} <span className="num font-normal text-slate-600">{r.strength}</span>
                        </p>
                        <p className="text-xs text-slate-500">
                          {r.category} · {r.form}
                        </p>
                        {r.activeIngredient && <p className="text-xs text-slate-600">{t('briefing.activeIngredient', { value: r.activeIngredient })}</p>}
                        {r.adminRule && <p className="text-xs text-slate-600">{r.adminRule}</p>}
                      </td>
                      <td className="num py-2.5 pr-3 text-slate-700">{r.schedule}</td>
                      <td className={cx('num py-2.5 pr-3', r.low ? 'font-semibold text-amber-700' : 'text-slate-700')}>
                        {r.supply}
                        {r.low && <span className="block text-xs">{t('briefing.refillNeeded')}</span>}
                      </td>
                      <td className="num py-2.5 text-right text-slate-700">{r.adherencePct === null ? '—' : `${r.adherencePct}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title={t('briefing.flags')}>
          {briefing.flags.length === 0 ? (
            <p className="text-sm text-slate-500">{t('briefing.noFlags')}</p>
          ) : (
            <ul className="space-y-3">
              {briefing.flags.map((f) => (
                <li key={f.id} className="text-sm">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                    {f.aLabel} + {f.bLabel}
                    <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold capitalize', SEVERITY_PRINT[f.severity])}>{t(`severity.${f.severity}`)}</span>
                    {f.spacing?.conflict && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">{t('badge.spacing')}</span>}
                  </p>
                  <p className="mt-0.5 leading-relaxed text-slate-600">{f.explanation}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={t('briefing.patterns')}>
          {briefing.correlations.length === 0 ? (
            <p className="text-sm text-slate-500">{t('briefing.noSymptoms')}</p>
          ) : (
            <>
              <ul className="space-y-3">
                {briefing.correlations.map((c) => (
                  <li key={c.key} className="text-sm">
                    <p className="font-semibold text-slate-900">
                      {c.label} <span className="num font-normal text-slate-500">· {t('briefing.lastLog', { count: c.count, when: formatDateTime(c.lastAt, lang) })}</span>
                    </p>
                    {(c.meds.length > 0 || c.habits.length > 0) && (
                      <p className="mt-0.5 text-slate-600">
                        {t('briefing.alongside', { items: [...c.meds.map((m) => `${m.name} (×${m.count})`), ...c.habits.map((h) => `${h.label} (×${h.count})`)].join(', ') })}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs italic text-slate-500">{t('briefing.patternsNote')}</p>
            </>
          )}
        </Section>

        <Section title={t('briefing.recentNotes')}>
          {briefing.recentNotes.length === 0 ? (
            <p className="text-sm text-slate-500">{t('briefing.noNotes')}</p>
          ) : (
            <ul className="space-y-2.5">
              {briefing.recentNotes.map((n) => (
                <li key={n.id} className="grid gap-x-4 text-sm sm:grid-cols-[150px_1fr]">
                  <span className="num text-slate-500">{formatDateTime(n.occurredAt, lang)}</span>
                  <span className="text-slate-700">{n.text}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <footer className="border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-500">
          {t('briefing.footer')}
        </footer>
      </article>
    </>
  )
}
