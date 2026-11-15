import type { Lang } from './translations'
import { normalizeText } from '../lib/text'

const PURPOSES_PT: Record<string, string> = {
  'pain reliever': 'Analgésico',
  'fever reducer': 'Antitérmico',
  'pain reliever fever reducer': 'Analgésico / antitérmico',
  'pain relief': 'Alívio da dor',
  'fever': 'Febre',
  'antacid': 'Antiácido',
  'acid reducer': 'Redutor de acidez',
  'antihistamine': 'Anti-histamínico',
  'cough suppressant': 'Antitussígeno',
  'expectorant': 'Expectorante',
  'nasal decongestant': 'Descongestionante nasal',
  'decongestant': 'Descongestionante',
  'antidiarrheal': 'Antidiarreico',
  'anti diarrheal': 'Antidiarreico',
  'laxative': 'Laxante',
  'stool softener': 'Amolecedor de fezes',
  'antiflatulent': 'Antiflatulento',
  'antiemetic': 'Antiemético',
  'anti itch': 'Antipruriginoso',
  'sleep aid': 'Auxiliar do sono',
  'topical analgesic': 'Analgésico tópico',
  'first aid antiseptic': 'Antisséptico de primeiros socorros',
  'antiseptic': 'Antisséptico',
  'sunscreen': 'Protetor solar',
  'vitamin supplement': 'Suplemento vitamínico',
  'dietary supplement': 'Suplemento alimentar',
}

const PART_SEPARATOR = /\s*(?:\/|;|,|\band\b|&)\s*/

const normalizePart = (part: string) =>
  normalizeText(part)
    .replace(/[^a-z ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export const localizePurpose = (text: string | undefined, lang: Lang) => {
  if (!text || lang !== 'pt-BR') return text
  const whole = PURPOSES_PT[normalizePart(text)]
  if (whole) return whole
  const parts = text
    .replace(/^\s*(purpose|uses?)\s*:?\s*/i, '')
    .split(PART_SEPARATOR)
    .map((part) => part.trim())
    .filter(Boolean)
  const translated = parts.map((part) => PURPOSES_PT[normalizePart(part)])
  return parts.length > 0 && translated.every(Boolean) ? translated.join(' / ') : text
}
