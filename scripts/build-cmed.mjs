import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CURATED_PATH = resolve(ROOT, 'src/data/anvisaMeds.json')
const OUTPUT_PATH = resolve(ROOT, 'public/data/cmed.json')
const EAN_OUTPUT_PATH = resolve(ROOT, 'public/data/cmed-eans.json')
const PMC_COLUMNS = ['pmc 18 %', 'pmc 17 %', 'pmc 20 %', 'pmc 12 %', 'pmc 0 %', 'pmc sem impostos']
const EAN_COLUMNS = ['ean 1', 'ean 2', 'ean 3']
const EAN_LENGTH = 13
const MAX_PILLS = 1000
const MAX_DOSAGES = 12

const input = process.argv[2]
if (!input) {
  console.error('Usage: node scripts/build-cmed.mjs <path-to-TA_PRECO_MEDICAMENTO.csv>')
  process.exit(1)
}

const stripAccents = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const normalize = (value) => stripAccents(value).toLowerCase().replace(/\s+/g, ' ').trim()

const parseCsv = (text) => {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 1
        } else quoted = false
      } else field += char
    } else if (char === '"') quoted = true
    else if (char === ';') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      row.push(field)
      field = ''
      if (row.some((cell) => cell.trim())) rows.push(row)
      row = []
    } else field += char
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

const LOWER_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'com', 'para', 'a', 'o'])

