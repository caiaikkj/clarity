import { useRef, useState } from 'react'
import { Camera, ClipboardPaste, FlaskConical, Plus, ScanBarcode, ScanLine, Search, ShieldCheck, Sparkles, Tag, Trash2, TriangleAlert, Upload } from 'lucide-react'
import type { Category, FdaInfo } from '../types'
import { adminRuleFor, englishGenerics, findCuratedByName, type AnvisaMed } from '../data/anvisaMeds'
import { lookupEan, type EanMatch } from '../data/eanIndex'
import { useI18n, type TKey } from '../i18n'
import { ADMIN_RULE_PRESETS } from '../i18n/adminRules'
import { FORMS, formLabel, isFormName } from '../i18n/forms'
import { useData, useUi } from '../lib/store'
import { enrichMedication } from '../lib/normalize'
import { type ScannedMedication, identifyBarcodeWithGemini, scanMedicationWithGemini } from '../lib/gemini'
import { asCategory, parsePrescriptionText } from '../lib/prescriptionParser'
import { brl, parsePrice } from '../lib/format'
import { defaultTimes } from '../lib/schedule'
import { isValidSpacingHours } from '../lib/rescheduler'
import { useGeminiConfig } from '../lib/useGemini'
import { BarcodeResultCard, type BarcodeResult } from './BarcodeResultCard'
import { BarcodeScanner } from './BarcodeScanner'
import { LabelDetails } from './LabelDetails'
import { MedicationAutocomplete } from './MedicationAutocomplete'
import { Chip, Modal, Spinner, cx } from './ui'

type Mode = 'name' | 'paste' | 'photo' | 'barcode'

interface Status {
  kind: 'info' | 'success' | 'warn' | 'error'
  text: string
}

interface LoadedImage {
  dataUrl: string
  mimeType: string
  data: string
}

const CATEGORIES: Category[] = ['prescription', 'supplement', 'otc']

const MODES: { id: Mode; label: TKey; icon: typeof Search }[] = [
  { id: 'name', label: 'add.mode.name', icon: Search },
  { id: 'paste', label: 'add.mode.paste', icon: ClipboardPaste },
  { id: 'photo', label: 'add.mode.photo', icon: Camera },
  { id: 'barcode', label: 'add.mode.barcode', icon: ScanBarcode },
]

const STATUS_STYLE: Record<Status['kind'], string> = {
  info: 'border-sky-300/25 bg-sky-400/10 text-sky-100',
  success: 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100',
  warn: 'border-amber-300/25 bg-amber-400/10 text-amber-100',
  error: 'border-rose-300/25 bg-rose-400/10 text-rose-100',
}

const MAX_IMAGE_SIDE = 1400
const JPEG_QUALITY = 0.85

const loadImage = (file: File, messages: { read: string; unreadable: string }) =>
  new Promise<LoadedImage>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error(messages.read))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error(messages.unreadable))
      img.onload = () => {
        const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
        resolve({ dataUrl, mimeType: 'image/jpeg', data: dataUrl.split(',')[1] })
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })

