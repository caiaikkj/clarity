import { useMemo } from 'react'
import { BrainCircuit } from 'lucide-react'
import { useI18n } from '../i18n'
import { useData } from '../lib/store'
import { isActiveCabinetMed } from '../lib/course'
import { buildItems, computeInteractions } from '../lib/interactions'
import { InteractionChecker } from '../components/InteractionChecker'
import { MixChecker } from '../components/MixChecker'
import { PatternInsights } from '../components/PatternInsights'
import { EmptyState, GlassCard, PageHeader } from '../components/ui'

export const BrainView = () => {
  const { data } = useData()
  const { t, lang } = useI18n()

  const activeMeds = useMemo(() => data.meds.filter(isActiveCabinetMed), [data.meds])
  const interactions = useMemo(() => computeInteractions(buildItems(activeMeds, data.notes, lang), lang), [activeMeds, data.notes, lang])
  const flagged = interactions.filter((i) => i.known && i.severity !== 'safe').length

  return (
    <>
      <PageHeader
        title={t('brain.title')}
        subtitle={`${t('brain.subtitle', { count: interactions.length })}${flagged ? t('brain.flagged', { n: flagged }) : ''}`}
      />

      {activeMeds.length === 0 ? (
        <GlassCard>
          <EmptyState icon={<BrainCircuit className="h-6 w-6" />} title={t('brain.emptyTitle')} body={t('brain.emptyBody')} />
        </GlassCard>
      ) : (
        <div className="space-y-6">
          <MixChecker />
          <PatternInsights />

          <GlassCard className="space-y-5 p-5 sm:p-6" delay={80}>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-white">{t('brain.checkerTitle')}</h2>
              <p className="mt-1 text-sm text-slate-400">{t('brain.everyPair')}</p>
            </div>
            <InteractionChecker interactions={interactions} />
          </GlassCard>
        </div>
      )}
    </>
  )
}
