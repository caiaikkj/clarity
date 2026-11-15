import type { Medication, Severity } from '../types'
import type { Lang } from '../i18n/translations'
import { INTERACTION_TEXT_PT } from '../i18n/ruleText'
import { normalizeText } from './text'

interface DrugEntry {
  names: string[]
  classes: string[]
}

const DRUGS: DrugEntry[] = [
  { names: ['ibuprofen', 'ibuprofeno', 'advil', 'motrin', 'alivium'], classes: ['nsaid'] },
  { names: ['dipyrone', 'dipirona', 'metamizole', 'metamizol', 'novalgina', 'anador'], classes: ['nsaid'] },
  { names: ['alcohol', 'alcool', 'álcool', 'cerveja', 'beer', 'wine', 'vinho', 'whisky', 'vodka'], classes: ['alcohol'] },
  { names: ['coffee', 'cafe', 'café', 'espresso', 'cha verde', 'chá verde', 'green tea', 'mate'], classes: ['caffeine'] },
  { names: ['naproxen', 'naproxeno', 'aleve'], classes: ['nsaid'] },
  { names: ['diclofenac', 'diclofenaco', 'voltaren', 'cataflam'], classes: ['nsaid'] },
  { names: ['aspirin', 'aas', 'acetylsalicylic', 'acido acetilsalicilico', 'ácido acetilsalicílico'], classes: ['nsaid', 'blood_thinner'] },
  { names: ['acetaminophen', 'paracetamol', 'tylenol'], classes: ['acetaminophen'] },
  { names: ['sertraline', 'sertralina', 'zoloft'], classes: ['ssri', 'serotonergic'] },
  { names: ['fluoxetine', 'fluoxetina', 'prozac'], classes: ['ssri', 'serotonergic'] },
  { names: ['escitalopram', 'lexapro'], classes: ['ssri', 'serotonergic'] },
  { names: ['citalopram', 'celexa'], classes: ['ssri', 'serotonergic'] },
  { names: ['paroxetine', 'paxil'], classes: ['ssri', 'serotonergic'] },
  { names: ['venlafaxine', 'effexor', 'duloxetine', 'cymbalta'], classes: ['snri', 'serotonergic'] },
  { names: ['warfarin', 'varfarina', 'marevan', 'coumadin', 'apixaban', 'eliquis', 'rivaroxaban', 'xarelto', 'clopidogrel', 'plavix'], classes: ['blood_thinner'] },
  { names: ['lisinopril', 'enalapril', 'ramipril', 'benazepril'], classes: ['raas'] },
  { names: ['losartan', 'losartana', 'valsartan', 'valsartana', 'olmesartan'], classes: ['raas'] },
  { names: ['prednisone', 'prednisona', 'prednisolone', 'dexamethasone', 'dexametasona'], classes: ['corticosteroid'] },
  { names: ['atorvastatin', 'atorvastatina', 'simvastatin', 'sinvastatina', 'rosuvastatin', 'rosuvastatina', 'lipitor'], classes: ['statin'] },
  { names: ['levothyroxine', 'levotiroxina', 'synthroid', 'puran t4', 'euthyrox'], classes: ['thyroid'] },
  { names: ['hydrochlorothiazide', 'hidroclorotiazida', 'chlorthalidone', 'clortalidona'], classes: ['thiazide'] },
  { names: ['magnesium', 'magnesio', 'magnésio'], classes: ['magnesium'] },
  { names: ['calcium', 'calcio', 'cálcio'], classes: ['calcium'] },
  { names: ['iron', 'ferrous', 'ferro', 'sulfato ferroso'], classes: ['iron'] },
  { names: ['vitamin d', 'vitamin d3', 'vitamina d', 'vitamina d3', 'cholecalciferol', 'colecalciferol', 'ergocalciferol'], classes: ['vitamin_d'] },
  { names: ['vitamin c', 'vitamina c', 'ascorbic acid', 'ácido ascórbico', 'acido ascorbico'], classes: ['vitamin_c'] },
  { names: ['vitamin k', 'vitamina k', 'phytonadione'], classes: ['vitamin_k'] },
  { names: ['omega-3', 'omega 3', 'ômega 3', 'ômega-3', 'fish oil', 'óleo de peixe', 'epa', 'dha'], classes: ['omega3'] },
  { names: ['melatonin', 'melatonina'], classes: ['melatonin'] },
  { names: ["st. john's wort", 'st johns wort', 'hypericum'], classes: ['st_johns_wort', 'serotonergic'] },
  { names: ['5-htp', 'tryptophan'], classes: ['serotonergic'] },
  { names: ['ginkgo', 'ginkgo biloba'], classes: ['ginkgo', 'blood_thinner'] },
  { names: ['ciprofloxacin', 'ciprofloxacino', 'levofloxacin', 'levofloxacino', 'doxycycline', 'doxiciclina', 'tetracycline', 'tetraciclina', 'minocycline'], classes: ['chelated_antibiotic'] },
  { names: ['alendronate', 'alendronato', 'fosamax', 'risedronate', 'risedronato'], classes: ['bisphosphonate'] },
  { names: ['cetirizine', 'cetirizina', 'diphenhydramine', 'difenidramina', 'benadryl', 'loratadine', 'loratadina', 'zyrtec'], classes: ['antihistamine'] },
  { names: ['caffeine', 'cafeina', 'cafeína'], classes: ['caffeine'] },
  { names: ['zinc', 'zinco'], classes: ['zinc'] },
  { names: ['torsilax'], classes: ['nsaid', 'caffeine', 'acetaminophen'] },
  { names: ['dorflex', 'neosaldina'], classes: ['caffeine'] },
]

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const matchesName = (text: string, name: string) =>
  new RegExp(`(^|[^a-z0-9])${escapeRegex(normalizeText(name))}([^a-z0-9]|$)`, 'i').test(normalizeText(text))

