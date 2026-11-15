import type { Lang } from '../i18n/translations'
import { translate } from '../i18n/translations'

const pad = (n: number) => String(n).padStart(2, '0')

export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const parseDateKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (d: Date, days: number) => {
  const next = new Date(d)
  next.setDate(next.getDate() + days)
  return next
}

export const minutesOf = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export const atTime = (date: Date, time: string) => {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  next.setMinutes(minutesOf(time))
  return next
}

export const toTimeString = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

export const formatClock = (time: string, lang: Lang) => {
  const [h, m] = time.split(':').map(Number)
  if (lang === 'pt-BR') return `${pad(h)}:${pad(m)}`
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${pad(m)} ${suffix}`
}

export const formatDateTime = (iso: string, lang: Lang) => {
  const d = new Date(iso)
  const today = new Date()
  const diff = Math.round(
    (new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86_400_000,
  )
  const clock = formatClock(toTimeString(d), lang)
  if (diff === 0) return `${translate(lang, 'date.today')}, ${clock}`
  if (diff === 1) return `${translate(lang, 'date.yesterday')}, ${clock}`
  if (diff < 7) return `${d.toLocaleDateString(lang, { weekday: 'long' })}, ${clock}`
  return `${d.toLocaleDateString(lang, { month: 'short', day: 'numeric' })}, ${clock}`
}

export const formatLongDate = (d: Date, lang: Lang) =>
  d.toLocaleDateString(lang, { weekday: 'long', month: 'long', day: 'numeric' })
export const formatCountdown = (minutes: number) => {
  const total = Math.round(Math.abs(minutes))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m}m`
  return `${h}h ${pad(m)}m`
}

export const formatShiftDelta = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `+${m}m`
  return m === 0 ? `+${h}h` : `+${h}h ${m}m`
}

export const formatHours = (hours: number, lang: Lang) => `${lang === 'pt-BR' ? String(hours).replace('.', ',') : hours}h`

export const greeting = (d: Date, lang: Lang) => {
  const h = d.getHours()
  if (h < 5) return translate(lang, 'greeting.late')
  if (h < 12) return translate(lang, 'greeting.morning')
  if (h < 18) return translate(lang, 'greeting.afternoon')
  return translate(lang, 'greeting.evening')
}