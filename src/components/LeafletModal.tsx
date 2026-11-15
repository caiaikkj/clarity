import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, BookOpen, ClipboardList, ExternalLink, Info, RefreshCw, ShieldAlert, Stethoscope, Utensils, type LucideIcon } from 'lucide-react'
import { useI18n, type TKey } from '../i18n'
import { formLabel } from '../i18n/forms'
import { localizeIngredients } from '../i18n/ingredients'
import { formatDateTime } from '../lib/dates'
import { generateLeaflet } from '../lib/gemini'
import {
  LEAFLET_SECTION_KEYS,
  POSOLOGY_KEYS,
  anvisaLeafletUrl,
  consultaRemediosUrl,
  hasPosology,
  type LeafletSectionKey,
} from '../lib/leaflet'
import { useData, useUi } from '../lib/store'
import { useGeminiConfig } from '../lib/useGemini'
import { LabelDetails } from './LabelDetails'
import { Modal, Spinner, cx } from './ui'

const STAGGER_MS = 70

const SECTION_META: Record<LeafletSectionKey, { icon: LucideIcon; accent: string }> = {
  indications: { icon: Stethoscope, accent: 'text-sky-300' },
  posology: { icon: ClipboardList, accent: 'text-cyan-300' },
  administration: { icon: Utensils, accent: 'text-indigo-300' },
  sideEffects: { icon: AlertTriangle, accent: 'text-amber-300' },
  contraindications: { icon: ShieldAlert, accent: 'text-rose-300' },
}

const POSOLOGY_LABELS: Record<(typeof POSOLOGY_KEYS)[number], TKey> = {
  generalUsage: 'leaflet.posology.generalUsage',
  frequencyGuidelines: 'leaflet.posology.frequencyGuidelines',
  safetyNotice: 'leaflet.posology.safetyNotice',
}

const LINK_CLASS = 'btn !rounded-full !px-4 !py-2 text-xs'

const SectionSkeleton = () => (
  <div className="glass-soft animate-pulse space-y-3 p-4" aria-hidden>
    <div className="h-4 w-1/2 rounded-full bg-white/10" />
    <div className="h-3 w-full rounded-full bg-white/[0.07]" />
    <div className="h-3 w-5/6 rounded-full bg-white/[0.07]" />
    <div className="h-3 w-2/3 rounded-full bg-white/[0.07]" />
  </div>
)

const BulletList = ({ items }: { items: string[] }) =>
  items.length > 0 ? (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-[13px] leading-relaxed text-slate-300">
          <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-slate-500" />
          <span className="min-w-0 break-words">{item}</span>
        </li>
      ))}
    </ul>
  ) : null

