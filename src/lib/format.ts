export const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const parsePrice = (raw: string) => {
  const trimmed = raw.replace(/[^\d.,]/g, '')
  if (!trimmed) return null
  const normalized = trimmed.includes(',') ? trimmed.replace(/\./g, '').replace(',', '.') : trimmed
  const value = Number(normalized)
  return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : null
}
