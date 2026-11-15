import { useMemo, useState, type FormEvent } from 'react'
import { NotebookPen, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import type { Note } from '../types'
import { useI18n } from '../i18n'
import { formatDateTime } from '../lib/dates'
import { tagLabel } from '../lib/knowledge'
import { analyzeNote } from '../lib/noteParser'
import { useData } from '../lib/store'
import { useToast } from '../lib/toast'
import { useGeminiConfig } from '../lib/useGemini'
import { NoteTags } from './NoteCard'
import { ConfirmDialog, Modal, Spinner, cx } from './ui'

type Filter = 'all' | `med:${string}` | `symptom:${string}`

export const NotesHistoryModal = ({
  onClose,
  initialMedId,
}: {
  onClose: () => void
  initialMedId?: string
}) => {
  const { data, addNote, updateNote, removeNote } = useData()
  const { toast } = useToast()
  const { t, lang } = useI18n()
  const gemini = useGeminiConfig()

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>(initialMedId ? `med:${initialMedId}` : 'all')
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<Note | null>(null)
  const [editText, setEditText] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const symptoms = useMemo(() => {
    const set = new Set<string>()
    data.notes.forEach((n) => n.symptoms.forEach((s) => set.add(s)))
    return [...set].sort()
  }, [data.notes])

  const notes = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...data.notes]
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .filter((n) => {
        if (filter.startsWith('med:')) return n.medIds.includes(filter.slice(4))
        if (filter.startsWith('symptom:')) return n.symptoms.includes(filter.slice(8))
        return true
      })
      .filter((n) => {
        if (!q) return true
        const medNames = n.medIds.map((id) => data.meds.find((m) => m.id === id)?.name ?? '').join(' ')
        return `${n.text} ${medNames} ${n.symptoms.join(' ')} ${n.habits.join(' ')}`.toLowerCase().includes(q)
      })
  }, [data.notes, data.meds, filter, query])

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    const value = draft.trim()
    if (!value || busy) return
    setBusy(true)
    const { parsed } = await analyzeNote(value, data.meds, gemini)
    const medIds = initialMedId && !parsed.medIds.includes(initialMedId) ? [...parsed.medIds, initialMedId] : parsed.medIds
    addNote(value, { ...parsed, medIds })
    setDraft('')
    toast(t('toast.noteAdded'))
    setBusy(false)
  }

  const saveEdit = () => {
    if (!editing || !editText.trim()) return
    updateNote(editing.id, { text: editText.trim() })
    toast(t('toast.noteUpdated'))
    setEditing(null)
  }

  return (
    <>
      <Modal wide title={t('notes.title')} subtitle={t('notes.subtitle', { count: data.notes.length })} onClose={onClose}>
        <div className="space-y-4">
          <form onSubmit={submit} className="glass-soft flex items-center gap-2 p-2 pl-3">
            <Plus className="h-4 w-4 shrink-0 text-sky-300" />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-slate-500"
              placeholder={t('notes.addPlaceholder')}
              aria-label={t('notes.addPlaceholder')}
            />
            <button type="submit" disabled={!draft.trim() || busy} className="btn btn-primary !px-3.5 !py-2 text-xs">
              {busy ? <Spinner /> : t('notes.add')}
            </button>
          </form>

          <div className="glass-soft flex items-center gap-2 px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-slate-500"
              placeholder={t('notes.search')}
              aria-label={t('notes.search')}
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={cx('btn !px-3 !py-1.5 text-xs', filter === 'all' && '!border-sky-300/50 !bg-sky-400/20 text-sky-100')}
            >
              {t('notes.filterAll')}
            </button>
            {data.meds.map((med) => (
              <button
                key={med.id}
                type="button"
                onClick={() => setFilter(`med:${med.id}`)}
                className={cx(
                  'btn !max-w-[12rem] truncate !px-3 !py-1.5 text-xs',
                  filter === `med:${med.id}` && '!border-sky-300/50 !bg-sky-400/20 text-sky-100',
                )}
              >
                {med.name}
              </button>
            ))}
            {symptoms.map((symptom) => (
              <button
                key={symptom}
                type="button"
                onClick={() => setFilter(`symptom:${symptom}`)}
                className={cx(
                  'btn !px-3 !py-1.5 text-xs',
                  filter === `symptom:${symptom}` && '!border-rose-300/50 !bg-rose-400/20 text-rose-100',
                )}
              >
                {tagLabel(symptom, lang)}
              </button>
            ))}
          </div>

          {notes.length === 0 ? (
            <div className="glass-soft flex flex-col items-center gap-2 px-4 py-10 text-center">
              <NotebookPen className="h-6 w-6 text-sky-300" />
              <p className="text-sm text-slate-300">{t('notes.empty')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <article key={note.id} className="glass-soft space-y-2.5 p-4">
                  {editing?.id === note.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        className="field resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setEditing(null)}>
                          {t('common.cancel')}
                        </button>
                        <button type="button" className="btn btn-primary !px-3 !py-1.5 text-xs" onClick={saveEdit}>
                          {t('common.save')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm leading-relaxed text-slate-100">{note.text}</p>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            className="btn btn-ghost h-8 w-8 !p-0"
                            aria-label={t('notes.edit')}
                            onClick={() => {
                              setEditing(note)
                              setEditText(note.text)
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost h-8 w-8 !p-0 text-rose-300"
                            aria-label={t('note.delete')}
                            onClick={() => setDeleteId(note.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <NoteTags note={note} meds={data.meds} />
                      <p className="num text-xs text-slate-500">{formatDateTime(note.occurredAt, lang)}</p>
                    </>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {deleteId && (
        <ConfirmDialog
          title={t('notes.deleteTitle')}
          body={t('notes.deleteBody')}
          confirmLabel={t('common.remove')}
          danger
          onCancel={() => setDeleteId(null)}
          onConfirm={() => {
            removeNote(deleteId)
            toast(t('toast.noteDeleted'))
            setDeleteId(null)
          }}
        />
      )}
    </>
  )
}
