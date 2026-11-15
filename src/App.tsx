import { I18nProvider } from './i18n'
import { AppProvider, useUi } from './lib/store'
import { Background } from './components/Background'
import { Dock, Sidebar, TopBar } from './components/Navigation'
import { AddMedicationModal } from './components/AddMedicationModal'
import { SettingsModal } from './components/SettingsModal'
import { GuideModal } from './components/GuideModal'
import { TodayView } from './views/TodayView'
import { CabinetView } from './views/CabinetView'
import { BrainView } from './views/BrainView'
import { BriefingView } from './views/BriefingView'

const Shell = () => {
  const { view, modal } = useUi()
  return (
    <>
      <Background />
      <Sidebar />
      <TopBar />
      <main className="print-root mx-auto min-h-screen max-w-6xl px-4 pb-32 pt-16 sm:px-8 lg:ml-72 lg:max-w-none lg:px-10 lg:pb-16 lg:pt-8 xl:pr-16">
        <div key={view} className="mx-auto max-w-6xl">
          {view === 'today' && <TodayView />}
          {view === 'cabinet' && <CabinetView />}
          {view === 'brain' && <BrainView />}
          {view === 'briefing' && <BriefingView />}
        </div>
      </main>
      <Dock />
      {modal === 'add' && <AddMedicationModal />}
      {modal === 'settings' && <SettingsModal />}
      {modal === 'guide' && <GuideModal />}
    </>
  )
}

export const App = () => (
  <I18nProvider>
    <AppProvider>
      <Shell />
    </AppProvider>
  </I18nProvider>
)
