import { useState, type FormEvent } from 'react'
import { ArrowUp, Sparkles } from 'lucide-react'
import type { Note } from '../types'
import { useI18n } from '../i18n'
import { useData } from '../lib/store'
import { useGeminiConfig } from '../lib/useGemini'
import { analyzeNote } from '../lib/noteParser'
import { NoteTags } from './NoteCard'
import { Spinner, cx } from './ui'
import { formatDateTime } from '../lib/dates'

const EXAMPLE_KEYS = ['dump.example1', 'dump.example2', 'dump.example3'] as const

export const BrainDumpBar = () => {
  const { data, addNote } = useData()
  const { t, lang } = useI18n()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)
  const [last, setLast] = useState<Note | null>(null)

  const geminiConfig = useGeminiConfig()

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    const value = text.trim()
    if (!value || busy) return
    setBusy(true)
    setWarning(null)
    const { parsed, warning: warn } = await analyzeNote(value, data.meds, geminiConfig)
    addNote(value, parsed)
    setLast({
      id: 'preview',
      text: value,
      createdAt: new Date().toISOString(),
      occurredAt: parsed.occurredAt,
      medIds: parsed.medIds,
      tookMedIds: parsed.tookMedIds,
      symptoms: parsed.symptoms,
      habits: parsed.habits,
      mood: parsed.mood,
      source: parsed.source,
    })
    setWarning(warn ?? null)
    setText('')
    setBusy(false)
  }

  const empty = last && last.medIds.length === 0 && last.symptoms.length === 0 && last.habits.length === 0

  return (
    <section aria-label={t('dump.region')} className="space-y-3">
      <form
        onSubmit={submit}
        className={cx(
          'glass flex items-center gap-3 !rounded-full py-2 pl-5 pr-2 transition-all duration-500 ease-smooth focus-within:border-sky-300/40 focus-within:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_0_0_5px_rgba(56,189,248,0.1),0_24px_60px_-24px_rgba(56,189,248,0.35)]',
        )}
      >
        <Sparkles className={cx('h-5 w-5 shrink-0 transition-colors', geminiConfig ? 'text-sky-300' : 'text-slate-500')} />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('dump.placeholder')}
          aria-label={t('dump.aria')}
          className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-white outline-none placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={!text.trim() || busy}
          aria-label={t('dump.save')}
          className="btn btn-primary h-11 w-11 shrink-0 !rounded-full !p-0"
        >
          {busy ? <Spinner /> : <ArrowUp className="h-5 w-5" />}
        </button>
      </form>

      {!last && !busy && (
        <div className="flex flex-wrap gap-2 px-1">
          {EXAMPLE_KEYS.map((key) => (
            <button key={key} type="button" onClick={() => setText(t(key))} className="btn btn-ghost !px-3 !py-1.5 text-xs text-slate-400">
              {t(key)}
            </button>
          ))}
        </div>
      )}

      {last && (
        <div className="glass-soft animate-pop space-y-2 px-4 py-3">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              {t('dump.saved')}
              {last.source === 'gemini' ? t('dump.taggedGemini') : t('dump.taggedLocal')}
            </span>
            <span className="num">{formatDateTime(last.occurredAt, lang)}</span>
          </div>
          {empty ? (
            <p className="text-sm text-slate-400">{t('dump.empty')}</p>
          ) : (
            <NoteTags note={last} meds={data.meds} />
          )}
          {warning && <p className="text-xs text-amber-300">{warning}</p>}
        </div>
      )}
    </section>
  )
}