const titleWord = (word) => {
  const lower = word.toLowerCase()
  if (LOWER_WORDS.has(lower)) return lower
  if (word.length <= 3 && word === word.toUpperCase()) return word
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

const titleProduct = (value) =>
  value
    .trim()
    .replace(/\s*\+\s*/g, ' + ')
    .split(/\s+/)
    .map((word) => (word === '+' ? word : titleWord(word)))
    .join(' ')

const sentenceCase = (value) => {
  const lower = value.trim().toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

const UNIT = /^(mg|mcg|g|ml|ui|u|meq|l|iu|mmol|kbq|mbq|mci|dl|kg|cm2|%)(\/[a-z0-9.,]+)*$/i
const NUMBER = /^[\d.,]+$/
const CONNECTOR = /^[+/]$/

const UNIT_CASE = { mg: 'mg', mcg: 'mcg', g: 'g', ml: 'mL', ui: 'UI', iu: 'IU', u: 'U', meq: 'mEq', l: 'L', mmol: 'mmol', kg: 'kg', dl: 'dL' }

const formatUnit = (token) =>
  token
    .split('/')
    .map((part) => UNIT_CASE[part.toLowerCase()] ?? part.toLowerCase())
    .join('/')

const GROUPED = /^\(([^)]+)\)\s*([A-Za-z%]+(?:\/[A-Za-z0-9.,]+)?)\s*(.*)$/

const expandGrouped = (presentation) => {
  const match = presentation.match(GROUPED)
  if (!match || !UNIT.test(match[2])) return presentation
  const amounts = match[1].split('+').map((amount) => `${amount.trim()} ${match[2]}`)
  return `${amounts.join(' + ')} ${match[3]}`
}

const parseStrength = (presentation) => {
  const expanded = expandGrouped(presentation.trim().replace(/\/\s+/g, '/'))
  const spaced = expanded.replace(/(\d)([A-Za-z%])/g, '$1 $2').replace(/\s*\+\s*/g, ' + ').replace(/\s+/g, ' ')
  const tokens = spaced.split(' ')
  const kept = []
  let sawUnit = false
  let index = 0
  for (; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (NUMBER.test(token) || CONNECTOR.test(token)) kept.push(token)
    else if (UNIT.test(token)) {
      kept.push(formatUnit(token))
      sawUnit = true
    } else break
  }
  while (kept.length && CONNECTOR.test(kept[kept.length - 1])) kept.pop()
  const strength = sawUnit ? kept.join(' ').replace(/ \/ /g, '/').replace(/(\d),0+(?=\s|\/|$)/g, '$1') : ''
  return { strength, rest: tokens.slice(index).join(' ').toUpperCase() }
}

const FORM_RULES = [
  ['Softgel', /\bCAP\b.*\b(MOLE|GEL)\b|\bCAPSULA MOLE\b/],
  ['Capsule', /\bCAPS?\b|\bCAPSULA/],
  ['Patch', /\bADES|\bPLASTRO|\bTRANSD/],
  ['Inhaler', /\bAER|\bINAL\b|\bSPRAY\b|\bJATO\b/],
  ['Gummy', /\bGOMA|\bGOMOSA/],
  ['Tablet', /\bCOM\b|\bCOMP\b|\bDRG\b|\bDRAGEA|\bCOMPR/],
  ['Liquid', /\b(SOL|XPE|SUS|EMU|GTS|ELX|LIQ|SOLUC|XAROPE)\b/],
]

const formOf = (rest) => FORM_RULES.find(([, pattern]) => pattern.test(rest))?.[0] ?? 'Other'

const ROUTE_PREFIXES = ['cloridrato de ', 'sulfato de ', 'besilato de ', 'maleato de ', 'fumarato de ', 'tartarato de ', 'succinato de ', 'mesilato de ', 'fosfato de ', 'acetato de ', 'citrato de ', 'bromidrato de ', 'nitrato de ', 'carbonato de ', 'oxalato de ', 'valerato de ', 'propionato de ', 'dipropionato de ', 'furoato de ', 'bitartarato de ', 'cetoglutarato de ', 'tosilato de ', 'pamoato de ', 'estearato de ', 'lactato de ']
const SALT_SUFFIXES = new Set(['sodico', 'sodica', 'potassico', 'potassica', 'calcico', 'calcica', 'magnesico', 'magnesica', 'monoidratado', 'monoidratada', 'diidratado', 'diidratada', 'anidro', 'anidra', 'hemi-hidratado', 'hemi-hidratada', 'trihidratado', 'trihidratada', 'dissodico', 'dissodica'])

const coreOf = (part) => {
  let value = normalize(part)
  const prefix = ROUTE_PREFIXES.find((p) => value.startsWith(p))
  if (prefix) value = value.slice(prefix.length)
  return value
    .split(' ')
    .filter((word) => !SALT_SUFFIXES.has(word))
    .join(' ')
    .trim()
}

const splitSubstances = (value) =>
  value
    .split(/\s*[;+]\s*/)
    .map((part) => part.trim())
    .filter(Boolean)

const buildEnglishLookup = () => {
  const curated = JSON.parse(readFileSync(CURATED_PATH, 'utf8'))
  const lookup = new Map()
  curated.forEach((med) => {
    const pt = splitSubstances(med.activeIngredient)
    const en = splitSubstances(med.englishGeneric)
    if (pt.length !== en.length) return
    pt.forEach((part, i) => {
      const key = coreOf(part)
      if (key && !lookup.has(key)) lookup.set(key, en[i].toLowerCase())
    })
  })
  return lookup
}

const parsePills = (presentation) => {
  const text = presentation.toUpperCase().replace(/\s+/g, ' ')
  const tail = text.match(/\bX\s*(\d+)\s*(ML|G|MG|L|DOSES?|DOS|GOTAS?)?\s*(?:\+.*)?$/)
  if (!tail || tail[2]) return 0
  const blisters = text.match(/\bCT\s*(\d+)\s*BL\b/)
  const count = Number(tail[1]) * (blisters ? Number(blisters[1]) : 1)
  return count > 0 && count <= MAX_PILLS ? count : 0
}

const parseMoney = (value) => {
  const parsed = Number.parseFloat((value ?? '').trim().replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

const normalizeEan = (value) => {
  const digits = (value ?? '').replace(/\D/g, '')
  return digits.length >= 8 && digits.length <= EAN_LENGTH ? digits.padStart(EAN_LENGTH, '0') : ''
}

const firstNumber = (strength) => Number.parseFloat((strength.match(/[\d.,]+/)?.[0] ?? '0').replace(',', '.'))

const rows = parseCsv(readFileSync(input, 'utf8').replace(/^\uFEFF/, ''))
const header = rows[0].map((cell) => normalize(cell))
const column = (prefix) => {
  const index = header.findIndex((cell) => cell.startsWith(prefix))
  if (index < 0) throw new Error(`Column not found: ${prefix}`)
  return index
}

const exactColumn = (label) => {
  const index = header.indexOf(label)
  if (index < 0) throw new Error(`Column not found: ${label}`)
  return index
}

const COL = {
  substance: column('substancia'),
  product: column('produto'),
  presentation: column('apresentacao'),
  tarja: column('tarja'),
  marketed: column('comercializacao'),
  eans: EAN_COLUMNS.map(exactColumn),
  pmc: PMC_COLUMNS.map(exactColumn),
}

const english = buildEnglishLookup()
const records = new Map()
let skipped = 0

rows.slice(1).forEach((row) => {
  const substance = row[COL.substance]?.trim()
  const product = row[COL.product]?.trim()
  const presentation = row[COL.presentation]?.trim()
  if (!substance || !product || !presentation || row.length < header.length - 3) {
    skipped += 1
    return
  }
  if (normalize(row[COL.marketed] ?? '') !== 'sim') {
    skipped += 1
    return
  }
  const name = titleProduct(product)
  const parts = splitSubstances(substance)
  const active = parts.map(sentenceCase).join(' + ')
  const key = `${normalize(name)}|${normalize(active)}`
  const { strength, rest } = parseStrength(presentation)
  const tarja = normalize(row[COL.tarja] ?? '')
  const record = records.get(key) ?? { n: name, a: active, e: parts.map((part) => english.get(coreOf(part)) ?? ''), byForm: new Map(), rx: false, otc: false, rows: [] }
  const eans = COL.eans.map((i) => normalizeEan(row[i])).filter(Boolean)
  const pmc = COL.pmc.map((i) => parseMoney(row[i])).find(Boolean) ?? 0
  if (eans.length) record.rows.push({ eans, strength, pills: parsePills(presentation), pmc })
  if (tarja.includes('vermelha') || tarja.includes('preta')) record.rx = true
  else if (tarja.includes('sem tarja')) record.otc = true
  const form = formOf(rest)
  const entry = record.byForm.get(form) ?? { count: 0, strengths: new Set() }
  entry.count += 1
  if (strength) entry.strengths.add(strength)
  record.byForm.set(form, entry)
  records.set(key, record)
})

const categoryOf = (record) => {
  if (record.rx) return 'prescription'
  return record.otc ? 'otc' : undefined
}

const built = [...records.values()]
  .map((record) => {
    const forms = [...record.byForm.entries()].sort((a, b) => b[1].count - a[1].count)
    const [form, main] = forms[0]
    const pool = main.strengths.size > 0 ? main.strengths : new Set(forms.flatMap(([, entry]) => [...entry.strengths]))
    const dosages = [...pool].sort((a, b) => firstNumber(a) - firstNumber(b)).slice(0, MAX_DOSAGES)
    const englishGeneric = record.e.every(Boolean) ? record.e.join(' + ') : ''
    const category = categoryOf(record)
    const out = { n: record.n, a: record.a, ...(englishGeneric ? { e: englishGeneric } : {}), d: dosages, f: form, ...(category ? { c: category } : {}) }
    return { out, rows: record.rows }
  })
  .sort((a, b) => a.out.n.localeCompare(b.out.n, 'pt-BR'))

const output = built.map((item) => item.out)
const eanIndex = {}
built.forEach((item, index) => {
  item.rows.forEach((row) => {
    row.eans.forEach((ean) => {
      eanIndex[ean] ??= [index, row.strength, row.pills, row.pmc]
    })
  })
})

mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
writeFileSync(OUTPUT_PATH, JSON.stringify(output))
writeFileSync(EAN_OUTPUT_PATH, JSON.stringify(eanIndex))

const withEnglish = output.filter((record) => record.e).length
console.log(`rows: ${rows.length - 1}, skipped: ${skipped}, records: ${output.length}, with English generic: ${withEnglish}, eans: ${Object.keys(eanIndex).length}`)