export const AddMedicationModal = () => {
  const { openModal } = useUi()
  const { addMed } = useData()
  const { t, lang } = useI18n()
  const close = () => openModal(null)
  const geminiConfig = useGeminiConfig()

  const [mode, setMode] = useState<Mode>('name')
  const [pasted, setPasted] = useState('')
  const [image, setImage] = useState<LoadedImage | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [selectedMed, setSelectedMed] = useState<AnvisaMed | null>(null)
  const [strength, setStrength] = useState('')
  const [form, setForm] = useState('Tablet')
  const [category, setCategory] = useState<Category>('supplement')
  const [asNeeded, setAsNeeded] = useState(false)
  const [times, setTimes] = useState<string[]>(['08:00'])
  const [pillsPerDose, setPillsPerDose] = useState(1)
  const [stock, setStock] = useState(30)
  const [refillThreshold, setRefillThreshold] = useState(7)
  const [instructions, setInstructions] = useState('')
  const [notes, setNotes] = useState('')
  const [ingredients, setIngredients] = useState<string[]>([])
  const [fda, setFda] = useState<FdaInfo | undefined>()
  const [activeIngredient, setActiveIngredient] = useState('')
  const [adminRule, setAdminRule] = useState('')
  const [price, setPrice] = useState('')
  const [pharmacy, setPharmacy] = useState('')
  const [spacingHours, setSpacingHours] = useState('')
  const [spacingTarget, setSpacingTarget] = useState('')
  const [pmc, setPmc] = useState<number | undefined>()
  const [barcode, setBarcode] = useState<BarcodeResult | null>(null)
  const [barcodeBusy, setBarcodeBusy] = useState(false)
  const [barcodeGeminiBusy, setBarcodeGeminiBusy] = useState(false)
  const [barcodeMessage, setBarcodeMessage] = useState<string | null>(null)

  const handleNameChange = (value: string) => {
    setName(value)
    if (selectedMed && value !== selectedMed.commercialName) setSelectedMed(null)
  }

  const selectLocalMed = (med: AnvisaMed) => {
    setName(med.commercialName)
    setSelectedMed(med)
    setActiveIngredient(med.activeIngredient)
    setAdminRule(adminRuleFor(med, lang))
    setIngredients(englishGenerics(med).map((generic) => generic.toUpperCase()))
    setFda(undefined)
    if (med.commonDosages.length > 0) setStrength(med.commonDosages[0])
    if (med.form && isFormName(med.form)) setForm(med.form)
    if (med.category) setCategory(med.category)
    setStatus({ kind: 'success', text: t('add.localMatch') })
  }

  const applyEanMatch = (match: EanMatch) => {
    const { med } = match
    const curated = findCuratedByName(med.commercialName)
    setName(med.commercialName)
    setSelectedMed(med)
    setActiveIngredient(med.activeIngredient)
    setAdminRule(curated ? adminRuleFor(curated, lang) : '')
    setIngredients(englishGenerics(curated ?? med).map((generic) => generic.toUpperCase()))
    setFda(undefined)
    const exactStrength = match.strength || med.commonDosages[0]
    if (exactStrength) setStrength(exactStrength)
    if (med.form && isFormName(med.form)) setForm(med.form)
    if (med.category) setCategory(med.category)
    if (match.pills > 0) {
      setStock(match.pills)
      setRefillThreshold(Math.max(3, Math.round(match.pills * 0.2)))
    }
    setPmc(match.pmc > 0 ? match.pmc : undefined)
    setStatus(null)
  }

  const handleBarcode = async (code: string) => {
    setBarcodeBusy(true)
    setBarcodeMessage(null)
    setStatus(null)
    try {
      const match = await lookupEan(code)
      if (match) {
        applyEanMatch(match)
        setBarcode({ kind: 'anvisa', code, match })
      } else {
        setPmc(undefined)
        setBarcode({ kind: 'missing', code })
      }
    } catch {
      setStatus({ kind: 'error', text: t('barcode.dataError') })
      setBarcode(null)
    } finally {
      setBarcodeBusy(false)
    }
  }

  const resetBarcode = () => {
    if (barcode?.kind === 'anvisa') {
      setName('')
      setSelectedMed(null)
      setActiveIngredient('')
      setIngredients([])
      setPmc(undefined)
    }
    setBarcode(null)
    setBarcodeMessage(null)
    setStatus(null)
  }

  const searchBarcodeWithGemini = async () => {
    if (!geminiConfig || barcode?.kind !== 'missing') return
    setBarcodeGeminiBusy(true)
    setBarcodeMessage(null)
    try {
      const identified = await identifyBarcodeWithGemini(geminiConfig, barcode.code)
      if (identified.recognized && identified.name) {
        applyScan(identified)
        setPmc(undefined)
        setBarcode({ kind: 'gemini', code: barcode.code })
      } else {
        setBarcodeMessage(t('barcode.geminiNotRecognized'))
      }
    } catch (err) {
      setBarcodeMessage(err instanceof Error ? err.message : t('common.geminiFailed'))
    } finally {
      setBarcodeGeminiBusy(false)
    }
  }

  const applyScan = (scan: ScannedMedication) => {
    if (scan.name) setName(scan.name)
    if (scan.activeIngredient) setActiveIngredient(scan.activeIngredient)
    if (scan.strength) setStrength(scan.strength)
    if (scan.form) {
      const match = FORMS.find((f) => f.toLowerCase() === scan.form?.toLowerCase())
      setForm(match ?? 'Other')
    }
    if (scan.category) setCategory(asCategory(scan.category, 'otc'))
    if (scan.instructions) setInstructions(scan.instructions)
    if (scan.quantity && scan.quantity > 0) {
      setStock(Math.round(scan.quantity))
      setRefillThreshold(Math.max(3, Math.round(scan.quantity * 0.2)))
    }
    if (scan.asNeeded) {
      setAsNeeded(true)
    } else if (scan.timesPerDay) {
      setAsNeeded(false)
      setTimes(defaultTimes(Math.min(6, Math.max(1, Math.round(scan.timesPerDay))), scan.bedtime))
    } else if (scan.bedtime) {
      setAsNeeded(false)
      setTimes(defaultTimes(1, true))
    }
    if (scan.ingredients?.length) setIngredients(scan.ingredients.map((i) => i.toUpperCase()))
  }

  const autofill = async () => {
    setBusy(true)
    setStatus(null)
    try {
      let targetName = name.trim()
      let note = ''
      let categoryKnown = false

      if (mode === 'paste') {
        if (!pasted.trim()) throw new Error(t('add.needText'))
        let scan: ScannedMedication
        if (geminiConfig) {
          try {
            scan = await scanMedicationWithGemini(geminiConfig, { text: pasted })
          } catch (err) {
            scan = parsePrescriptionText(pasted)
            note = `${err instanceof Error ? err.message : t('common.geminiFailed')} ${t('add.onDeviceParsing')} `
          }
        } else {
          scan = parsePrescriptionText(pasted)
        }
        applyScan(scan)
        if (scan.explanation) note += `${scan.explanation} `
        categoryKnown = Boolean(scan.category)
        targetName = scan.name ?? targetName
      } else if (mode === 'photo') {
        if (!image) throw new Error(t('add.needPhoto'))
        if (!geminiConfig) throw new Error(t('add.needKeyPhoto'))
        const scan = await scanMedicationWithGemini(geminiConfig, { image: { mimeType: image.mimeType, data: image.data } })
        applyScan(scan)
        if (scan.explanation) note += `${scan.explanation} `
        categoryKnown = Boolean(scan.category)
        targetName = scan.name ?? targetName
      }

      if (!targetName) {
        setStatus({ kind: 'warn', text: `${note}${t('add.noName')}` })
        return
      }
      setName(targetName)
      const result = await enrichMedication(targetName, geminiConfig, lang)
      const { fda: info } = result
      setFda(info)
      if (info.ingredients.length) setIngredients(info.ingredients)
      if (result.activeIngredient) setActiveIngredient(result.activeIngredient)
      if (result.adminRule && !adminRule.trim()) setAdminRule(result.adminRule)
      if (result.strength && !strength.trim()) setStrength(result.strength)
      if (info.source === 'openFDA' && !categoryKnown) setCategory(info.prescriptionOnly ? 'prescription' : 'otc')

      const text = [note.trim(), ...result.steps, ...result.warnings].filter(Boolean).join(' ')
      const matched = info.source !== 'none'
      setStatus({ kind: matched ? 'success' : 'warn', text: text || t('add.done') })
    } catch (err) {
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : t('common.somethingWrong') })
    } finally {
      setBusy(false)
    }
  }

  const onFile = async (file?: File) => {
    if (!file) return
    setStatus(null)
    try {
      setImage(await loadImage(file, { read: t('add.imageReadFail'), unreadable: t('add.imageUnreadable') }))
    } catch (err) {
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : t('add.imageLoadFail') })
    }
  }

  const priceValue = parsePrice(price)
  const priceInvalid = price.trim() !== '' && priceValue === null

  const spacingValue = Number(spacingHours.replace(',', '.'))
  const spacingFilled = spacingHours.trim() !== '' || spacingTarget.trim() !== ''
  const spacingValid = isValidSpacingHours(spacingValue) && spacingTarget.trim() !== ''
  const spacingInvalid = spacingFilled && !spacingValid

  const save = () => {
    if (!name.trim() || priceInvalid || spacingInvalid) return
    addMed({
      name: name.trim(),
      strength: strength.trim(),
      form,
      category,
      asNeeded,
      times: asNeeded ? [] : [...times].sort(),
      pillsPerDose: Math.max(1, pillsPerDose),
      stock: Math.max(0, stock),
      refillThreshold: Math.max(0, refillThreshold),
      instructions: instructions.trim(),
      notes: notes.trim(),
      ingredients,
      fda,
      activeIngredient: activeIngredient.trim() || undefined,
      adminRule: adminRule.trim() || undefined,
      spacingHours: spacingValid ? spacingValue : undefined,
      spacingTarget: spacingValid ? spacingTarget.trim() : undefined,
      lastPaidPrice: priceValue ?? undefined,
      pmc,
      lastPharmacy: pharmacy.trim() || undefined,
      lastPaidAt: priceValue !== null || pharmacy.trim() ? new Date().toISOString() : undefined,
    })
    close()
  }

  const setPerDay = (n: number) => setTimes(defaultTimes(n))

  const canAutofill =
    mode === 'name' || mode === 'barcode' ? name.trim().length > 1 : mode === 'paste' ? pasted.trim().length > 2 : image !== null

  return (
    <Modal
      wide
      title={t('add.title')}
      subtitle={t('add.subtitle')}
      onClose={close}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={close}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={!name.trim() || (!asNeeded && times.length === 0) || spacingInvalid}>
            <Plus className="h-4 w-4" />
            {t('add.submit')}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="glass-soft space-y-4 p-4">
          <div className="grid grid-cols-2 gap-1.5 rounded-3xl border border-white/10 bg-black/20 p-1" role="tablist">
            {MODES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                onClick={() => setMode(id)}
                className={cx(
                  'tactile flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium sm:text-sm',
                  mode === id ? 'bg-white/[0.14] text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]' : 'text-slate-400 hover:text-slate-200',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {t(label)}
              </button>
            ))}
          </div>

          {mode === 'name' && (
            <div className="space-y-2">
              <MedicationAutocomplete
                value={name}
                onChange={handleNameChange}
                onSelect={selectLocalMed}
                onSubmit={() => {
                  if (canAutofill && !busy) autofill()
                }}
                placeholder={t('add.namePlaceholder')}
                ariaLabel={t('add.nameAria')}
              />
              <p className="text-xs text-slate-500">{t('add.nameHint')}</p>
            </div>
          )}

          {mode === 'paste' && (
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={5}
              className="field resize-none"
              placeholder={t('add.pastePlaceholder')}
            />
          )}

          {mode === 'photo' && (
            <div>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
              {image ? (
                <div className="flex items-center gap-4">
                  <img src={image.dataUrl} alt={t('add.photoSelected')} className="h-24 w-24 rounded-2xl border border-white/15 object-cover" />
                  <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
                    <Upload className="h-4 w-4" />
                    {t('add.photoChoose')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-white/20 bg-black/10 px-4 py-8 text-sm text-slate-400 transition-all duration-200 ease-smooth hover:border-sky-300/40 hover:bg-white/[0.05] hover:text-slate-200"
                >
                  <ScanLine className="h-7 w-7 text-sky-300" />
                  {t('add.photoUpload')}
                </button>
              )}
              {!geminiConfig && (
                <p className="mt-3 flex items-start gap-2 text-xs text-amber-200">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {t('add.photoNeedsKey')}
                </p>
              )}
            </div>
          )}

          {mode === 'barcode' && (
            <div className="space-y-3">
              {barcodeBusy && (
                <p className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-6 text-sm text-slate-300">
                  <Spinner />
                  {t('barcode.loadingData')}
                </p>
              )}
              {!barcodeBusy && !barcode && <BarcodeScanner onDetected={handleBarcode} />}
              {!barcodeBusy && barcode && (
                <BarcodeResultCard
                  result={barcode}
                  canUseGemini={geminiConfig !== null}
                  geminiBusy={barcodeGeminiBusy}
                  geminiMessage={barcodeMessage}
                  onGemini={searchBarcodeWithGemini}
                  onReset={resetBarcode}
                />
              )}
            </div>
          )}

          {(mode !== 'barcode' || canAutofill) && (
            <div className="flex items-center gap-3">
              <button type="button" className="btn btn-primary" onClick={autofill} disabled={busy || !canAutofill}>
                {busy ? <Spinner /> : <Sparkles className="h-4 w-4" />}
                {mode === 'name' || mode === 'barcode' ? t('add.lookup') : t('add.autofill')}
              </button>
              {geminiConfig && <Chip tone="cyan">{t('add.geminiOn')}</Chip>}
            </div>
          )}

          {status && <p className={cx('rounded-2xl border px-4 py-3 text-sm animate-fade', STATUS_STYLE[status.kind])}>{status.text}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {mode !== 'name' && (
            <div className="sm:col-span-2">
              <label className="label" htmlFor="med-name">
                {t('common.name')}
              </label>
              <input id="med-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('add.namePlain')} />
            </div>
          )}
          <div>
            <label className="label" htmlFor="med-strength">
              {t('common.strength')}
            </label>
            <input id="med-strength" className="field num" value={strength} onChange={(e) => setStrength(e.target.value)} placeholder={t('add.strengthPlaceholder')} />
            {selectedMed && selectedMed.commonDosages.length > 0 && (
              <div className="mt-2" aria-label={t('add.dosageSuggestions')}>
                <p className="mb-1.5 text-[11px] text-slate-500">{t('add.dosageSuggestions')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedMed.commonDosages.map((dosage) => (
                    <button
                      key={dosage}
                      type="button"
                      onClick={() => setStrength(dosage)}
                      className={cx(
                        'btn btn-ghost num !px-2.5 !py-1 text-[11px]',
                        strength === dosage ? '!border-sky-300/50 !bg-sky-400/20 text-sky-100' : 'text-slate-400',
                      )}
                    >
                      {dosage}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="label" htmlFor="med-form">
              {t('common.form')}
            </label>
            <select id="med-form" className="field" value={form} onChange={(e) => setForm(e.target.value)}>
              {FORMS.map((f) => (
                <option key={f} value={f} className="bg-slate-900">
                  {formLabel(f, lang)}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <span className="label">{t('add.type')}</span>
            <div className="flex gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cx('btn flex-1', category === c && '!border-sky-300/50 !bg-sky-400/20 text-sky-100')}
                >
                  {t(`category.${c}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2">
            <span className="label">{t('add.schedule')}</span>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={cx('btn', asNeeded && '!border-sky-300/50 !bg-sky-400/20 text-sky-100')} onClick={() => setAsNeeded(true)}>
                {t('freq.asNeeded')}
              </button>
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={cx('btn num', !asNeeded && times.length === n && '!border-sky-300/50 !bg-sky-400/20 text-sky-100')}
                  onClick={() => {
                    setAsNeeded(false)
                    setPerDay(n)
                  }}
                >
                  {t('add.perDay', { n })}
                </button>
              ))}
            </div>
            {!asNeeded && (
              <div className="mt-3 flex flex-wrap gap-2">
                {times.map((time, i) => (
                  <div key={i} className="glass-soft flex items-center gap-1 !rounded-full py-1 pl-3 pr-1">
                    <input
                      type="time"
                      value={time}
                      aria-label={t('add.doseTime', { n: i + 1 })}
                      onChange={(e) => setTimes(times.map((x, j) => (j === i ? e.target.value || x : x)))}
                      className="num bg-transparent text-sm text-white outline-none [color-scheme:dark]"
                    />
                    {times.length > 1 && (
                      <button type="button" aria-label={t('add.removeTime')} onClick={() => setTimes(times.filter((_, j) => j !== i))} className="btn btn-ghost h-7 w-7 !p-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {times.length < 6 && (
                  <button type="button" className="btn btn-ghost !py-1.5 text-xs" onClick={() => setTimes([...times, '12:00'])}>
                    <Plus className="h-3.5 w-3.5" />
                    {t('add.addTime')}
                  </button>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="label" htmlFor="med-dose">
              {t('add.pillsPerDose')}
            </label>
            <input id="med-dose" type="number" min={1} className="field num" value={pillsPerDose} onChange={(e) => setPillsPerDose(Number(e.target.value) || 1)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="med-stock">
                {t('add.inStock')}
              </label>
              <input id="med-stock" type="number" min={0} className="field num" value={stock} onChange={(e) => setStock(Number(e.target.value) || 0)} />
            </div>
            <div>
              <label className="label" htmlFor="med-refill">
                {t('add.refillAt')}
              </label>
              <input id="med-refill" type="number" min={0} className="field num" value={refillThreshold} onChange={(e) => setRefillThreshold(Number(e.target.value) || 0)} />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="med-instr">
              {t('add.instructions')}
            </label>
            <input id="med-instr" className="field" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder={t('add.instructionsPlaceholder')} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="med-notes">
              {t('add.notes')}
            </label>
            <textarea id="med-notes" rows={2} className="field resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('add.notesPlaceholder')} />
          </div>
        </div>

        <div className="glass-soft space-y-4 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-white">
            <FlaskConical className="h-4 w-4 text-indigo-300" />
            {t('add.pharma')}
            <span className="text-xs font-normal text-slate-500">{t('common.optional')}</span>
          </p>
          <div>
            <label className="label" htmlFor="med-active">
              {t('add.activeIngredient')}
            </label>
            <input
              id="med-active"
              className="field"
              value={activeIngredient}
              onChange={(e) => setActiveIngredient(e.target.value)}
              placeholder={t('add.activePlaceholder')}
            />
          </div>
          <div>
            <label className="label" htmlFor="med-rule">
              {t('add.adminRule')}
            </label>
            <input
              id="med-rule"
              className="field"
              value={adminRule}
              onChange={(e) => setAdminRule(e.target.value)}
              placeholder={t('add.adminPlaceholder')}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ADMIN_RULE_PRESETS.map((preset) => {
                const label = lang === 'pt-BR' ? preset.pt : preset.en
                return (
                  <button
                    key={preset.en}
                    type="button"
                    onClick={() => setAdminRule(label)}
                    className="btn btn-ghost !px-2.5 !py-1 text-[11px] text-slate-400"
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
            <div>
              <label className="label" htmlFor="med-spacing-hours">
                {t('add.spacingHours')}
              </label>
              <input
                id="med-spacing-hours"
                inputMode="decimal"
                className={cx('field num', spacingInvalid && '!border-rose-300/60')}
                value={spacingHours}
                onChange={(e) => setSpacingHours(e.target.value)}
                placeholder={t('add.spacingHoursPlaceholder')}
              />
            </div>
            <div>
              <label className="label" htmlFor="med-spacing-target">
                {t('add.spacingTarget')}
              </label>
              <input
                id="med-spacing-target"
                className={cx('field', spacingInvalid && '!border-rose-300/60')}
                value={spacingTarget}
                onChange={(e) => setSpacingTarget(e.target.value)}
                placeholder={t('add.spacingTargetPlaceholder')}
              />
            </div>
          </div>
          <p className={cx('text-xs', spacingInvalid ? 'text-rose-300' : 'text-slate-500')}>
            {spacingInvalid ? t('add.spacingInvalid') : t('add.spacingHint')}
          </p>
          <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
            <div>
              <label className="label" htmlFor="med-price">
                {t('add.lastPrice')}
              </label>
              <input
                id="med-price"
                inputMode="decimal"
                className={cx('field num', priceInvalid && '!border-rose-300/60')}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={lang === 'pt-BR' ? '0,00' : '0.00'}
              />
            </div>
            <div>
              <label className="label" htmlFor="med-pharmacy">
                {t('add.lastPharmacy')}
              </label>
              <input id="med-pharmacy" className="field" value={pharmacy} onChange={(e) => setPharmacy(e.target.value)} placeholder={t('add.pharmacyPlaceholder')} />
            </div>
          </div>
          {priceInvalid && <p className="text-xs text-rose-300">{t('add.invalidPrice')}</p>}
          {pmc !== undefined && (
            <p className="num flex items-center gap-2 text-xs text-slate-400">
              <Tag className="h-3.5 w-3.5 text-emerald-300" />
              {t('card.pmc')} <span className="font-semibold text-slate-200">{brl.format(pmc)}</span>
            </p>
          )}
        </div>

        {fda && fda.source !== 'none' && (
          <div className="glass-soft space-y-3 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
              <ShieldCheck className="h-4 w-4" />
              {fda.source === 'openFDA' ? t('add.fdaLabel') : t('add.geminiNotes')}
            </p>
            <LabelDetails fda={fda} ingredients={ingredients} />
          </div>
        )}
      </div>
    </Modal>
  )
}
