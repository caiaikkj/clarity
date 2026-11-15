import type { AppData, DoseLog, Medication, Note } from '../types'
import { DEFAULT_LANG, type Lang } from '../i18n/translations'
import { addDays, atTime, dateKey, minutesOf } from '../lib/dates'
import { doseId } from '../lib/schedule'

const SEED_HISTORY_DAYS = 30
const MISSED_DAY_OFFSETS = new Set([27, 21, 17, 11, 8])

type PharmaFields = Pick<Medication, 'activeIngredient' | 'adminRule' | 'lastPaidPrice' | 'lastPharmacy' | 'lastPaidAt'>

export const SEED_PHARMA: Record<string, PharmaFields> = {
  med_sertraline: {
    activeIngredient: 'Cloridrato de sertralina',
    adminRule: 'Pela manhã, com ou sem alimentos',
    lastPaidPrice: 28.9,
    lastPharmacy: 'Drogaria São Paulo',
  },
  med_vitd3: {
    activeIngredient: 'Colecalciferol (vitamina D3)',
    adminRule: 'Com a refeição (gordura ajuda)',
  },
  med_magnesium: {
    activeIngredient: 'Glicinato de magnésio',
    adminRule: 'Espaçar 4h de remédios da tireoide',
  },
  med_ibuprofen: {
    activeIngredient: 'Ibuprofeno',
    adminRule: 'Com alimentos',
    lastPaidPrice: 12.5,
    lastPharmacy: 'Drogasil',
  },
}

interface MedCopy {
  name: string
  instructions: string
  notes: string
}

interface SeedCopy {
  sertraline: MedCopy
  vitd3: MedCopy
  magnesium: MedCopy
  ibuprofen: MedCopy
  note1: string
  note2: string
  note3: string
}

