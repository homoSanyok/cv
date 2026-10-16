import { useSettings } from '../../../app/services/settings.service'
import './frontend-projects.css'

const translations = {
  ru: {
    title: 'О проектах: веб-интерфейсы',
    openImage: 'Открыть интерфейс системы работы с HART устройствами в полном размере',
    imageDescription: 'Интерфейс мониторинга HART устройств с деревом устройств, графиком параметров и историей событий',
    note: '*На скрине отображена часть системы работы с HART устройствами. Интерфейс намеренно видоизменён.',
  },
  en: {
    title: 'About projects: web interfaces',
    openImage: 'Open the HART device management interface at full size',
    imageDescription: 'HART device monitoring interface with a device tree, a parameter chart, and an event history',
    note: '*The screenshot shows part of a system for working with HART devices. The interface has been intentionally modified.',
  },
}

export function FrontendProjectsScreen() {
  const { language } = useSettings()
  const text = translations[language]
  const screenshot = 'assets/cv/hart-interface.png'

  return (
    <section className="cv-screen cv-frontend" aria-label={text.title}>
      <div className="cv-project__overview cv-frontend__overview">
        <a
          className="cv-project__image-link"
          href={screenshot}
          target="_blank"
          rel="noreferrer"
          aria-label={text.openImage}
        >
          <img
            className="cv-project__image"
            src={screenshot}
            alt={text.imageDescription}
          />
        </a>
        <div className="cv-card cv-project__description">
          <p>
            {language === 'en' ? <>
              A special mention should be made of my two most recent projects at
              Gazprom. They are modular <strong>SPA</strong> web UIs built around
              a shared library that provides reusable screens and standardized
              services for API communication. The library is configured as a
              standalone project using <strong>ng-packagr</strong>, without being
              tied to any particular <strong>workspace</strong>.
            </> : <>
              Особого упоминания стоят мои последние два проекта в Газпроме. Это
              модульные <strong>SPA</strong> WEB UI интерфейсы с единой библиотекой,
              которая включает в себя общие экраны и единые стандартизированные
              сервисы для работы с API. Библиотека сконфигурирована как отдельный
              проект на <strong>ng-package</strong> без привязки к какому-либо{' '}
              <strong>workspace</strong>.
            </>}
          </p>
          <p>
            {language === 'en' ? <>
              The projects’ APIs expose only a <strong>WebSocket</strong>{' '}
              interface for communication, which led me to develop a service
              that provides <strong>async/await</strong>-style interaction over
              WebSockets.
            </> : <>
              API проектов предоставляет только <strong>WebSocket</strong> интерфейс
              для взаимодействия, что подтолкнуло к разработке сервиса,
              реализующего <strong>async/await</strong> взаимодействие с WebSocket.
            </>}
          </p>
          <p className="cv-project__note">{text.note}</p>
        </div>
      </div>
      <div className="cv-card cv-frontend__details">
        <p>
          {language === 'en' ? <>
            One of the projects involved generating a sensor configuration
            interface based on the <strong>XML</strong> layout of the sensor’s
            own settings menu, in accordance with the <strong>EDDL</strong>{' '}
            specification. The specification defines components responsible for
            screen layout, input and output controls (<strong>input, select,
            radio group</strong>), and chart visualization (<strong>Gauge, Scope,
            Sweep, HorizontalBar, VerticalBar, and Line</strong>). Each menu
            element, including submenu windows, was updated through a{' '}
            <strong>WebSocket</strong> subscription.
          </> : <>
            Один из проектов предусматривал формирование интерфейса настройки
            датчика в соответствии с <strong>XML</strong> вёрсткой меню настроек
            самого датчика в соответствии с <strong>EDDL</strong> спецификацией.
            Спецификация определяет компоненты: отвечающие за расположение элементов
            на экране, за формат интерфейсов ввода и вывода данных (
            <strong>input, select, radio-group</strong>), за отображение графиков (
            <strong>Gauge, Scope, Sweep, HorizontalBar, VerticalBar и Line</strong>).
            Каждый элемент меню (в том числе окна подменю) обновлялся по подписке
            через <strong>WebSocket</strong>.
          </>}
        </p>
        <p>
          {language === 'en' ? <>
            I have experience working with <strong>legacy</strong> code. With the
            help of AI tools, I analyzed existing legacy codebases and implemented
            changes while preserving their established style and conventions.
            New functionality was developed using modern approaches and
            integrated with the legacy code where necessary. I also actively
            worked with a <strong>merge request</strong>-based workflow throughout
            the project.
          </> : <>
            Имею опыт работы с <strong>legacy</strong> кодом. С применением AI
            разбирал legacy и вносил доработки в его же стиле. Новый функционал
            наращивал современными методами, интегрируя его с <strong>legacy</strong>,
            где это необходимо. В рамках проекта активно пользовался подходом{' '}
            <strong>merge request</strong>.
          </>}
        </p>
        <div>
          <p>
            {language === 'en' ? <>
              I also participated in a project focused on developing user-facing
              software for a <strong>3D printer</strong>. My responsibilities
              included:
            </> : <>
              Участвовал в проекте по разработке пользовательского ПО для{' '}
              <strong>3D принтера</strong>. В рамках проекта занимался:
            </>}
          </p>
          <ul>
            <li>
              {language === 'en' ? <>
                integrating the <strong>Moonraker</strong> API into a{' '}
                <strong>React</strong> application;
              </> : <>
                интеграцией <strong>moonraker</strong> API в <strong>React</strong>{' '}
                приложение;
              </>}
            </li>
            <li>
              {language === 'en' ? <>
                setting up a dedicated Wi-Fi network on an <strong>Orange Pi</strong>{' '}
                for accessing the printer’s Web UI, as well as implementing an
                interface for connecting the printer to an external Wi-Fi network;
              </> : <>
                поднятием собственной Wi-Fi сети на базе <strong>Orange pi</strong>{' '}
                для дальнейшей работы с WEB UI интерфейсом принтера + интерфейс
                подключения принтера к внешней Wi-Fi сети;
              </>}
            </li>
            <li>
              {language === 'en' ? <>
                reprogramming the printer control panel UI running on an{' '}
                <strong>ATmega</strong> microcontroller.
              </> : <>
                перепрограммированием UI интерфейса пульта управления принтера на{' '}
                <strong>ATmega</strong>.
              </>}
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
