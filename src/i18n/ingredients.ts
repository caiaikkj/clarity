import type { Lang } from './translations'
import { ANVISA_MEDS, englishGenerics } from '../data/anvisaMeds'
import { normalizeText } from '../lib/text'

const EXTRA_INGREDIENTS_PT: Record<string, string> = {
  acetaminophen: 'Paracetamol',
  aspirin: 'Ácido acetilsalicílico',
  naproxen: 'Naproxeno',
  diclofenac: 'Diclofenaco',
  diphenhydramine: 'Difenidramina',
  loratadine: 'Loratadina',
  cetirizine: 'Cetirizina',
  fexofenadine: 'Fexofenadina',
  famotidine: 'Famotidina',
  omeprazole: 'Omeprazol',
  metformin: 'Metformina',
  levothyroxine: 'Levotiroxina',
  losartan: 'Losartana',
  amoxicillin: 'Amoxicilina',
  azithromycin: 'Azitromicina',
  atorvastatin: 'Atorvastatina',
  simvastatin: 'Sinvastatina',
  sertraline: 'Sertralina',
  fluoxetine: 'Fluoxetina',
  escitalopram: 'Escitalopram',
  clonazepam: 'Clonazepam',
  caffeine: 'Cafeína',
  dextromethorphan: 'Dextrometorfano',
  guaifenesin: 'Guaifenesina',
  pseudoephedrine: 'Pseudoefedrina',
  phenylephrine: 'Fenilefrina',
  loperamide: 'Loperamida',
  simethicone: 'Simeticona',
  melatonin: 'Melatonina',
  'folic acid': 'Ácido fólico',
  'ascorbic acid': 'Ácido ascórbico (vitamina C)',
  cholecalciferol: 'Colecalciferol (vitamina D3)',
  'calcium carbonate': 'Carbonato de cálcio',
  'magnesium oxide': 'Óxido de magnésio',
  'magnesium citrate': 'Citrato de magnésio',
  'magnesium glycinate': 'Glicinato de magnésio',
  magnesium: 'Magnésio',
  calcium: 'Cálcio',
  potassium: 'Potássio',
  zinc: 'Zinco',
  iron: 'Ferro',
  selenium: 'Selênio',
  copper: 'Cobre',
  iodine: 'Iodo',
  chromium: 'Cromo',
  'vitamin a': 'Vitamina A',
  'vitamin b6': 'Vitamina B6 (piridoxina)',
  'vitamin b12': 'Vitamina B12 (cianocobalamina)',
  'vitamin c': 'Vitamina C (ácido ascórbico)',
  'vitamin d': 'Vitamina D',
  'vitamin d3': 'Vitamina D3 (colecalciferol)',
  'vitamin e': 'Vitamina E',
  'vitamin k2': 'Vitamina K2',
  'fish oil': 'Óleo de peixe',
  creatine: 'Creatina',
  'coenzyme q10': 'Coenzima Q10',
  coq10: 'Coenzima Q10',
  'ferrous sulfate': 'Sulfato ferroso',
  omega: 'Ômega-3',
  'omega-3': 'Ômega-3',
}

const SALT_WORDS = new Set([
  'hydrochloride',
  'hcl',
  'sodium',
  'potassium',
  'sulfate',
  'sulphate',
  'maleate',
  'besylate',
  'tartrate',
  'succinate',
  'mesylate',
  'phosphate',
  'acetate',
  'dihydrate',
  'monohydrate',
  'anhydrous',
])

const splitMulti = (value: string) =>
  value
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)

const clean = (value: string) =>
  normalizeText(value)
    .replace(/[^a-z0-9 -]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

let dictionary: Map<string, string> | null = null

const getDictionary = () => {
  if (dictionary) return dictionary
  const map = new Map<string, string>()
  ANVISA_MEDS.forEach((med) => {
    const english = englishGenerics(med)
    const portuguese = splitMulti(med.activeIngredient)
    if (english.length === portuguese.length) {
      english.forEach((name, i) => {
        const key = clean(name)
        if (!map.has(key)) map.set(key, portuguese[i])
      })
    } else if (english.length === 1) {
      const key = clean(english[0])
      if (!map.has(key)) map.set(key, med.activeIngredient)
    }
  })
  Object.entries(EXTRA_INGREDIENTS_PT).forEach(([name, pt]) => {
    if (!map.has(name)) map.set(name, pt)
  })
  dictionary = map
  return map
}

const withoutSalts = (value: string) =>
  value
    .split(' ')
    .filter((word) => !SALT_WORDS.has(word))
    .join(' ')

export const localizeIngredient = (name: string, lang: Lang) => {
  if (lang !== 'pt-BR') return name
  const map = getDictionary()
  const key = clean(name)
  return map.get(key) ?? map.get(withoutSalts(key)) ?? name
}

export const localizeIngredients = (names: string[], lang: Lang) => [...new Set(names.map((name) => localizeIngredient(name, lang)))]
