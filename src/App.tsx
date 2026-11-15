import { I18nProvider } from './i18n'
import { AuthProvider } from './lib/auth'
import { AppProvider, useUi } from './lib/store'
import { ToastProvider } from './lib/toast'
import { Background } from './components/Background'
import { Dock, Sidebar, TopBar } from './components/Navigation'
import { AddMedicationModal } from './components/AddMedicationModal'
import { CloudAuthModal } from './components/CloudAuthModal'
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
      <main className="print-root mx-auto min-h-[100dvh] max-w-6xl px-4 pb-32 pt-[max(4.5rem,calc(env(safe-area-inset-top)+3.25rem))] sm:px-8 lg:ml-72 lg:max-w-none lg:px-10 lg:pb-16 lg:pt-8 xl:pr-16">
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
      {modal === 'cloud' && <CloudAuthModal />}
    </>
  )
}

export const App = () => (
  <I18nProvider>
    <AppProvider>
      <AuthProvider>
        <ToastProvider>
          <Shell />
        </ToastProvider>
      </AuthProvider>
    </AppProvider>
  </I18nProvider>
)
