import { describe, expect, it } from "vitest"
import { getConstraintsForType } from "./constraints"

describe("validation constraints", () => {
  it("includes min and max length for string fields", () => {
    const constraints = getConstraintsForType("string")
    const values = constraints.map((constraint) => constraint.value)

    expect(values).toContain("minLength")
    expect(values).toContain("maxLength")
  })
})
