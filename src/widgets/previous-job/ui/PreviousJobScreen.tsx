import { useSettings } from '../../../app/services/settings.service'

const translations = {
  ru: {
    title: 'Это моя предыдущая работа',
    logo: 'РОСБИОТЕХ — Российский биотехнологический университет',
    experience: 'Опыт работы:',
    duration: 'более 1 года',
    position: 'Должность:',
    stack: 'Базовый стек',
    backendStack: 'Back стек:',
    printing: '3D-печать',
    description: 'Участвовал в разработке ПО для 3D принтеров, реализующего HMI для работы с 3D принтером, в который входили интерфейсы загрузки GCODE, мониторинг состояния печати, управления принтером и т.д. Занимался созданием собственной Wi-Fi сети принтера (Python), а также интерфейсом работы с принтером (Web).',
  },
  en: {
    title: 'It’s my previous job',
    logo: 'ROSBIOTECH — Russian Biotechnological University',
    experience: 'Experience:',
    duration: 'more than 1 year',
    position: 'Post:',
    stack: 'Stack',
    backendStack: 'Back stack:',
    printing: '3D printing',
    description: 'I developed software for 3D printers. It served as an HMI with interfaces for loading and unloading GCODE, monitoring print status, controlling the printer, and more. I developed the printer’s own Wi-Fi network and network settings interface.',
  },
}

const technologies = [
  { asset: 'typescript', name: 'TypeScript' },
  { asset: 'react', name: 'React' },
  { asset: 'python', name: 'Python' },
  { asset: 'wifi', name: 'Wi-Fi' },
  { asset: 'docker', name: 'Docker' },
  { asset: 'linux', name: 'Linux' },
  { asset: 'git', name: 'Git' },
  { asset: 'printing', name: '3D printing' },
]

export function PreviousJobScreen() {
  const { language } = useSettings()
  const text = translations[language]

  return (
    <section className="cv-screen cv-job" aria-label={text.title}>
      <div className="cv-job__overview">
        <img
          className="cv-job__logo"
          src="assets/cv/rosbiotech.svg"
          alt={text.logo}
        />
        <dl className="cv-card cv-job__facts">
          <div>
            <dt>{text.experience}</dt>
            <dd>{text.duration}</dd>
          </div>
          <div>
            <dt>{text.position}</dt>
            <dd>full-stack</dd>
          </div>
        </dl>
      </div>
      <div className="cv-card cv-stack">
        <div className="cv-stack__row">
          <h2>{text.stack}:</h2>
          <ul className="cv-stack__icons" aria-label={text.stack}>
            {technologies.map(({ asset, name }) => (
              <li key={asset}>
                <img
                  src={`assets/cv/${asset}.svg`}
                  alt={asset === 'printing' ? text.printing : name}
                  title={asset === 'printing' ? text.printing : name}
                />
              </li>
            ))}
          </ul>
        </div>
        <div className="cv-stack__row">
          <h2>{text.backendStack}</h2>
          <p>moonraker, serial</p>
        </div>
      </div>
      <div className="cv-card cv-job__description">
        <p>{text.description}</p>
      </div>
    </section>
  )
}
