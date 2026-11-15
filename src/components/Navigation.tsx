import { BrainCircuit, CalendarCheck2, ClipboardList, HelpCircle, Pill, Settings, Sparkles, WifiOff, type LucideIcon } from 'lucide-react'
import type { ViewId } from '../types'
import { useI18n, type TKey } from '../i18n'
import { useOnlineStatus } from '../lib/pwa'
import { useData, useUi } from '../lib/store'
import { LanguageToggle } from './LanguageToggle'
import { cx } from './ui'

const ITEMS: { id: ViewId; label: TKey; shortLabel: TKey; icon: LucideIcon }[] = [
  { id: 'today', label: 'nav.today', shortLabel: 'nav.today', icon: CalendarCheck2 },
  { id: 'cabinet', label: 'nav.cabinet', shortLabel: 'nav.cabinet', icon: Pill },
  { id: 'brain', label: 'nav.brain', shortLabel: 'nav.brainShort', icon: BrainCircuit },
  { id: 'briefing', label: 'nav.briefing', shortLabel: 'nav.briefing', icon: ClipboardList },
]

export const Sidebar = () => {
  const { view, setView, openModal } = useUi()
  const { settings } = useData()
  const { t } = useI18n()
  const connected = settings.geminiKey.length > 0

  return (
    <aside className="no-print glass fixed bottom-4 left-4 top-4 z-30 hidden w-64 flex-col p-4 lg:flex">
      <div className="flex items-center gap-3 px-2 pb-6 pt-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 shadow-glow">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-lg font-semibold leading-none tracking-tight text-white">Clarity</p>
          <p className="mt-1 text-xs text-slate-400">{t('app.tagline')}</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1.5" aria-label={t('nav.primary')}>
        {ITEMS.map(({ id, label, icon: Icon }) => {
          const active = view === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'group flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-all duration-500 ease-spring active:scale-95',
                active
                  ? 'border-white/[0.18] bg-white/[0.12] text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_8px_24px_-12px_rgba(56,189,248,0.5)]'
                  : 'border-transparent text-slate-400 hover:translate-x-1 hover:bg-white/[0.06] hover:text-slate-100',
              )}
            >
              <Icon className={cx('h-[18px] w-[18px] transition-colors', active ? 'text-sky-300' : 'group-hover:text-sky-300')} />
              {t(label)}
            </button>
          )
        })}
      </nav>

      <div className="mb-3 flex justify-center">
        <LanguageToggle />
      </div>

      <button
        type="button"
        onClick={() => openModal('guide')}
        className="group mb-1 flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-left text-sm font-medium text-slate-400 transition-all duration-500 ease-spring hover:bg-white/[0.06] hover:text-slate-100 active:scale-95"
      >
        <HelpCircle className="h-[18px] w-[18px] transition-colors group-hover:text-sky-300" />
        {t('nav.guide')}
      </button>

      <button
        type="button"
        onClick={() => openModal('settings')}
        className="group flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-left text-sm font-medium text-slate-400 transition-all duration-500 ease-spring hover:bg-white/[0.06] hover:text-slate-100 active:scale-95"
      >
        <Settings className="h-[18px] w-[18px] transition-transform duration-700 group-hover:rotate-90" />
        <span className="flex-1">{t('nav.settings')}</span>
        <span
          className={cx('h-2 w-2 rounded-full', connected ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'bg-slate-600')}
          title={connected ? t('nav.geminiOn') : t('nav.geminiOff')}
        />
      </button>
    </aside>
  )
}

export const TopBar = () => {
  const { openModal } = useUi()
  const { t } = useI18n()
  const online = useOnlineStatus()
  return (
    <div className="no-print fixed inset-x-3 top-3 z-30 flex items-center justify-between gap-2 lg:inset-x-auto lg:right-6 lg:top-4">
      {!online ? (
        <span className="flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-400/15 px-3 py-1.5 text-xs font-semibold text-amber-100 backdrop-blur-xl">
          <WifiOff className="h-3.5 w-3.5" />
          {t('pwa.offline')}
        </span>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => openModal('guide')}
          aria-label={t('nav.guide')}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.08] text-slate-200 backdrop-blur-xl transition-all active:scale-90"
        >
          <HelpCircle className="h-[18px] w-[18px]" />
        </button>
        <LanguageToggle className="shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]" />
      </div>
    </div>
  )
}

export const Dock = () => {
  const { view, setView, openModal } = useUi()
  const { t } = useI18n()
  return (
    <nav
      aria-label={t('nav.primary')}
      className="no-print glass safe-bottom fixed inset-x-3 bottom-3 z-30 flex items-center justify-around !rounded-[26px] px-2 py-2 lg:hidden"
    >
      {ITEMS.map(({ id, shortLabel, icon: Icon }) => {
        const active = view === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-[10px] font-medium transition-all duration-500 ease-spring active:scale-90',
              active ? 'bg-white/[0.12] text-sky-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]' : 'text-slate-400',
            )}
          >
            <Icon className={cx('h-5 w-5 transition-transform duration-500 ease-spring', active && '-translate-y-0.5 scale-110')} />
            {t(shortLabel)}
          </button>
        )
      })}
      <button
        type="button"
        onClick={() => openModal('settings')}
        className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-[10px] font-medium text-slate-400 transition-all duration-500 ease-spring active:scale-90"
      >
        <Settings className="h-5 w-5" />
        {t('nav.settings')}
      </button>
    </nav>
  )
}
