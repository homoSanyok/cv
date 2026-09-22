import { useSettings } from '../../../app/services/settings.service'
import transferDiagramEn from '../assets/transfer-diagram-en.jpg'

const translations = {
  ru: {
    title: 'О проектах: передача данных',
    openImage: 'Открыть схему системы com-transfer в полном размере',
    imageDescription: 'Схема системы com-transfer: передача данных между Node.js сервисами через RS485 с оптронной развязкой и интеграцией с OPC-DA сервером',
  },
  en: {
    title: 'About projects: data transfer',
    openImage: 'Open the data transfer system diagram at full size',
    imageDescription: 'Data transfer system diagram with primary and standby controllers, data collection and processing modules, and an OPC-DA server',
  },
}

export function DataTransferScreen() {
  const { language } = useSettings()
  const text = translations[language]
  const diagram = language === 'en' ? transferDiagramEn : 'assets/cv/transfer-diagram.png'

  return (
    <section className="cv-screen cv-transfer" aria-label={text.title}>
      <div className="cv-project__overview cv-transfer__overview">
        <a
          className="cv-project__image-link"
          href={diagram}
          target="_blank"
          rel="noreferrer"
          aria-label={text.openImage}
        >
          <img
            className="cv-project__image"
            src={diagram}
            alt={text.imageDescription}
          />
        </a>
        <div className="cv-card cv-project__description">
          <p>
            {language === 'en' ? <>
              Developed a <strong>Node.js</strong> service to integrate two
              industrial platforms: a corporate <strong>.NET</strong> data
              collection and consolidation system and an <strong>OPC-DA</strong>{' '}
              server. The solution involved setting up communication through the
              following pipeline: <strong>SignalR API</strong> →{' '}
              <strong>Node.js</strong> data transfer service over{' '}
              <strong>serialport</strong> → <strong>Node.js</strong> service for
              reading data from <strong>serialport</strong> → data transmission
              to <strong>OPC-DA</strong>.
            </> : <>
              Разработал <strong>Node.js</strong> сервис взаимодействия двух
              промышленных платформ: корпоративной <strong>.NET</strong> системы
              сборки и консолидации данных и <strong>OPC-DA</strong> сервера.
              Разработка включала в себя наладку взаимодействия по следующей
              цепочке: <strong>SignalR API</strong> → <strong>Node.js</strong> сервис
              передачи данных по <strong>serialport</strong> →{' '}
              <strong>Node.js</strong> сервис чтения данных из{' '}
              <strong>serialport</strong> → передача данных в <strong>OPC-DA</strong>.
            </>}
          </p>
          <p>
            {language === 'en' ? <>
              Data was transmitted using a custom protocol similar to the
              industrial <strong>HART</strong> protocol. A <strong>checksum</strong>{' '}
              mechanism was used to verify data integrity, while tag values were
              encoded using the <strong>IEEE 754</strong> floating-point standard.
            </> : <>
              Передача данных была по собственному протоколу, схожему с
              промышленным <strong>HART</strong>. Для проверки достоверности данных
              был выбран метод <strong>check sum</strong>, а значения тегов были
              закодированы с помощью <strong>IEEE 754</strong>.
            </>}
          </p>
        </div>
      </div>
    </section>
  )
}
