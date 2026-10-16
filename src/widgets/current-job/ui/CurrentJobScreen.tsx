import { dockService } from '../../../app/services/dock.service'
import { useSettings } from '../../../app/services/settings.service'
import './current-job.css'

type ProjectWindow = {
  uuid: string
  appName: { ru: string; en: string }
}

type CurrentJobScreenProps = {
  windows: readonly ProjectWindow[]
}

const translations = {
  ru: {
    title: 'Это моя текущая работа',
    logo: 'Газпром нефть — Газпромнефть Автоматика-Сервис',
    experience: 'Опыт работы:',
    duration: 'более 3-х лет',
    position: 'Должность:',
    stack: 'Базовый стек',
    frontendStack: 'Front стек:',
    descriptionIntro: 'Активно участвовал в четырёх проектах компании: ',
    laboratory: 'интеграция лабораторных приборов в систему ЛИМС',
    measurementController: 'импортозамещение измерительного контроллера массы нефти и нефтепродуктов',
    hartDevices: 'импортозамещение системы работы с HART устройствами (AMS Device Manager)',
    dataTransfer: 'разработка системы односторонней передачи данных на оптронах',
    lastProjectSeparator: '; ',
  },
  en: {
    title: 'It’s my current job',
    logo: 'Gazprom Neft — Gazpromneft Automation Service',
    experience: 'Experience:',
    duration: 'more than 3 years',
    position: 'Post:',
    stack: 'Stack',
    frontendStack: 'Front stack:',
    descriptionIntro: 'I actively participated in four company projects: ',
    laboratory: 'integrating laboratory devices into a LIMS',
    measurementController: 'developing an oil and petroleum product mass measurement controller',
    hartDevices: 'developing a system for working with HART devices (an AMS Device Manager alternative)',
    dataTransfer: 'developing a one-way data transfer system using optocouplers',
    lastProjectSeparator: '; and ',
  },
}

const technologies = [
  { asset: 'nodejs', name: 'Node.js' },
  { asset: 'typescript', name: 'TypeScript' },
  { asset: 'angular', name: 'Angular' },
  { asset: 'docker', name: 'Docker' },
  { asset: 'linux', name: 'Linux' },
  { asset: 'git', name: 'Git' },
  { asset: 'figma', name: 'Figma' },
]

export function CurrentJobScreen({ windows }: CurrentJobScreenProps) {
  const { language } = useSettings()
  const text = translations[language]

  const projectLink = (uuid: string, label: string) => {
    const projectWindow = windows.find((window) => window.uuid === uuid)
    if (!projectWindow) return label

    return (
      <a
        className="cv-job__project-link"
        href={`#${projectWindow.uuid}`}
        onClick={(event) => {
          event.preventDefault()
          dockService.activateApplication(projectWindow.appName[language])
        }}
      >
        {label}
      </a>
    )
  }

  return (
    <section className="cv-screen cv-job cv-current-job" aria-label={text.title}>
      <div className="cv-job__overview">
        <img
          className="cv-job__logo"
          src="assets/cv/gazprom.svg"
          alt={text.logo}
        />
        <dl className="cv-card cv-job__facts">
          <div>
            <dt>{text.experience}</dt>
            <dd>{text.duration}</dd>
          </div>
          <div>
            <dt>{text.position}</dt>
            <dd>front-end dev</dd>
          </div>
        </dl>
      </div>
      <div className="cv-card cv-stack">
        <div className="cv-stack__row">
          <h2>{text.stack}:</h2>
          <ul className="cv-stack__icons" aria-label={text.stack}>
            {technologies.map(({ asset, name }) => (
              <li key={asset}>
                <img src={`assets/cv/${asset}.svg`} alt={name} title={name} />
              </li>
            ))}
          </ul>
        </div>
        <div className="cv-stack__row">
          <h2>{text.frontendStack}</h2>
          <p>echarts, monaco-editor, rxjs, prizm-ui, zustand</p>
        </div>
      </div>
      <div className="cv-card cv-job__description">
        <p>
          {text.descriptionIntro}
          {projectLink('laboratory', text.laboratory)}
          {'; '}
          {projectLink('frontend-projects', text.measurementController)}
          {'; '}
          {projectLink('frontend-projects', text.hartDevices)}
          {text.lastProjectSeparator}
          {projectLink('data-transfer', text.dataTransfer)}
          {'.'}
        </p>
      </div>
    </section>
  )
}
