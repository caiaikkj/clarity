import { useState } from 'react'
import { Languages, Sparkles } from 'lucide-react'
import type { FdaInfo } from '../types'
import { useI18n } from '../i18n'
import { localizeIngredients } from '../i18n/ingredients'
import { localizePurpose } from '../i18n/labelGlossary'
import { localizeLabel } from '../lib/gemini'
import { useGeminiConfig } from '../lib/useGemini'
import { useData } from '../lib/store'
import { Chip, Spinner } from './ui'

const Block = ({ label, text }: { label: string; text?: string }) =>
  text ? (
    <div>
      <p className="label">{label}</p>
      <p className="text-sm leading-relaxed text-slate-300">{text}</p>
    </div>
  ) : null

interface LabelDetailsProps {
  fda?: FdaInfo
  ingredients: string[]
  medId?: string
  medName?: string
}

export const LabelDetails = ({ fda, ingredients, medId, medName }: LabelDetailsProps) => {
  const { t, lang } = useI18n()
  const { updateMed } = useData()
  const gemini = useGeminiConfig()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasLocalized = Boolean(fda?.summaryPt || fda?.warningsPt || fda?.interactionsPt)
  const useLocalized = hasLocalized && (fda?.source === 'gemini' || (fda?.localizedLang ?? 'pt-BR') === lang)
  const hasLabelText = Boolean(fda?.purpose || fda?.warnings || fda?.interactions)
  const showOriginal = fda?.source === 'openFDA' && !useLocalized && hasLabelText
  const canTranslate = showOriginal && Boolean(medId)

  const translate = async () => {
    if (!fda || !medId || !gemini) return
    setBusy(true)
    setError(null)
    try {
      const localized = await localizeLabel(gemini, medName ?? fda.genericName ?? '', [
        {
          ingredient: fda.genericName ?? fda.ingredients[0] ?? medName ?? '',
          purpose: fda.purpose,
          warnings: fda.warnings,
          interactions: fda.interactions,
        },
      ])
      updateMed(medId, {
        fda: {
          ...fda,
          summaryPt: localized.summary?.trim() || undefined,
          warningsPt: localized.warnings?.trim() || undefined,
          interactionsPt: localized.interactions?.trim() || undefined,
          localizedLang: lang,
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('label.translateFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      {ingredients.length > 0 && (
        <div>
          <p className="label">{t('label.activeIngredients')}</p>
          <div className="flex flex-wrap gap-1.5">
            {localizeIngredients(ingredients, lang).map((i) => (
              <Chip key={i} tone="indigo">
                {i}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {fda && fda.source !== 'none' ? (
        <>
          {useLocalized ? (
            <>
              <Block label={t('label.summary')} text={fda.summaryPt} />
              <Block label={t('label.warnings')} text={fda.warningsPt} />
              <Block label={t('label.interactions')} text={fda.interactionsPt} />
            </>
          ) : (
            <>
              <Block label={t('label.purpose')} text={localizePurpose(fda.purpose, lang)} />
              <Block label={t('label.warnings')} text={fda.warnings} />
              <Block label={t('label.interactions')} text={fda.interactions} />
            </>
          )}

          {showOriginal && lang === 'pt-BR' && (
            <div className="space-y-2 rounded-2xl border border-white/10 bg-black/10 px-3.5 py-3">
              <p className="text-xs leading-relaxed text-slate-400">{t('label.notTranslated')}</p>
              {canTranslate && (
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className="btn !px-3 !py-1.5 text-xs" onClick={translate} disabled={!gemini || busy}>
                    {busy ? <Spinner /> : <Languages className="h-3.5 w-3.5" />}
                    {t('label.translate')}
                  </button>
                  {!gemini && <span className="text-xs text-slate-500">{t('label.needKeyToTranslate')}</span>}
                </div>
              )}
              {error && <p className="text-xs text-rose-300">{error}</p>}
            </div>
          )}

          {fda.source === 'openFDA' && useLocalized && (fda.warnings || fda.interactions) && (
            <details className="group rounded-2xl border border-white/10 bg-black/10 px-3.5 py-2.5">
              <summary className="cursor-pointer text-xs font-medium text-slate-400 group-open:text-slate-200">{t('label.originalFda')}</summary>
              <div className="mt-2 space-y-2 text-xs leading-relaxed text-slate-400">
                {fda.purpose && <p>{fda.purpose}</p>}
                {fda.warnings && <p>{fda.warnings}</p>}
                {fda.interactions && <p>{fda.interactions}</p>}
              </div>
            </details>
          )}

          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
            {fda.source === 'gemini' && <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-sky-300" />}
            {fda.source === 'openFDA'
              ? `${t('label.sourceFda')}${fda.manufacturer ? ` · ${fda.manufacturer}` : ''}${useLocalized ? t('label.translatedByGemini') : ''}`
              : t('label.aiGenerated')}
          </p>
        </>
      ) : (
        <p className="text-sm text-slate-400">{t('label.notListed')}</p>
      )}
    </div>
  )
}
