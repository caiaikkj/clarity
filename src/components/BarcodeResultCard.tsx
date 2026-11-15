import { BadgeCheck, RotateCcw, ScanBarcode, Sparkles, TriangleAlert } from 'lucide-react'
import type { EanMatch } from '../data/eanIndex'
import { useI18n } from '../i18n'
import { brl } from '../lib/format'
import { Spinner } from './ui'

export type BarcodeResult =
  | { kind: 'anvisa'; code: string; match: EanMatch }
  | { kind: 'missing'; code: string }
  | { kind: 'gemini'; code: string }

interface BarcodeResultCardProps {
  result: BarcodeResult
  canUseGemini: boolean
  geminiBusy: boolean
  geminiMessage: string | null
  onGemini: () => void
  onReset: () => void
}

export const BarcodeResultCard = ({ result, canUseGemini, geminiBusy, geminiMessage, onGemini, onReset }: BarcodeResultCardProps) => {
  const { t } = useI18n()

  return (
    <div className="space-y-3 animate-fade">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="num flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-slate-300">
          <ScanBarcode className="h-3.5 w-3.5 text-cyan-300" />
          {t('barcode.code', { code: result.code })}
        </p>
        <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={onReset} disabled={geminiBusy}>
          <RotateCcw className="h-3.5 w-3.5" />
          {t('barcode.scanAgain')}
        </button>
      </div>

      {result.kind === 'anvisa' && (
        <div className="space-y-2 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] backdrop-blur-xl">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
            <BadgeCheck className="h-4 w-4 text-emerald-300" />
            {t('barcode.found')}
          </p>
          <p className="text-sm text-white">
            <span className="font-semibold">{result.match.med.commercialName}</span>
            {result.match.strength && <span className="num text-slate-300"> · {result.match.strength}</span>}
          </p>
          <p className="text-xs leading-relaxed text-emerald-100/80">{result.match.med.activeIngredient}</p>
          <div className="num flex flex-wrap gap-x-4 gap-y-1 text-xs text-emerald-100/90">
            {result.match.pills > 0 && <span>{t('barcode.units', { n: result.match.pills })}</span>}
            {result.match.pmc > 0 && <span>{t('barcode.pmc', { price: brl.format(result.match.pmc) })}</span>}
          </div>
        </div>
      )}

      {result.kind === 'missing' && (
        <div className="space-y-3 rounded-2xl border border-amber-300/25 bg-amber-400/10 px-4 py-3 backdrop-blur-xl">
          <p className="flex items-start gap-2 text-sm text-amber-100">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            {t('barcode.notFound')}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-primary" onClick={onGemini} disabled={!canUseGemini || geminiBusy}>
              {geminiBusy ? <Spinner /> : <Sparkles className="h-4 w-4" />}
              {t('barcode.gemini')}
            </button>
            {!canUseGemini && <span className="text-xs text-amber-200/80">{t('barcode.geminiNeedsKey')}</span>}
          </div>
          {geminiMessage && <p className="text-xs leading-relaxed text-amber-100">{geminiMessage}</p>}
        </div>
      )}

      {result.kind === 'gemini' && (
        <p className="flex items-start gap-2 rounded-2xl border border-sky-300/25 bg-sky-400/10 px-4 py-3 text-sm text-sky-100 backdrop-blur-xl">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
          {t('barcode.geminiFound')}
        </p>
      )}
    </div>
  )
}
