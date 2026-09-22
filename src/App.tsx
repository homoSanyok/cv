import { useEffect } from 'react'
import './App.css'
import './widgets/resume-screens.css'
import { useSettings } from './app/services/settings.service'
import { Dock } from './entities/dock'
import { Window } from './shared/ui/window'
import { AboutScreen } from './widgets/about'
import { CurrentJobScreen } from './widgets/current-job'
import { DataTransferScreen } from './widgets/data-transfer'
import { FrontendProjectsScreen } from './widgets/frontend-projects'
import { LaboratoryScreen } from './widgets/laboratory'
import { PreviousJobScreen } from './widgets/previous-job'
import { ProfileScreen } from './widgets/profile'
import { SettingsScreen } from './widgets/settings'

const screens = [
  {
    uuid: 'profile',
    title: { ru: 'Это я', en: 'It’s me' },
    appName: { ru: 'Это я', en: 'It’s me' },
    appIcon: 'assets/design/applications/person.svg',
    defaultOpen: true,
    Component: ProfileScreen,
  },
  {
    uuid: 'current-job',
    title: { ru: 'Это моя текущая работа', en: 'It’s my current job' },
    appName: { ru: 'Газпром нефть', en: 'Gazprom Neft' },
    appIcon: 'assets/design/applications/gazprom.svg',
    Component: CurrentJobScreen,
  },
  {
    uuid: 'previous-job',
    title: { ru: 'Это моя предыдущая работа', en: 'It’s my previous job' },
    appName: { ru: 'РОСБИОТЕХ', en: 'ROSBIOTECH' },
    appIcon: 'assets/design/applications/rosbiotech.svg',
    Component: PreviousJobScreen,
  },
  {
    uuid: 'frontend-projects',
    title: { ru: 'О проектах', en: 'About projects' },
    appName: { ru: 'Веб-интерфейсы', en: 'Web interfaces' },
    appIcon: 'assets/design/applications/angular.svg',
    Component: FrontendProjectsScreen,
  },
  {
    uuid: 'data-transfer',
    title: { ru: 'О проектах', en: 'About projects' },
    appName: { ru: 'Передача данных', en: 'Data transfer' },
    appIcon: 'assets/design/applications/nodejs.svg',
    Component: DataTransferScreen,
  },
  {
    uuid: 'laboratory',
    title: { ru: 'О проектах', en: 'About projects' },
    appName: { ru: 'Node-RED', en: 'Node-RED' },
    appIcon: 'assets/design/applications/node-red.svg',
    Component: LaboratoryScreen,
  },
  {
    uuid: 'about',
    title: { ru: 'О себе', en: 'About me' },
    appName: { ru: 'О себе', en: 'About me' },
    appIcon: 'assets/design/applications/favicon.svg',
    Component: AboutScreen,
  },
  {
    uuid: 'settings',
    title: { ru: 'Настройки', en: 'Settings' },
    appName: { ru: 'Настройки', en: 'Settings' },
    appIcon: 'assets/design/applications/settings.svg',
    Component: SettingsScreen,
  },
]

function App() {
  const { language } = useSettings()

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  return (
    <main className="app">
      <div className="app__windows">
        {screens.map(({ Component, title, appName, ...windowProps }) => (
          <Window
            key={windowProps.uuid}
            {...windowProps}
            title={title[language]}
            appName={appName[language]}
          >
            <Component />
          </Window>
        ))}
      </div>
      <Dock className="app__dock" />
    </main>
  )
}

export default App
