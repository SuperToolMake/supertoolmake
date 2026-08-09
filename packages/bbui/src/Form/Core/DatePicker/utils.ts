interface Input {
  max: number
  pad: number
  fallback: string
}

interface LocaleWeekInfo {
  firstDay?: number
}

interface LocaleWithWeekInfo {
  readonly weekInfo?: LocaleWeekInfo
  getWeekInfo?: () => LocaleWeekInfo
}

export type Weekday =
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"

const DEFAULT_WEEKDAY: Weekday = "Monday"
const WEEKDAY_BY_INDEX: Weekday[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]

const normalizeLocaleCode = (code?: string | null) => {
  if (!code) {
    return null
  }
  return code.toLowerCase().replace(/_/g, "-")
}

const getNavigatorLocales = (): readonly string[] => {
  if (typeof navigator === "undefined") {
    return []
  }
  if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
    return navigator.languages
  }
  return navigator.language ? [navigator.language] : []
}

const getLocaleWeekInfo = (code: string): LocaleWeekInfo | undefined => {
  if (typeof Intl.Locale !== "function") {
    return undefined
  }

  try {
    if (Intl.DateTimeFormat.supportedLocalesOf([code]).length === 0) {
      return undefined
    }
    const locale = new Intl.Locale(code) as Intl.Locale & LocaleWithWeekInfo
    return locale.weekInfo ?? locale.getWeekInfo?.()
  } catch {
    return undefined
  }
}

export const getLocaleStartDayOfWeek = (
  locales: readonly string[] = getNavigatorLocales()
): Weekday => {
  for (const locale of locales) {
    const normalized = normalizeLocaleCode(locale)
    if (!normalized) {
      continue
    }
    const firstDay = getLocaleWeekInfo(normalized)?.firstDay
    if (typeof firstDay === "number" && firstDay >= 1 && firstDay <= 7) {
      return WEEKDAY_BY_INDEX[firstDay % 7]
    }
  }
  return DEFAULT_WEEKDAY
}

export const cleanInput = ({ max, pad, fallback }: Input) => {
  return (e: Event) => {
    const target = e.target as HTMLInputElement
    if (target.value) {
      const value = parseInt(target.value)
      if (Number.isNaN(value)) {
        target.value = fallback
      } else {
        target.value = Math.min(max, value).toString().padStart(pad, "0")
      }
    } else {
      target.value = fallback
    }
  }
}
