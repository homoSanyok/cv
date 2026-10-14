import { settingsService, useSettings } from '../../../app/services/settings.service'
import { dockService } from '../../../app/services/dock.service'
import './SettingsScreen.css'

const translations = {
  ru: {
    title: 'Настройки',
    language: 'Язык интерфейса',
    closeAllTabs: 'Закрыть все вкладки',
  },
  en: {
    title: 'Settings',
    language: 'Interface language',
    closeAllTabs: 'Close all tabs',
  },
}

export function SettingsScreen() {
  const { language } = useSettings()
  const text = translations[language]

  return (
    <section className="cv-screen cv-settings" aria-label={text.title}>
      <div className="cv-settings__language">
        <label htmlFor="settings-interface-language">{text.language}</label>
        <div className="cv-settings__combobox">
          <select
            id="settings-interface-language"
            name="interface-language"
            value={language}
            onChange={(event) => {
              const value = event.currentTarget.value
              if (value === 'ru' || value === 'en') {
                settingsService.update({ language: value })
              }
            }}
          >
            <option value="en" lang="en">English</option>
            <option value="ru" lang="ru">Русский</option>
          </select>
          <span className="cv-settings__combobox-arrow" aria-hidden="true">
            <svg viewBox="0 0 16 16" fill="none">
              <path d="m4.5 6.5 3.5 3.5 3.5-3.5" />
            </svg>
          </span>
        </div>
      </div>
      <button
        className="cv-settings__close-all"
        type="button"
        onClick={() => dockService.closeAll()}
      >
        {text.closeAllTabs}
      </button>
    </section>
  )
}
