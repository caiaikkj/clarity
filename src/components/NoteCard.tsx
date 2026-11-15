import { useState } from 'react'
import { CheckCheck, Pill, Sparkles, Trash2 } from 'lucide-react'
import type { Medication, Note } from '../types'
import { useI18n } from '../i18n'
import { formatDateTime } from '../lib/dates'
import { tagLabel } from '../lib/knowledge'
import { useData } from '../lib/store'
import { useToast } from '../lib/toast'
import { Chip, ConfirmDialog, IconButton } from './ui'

export const NoteTags = ({ note, meds }: { note: Note; meds: Medication[] }) => {
  const { lang } = useI18n()
  const linked = note.medIds.map((id) => meds.find((m) => m.id === id)).filter((m): m is Medication => Boolean(m))
  return (
    <div className="flex flex-wrap gap-1.5">
      {linked.map((m) => (
        <Chip key={m.id} tone="cyan">
          <Pill className="h-3 w-3" />
          {m.name}
        </Chip>
      ))}
      {note.symptoms.map((s) => (
        <Chip key={s} tone="rose">
          {tagLabel(s, lang)}
        </Chip>
      ))}
      {note.habits.map((h) => (
        <Chip key={h} tone="emerald">
          {tagLabel(h, lang)}
        </Chip>
      ))}
    </div>
  )
}

export const NoteCard = ({ note, showActions = true }: { note: Note; showActions?: boolean }) => {
  const { data, removeNote, logNoteDose } = useData()
  const { toast } = useToast()
  const { t, lang } = useI18n()
  const [confirm, setConfirm] = useState(false)
  const canLog = showActions && note.tookMedIds.length > 0 && !note.doseLogged

  return (
    <>
      <article className="glass-soft group space-y-2.5 p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm leading-relaxed text-slate-100">{note.text}</p>
          {showActions && (
            <IconButton label={t('note.delete')} onClick={() => setConfirm(true)} className="!h-8 !w-8 shrink-0 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus:opacity-100">
              <Trash2 className="h-3.5 w-3.5" />
            </IconButton>
          )}
        </div>
        <NoteTags note={note} meds={data.meds} />
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
          <span className="num flex items-center gap-1.5">
            {note.source === 'gemini' && <Sparkles className="h-3 w-3 text-sky-300" aria-label={t('note.taggedGemini')} />}
            {formatDateTime(note.occurredAt, lang)}
          </span>
          {canLog && (
            <button type="button" onClick={() => logNoteDose(note.id)} className="btn btn-ghost !px-2.5 !py-1 text-xs text-sky-300">
              <CheckCheck className="h-3.5 w-3.5" />
              {t('note.logDose')}
            </button>
          )}
        </div>
      </article>
      {confirm && (
        <ConfirmDialog
          title={t('notes.deleteTitle')}
          body={t('notes.deleteBody')}
          confirmLabel={t('common.remove')}
          danger
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            removeNote(note.id)
            toast(t('toast.noteDeleted'))
            setConfirm(false)
          }}
        />
      )}
    </>
  )
}
