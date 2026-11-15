import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ScanBarcode, Search } from 'lucide-react'
import type { Html5Qrcode } from 'html5-qrcode'
import { useI18n, type TKey } from '../i18n'
import { digitsOnly, isValidBarcode } from '../lib/barcode'
import { createAudioContext, playChime, vibrate } from '../lib/feedback'
import { Spinner, cx } from './ui'

const REGION_ID = 'clarity-barcode-region'
const SCAN_FPS = 15
const MAX_BARCODE_LENGTH = 13

type Phase = 'starting' | 'scanning' | 'error'

interface BarcodeScannerProps {
  onDetected: (code: string) => void
}

const CORNERS = [
  'left-0 top-0 rounded-tl-2xl border-l-2 border-t-2',
  'right-0 top-0 rounded-tr-2xl border-r-2 border-t-2',
  'bottom-0 left-0 rounded-bl-2xl border-b-2 border-l-2',
  'bottom-0 right-0 rounded-br-2xl border-b-2 border-r-2',
]

export const BarcodeScanner = ({ onDetected }: BarcodeScannerProps) => {
  const { t } = useI18n()
  const [phase, setPhase] = useState<Phase>('starting')
  const [errorKey, setErrorKey] = useState<TKey>('barcode.cameraError')
  const [manual, setManual] = useState('')
  const [manualInvalid, setManualInvalid] = useState(false)
  const detectedRef = useRef(onDetected)

  useEffect(() => {
    detectedRef.current = onDetected
  }, [onDetected])

  useEffect(() => {
    let cancelled = false
    let handled = false
    let started = false
    let scanner: Html5Qrcode | null = null
    const audio = createAudioContext()

    const stop = async () => {
      if (!scanner || !started) return
      started = false
      await scanner.stop().catch(() => undefined)
      scanner.clear()
    }

    const fail = (key: TKey) => {
      if (cancelled) return
      setErrorKey(key)
      setPhase('error')
    }

    const run = async () => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        fail('barcode.insecure')
        return
      }
      try {
        const { Html5Qrcode: Scanner, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
        if (cancelled) return
        scanner = new Scanner(REGION_ID, {
          verbose: false,
          useBarCodeDetectorIfSupported: true,
          formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8, Html5QrcodeSupportedFormats.UPC_A],
        })
        await scanner.start(
          { facingMode: 'environment' },
          { fps: SCAN_FPS, disableFlip: true },
          (decoded) => {
            if (handled || !isValidBarcode(decoded)) return
            handled = true
            playChime(audio)
            vibrate()
            void stop().then(() => {
              if (!cancelled) detectedRef.current(digitsOnly(decoded))
            })
          },
          () => undefined,
        )
        started = true
        if (cancelled) {
          await stop()
          return
        }
        setPhase('scanning')
      } catch {
        fail('barcode.cameraError')
      }
    }

    void run()

    return () => {
      cancelled = true
      void stop()
      void audio?.close().catch(() => undefined)
    }
  }, [])

  const submitManual = (e: FormEvent) => {
    e.preventDefault()
    if (!isValidBarcode(manual)) {
      setManualInvalid(true)
      return
    }
    detectedRef.current(digitsOnly(manual))
  }

  return (
    <div className="space-y-3">
      <div
        role="img"
        aria-label={t('barcode.viewfinderAria')}
        className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/20 bg-black/50 shadow-glass"
      >
        <div id={REGION_ID} className="absolute inset-0 [&_video]:!h-full [&_video]:!w-full [&_video]:!object-cover" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.07] via-transparent to-black/25" />

        <div className="pointer-events-none absolute inset-x-[9%] inset-y-[24%]">
          {CORNERS.map((corner) => (
            <span key={corner} className={cx('absolute h-6 w-6 border-cyan-300/90', corner)} />
          ))}
          {phase === 'scanning' && (
            <span className="absolute inset-x-2 top-0 h-0.5 animate-scanline rounded-full bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_16px_3px_rgba(34,211,238,0.65)] motion-reduce:top-1/2 motion-reduce:animate-none" />
          )}
        </div>

        {phase !== 'scanning' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            {phase === 'starting' ? (
              <>
                <Spinner />
                <p className="text-sm text-slate-300">{t('barcode.starting')}</p>
              </>
            ) : (
              <>
                <ScanBarcode className="h-8 w-8 text-slate-400" />
                <p className="text-sm leading-relaxed text-amber-100">{t(errorKey)}</p>
              </>
            )}
          </div>
        )}
      </div>

      {phase !== 'error' && <p className="text-xs text-slate-500">{t('barcode.hint')}</p>}

      <form onSubmit={submitManual} className="space-y-1.5">
        <label className="label" htmlFor="barcode-manual">
          {t('barcode.manualLabel')}
        </label>
        <div className="flex gap-2">
          <input
            id="barcode-manual"
            className={cx('field num', manualInvalid && '!border-rose-300/60')}
            inputMode="numeric"
            autoComplete="off"
            maxLength={MAX_BARCODE_LENGTH}
            value={manual}
            onChange={(e) => {
              setManual(digitsOnly(e.target.value))
              setManualInvalid(false)
            }}
            placeholder={t('barcode.manualPlaceholder')}
          />
          <button type="submit" className="btn shrink-0" disabled={manual.length < 8}>
            <Search className="h-4 w-4" />
            {t('barcode.search')}
          </button>
        </div>
        {manualInvalid && <p className="text-xs text-rose-300">{t('barcode.invalid')}</p>}
      </form>
    </div>
  )
}
