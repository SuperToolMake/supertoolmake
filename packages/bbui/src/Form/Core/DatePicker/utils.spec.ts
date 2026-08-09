import { describe, expect, it } from "vitest"
import { getLocaleStartDayOfWeek } from "./utils"

describe("getLocaleStartDayOfWeek", () => {
  it("uses the locale's first day of the week", () => {
    expect(getLocaleStartDayOfWeek(["en-US"])).toBe("Sunday")
    expect(getLocaleStartDayOfWeek(["en-GB"])).toBe("Monday")
    expect(getLocaleStartDayOfWeek(["ar-AF"])).toBe("Saturday")
  })

  it("normalizes locale separators", () => {
    expect(getLocaleStartDayOfWeek(["en_US"])).toBe("Sunday")
  })

  it("falls back for missing or invalid locale metadata", () => {
    expect(getLocaleStartDayOfWeek([])).toBe("Monday")
    expect(getLocaleStartDayOfWeek(["not-a-locale"])).toBe("Monday")
  })
})
