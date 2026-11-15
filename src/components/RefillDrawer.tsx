import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Check, Copy, ExternalLink, FlaskConical, MapPin, PackagePlus, ShoppingBag, Store, Tag } from 'lucide-react'
import { useI18n } from '../i18n'
import { brl, parsePrice } from '../lib/format'
import { useData } from '../lib/store'
import { isLowStock } from '../lib/schedule'
import { Chip, Drawer, cx } from './ui'

type SearchBy = 'name' | 'active'

const LinkButton = ({ href, icon, label, hint }: { href: string; icon: ReactNode; label: string; hint: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="glass-soft glass-interactive group flex items-center gap-3 px-4 py-3"
  >
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] text-sky-300">{icon}</span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-semibold text-white">{label}</span>
      <span className="block truncate text-xs text-slate-400">{hint}</span>
    </span>
    <ExternalLink className="h-4 w-4 shrink-0 text-slate-500 transition-colors group-hover:text-sky-300" />
  </a>
)

export const RefillDrawer = ({ medId, onClose }: { medId: string; onClose: () => void }) => {
  const { data, updateMed, refill } = useData()
  const { t, lang } = useI18n()
  const med = data.meds.find((m) => m.id === medId)

  const [active, setActive] = useState(med?.activeIngredient ?? '')
  const [price, setPrice] = useState(med?.lastPaidPrice !== undefined ? med.lastPaidPrice.toFixed(2).replace('.', ',') : '')
  const [pharmacy, setPharmacy] = useState(med?.lastPharmacy ?? '')
  const [quantity, setQuantity] = useState(30)
  const [searchBy, setSearchBy] = useState<SearchBy>(med?.activeIngredient ? 'active' : 'name')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!med) onClose()
  }, [med, onClose])

  if (!med) return null

  const low = isLowStock(med)
  const priceValue = parsePrice(price)
  const priceInvalid = price.trim() !== '' && priceValue === null
  const base = searchBy === 'active' && med.activeIngredient ? med.activeIngredient : med.name
  const query = `${base} ${med.strength}`.trim()
  const encoded = encodeURIComponent(query)

  const saveActive = () => {
    const next = active.trim()
    if (next !== (med.activeIngredient ?? '')) updateMed(med.id, { activeIngredient: next || undefined })
  }

  const copyActive = async () => {
    const text = `${med.activeIngredient ?? med.name} ${med.strength}`.trim()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  const savePrice = (e: FormEvent) => {
    e.preventDefault()
    if (priceInvalid) return
    updateMed(med.id, {
      lastPaidPrice: priceValue ?? undefined,
      lastPharmacy: pharmacy.trim() || undefined,
      lastPaidAt: priceValue !== null || pharmacy.trim() ? new Date().toISOString() : undefined,
    })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  const addStock = (e: FormEvent) => {
    e.preventDefault()
    if (quantity > 0) refill(med.id, Math.round(quantity))
  }

  return (
    <Drawer title={t('drawer.title')} subtitle={`${med.name} ${med.strength}`} onClose={onClose}>
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="label !mb-0">{t('drawer.stock')}</p>
          <Chip tone={low ? 'amber' : 'cyan'} className="num">
            {t('drawer.pillsLeft', { n: med.stock })}
            {low ? t('drawer.refillSoon') : ''}
          </Chip>
        </div>
        <form onSubmit={addStock} className="glass-soft flex items-center gap-2 p-2 pl-4">
          <label htmlFor="drawer-qty" className="shrink-0 text-xs text-slate-400">
            {t('drawer.bought')}
          </label>
          <input
            id="drawer-qty"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="num min-w-0 flex-1 bg-transparent text-sm text-white outline-none"
          />
          <button type="submit" className={cx('btn !px-4 !py-1.5 text-xs', low && 'btn-primary')}>
            <PackagePlus className="h-3.5 w-3.5" />
            {t('drawer.add')}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <p className="label !mb-0">{t('drawer.activeIngredient')}</p>
        <div className="glass-soft space-y-3 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] text-indigo-300">
              <FlaskConical className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold leading-snug text-white">{med.activeIngredient || t('common.unknown')}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {t('drawer.askGeneric')} <span className="num text-slate-200">{`${med.activeIngredient ?? med.name} ${med.strength}`.trim()}</span>
              </p>
            </div>
            <button type="button" onClick={copyActive} aria-label={t('drawer.copyAria')} className="btn btn-ghost h-9 w-9 shrink-0 !p-0">
              {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <input
            className="field"
            value={active}
            onChange={(e) => setActive(e.target.value)}
            onBlur={saveActive}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              e.currentTarget.blur()
            }}
            placeholder={t('drawer.activePlaceholder')}
            aria-label={t('drawer.activeIngredient')}
          />
        </div>
      </section>

      <section className="space-y-3">
        <p className="label !mb-0">{t('drawer.priceLog')}</p>
        <form onSubmit={savePrice} className="glass-soft space-y-3 p-4">
          {med.lastPaidPrice !== undefined && (
            <p className="num flex items-center gap-2 text-sm text-slate-300">
              <Tag className="h-4 w-4 text-sky-300" />
              {t('drawer.last')} <span className="font-semibold text-white">{brl.format(med.lastPaidPrice)}</span>
              {med.lastPharmacy && <span className="truncate text-slate-400">· {med.lastPharmacy}</span>}
              {med.lastPaidAt && (
                <span className="ml-auto shrink-0 text-xs text-slate-500">
                  {new Date(med.lastPaidAt).toLocaleDateString(lang, { day: 'numeric', month: 'short' })}
                </span>
              )}
            </p>
          )}
          {med.pmc !== undefined && (
            <p className="num flex items-center gap-2 text-sm text-slate-300">
              <Tag className="h-4 w-4 text-emerald-300" />
              {t('card.pmc')} <span className="font-semibold text-white">{brl.format(med.pmc)}</span>
            </p>
          )}
          <div className="grid grid-cols-[120px_1fr] gap-3">
            <div>
              <label className="label" htmlFor="drawer-price">
                {t('drawer.price')}
              </label>
              <input
                id="drawer-price"
                inputMode="decimal"
                className={cx('field num', priceInvalid && '!border-rose-300/60')}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={lang === 'pt-BR' ? '0,00' : '0.00'}
              />
            </div>
            <div>
              <label className="label" htmlFor="drawer-pharmacy">
                {t('drawer.pharmacy')}
              </label>
              <input
                id="drawer-pharmacy"
                className="field"
                value={pharmacy}
                onChange={(e) => setPharmacy(e.target.value)}
                placeholder={t('drawer.pharmacyPlaceholder')}
              />
            </div>
          </div>
          {priceInvalid && <p className="text-xs text-rose-300">{t('drawer.invalidPrice')}</p>}
          <button type="submit" className="btn btn-primary w-full" disabled={priceInvalid || (!price.trim() && !pharmacy.trim())}>
            {saved ? <Check className="h-4 w-4" /> : <Tag className="h-4 w-4" />}
            {saved ? t('drawer.saved') : t('drawer.savePrice')}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="label !mb-0">{t('drawer.compare')}</p>
          <div className="flex gap-1 rounded-full border border-white/10 bg-black/20 p-1" role="tablist" aria-label={t('drawer.searchByAria')}>
            {(['name', 'active'] as SearchBy[]).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={searchBy === id}
                disabled={id === 'active' && !med.activeIngredient}
                onClick={() => setSearchBy(id)}
                className={cx(
                  'rounded-full px-3 py-1 text-xs font-medium transition-all duration-500 ease-spring disabled:opacity-40',
                  searchBy === id ? 'bg-white/[0.14] text-white' : 'text-slate-400',
                )}
              >
                {id === 'name' ? t('drawer.byName') : t('drawer.byActive')}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2.5">
          <LinkButton
            href={`https://consultaremedios.com.br/busca?termo=${encoded}`}
            icon={<Store className="h-5 w-5" />}
            label="Consulta Remédios"
            hint={query}
          />
          <LinkButton
            href={`https://www.google.com/search?tbm=shop&q=${encoded}`}
            icon={<ShoppingBag className="h-5 w-5" />}
            label="Google Shopping"
            hint={query}
          />
          <LinkButton
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t('drawer.mapsQuery'))}`}
            icon={<MapPin className="h-5 w-5" />}
            label="Google Maps"
            hint={t('drawer.mapsQuery')}
          />
        </div>
      </section>
    </Drawer>
  )
}
