import { describe, expect, it } from "vitest"
import { isInsideStringLiteral } from "./stringContext"

describe("isInsideStringLiteral", () => {
  it("returns false in plain code", () => {
    expect(isInsideStringLiteral("const a = ")).toBe(false)
  })

  it("returns true inside a single line template literal", () => {
    expect(isInsideStringLiteral("`hello ")).toBe(true)
  })

  it("returns true inside a multi line template literal", () => {
    expect(isInsideStringLiteral("`hello\nworld ")).toBe(true)
  })

  it("returns true inside a quoted string", () => {
    expect(isInsideStringLiteral("'don")).toBe(true)
    expect(isInsideStringLiteral('"cost: ')).toBe(true)
  })

  it("does not treat an apostrophe as closing a double quoted string", () => {
    expect(isInsideStringLiteral("\"it's ")).toBe(true)
  })

  it("returns false inside ${} interpolation", () => {
    expect(isInsideStringLiteral("`${")).toBe(false)
    expect(isInsideStringLiteral("`${user.")).toBe(false)
  })

  it("returns false after a completed template literal", () => {
    expect(isInsideStringLiteral("`${name}` + ")).toBe(false)
  })

  it("handles nested template literals", () => {
    expect(isInsideStringLiteral("`a${ `b ")).toBe(true)
    expect(isInsideStringLiteral("`a${ `b${")).toBe(false)
  })

  it("ignores quotes and backticks in comments", () => {
    expect(isInsideStringLiteral("// don't use `\nconst a = ")).toBe(false)
    expect(isInsideStringLiteral("/* don't */ `")).toBe(true)
  })

  it("ignores braces in code blocks within an interpolation", () => {
    expect(isInsideStringLiteral("`${({ a: 1 }).")).toBe(false)
    expect(isInsideStringLiteral("`${({ a: 1 })} ")).toBe(true)
  })
})
