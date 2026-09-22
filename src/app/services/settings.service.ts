import { useSyncExternalStore } from 'react'

export type Language = 'ru' | 'en'

export type Settings = {
  language: Language
}

const storageKey = 'settings'
const defaultSettings: Readonly<Settings> = Object.freeze({ language: 'en' })

function parseSettings(value: string | null): Readonly<Settings> {
  try {
    const stored: unknown = value ? JSON.parse(value) : null
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
      return defaultSettings
    }

    return Object.freeze({
      ...defaultSettings,
      ...stored,
      language: 'language' in stored && (stored.language === 'ru' || stored.language === 'en')
        ? stored.language
        : defaultSettings.language,
    })
  } catch {
    return defaultSettings
  }
}

class SettingsService {
  private settings: Readonly<Settings> = defaultSettings
  private listeners = new Set<() => void>()

  constructor() {
    this.settings = this.read()
    this.persist()
  }

  private read() {
    try {
      return parseSettings(window.localStorage.getItem(storageKey))
    } catch {
      return defaultSettings
    }
  }

  private persist() {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(this.settings))
    } catch {
      // Keep settings usable for this session when storage is unavailable.
    }
  }

  private notify() {
    this.listeners.forEach((listener) => listener())
  }

  private handleStorage = (event: StorageEvent) => {
    if (event.key !== storageKey && event.key !== null) return
    try {
      if (event.storageArea !== window.localStorage) return
    } catch {
      return
    }

    this.settings = parseSettings(event.newValue)
    this.notify()
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    if (this.listeners.size === 1 && typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorage)
      // Pick up changes made while there were no mounted subscribers.
      this.settings = this.read()
    }

    return () => {
      this.listeners.delete(listener)
      if (this.listeners.size === 0 && typeof window !== 'undefined') {
        window.removeEventListener('storage', this.handleStorage)
      }
    }
  }

  getSnapshot = () => this.settings
  getServerSnapshot = () => defaultSettings

  update = (settings: Partial<Settings>) => {
    const next = parseSettings(JSON.stringify({ ...this.settings, ...settings }))
    if (Object.keys(next).every((key) => (
      next[key as keyof Settings] === this.settings[key as keyof Settings]
    ))) return

    this.settings = next
    this.persist()
    this.notify()
  }
}

export const settingsService = new SettingsService()

export function useSettings() {
  return useSyncExternalStore(
    settingsService.subscribe,
    settingsService.getSnapshot,
    settingsService.getServerSnapshot,
  )
}
