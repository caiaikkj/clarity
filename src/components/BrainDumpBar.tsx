import { useRef, useState, type FormEvent } from 'react'
import { ArrowUp, Mic, Sparkles } from 'lucide-react'
import type { Note } from '../types'
import { useI18n, type TKey } from '../i18n'
import { useData } from '../lib/store'
import { useGeminiConfig } from '../lib/useGemini'
import { useSpeech, type SpeechFailure } from '../lib/useSpeech'
import { analyzeNote } from '../lib/noteParser'
import { NoteTags } from './NoteCard'
import { Spinner, cx } from './ui'
import { formatDateTime } from '../lib/dates'

const EXAMPLE_KEYS = ['dump.example1', 'dump.example2', 'dump.example3'] as const

const VOICE_ERROR_KEYS: Record<SpeechFailure, TKey> = {
  denied: 'dump.mic.denied',
  'no-microphone': 'dump.mic.missing',
  network: 'dump.mic.network',
  unknown: 'dump.mic.failed',
}

const joinSpeech = (base: string, transcript: string) => [base, transcript].filter(Boolean).join(' ')

export const BrainDumpBar = () => {
  const { data, addNote } = useData()
  const { t, lang } = useI18n()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)
  const [last, setLast] = useState<Note | null>(null)

  const [voiceError, setVoiceError] = useState<string | null>(null)
  const dictationBase = useRef('')

  const geminiConfig = useGeminiConfig()

  const speech = useSpeech({
    lang,
    onTranscript: (transcript) => setText(joinSpeech(dictationBase.current, transcript)),
    onFailure: (failure) => setVoiceError(t(VOICE_ERROR_KEYS[failure])),
  })

  const toggleVoice = () => {
    if (speech.listening) {
      speech.stop()
      return
    }
    setVoiceError(null)
    dictationBase.current = text.trim()
    speech.start()
  }

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    const value = text.trim()
    if (!value || busy) return
    speech.stop()
    setVoiceError(null)
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
          'glass flex items-center gap-3 !rounded-full py-2 pl-5 pr-2 transition-all duration-200 ease-smooth focus-within:border-sky-300/40 focus-within:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_0_0_5px_rgba(56,189,248,0.1),0_24px_60px_-24px_rgba(56,189,248,0.35)]',
        )}
      >
        <Sparkles className={cx('h-5 w-5 shrink-0 transition-colors', geminiConfig ? 'text-sky-300' : 'text-slate-500')} />
        <input
          value={text}
          onChange={(e) => {
            if (speech.listening) speech.stop()
            setText(e.target.value)
          }}
          placeholder={speech.listening ? t('dump.listening') : t('dump.placeholder')}
          aria-label={t('dump.aria')}
          className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-white outline-none placeholder:text-slate-500"
        />
        {speech.supported && (
          <button
            type="button"
            onClick={toggleVoice}
            aria-pressed={speech.listening}
            aria-label={speech.listening ? t('dump.mic.stop') : t('dump.mic.start')}
            title={speech.listening ? t('dump.mic.stop') : t('dump.mic.start')}
            className={cx(
              'btn btn-ghost relative h-11 w-11 shrink-0 !rounded-full !p-0 backdrop-blur-md',
              speech.listening ? '!border-rose-300/50 !bg-rose-500/20 text-rose-100' : 'text-slate-300',
            )}
          >
            {speech.listening && (
              <>
                <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full border-2 border-cyan-300/70 animate-mic-ring" />
                <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full border-2 border-rose-400/60 animate-mic-ring [animation-delay:0.8s]" />
              </>
            )}
            <Mic className="relative h-5 w-5" />
          </button>
        )}
        <button
          type="submit"
          disabled={!text.trim() || busy}
          aria-label={t('dump.save')}
          className="btn btn-primary h-11 w-11 shrink-0 !rounded-full !p-0"
        >
          {busy ? <Spinner /> : <ArrowUp className="h-5 w-5" />}
        </button>
      </form>

      {voiceError && (
        <p role="alert" className="px-4 text-xs text-amber-300">
          {voiceError}
        </p>
      )}

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
