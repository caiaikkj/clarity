import { useId, useMemo, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { Pill } from 'lucide-react'
import { searchAnvisaMeds, type AnvisaMed } from '../data/anvisaMeds'
import { useI18n } from '../i18n'
import { cx } from './ui'

interface Props {
  value: string
  onChange: (value: string) => void
  onSelect: (med: AnvisaMed) => void
  onSubmit: () => void
  placeholder: string
  ariaLabel: string
}

export const MedicationAutocomplete = ({ value, onChange, onSelect, onSubmit, placeholder, ariaLabel }: Props) => {
  const { t } = useI18n()
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const results = useMemo(() => searchAnvisaMeds(value), [value])
  const visible = open && results.length > 0
  const optionId = (index: number) => `${listId}-${index}`

  const choose = (med: AnvisaMed) => {
    setOpen(false)
    onSelect(med)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
    setActiveIndex(0)
    setOpen(true)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!visible) setOpen(true)
      else setActiveIndex((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (visible) setActiveIndex((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (visible) choose(results[activeIndex])
      else onSubmit()
    } else if (e.key === 'Escape' && visible) {
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <input
        className="field"
        value={value}
        autoFocus
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={visible}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={visible ? optionId(activeIndex) : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
      />
      {visible && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t('add.suggestions')}
          className="absolute inset-x-0 top-full z-30 mt-2 max-h-72 space-y-0.5 overflow-y-auto rounded-2xl border border-white/[0.16] bg-slate-900/85 p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.12)] backdrop-blur-2xl animate-pop"
        >
          {results.map((med, index) => (
            <li
              key={med.commercialName}
              id={optionId(index)}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(med)}
              className={cx(
                'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition-colors duration-200',
                index === activeIndex ? 'bg-white/[0.12]' : 'hover:bg-white/[0.06]',
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.07] text-sky-300">
                <Pill className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">{med.commercialName}</span>
                <span className="block truncate text-xs text-slate-400">
                  {med.activeIngredient}
                  {med.englishGeneric ? ` · ${med.englishGeneric}` : ''}
                </span>
              </span>
              <span className="num shrink-0 text-[11px] text-slate-500">{t('add.optionDosages', { n: med.commonDosages.length })}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
