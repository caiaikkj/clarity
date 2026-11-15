import { LANGS, LANG_SHORT, useI18n, type Lang } from '../i18n'
import { cx } from './ui'

const NATIVE_NAME: Record<Lang, string> = { 'pt-BR': 'Português (Brasil)', 'en-US': 'English (US)' }

export const LanguageToggle = ({ className }: { className?: string }) => {
  const { lang, setLang, t } = useI18n()
  const activeIndex = LANGS.indexOf(lang)

  return (
    <div
      role="radiogroup"
      aria-label={t('lang.label')}
      className={cx(
        'relative inline-grid grid-cols-2 rounded-full border border-white/[0.14] bg-white/[0.06] p-0.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18)] backdrop-blur-xl',
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-white/[0.2] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3),0_4px_14px_-4px_rgba(56,189,248,0.55)] transition-transform duration-500 ease-spring"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />
      {LANGS.map((code) => {
        const active = code === lang
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={NATIVE_NAME[code]}
            title={NATIVE_NAME[code]}
            onClick={() => setLang(code)}
            className={cx(
              'relative z-10 min-w-[3rem] rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition-colors duration-300 active:scale-95',
              active ? 'text-white' : 'text-slate-400 hover:text-slate-100',
            )}
          >
            {LANG_SHORT[code]}
          </button>
        )
      })}
    </div>
  )
}
