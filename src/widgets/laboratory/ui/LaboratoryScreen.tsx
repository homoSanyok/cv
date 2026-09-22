import { useSettings } from '../../../app/services/settings.service'

const translations = {
  ru: {
    title: 'О проектах: Node-RED',
    openImage: 'Открыть свидетельство о регистрации программы в полном размере',
    imageDescription: 'Фрагмент свидетельства Роспатента: заявка № 2023665269, государственная регистрация 25 июля 2023 года',
  },
  en: {
    title: 'About projects: Node-RED',
    openImage: 'Open the Node-RED illustration at full size',
    imageDescription: 'Node-RED logo',
  },
}

export function LaboratoryScreen() {
  const { language } = useSettings()
  const text = translations[language]
  const illustration = language === 'en' ? 'assets/cv/node-red.svg' : 'assets/cv/registration.png'

  return (
    <section className="cv-screen cv-laboratory" aria-label={text.title}>
      <div className="cv-project__overview cv-laboratory__overview">
        <a
          className="cv-project__image-link"
          href={illustration}
          target="_blank"
          rel="noreferrer"
          aria-label={text.openImage}
        >
          <img
            className="cv-project__image"
            src={illustration}
            alt={text.imageDescription}
          />
        </a>
        <div className="cv-card cv-project__description">
          <p>
            {language === 'en' ? <>
              Developed <strong>Node-RED</strong> libraries for a project
              integrating laboratory instruments into a unified data collection
              system. As part of the project, software was developed and deployed
              for an appliance-based hardware/software solution built on{' '}
              <strong>Raspberry Pi</strong>, including <strong>Docker</strong>,{' '}
              <strong>Nginx</strong>, <strong>Node-RED</strong>, and{' '}
              <strong>Python</strong>.
            </> : <>
              Разрабатывал <strong>node-red</strong> библиотеки для проекта
              интеграции лабораторных приборов в единую систему сбора данных. В
              рамках проекта было разработано и развёрнуто ПО для коробочного
              решения (ПАК) на базе <strong>Raspberry pi</strong>, включающее{' '}
              <strong>docker, nginx, node-red, python</strong>.
            </>}
          </p>
          <p>
            {language === 'en' ? <>
              As part of the project, a <strong>Node-RED</strong> library for
              streaming data encryption with <strong>LZ4</strong>-based
              compression was registered with Rospatent.
            </> : <>
              В рамках проекта в Роспатенте была зарегистрирована node-red
              библиотека поточного шифрования данных со сжатием на основе алгоритма{' '}
              <strong>LZ4</strong>.
            </>}
          </p>
        </div>
      </div>
    </section>
  )
}
