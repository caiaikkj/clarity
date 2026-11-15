import { useState, type FormEvent } from 'react'
import { Cloud, CloudOff, KeyRound, LogOut, Mail, RefreshCw, ShieldCheck } from 'lucide-react'
import { useI18n } from '../i18n'
import { formatDateTime } from '../lib/dates'
import { useAuth } from '../lib/auth'
import { useUi } from '../lib/store'
import { Modal, Spinner, cx } from './ui'

type AuthTab = 'password' | 'magic'
type AuthMode = 'signin' | 'signup'

export const CloudAuthModal = () => {
  const { openModal } = useUi()
  const { t, lang } = useI18n()
  const auth = useAuth()
  const [tab, setTab] = useState<AuthTab>('password')
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const close = () => openModal(null)
  const error = localError || auth.error

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setLocalError(null)
    auth.clearError()
    try {
      await action()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : t('cloud.errorGeneric'))
    } finally {
      setBusy(false)
    }
  }

  const onPassword = (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    void run(() => (mode === 'signin' ? auth.signIn(email, password) : auth.signUp(email, password)))
  }

  const onMagic = (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    void run(() => auth.sendMagicLink(email))
  }

  const synced = auth.syncStatus === 'synced'
  const syncing = auth.syncStatus === 'syncing' || busy

  return (
    <Modal
      title={auth.user ? t('cloud.accountTitle') : t('cloud.title')}
      subtitle={auth.user ? t('cloud.accountSubtitle') : t('cloud.subtitle')}
      onClose={close}
      heavyBlur
      footer={
        auth.user ? (
          <button type="button" className="btn btn-ghost" onClick={close}>
            {t('common.close')}
          </button>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={close}>
            {t('common.cancel')}
          </button>
        )
      }
    >
      <div className="space-y-5">
        {auth.user ? (
          <>
            <div className="glass-soft flex items-start gap-3 p-4">
              <span className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-sky-300">
                <Cloud className="h-5 w-5" />
                <span
                  className={cx(
                    'absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-slate-900',
                    synced ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.85)]' : syncing ? 'bg-sky-400' : 'bg-amber-400',
                  )}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{auth.user.email}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                  {synced ? t('cloud.synced') : syncing ? t('cloud.syncing') : auth.syncStatus === 'conflict' ? t('cloud.conflict') : t('cloud.idle')}
                  {auth.lastSyncedAt && synced && (
                    <span className="num text-slate-500">· {formatDateTime(auth.lastSyncedAt, lang)}</span>
                  )}
                </p>
              </div>
            </div>

            {auth.conflict && (
              <div className="glass-soft space-y-3 !border-amber-300/25 p-4">
                <p className="text-sm leading-relaxed text-amber-50">{t('cloud.conflictBody')}</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="button" className="btn btn-primary flex-1" disabled={busy} onClick={() => void run(auth.useCloud)}>
                    {t('cloud.useCloud')}
                  </button>
                  <button type="button" className="btn flex-1" disabled={busy} onClick={() => void run(auth.keepLocal)}>
                    {t('cloud.keepLocal')}
                  </button>
                </div>
              </div>
            )}

            {error && <p className="rounded-2xl border border-rose-300/25 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">{error}</p>}

            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn" disabled={busy || !!auth.conflict} onClick={() => void run(auth.syncNow)}>
                {syncing ? <Spinner /> : <RefreshCw className="h-4 w-4" />}
                {t('cloud.syncNow')}
              </button>
              <button
                type="button"
                className="btn text-rose-200"
                disabled={busy}
                onClick={() => void run(async () => { await auth.signOut(); close() })}
              >
                <LogOut className="h-4 w-4" />
                {t('cloud.signOut')}
              </button>
            </div>

            <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {t('cloud.privacy')}
            </p>
          </>
        ) : (
          <>
            <div className="flex gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
              {(
                [
                  ['password', 'cloud.tabPassword'],
                  ['magic', 'cloud.tabMagic'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setTab(id)
                    setLocalError(null)
                    auth.clearError()
                    auth.clearMagicSent()
                  }}
                  className={cx(
                    'flex-1 rounded-full px-3 py-2 text-xs font-semibold transition-colors',
                    tab === id ? 'bg-white/[0.12] text-white' : 'text-slate-400 hover:text-slate-200',
                  )}
                >
                  {t(label)}
                </button>
              ))}
            </div>

            {tab === 'password' ? (
              <form className="space-y-4" onSubmit={onPassword}>
                <div className="flex gap-1 rounded-full border border-white/10 bg-black/20 p-1">
                  {(
                    [
                      ['signin', 'cloud.signIn'],
                      ['signup', 'cloud.signUp'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMode(id)}
                      className={cx(
                        'flex-1 rounded-full px-3 py-1.5 text-xs font-semibold',
                        mode === id ? 'bg-sky-400/20 text-sky-100' : 'text-slate-400',
                      )}
                    >
                      {t(label)}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="label" htmlFor="cloud-email">
                    {t('cloud.email')}
                  </label>
                  <input
                    id="cloud-email"
                    type="email"
                    autoComplete="email"
                    className="field"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('cloud.emailPlaceholder')}
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="cloud-password">
                    {t('cloud.password')}
                  </label>
                  <input
                    id="cloud-password"
                    type="password"
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    className="field"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('cloud.passwordPlaceholder')}
                    minLength={6}
                    required
                  />
                </div>
                {error && <p className="text-xs text-rose-300">{error}</p>}
                <button type="submit" className="btn btn-primary w-full" disabled={busy || !email.trim() || password.length < 6}>
                  {busy ? <Spinner /> : mode === 'signin' ? <KeyRound className="h-4 w-4" /> : <Cloud className="h-4 w-4" />}
                  {mode === 'signin' ? t('cloud.signIn') : t('cloud.createAccount')}
                </button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={onMagic}>
                <p className="text-sm leading-relaxed text-slate-400">{t('cloud.magicHint')}</p>
                <div>
                  <label className="label" htmlFor="cloud-magic-email">
                    {t('cloud.email')}
                  </label>
                  <input
                    id="cloud-magic-email"
                    type="email"
                    autoComplete="email"
                    className="field"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      auth.clearMagicSent()
                    }}
                    placeholder={t('cloud.emailPlaceholder')}
                    required
                  />
                </div>
                {auth.magicSent && (
                  <p className="rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-3.5 py-2.5 text-xs text-emerald-100">
                    {t('cloud.magicSent')}
                  </p>
                )}
                {error && <p className="text-xs text-rose-300">{error}</p>}
                <button type="submit" className="btn btn-primary w-full" disabled={busy || !email.trim()}>
                  {busy ? <Spinner /> : <Mail className="h-4 w-4" />}
                  {t('cloud.sendMagic')}
                </button>
              </form>
            )}

            <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
              <CloudOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {t('cloud.localMode')}
            </p>
          </>
        )}
      </div>
    </Modal>
  )
}
