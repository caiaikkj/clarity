export const stripAccents = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export const normalizeText = (s: string) => stripAccents(s).toLowerCase()

export const normalizeKey = (s: string) =>
  normalizeText(s)
    .replace(/\d+\s*(mg|mcg|g|ml|ui|iu)\b/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
