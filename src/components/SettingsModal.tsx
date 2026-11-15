import { useRef, useState } from 'react'
import { CheckCircle2, Cloud, Download, ExternalLink, Eye, EyeOff, KeyRound, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { useI18n } from '../i18n'
import { useAuth } from '../lib/auth'
import { useData, useUi } from '../lib/store'
import { DEFAULT_MODEL, MODEL_OPTIONS, testGeminiKey } from '../lib/gemini'
import { LanguageToggle } from './LanguageToggle'
import { Modal, Spinner, cx } from './ui'

type Test = { state: 'idle' } | { state: 'busy' } | { state: 'ok' } | { state: 'error'; message: string }

export const SettingsModal = () => {
  const { openModal } = useUi()
  const { t, lang } = useI18n()
  const { user, syncStatus } = useAuth()
  const { settings, setSettings, clearAll, exportBackup, importBackup } = useData()
  const [key, setKey] = useState(settings.geminiKey)
  const [model, setModel] = useState(settings.model || DEFAULT_MODEL)
  const [reveal, setReveal] = useState(false)
  const [test, setTest] = useState<Test>({ state: 'idle' })
  const [confirm, setConfirm] = useState(false)
  const [backupMessage, setBackupMessage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const close = () => openModal(null)

  const runTest = async () => {
    setTest({ state: 'busy' })
    try {
      await testGeminiKey({ apiKey: key.trim(), model, language: lang })
      setTest({ state: 'ok' })
    } catch (err) {
      setTest({ state: 'error', message: err instanceof Error ? err.message : t('settings.testFailed') })
    }
  }

  const save = () => {
    setSettings({ geminiKey: key.trim(), model })
    close()
  }

  const confirmAction = () => {
    clearAll()
    setConfirm(false)
    close()
  }

  return (
    <Modal
      title={t('settings.title')}
      subtitle={t('settings.subtitle')}
      onClose={close}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={close}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn btn-primary" onClick={save}>
            {t('common.save')}
          </button>
        </>
      }
    >
      <div className="space-y-7">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-white">{t('settings.language')}</h3>
              <p className="mt-0.5 text-xs text-slate-400">{t('settings.languageHint')}</p>
            </div>
            <LanguageToggle className="shrink-0" />
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-sky-300" />
            <h3 className="text-sm font-semibold text-white">{t('cloud.settingsTitle')}</h3>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">{t('cloud.settingsBody')}</p>
          <button type="button" className="btn !rounded-full !px-4 !py-2 text-xs" onClick={() => openModal('cloud')}>
            <span className="relative">
              <Cloud className="h-3.5 w-3.5 text-sky-300" />
              {user && (
                <span
                  className={cx(
                    'absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full',
                    syncStatus === 'synced' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]' : 'bg-amber-400',
                  )}
                />
              )}
            </span>
            {user ? t('cloud.pillSignedIn') : t('cloud.pill')}
          </button>
          {user?.email && <p className="truncate text-xs text-slate-500">{user.email}</p>}
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-sky-300" />
            <h3 className="text-sm font-semibold text-white">{t('settings.keyTitle')}</h3>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            {t('settings.keyBody')}
          </p>

          <div className="relative">
            <input
              type={reveal ? 'text' : 'password'}
              className="field num pr-12"
              value={key}
              onChange={(e) => {
                setKey(e.target.value)
                setTest({ state: 'idle' })
              }}
              placeholder="AIza…"
              autoComplete="off"
              spellCheck={false}
              aria-label={t('settings.keyAria')}
            />
            <button
              type="button"
              aria-label={reveal ? t('settings.hideKey') : t('settings.showKey')}
              onClick={() => setReveal(!reveal)}
              className="btn btn-ghost absolute right-1.5 top-1/2 h-8 w-8 -translate-y-1/2 !p-0"
            >
              {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div>
            <label className="label" htmlFor="gemini-model">
              {t('settings.model')}
            </label>
            <select id="gemini-model" className="field" value={model} onChange={(e) => setModel(e.target.value)}>
              {MODEL_OPTIONS.map((m) => (
                <option key={m} value={m} className="bg-slate-900">
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn" onClick={runTest} disabled={!key.trim() || test.state === 'busy'}>
              {test.state === 'busy' && <Spinner />}
              {t('settings.testKey')}
            </button>
            {test.state === 'ok' && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                {t('settings.connected')}
              </span>
            )}
            {test.state === 'error' && <span className="text-sm text-rose-300">{test.message}</span>}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="ml-auto flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200"
            >
              {t('settings.getKey')}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <p className="flex items-start gap-2 text-xs text-slate-500">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t('settings.keyPrivacy')}
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-white">{t('settings.fdaTitle')}</h3>
          <p className="text-sm leading-relaxed text-slate-400">
            {t('settings.fdaBody')}
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-white">{t('backup.title')}</h3>
          <p className="text-sm leading-relaxed text-slate-400">{t('backup.body')}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn"
              onClick={() => {
                const blob = new Blob([exportBackup()], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const anchor = document.createElement('a')
                anchor.href = url
                anchor.download = `clarity-backup-${new Date().toISOString().slice(0, 10)}.json`
                anchor.click()
                URL.revokeObjectURL(url)
                setBackupMessage(t('backup.exported'))
              }}
            >
              <Download className="h-4 w-4" />
              {t('backup.export')}
            </button>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" />
              {t('backup.import')}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                try {
                  importBackup(await file.text())
                  setBackupMessage(t('backup.imported'))
                } catch {
                  setBackupMessage(t('backup.importFailed'))
                }
              }}
            />
          </div>
          {backupMessage && <p className="text-xs text-sky-200">{backupMessage}</p>}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-white">{t('settings.data')}</h3>
          {confirm ? (
            <div className="glass-soft space-y-3 !border-rose-300/25 p-4">
              <p className="text-sm text-rose-100">
                {t('settings.confirmClear')} {t('settings.cannotUndo')}
              </p>
              <div className="flex gap-2">
                <button type="button" className="btn !border-rose-300/40 !bg-rose-500/25" onClick={confirmAction}>
                  {t('settings.yes')}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setConfirm(false)}>
                  {t('settings.keepData')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn text-rose-200" onClick={() => setConfirm(true)}>
                <Trash2 className="h-4 w-4" />
                {t('settings.clear')}
              </button>
            </div>
          )}
        </section>

        <p className="text-xs leading-relaxed text-slate-500">
          {t('settings.disclaimer')}
        </p>
      </div>
    </Modal>
  )
}