const SEED_COPY: Record<Lang, SeedCopy> = {
  'en-US': {
    sertraline: {
      name: 'Sertraline',
      instructions: 'Take 1 tablet by mouth every morning.',
      notes: 'Prescribed by Dr. Rivera. Refill authorised through March.',
    },
    vitd3: {
      name: 'Vitamin D3',
      instructions: 'Take 1 softgel with lunch (fat helps absorption).',
      notes: 'Last blood test: 25-OH vitamin D in the low-normal range.',
    },
    magnesium: {
      name: 'Magnesium Glycinate',
      instructions: 'Take 1 capsule about 30 minutes before bed.',
      notes: 'Started for sleep quality and muscle tension.',
    },
    ibuprofen: {
      name: 'Ibuprofen',
      instructions: 'Take 1 tablet with food as needed for pain. Maximum 3 per day.',
      notes: 'Only for tension headaches. Always with food.',
    },
    note1: 'Took Magnesium at 10pm, slept great',
    note2: 'Mild headache after afternoon coffee',
    note3: 'Took ibuprofen for the headache, felt a bit queasy afterwards. Skipped lunch.',
  },
  'pt-BR': {
    sertraline: {
      name: 'Sertralina',
      instructions: 'Tomar 1 comprimido por via oral toda manhã.',
      notes: 'Prescrito pelo Dr. Rivera. Receita válida até março.',
    },
    vitd3: {
      name: 'Vitamina D3',
      instructions: 'Tomar 1 cápsula no almoço (a gordura ajuda a absorção).',
      notes: 'Último exame de sangue: vitamina D 25-OH no limite inferior da normalidade.',
    },
    magnesium: {
      name: 'Glicinato de Magnésio',
      instructions: 'Tomar 1 cápsula cerca de 30 minutos antes de dormir.',
      notes: 'Iniciado para melhorar o sono e a tensão muscular.',
    },
    ibuprofen: {
      name: 'Ibuprofeno',
      instructions: 'Tomar 1 comprimido com alimentos se houver dor. Máximo de 3 por dia.',
      notes: 'Só para dor de cabeça tensional. Sempre com alimentos.',
    },
    note1: 'Tomei magnésio às 22h, dormi muito bem',
    note2: 'Dor de cabeça leve depois do café da tarde',
    note3: 'Tomei ibuprofeno para a dor de cabeça, fiquei meio enjoado depois. Pulei o almoço.',
  },
}
export const createSeedData = (lang: Lang = DEFAULT_LANG, now = new Date()): AppData => {
  const copy = SEED_COPY[lang]
  const startDate = dateKey(addDays(now, -SEED_HISTORY_DAYS))

  const meds: Medication[] = [
    {
      id: 'med_sertraline',
      name: copy.sertraline.name,
      strength: '50 mg',
      form: 'Tablet',
      category: 'prescription',
      asNeeded: false,
      times: ['08:00'],
      pillsPerDose: 1,
      stock: 8,
      refillThreshold: 10,
      instructions: copy.sertraline.instructions,
      notes: copy.sertraline.notes,
      ingredients: ['SERTRALINE HYDROCHLORIDE'],
      ...SEED_PHARMA.med_sertraline,
      startDate,
      fda: {
        source: 'openFDA',
        brandName: 'Sertraline Hydrochloride',
        genericName: 'SERTRALINE HYDROCHLORIDE',
        ingredients: ['SERTRALINE HYDROCHLORIDE'],
        purpose: 'Treatment of major depressive disorder, OCD, panic disorder, PTSD, social anxiety disorder and PMDD.',
        warnings:
          'Suicidality and antidepressant drugs: antidepressants increased the risk of suicidal thoughts and behavior in children, adolescents and young adults in short-term studies. Monitor for clinical worsening. Serotonin syndrome and abnormal bleeding have been reported, especially when combined with NSAIDs, aspirin or other drugs that affect coagulation.',
        interactions:
          'MAOIs, pimozide, other serotonergic drugs (triptans, tramadol, St. John\u2019s wort), drugs that interfere with hemostasis (NSAIDs, aspirin, warfarin).',
      },
    },
    {
      id: 'med_vitd3',
      name: copy.vitd3.name,
      strength: '2000 IU',
      form: 'Softgel',
      category: 'supplement',
      asNeeded: false,
      times: ['13:00'],
      pillsPerDose: 1,
      stock: 74,
      refillThreshold: 14,
      instructions: copy.vitd3.instructions,
      notes: copy.vitd3.notes,
      ingredients: ['CHOLECALCIFEROL'],
      ...SEED_PHARMA.med_vitd3,
      startDate,
      fda: { source: 'none', ingredients: ['CHOLECALCIFEROL'] },
    },
    {
      id: 'med_magnesium',
      name: copy.magnesium.name,
      strength: '400 mg',
      form: 'Capsule',
      category: 'supplement',
      asNeeded: false,
      times: ['21:30'],
      pillsPerDose: 1,
      stock: 46,
      refillThreshold: 12,
      instructions: copy.magnesium.instructions,
      notes: copy.magnesium.notes,
      ingredients: ['MAGNESIUM'],
      ...SEED_PHARMA.med_magnesium,
      startDate,
      fda: { source: 'none', ingredients: ['MAGNESIUM'] },
    },
    {
      id: 'med_ibuprofen',
      name: copy.ibuprofen.name,
      strength: '400 mg',
      form: 'Tablet',
      category: 'otc',
      asNeeded: true,
      times: [],
      pillsPerDose: 1,
      stock: 18,
      refillThreshold: 8,
      instructions: copy.ibuprofen.instructions,
      notes: copy.ibuprofen.notes,
      ingredients: ['IBUPROFEN'],
      ...SEED_PHARMA.med_ibuprofen,
      startDate,
      fda: {
        source: 'openFDA',
        brandName: 'Ibuprofen',
        genericName: 'IBUPROFEN',
        ingredients: ['IBUPROFEN'],
        purpose: 'Pain reliever / fever reducer.',
        warnings:
          'Stomach bleeding warning: this product contains an NSAID, which may cause severe stomach bleeding. The chances are higher if you are age 60 or older, have had stomach ulcers or bleeding problems, take a blood thinning (anticoagulant) or steroid drug, take other drugs containing prescription or nonprescription NSAIDs, have 3 or more alcoholic drinks every day while using this product, or take more or for a longer time than directed.',
        interactions: 'Ask a doctor or pharmacist before use if you are taking a prescription drug for diabetes, gout, arthritis, or blood thinners.',
      },
    },
  ]

  const missed = (offset: number, medId: string) => MISSED_DAY_OFFSETS.has(offset) && medId !== 'med_sertraline'
  const logs: DoseLog[] = []
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  for (let offset = 0; offset <= SEED_HISTORY_DAYS; offset++) {
    const day = addDays(now, -offset)
    const key = dateKey(day)
    meds.forEach((m) => {
      if (m.asNeeded) return
      m.times.forEach((time) => {
        if (offset === 0 && minutesOf(time) > nowMinutes - 20) return
        if (missed(offset, m.id)) return
        const takenAt = atTime(day, time)
        takenAt.setMinutes(takenAt.getMinutes() + ((offset * 7 + minutesOf(time)) % 23))
        logs.push({ id: doseId(m.id, key, time), medId: m.id, date: key, time, takenAt: takenAt.toISOString() })
      })
    })
  }

  const at = (daysAgo: number, time: string) => atTime(addDays(now, -daysAgo), time).toISOString()

  logs.push({
    id: 'dose_seed_prn_ibuprofen',
    medId: 'med_ibuprofen',
    date: dateKey(addDays(now, -2)),
    time: 'prn',
    takenAt: at(2, '16:30'),
  })

  const notes: Note[] = [
    {
      id: 'note_seed_1',
      text: copy.note1,
      createdAt: at(1, '22:05'),
      occurredAt: at(1, '22:00'),
      medIds: ['med_magnesium'],
      tookMedIds: ['med_magnesium'],
      symptoms: [],
      habits: ['good_sleep'],
      mood: 'positive',
      source: 'local',
      doseLogged: true,
    },
    {
      id: 'note_seed_2',
      text: copy.note2,
      createdAt: at(2, '15:40'),
      occurredAt: at(2, '15:30'),
      medIds: [],
      tookMedIds: [],
      symptoms: ['headache'],
      habits: ['caffeine'],
      mood: 'negative',
      source: 'local',
    },
    {
      id: 'note_seed_3',
      text: copy.note3,
      createdAt: at(2, '17:10'),
      occurredAt: at(2, '16:30'),
      medIds: ['med_ibuprofen'],
      tookMedIds: ['med_ibuprofen'],
      symptoms: ['headache', 'nausea'],
      habits: ['skipped_meal'],
      mood: 'negative',
      source: 'local',
      doseLogged: true,
    },
  ]

  return { meds, logs, notes }
}