type Identifiable = Pick<Medication, 'name' | 'ingredients'> & { activeIngredient?: string }

const medText = (m: Identifiable) =>
  [m.name, m.activeIngredient ?? '', ...m.ingredients].join(' | ').toLowerCase()

export const classesOfText = (text: string) => {
  const lower = text.toLowerCase()
  const set = new Set<string>()
  for (const drug of DRUGS) {
    if (drug.names.some((n) => matchesName(lower, n))) drug.classes.forEach((c) => set.add(c))
  }
  return [...set]
}

export const classesOf = (m: Identifiable) => classesOfText(medText(m))

export const findKnownDrug = (text: string) => {
  const lower = text.toLowerCase()
  const hit = DRUGS.flatMap((d) => d.names).find((n) => n.length > 3 && matchesName(lower, n))
  return hit
}

const STOP_WORDS = new Set([
  'vitamin',
  'glycinate',
  'citrate',
  'oxide',
  'acid',
  'extract',
  'complex',
  'tablet',
  'capsule',
  'daily',
  'supplement',
  'sodium',
  'hydrochloride',
  'plus',
  'extra',
  'strength',
  'cloridrato',
  'sodica',
  'sódica',
  'acido',
  'ácido',
  'glicinato',
  'vitamina',
])

export const aliasesOf = (m: Identifiable) => {
  const aliases = new Set<string>()
  const name = m.name.toLowerCase().trim()
  aliases.add(name)
  const words = name.split(/[\s/,-]+/).filter((w) => w.length >= 4 && !STOP_WORDS.has(w) && !/^\d/.test(w))
  words.forEach((w) => aliases.add(w))
  if (/vitamin d/.test(name) || /\bd3\b/.test(name)) {
    aliases.add('vitamin d')
    aliases.add('vit d')
    aliases.add('d3')
  }
  if (m.activeIngredient) {
    const first = m.activeIngredient
      .toLowerCase()
      .split(/[\s/,()+-]+/)
      .find((w) => w.length >= 4 && !STOP_WORDS.has(w))
    if (first) aliases.add(first)
  }
  m.ingredients.forEach((i) => {
    const first = i.toLowerCase().split(/[\s,(]+/)[0]
    if (first && first.length >= 4 && !STOP_WORDS.has(first)) aliases.add(first)
  })
  const text = medText(m)
  DRUGS.forEach((d) => {
    if (d.names.some((n) => matchesName(text, n))) d.names.forEach((n) => aliases.add(n))
  })
  return [...aliases].filter(Boolean)
}

export const mentions = (text: string, aliases: string[]) => {
  const lower = text.toLowerCase()
  return aliases.some((a) => matchesName(lower, a))
}

interface BaseTagDef {
  key: string
  label: string
  patterns: RegExp[]
}

export interface TagDef extends BaseTagDef {
  labelPt: string
}

interface PtTag {
  label: string
  patterns: RegExp[]
}

const SYMPTOM_DEFS: BaseTagDef[] = [
  { key: 'headache', label: 'Headache', patterns: [/head ?ache/i, /migraine/i, /head (hurts|pounding)/i] },
  { key: 'nausea', label: 'Nausea', patterns: [/nause(a|ous)/i, /queasy/i, /sick to my stomach/i, /felt sick/i] },
  { key: 'stomach_pain', label: 'Stomach pain', patterns: [/stomach (pain|ache|cramp|upset|hurt)/i, /upset stomach/i, /abdominal/i, /heartburn/i, /indigestion/i, /reflux/i] },
  { key: 'dizziness', label: 'Dizziness', patterns: [/dizz(y|iness)/i, /light-?headed/i, /vertigo/i] },
  { key: 'fatigue', label: 'Fatigue', patterns: [/fatigue/i, /exhaust(ed|ion)/i, /(very |so |really )?tired/i, /drowsy/i, /sluggish/i, /low energy/i] },
  { key: 'insomnia', label: 'Insomnia', patterns: [/insomnia/i, /couldn'?t sleep/i, /can'?t sleep/i, /trouble sleeping/i, /woke up (a lot|often|at)/i] },
  { key: 'anxiety', label: 'Anxiety', patterns: [/anxi(ety|ous)/i, /jitter(y|s)/i, /panic/i, /on edge/i, /restless/i] },
  { key: 'muscle_pain', label: 'Muscle pain', patterns: [/muscle (pain|ache|cramp|soreness)/i, /cramps?/i, /back pain/i, /joint pain/i, /sore\b/i] },
  { key: 'rash', label: 'Rash', patterns: [/rash/i, /hives/i, /itch(y|ing)/i] },
  { key: 'dry_mouth', label: 'Dry mouth', patterns: [/dry mouth/i] },
  { key: 'diarrhea', label: 'Diarrhea', patterns: [/diarrh?ea/i, /loose stool/i] },
  { key: 'low_mood', label: 'Low mood', patterns: [/low mood/i, /feeling down/i, /depressed/i, /sad\b/i, /irritab(le|ility)/i] },
]

const HABIT_DEFS: BaseTagDef[] = [
  { key: 'caffeine', label: 'Caffeine', patterns: [/coffee/i, /caffeine/i, /espresso/i, /energy drink/i, /\bcola\b/i, /\btea\b/i, /latte/i] },
  { key: 'alcohol', label: 'Alcohol', patterns: [/alcohol/i, /\bwine\b/i, /\bbeer\b/i, /cocktail/i, /whiskey/i, /\bdrinks?\b.*\b(night|dinner)\b/i] },
  { key: 'exercise', label: 'Exercise', patterns: [/exercis/i, /workout/i, /\bgym\b/i, /\brun(ning)?\b/i, /\bjog/i, /\bwalk(ed)?\b/i, /yoga/i, /cycling/i] },
  { key: 'good_sleep', label: 'Good sleep', patterns: [/slept (great|well|good|deeply|soundly)/i, /great sleep/i, /good sleep/i, /deep sleep/i, /well[- ]rested/i] },
  { key: 'poor_sleep', label: 'Poor sleep', patterns: [/slept (badly|poorly|terribly)/i, /poor sleep/i, /bad sleep/i, /little sleep/i, /barely slept/i] },
  { key: 'skipped_meal', label: 'Skipped meal', patterns: [/skipped (breakfast|lunch|dinner|a meal|meals)/i, /empty stomach/i, /without (eating|food)/i, /didn'?t eat/i] },
  { key: 'stress', label: 'Stress', patterns: [/stress(ed|ful)?/i, /overwhelm/i, /deadline/i] },
  { key: 'hydration', label: 'Hydration', patterns: [/hydrat/i, /drank (a lot of )?water/i, /dehydrat/i] },
  { key: 'heavy_meal', label: 'Heavy meal', patterns: [/heavy (meal|dinner|lunch)/i, /spicy/i, /fast food/i, /\bdairy\b/i] },
]

const PT_SYMPTOMS: Record<string, PtTag> = {
  headache: { label: 'Dor de cabeça', patterns: [/dor de cabeca/, /cefaleia/, /enxaqueca/] },
  nausea: { label: 'Náusea', patterns: [/nausea/, /enjoo/, /enjoad/, /mal[- ]estar no estomago/] },
  stomach_pain: { label: 'Dor de estômago', patterns: [/dor (de|no) (estomago|barriga)/, /dor abdominal/, /\bazia\b/, /queimacao/, /refluxo/, /gastrite/, /ma digestao/, /colica/] },
  dizziness: { label: 'Tontura', patterns: [/tontura/, /\btont[oa]\b/, /vertigem/, /cabeca leve/] },
  fatigue: { label: 'Cansaço', patterns: [/cansad[oa]/, /cansaco/, /fadiga/, /exaust/, /sonolen/, /sem energia/, /desanimad/] },
  insomnia: { label: 'Insônia', patterns: [/insonia/, /nao consegui dormir/, /nao consigo dormir/, /acordei (varias vezes|muito|de madrugada)/] },
  anxiety: { label: 'Ansiedade', patterns: [/ansiedade/, /ansios/, /agitad/, /nervos/, /panico/, /inquiet/] },
  muscle_pain: { label: 'Dor muscular', patterns: [/dor muscular/, /dor nas costas/, /dor (nas|na) (juntas|articulac)/, /caibra/, /contratura/, /dor no corpo/] },
  rash: { label: 'Alergia na pele', patterns: [/alergia/, /coceira/, /urticaria/, /erupcao/, /manchas na pele/] },
  dry_mouth: { label: 'Boca seca', patterns: [/boca seca/] },
  diarrhea: { label: 'Diarreia', patterns: [/diarreia/, /fezes (moles|liquid)/] },
  low_mood: { label: 'Humor baixo', patterns: [/humor baixo/, /desanimo/, /\btriste\b/, /deprimid/, /irritad/, /irritabilidade/] },
}

const PT_HABITS: Record<string, PtTag> = {
  caffeine: { label: 'Cafeína', patterns: [/\bcafe\b/, /cafeina/, /expresso/, /energetico/, /\bcha\b/, /\bmate\b/, /refrigerante de cola/] },
  alcohol: { label: 'Álcool', patterns: [/alcool/, /\bvinho\b/, /cerveja/, /\bchopp?\b/, /caipirinha/, /whisky/] },
  exercise: { label: 'Exercício', patterns: [/exercicio/, /\btrein(o|ei)\b/, /academia/, /\bcorri\b/, /corrida/, /caminhada/, /caminhei/, /\byoga\b/, /pedalei/, /ciclismo/, /malhei/, /musculacao/] },
  good_sleep: { label: 'Sono bom', patterns: [/dormi (muito )?bem/, /sono (bom|tranquilo|profundo)/, /bem descansad/, /noite de sono (boa|otima)/] },
  poor_sleep: { label: 'Sono ruim', patterns: [/dormi (mal|pouco)/, /sono (ruim|pessimo)/, /pouco sono/, /mal dormi/, /noite mal dormida/] },
  skipped_meal: { label: 'Pulou refeição', patterns: [/pulei (o |a )?(cafe|almoco|jantar|refeicao)/, /em jejum/, /sem comer/, /nao comi/, /estomago vazio/] },
  stress: { label: 'Estresse', patterns: [/estress/, /sobrecarreg/, /sobrecarga/, /prazo apertado/] },
  hydration: { label: 'Hidratação', patterns: [/hidrat/, /bebi (muita )?agua/, /desidrat/] },
  heavy_meal: { label: 'Refeição pesada', patterns: [/refeicao pesada/, /jantar pesado/, /almoco pesado/, /comida (apimentada|pesada|gordurosa)/, /pimenta/, /fast food/, /laticinio/, /feijoada/] },
}

const withPortuguese = (defs: BaseTagDef[], pt: Record<string, PtTag>): TagDef[] =>
  defs.map((def) => ({
    ...def,
    labelPt: pt[def.key]?.label ?? def.label,
    patterns: [...def.patterns, ...(pt[def.key]?.patterns ?? [])],
  }))

export const SYMPTOMS: TagDef[] = withPortuguese(SYMPTOM_DEFS, PT_SYMPTOMS)
export const HABITS: TagDef[] = withPortuguese(HABIT_DEFS, PT_HABITS)

const labelIndex = new Map<string, TagDef>([...SYMPTOMS, ...HABITS].map((t) => [t.key, t]))

export const slugify = (s: string) =>
  normalizeText(s)
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

export const normalizeTag = (raw: string, defs: TagDef[]) => {
  const direct = defs.find((d) => d.key === slugify(raw))
  if (direct) return direct.key
  const cleaned = normalizeText(raw).trim()
  const byLabel = defs.find((d) => normalizeText(d.label) === cleaned || normalizeText(d.labelPt) === cleaned)
  if (byLabel) return byLabel.key
  const byPattern = defs.find((d) => d.patterns.some((p) => p.test(cleaned)))
  if (byPattern) return byPattern.key
  return slugify(raw)
}

export const tagLabel = (key: string, lang: Lang) => {
  const def = labelIndex.get(key)
  if (def) return lang === 'pt-BR' ? def.labelPt : def.label
  return key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

export const detectTags = (text: string, defs: TagDef[]) => {
  const cleaned = normalizeText(text)
  return defs.filter((d) => d.patterns.some((p) => p.test(cleaned))).map((d) => d.key)
}

export const HABIT_CLASSES: Record<string, string[]> = {
  caffeine: ['caffeine'],
  alcohol: ['alcohol'],
}

interface Rule {
  a: string
  b: string
  severity: Severity
  title: string
  explanation: string
  advice: string
}

export const RULES: Rule[] = [
  {
    a: 'nsaid',
    b: 'ssri',
    severity: 'caution',
    title: 'Higher bleeding risk',
    explanation:
      'NSAIDs like ibuprofen and SSRI/SNRI antidepressants both reduce how well blood clots. Taken together they raise the chance of stomach irritation and bleeding.',
    advice: 'Ask your prescriber or pharmacist before combining. Take NSAIDs with food, for the shortest time possible, and report black stools or stomach pain.',
  },
  {
    a: 'nsaid',
    b: 'snri',
    severity: 'caution',
    title: 'Higher bleeding risk',
    explanation: 'NSAIDs combined with SNRI antidepressants can increase the risk of gastrointestinal bleeding.',
    advice: 'Check with your prescriber before regular use of both.',
  },
  {
    a: 'nsaid',
    b: 'blood_thinner',
    severity: 'caution',
    title: 'Serious bleeding risk',
    explanation: 'NSAIDs add to the effect of blood thinners and can irritate the stomach lining, raising the risk of significant bleeding.',
    advice: 'Avoid unless your doctor has specifically approved the combination.',
  },
  {
    a: 'nsaid',
    b: 'raas',
    severity: 'caution',
    title: 'Kidney and blood pressure effects',
    explanation: 'NSAIDs can blunt the blood-pressure-lowering effect of ACE inhibitors and ARBs and, together, may strain the kidneys.',
    advice: 'Keep hydrated and discuss regular NSAID use with your prescriber.',
  },
  {
    a: 'nsaid',
    b: 'corticosteroid',
    severity: 'caution',
    title: 'Stomach ulcer risk',
    explanation: 'Corticosteroids and NSAIDs both irritate the stomach lining; combined, the chance of ulcers and bleeding rises.',
    advice: 'Use only under medical guidance, with food.',
  },
  {
    a: 'nsaid',
    b: 'alcohol',
    severity: 'monitor',
    title: 'Stomach irritation',
    explanation: 'Alcohol and NSAIDs each irritate the stomach lining. Regular drinking while using NSAIDs raises bleeding risk.',
    advice: 'Limit alcohol on days you take NSAIDs.',
  },
  {
    a: 'nsaid',
    b: 'caffeine',
    severity: 'monitor',
    title: 'Possible stomach upset',
    explanation: 'Coffee is acidic and can add to the stomach irritation NSAIDs may cause, especially on an empty stomach.',
    advice: 'Take NSAIDs with food rather than with coffee.',
  },
  {
    a: 'ssri',
    b: 'caffeine',
    severity: 'monitor',
    title: 'Jitters and sleep effects',
    explanation: 'Caffeine can amplify restlessness, anxiety and sleep disruption, which some people already notice with SSRIs.',
    advice: 'Watch how you feel after caffeine, especially in the afternoon.',
  },
  {
    a: 'serotonergic',
    b: 'alcohol',
    severity: 'monitor',
    title: 'Increased drowsiness and mood effects',
    explanation: 'Alcohol can intensify drowsiness and dizziness from antidepressants and may worsen mood symptoms.',
    advice: 'Keep alcohol minimal and note how you feel the next day.',
  },
  {
    a: 'ssri',
    b: 'st_johns_wort',
    severity: 'caution',
    title: 'Serotonin syndrome risk',
    explanation: "St. John's wort raises serotonin and can combine dangerously with SSRIs, causing agitation, fever, rapid heartbeat and tremor.",
    advice: 'Do not combine without medical supervision.',
  },
  {
    a: 'serotonergic',
    b: 'serotonergic',
    severity: 'caution',
    title: 'Serotonin syndrome risk',
    explanation: 'Taking more than one serotonin-boosting product can push serotonin too high.',
    advice: 'Confirm with your prescriber before combining.',
  },
  {
    a: 'magnesium',
    b: 'vitamin_d',
    severity: 'safe',
    title: 'Complementary pair',
    explanation: 'Magnesium helps your body convert vitamin D into its active form, so the two work well together.',
    advice: 'No change needed.',
  },
  {
    a: 'magnesium',
    b: 'caffeine',
    severity: 'monitor',
    title: 'Minor magnesium loss',
    explanation: 'Caffeine slightly increases magnesium loss in urine. Regular heavy intake may reduce the benefit of supplementation.',
    advice: 'Moderate caffeine; consistency matters more than any single cup.',
  },
  {
    a: 'calcium',
    b: 'vitamin_d',
    severity: 'safe',
    title: 'Complementary pair',
    explanation: 'Vitamin D improves calcium absorption.',
    advice: 'No change needed.',
  },
  {
    a: 'iron',
    b: 'vitamin_c',
    severity: 'safe',
    title: 'Helps absorption',
    explanation: 'Vitamin C improves absorption of iron from supplements.',
    advice: 'No change needed.',
  },
  {
    a: 'vitamin_d',
    b: 'thiazide',
    severity: 'monitor',
    title: 'Calcium levels',
    explanation: 'Thiazide diuretics reduce calcium loss; with high-dose vitamin D this can lead to elevated calcium.',
    advice: 'Ask your doctor about periodic calcium blood tests.',
  },
  {
    a: 'vitamin_k',
    b: 'blood_thinner',
    severity: 'caution',
    title: 'Changes blood thinner effect',
    explanation: 'Vitamin K can counteract warfarin-type blood thinners, making doses less predictable.',
    advice: 'Keep vitamin K intake consistent and tell your care team.',
  },
  {
    a: 'omega3',
    b: 'blood_thinner',
    severity: 'monitor',
    title: 'Mild additive effect',
    explanation: 'High-dose omega-3 may slightly increase bleeding tendency alongside blood thinners.',
    advice: 'Mention it to your doctor, especially before procedures.',
  },
  {
    a: 'ginkgo',
    b: 'blood_thinner',
    severity: 'caution',
    title: 'Bleeding risk',
    explanation: 'Ginkgo can affect platelets and add to the effect of blood thinners.',
    advice: 'Avoid unless approved by your doctor.',
  },
  {
    a: 'melatonin',
    b: 'alcohol',
    severity: 'monitor',
    title: 'Added drowsiness',
    explanation: 'Alcohol and melatonin both cause sleepiness and alcohol disrupts sleep quality.',
    advice: 'Avoid alcohol close to bedtime.',
  },
  {
    a: 'melatonin',
    b: 'caffeine',
    severity: 'monitor',
    title: 'Opposing effects',
    explanation: 'Caffeine can counteract melatonin and delay sleep onset.',
    advice: 'Avoid caffeine in the late afternoon and evening.',
  },
  {
    a: 'acetaminophen',
    b: 'alcohol',
    severity: 'caution',
    title: 'Liver strain',
    explanation: 'Regular alcohol use together with acetaminophen increases the risk of liver injury.',
    advice: 'Stay within label dose limits and avoid heavy drinking.',
  },
  {
    a: 'statin',
    b: 'alcohol',
    severity: 'monitor',
    title: 'Liver load',
    explanation: 'Both are processed by the liver, so heavy alcohol intake may add strain.',
    advice: 'Keep alcohol moderate and keep up with liver tests if ordered.',
  },
  {
    a: 'antihistamine',
    b: 'alcohol',
    severity: 'monitor',
    title: 'Increased sedation',
    explanation: 'Sedating antihistamines and alcohol together cause stronger drowsiness.',
    advice: 'Avoid driving and limit alcohol.',
  },
  {
    a: 'ssri',
    b: 'blood_thinner',
    severity: 'caution',
    title: 'Higher bleeding risk',
    explanation: 'SSRIs reduce platelet function and can add to the bleeding risk of blood thinners.',
    advice: 'Discuss with your prescriber.',
  },
]

export const SEVERITY_RANK: Record<Severity, number> = { safe: 0, monitor: 1, caution: 2 }

export const MINERAL_CLASSES = ['magnesium', 'calcium', 'iron', 'zinc']

export interface SpacingRule {
  id: string
  a: string[]
  b: string[]
  hours: number
  title: string
  explanation: string
  advice: string
}

export const SPACING_RULES: SpacingRule[] = [
  {
    id: 'minerals|thyroid',
    a: MINERAL_CLASSES,
    b: ['thyroid'],
    hours: 4,
    title: 'Absorption conflict with thyroid medication',
    explanation:
      'Calcium, iron and magnesium bind levothyroxine in the gut and can noticeably reduce how much you absorb, shifting thyroid levels.',
    advice: 'Take thyroid medication on an empty stomach and keep minerals at least 4 hours away.',
  },
  {
    id: 'minerals|chelated_antibiotic',
    a: MINERAL_CLASSES,
    b: ['chelated_antibiotic'],
    hours: 3,
    title: 'Reduced antibiotic absorption',
    explanation: 'Minerals chelate fluoroquinolone and tetracycline antibiotics in the gut, so less of the antibiotic reaches your blood.',
    advice: 'Separate by at least 2 hours before or 3-6 hours after the antibiotic, depending on the product.',
  },
  {
    id: 'minerals|bisphosphonate',
    a: MINERAL_CLASSES,
    b: ['bisphosphonate'],
    hours: 2,
    title: 'Reduced bisphosphonate absorption',
    explanation: 'Minerals bind bisphosphonates and lower how much you absorb.',
    advice: 'Take the bisphosphonate first with plain water and keep minerals at least 2 hours away.',
  },
  {
    id: 'calcium|iron',
    a: ['calcium'],
    b: ['iron'],
    hours: 2,
    title: 'Competing mineral absorption',
    explanation: 'Calcium and iron compete for absorption when taken together.',
    advice: 'Take them at different meals, at least 2 hours apart.',
  },
]

export const SUPPLEMENT_CLASSES = ['magnesium', 'calcium', 'iron', 'zinc', 'vitamin_d', 'vitamin_c', 'vitamin_k', 'omega3', 'melatonin', 'ginkgo', 'st_johns_wort']

interface RuleCopy {
  title: string
  explanation: string
  advice: string
}

export const ruleCopy = (id: string, fallback: RuleCopy, lang: Lang): RuleCopy =>
  lang === 'pt-BR' ? (INTERACTION_TEXT_PT[id] ?? fallback) : fallback

export const interactionRuleId = (rule: Pick<Rule, 'a' | 'b'>) => `${rule.a}|${rule.b}`