export const LeafletModal = ({ medId, onClose }: { medId: string; onClose: () => void }) => {
  const { data, updateMed } = useData()
  const { openModal } = useUi()
  const { t, lang } = useI18n()
  const gemini = useGeminiConfig()
  const med = data.meds.find((m) => m.id === medId)
  const leaflet = med?.leafletSummary?.[lang]
  const incomplete = Boolean(leaflet && !hasPosology(leaflet))
  const needsRefresh = incomplete && Boolean(gemini)
  const hasCompleteLeaflet = Boolean(leaflet && hasPosology(leaflet))

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const controller = useRef<AbortController>()
  const medRef = useRef(med)
  const updateMedRef = useRef(updateMed)
  const failureRef = useRef(t('leaflet.failed'))
  medRef.current = med
  updateMedRef.current = updateMed
  failureRef.current = t('leaflet.failed')

  useEffect(() => {
    if (!med) onClose()
  }, [med, onClose])

  const generate = useCallback(async () => {
    const current = medRef.current
    if (!gemini || !current) return
    controller.current?.abort()
    const ctl = new AbortController()
    controller.current = ctl
    setBusy(true)
    setError(null)
    try {
      const result = await generateLeaflet(
        gemini,
        {
          name: current.name,
          strength: current.strength,
          form: current.form,
          activeIngredient: current.activeIngredient,
          ingredients: current.ingredients,
          adminRule: current.adminRule,
        },
        ctl.signal,
      )
      if (ctl.signal.aborted) return
      updateMedRef.current(medId, { leafletSummary: { ...medRef.current?.leafletSummary, [gemini.language]: result } })
    } catch (err) {
      if (!ctl.signal.aborted) setError(err instanceof Error ? err.message : failureRef.current)
    } finally {
      if (!ctl.signal.aborted) setBusy(false)
    }
  }, [gemini, medId])

  useEffect(() => {
    if ((!leaflet || needsRefresh) && gemini) void generate()
    return () => {
      controller.current?.abort()
      setBusy(false)
      setError(null)
    }
  }, [leaflet, needsRefresh, gemini, generate])

  if (!med) return null

  const activeIngredient = med.activeIngredient || localizeIngredients(med.ingredients, lang).join(' + ')
  const presentation = [med.strength, formLabel(med.form, lang)].filter(Boolean).join(' · ')
  const hasFda = Boolean(med.fda && med.fda.source !== 'none')
  const showSkeleton = busy && (!leaflet || needsRefresh)
  const displayLeaflet = hasCompleteLeaflet || (incomplete && !gemini) ? leaflet! : null
  const posology = displayLeaflet?.posology ?? { generalUsage: [], frequencyGuidelines: [], safetyNotice: [] }

  const openSettings = () => {
    onClose()
    openModal('settings')
  }

  return (
    <Modal
      wide
      heavyBlur
      title={med.name}
      subtitle={t('leaflet.subtitle')}
      onClose={onClose}
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <a href={anvisaLeafletUrl(med.name)} target="_blank" rel="noopener noreferrer" className={cx(LINK_CLASS, 'justify-center')}>
            <ExternalLink className="h-3.5 w-3.5" />
            {t('leaflet.anvisa')}
          </a>
          <a href={consultaRemediosUrl(med.name)} target="_blank" rel="noopener noreferrer" className={cx(LINK_CLASS, 'justify-center')}>
            <ExternalLink className="h-3.5 w-3.5" />
            {t('leaflet.consultaRemedios')}
          </a>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="flex items-start gap-2 rounded-2xl border border-amber-300/20 bg-amber-400/[0.07] px-3.5 py-2.5 text-xs leading-relaxed text-amber-100/90">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
          {t('leaflet.disclaimer')}
        </p>

        <div className="glass-soft grid gap-3 p-4 sm:grid-cols-2">
          <div className="min-w-0">
            <p className="label">{t('badge.activeIngredient')}</p>
            <p className="break-words text-sm font-medium text-white">{activeIngredient || '—'}</p>
          </div>
          <div className="min-w-0">
            <p className="label">{t('leaflet.presentation')}</p>
            <p className="num break-words text-sm font-medium text-white">{presentation || '—'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-400">
            <BookOpen className="h-3.5 w-3.5 shrink-0 text-sky-300" />
            <span className="truncate">
              {busy
                ? needsRefresh
                  ? t('leaflet.updatingPosology')
                  : t('leaflet.generating')
                : displayLeaflet
                  ? t('leaflet.saved', { date: formatDateTime(displayLeaflet.generatedAt, lang) })
                  : t('leaflet.notGenerated')}
            </span>
          </p>
          <button
            type="button"
            onClick={() => void generate()}
            disabled={!gemini || busy}
            aria-label={t('leaflet.refreshAria', { name: med.name })}
            className="btn btn-ghost !rounded-full !px-3 !py-1.5 text-xs"
          >
            {busy ? <Spinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {t('leaflet.refresh')}
          </button>
        </div>

        {error && <p className="rounded-2xl border border-rose-300/25 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">{error}</p>}

        {!displayLeaflet && !gemini && (
          <div className="glass-soft space-y-3 p-4">
            <p className="text-sm leading-relaxed text-slate-300">{t('leaflet.needKey')}</p>
            <button type="button" className="btn !rounded-full !px-4 !py-2 text-xs" onClick={openSettings}>
              {t('leaflet.openSettings')}
            </button>
          </div>
        )}

        {(displayLeaflet || showSkeleton) && (
          <div className={cx('grid gap-3 transition-opacity duration-200 sm:grid-cols-2', busy && displayLeaflet && 'opacity-60')}>
            {LEAFLET_SECTION_KEYS.map((key, index) => {
              if (!displayLeaflet) return <SectionSkeleton key={key} />
              const { icon: Icon, accent } = SECTION_META[key]
              const highlighted = key === 'posology'
              return (
                <section
                  key={key}
                  className={cx(
                    'animate-rise',
                    highlighted
                      ? 'rounded-[26px] border-2 border-cyan-300/35 bg-gradient-to-br from-cyan-400/[0.16] via-white/[0.06] to-amber-400/[0.14] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18),0_0_40px_-10px_rgba(34,211,238,0.55),0_0_28px_-14px_rgba(251,191,36,0.35)] backdrop-blur-md sm:col-span-2 sm:p-6'
                      : 'glass-soft p-4',
                  )}
                  style={{ animationDelay: `${index * STAGGER_MS}ms` }}
                >
                  <div className={cx('flex items-center gap-2.5', highlighted ? 'mb-4' : 'mb-3')}>
                    <span
                      className={cx(
                        'flex shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07]',
                        accent,
                        highlighted ? 'h-11 w-11' : 'h-8 w-8',
                      )}
                    >
                      <Icon className={highlighted ? 'h-5 w-5' : 'h-4 w-4'} />
                    </span>
                    <h3 className={cx('font-semibold leading-snug text-white', highlighted ? 'text-lg sm:text-xl' : 'text-sm')}>
                      {t(`leaflet.section.${key}`)}
                    </h3>
                  </div>

                  {key === 'posology' ? (
                    <div className="grid gap-3.5 sm:grid-cols-3">
                      {POSOLOGY_KEYS.map((sub) => {
                        const items = posology[sub]
                        return (
                          <div key={sub} className="rounded-2xl border border-cyan-200/15 bg-black/30 p-4">
                            <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.07em] text-cyan-100">
                              {t(POSOLOGY_LABELS[sub])}
                            </p>
                            {items.length > 0 ? (
                              <ul className="space-y-2.5">
                                {items.map((item) => (
                                  <li key={item} className="flex gap-2.5 text-[15px] leading-relaxed text-slate-100">
                                    <span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300/80" />
                                    <span className="min-w-0 break-words">{item}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-[14px] text-slate-500">{t('leaflet.noData')}</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : displayLeaflet[key].length > 0 ? (
                    <BulletList items={displayLeaflet[key]} />
                  ) : (
                    <p className="text-[13px] text-slate-500">{t('leaflet.noData')}</p>
                  )}
                </section>
              )
            })}
          </div>
        )}

        {hasFda && (
          <details className="group glass-soft px-4 py-3">
            <summary className="cursor-pointer text-xs font-medium text-slate-400 group-open:text-slate-200">{t('card.labelDetails')}</summary>
            <div className="mt-3">
              <LabelDetails fda={med.fda} ingredients={med.ingredients} medId={med.id} medName={med.name} />
            </div>
          </details>
        )}
      </div>
    </Modal>
  )
}
