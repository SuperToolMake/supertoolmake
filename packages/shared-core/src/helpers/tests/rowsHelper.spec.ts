import { convertDataToExportFormat } from "../rowsHelper"

describe("convertDataToExportFormat", () => {
  const rows = [{ firstName: "John", lastName: "Connor" }]
  const columns = [{ name: "firstName" }, { name: "lastName" }]
  const customHeaders = {
    firstName: "First name",
    lastName: "Last name",
  }

  it("uses custom headers for CSV columns", () => {
    expect(convertDataToExportFormat(rows, "csv", columns, ",", customHeaders)).toBe(
      "First name,Last name\nJohn,Connor"
    )
  })

  it("escapes CSV custom headers", () => {
    expect(
      convertDataToExportFormat(rows, "csv", columns, ",", {
        firstName: 'First, "preferred" name',
        lastName: "Last name",
      })
    ).toBe('"First, ""preferred"" name",Last name\nJohn,Connor')
  })

  it("uses custom headers for JSON keys", () => {
    expect(convertDataToExportFormat(rows, "json", columns, ",", customHeaders)).toBe(
      JSON.stringify([{ "First name": "John", "Last name": "Connor" }], null, 2)
    )
  })

  it("disambiguates duplicate JSON headers", () => {
    expect(
      convertDataToExportFormat(rows, "json", columns, ",", {
        firstName: "Name",
        lastName: "Name",
      })
    ).toBe(JSON.stringify([{ Name: "John", "Name (2)": "Connor" }], null, 2))
  })
})
