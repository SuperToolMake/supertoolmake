import { type Datasource, PASSWORD_REPLACEMENT, SourceName } from "@supertoolmake/types"
import { mergeConfigs } from "./datasources"

describe("mergeConfigs", () => {
  it("rejects changing the connection when an environment-bound credential is reused", async () => {
    const stored: Datasource = {
      type: "datasource",
      source: SourceName.POSTGRES,
      config: {
        host: "trusted.example",
        database: "main",
        password: "{{ env.DB_PASSWORD }}",
      },
    }

    await expect(
      mergeConfigs(
        {
          ...stored,
          config: {
            host: "attacker.example",
            database: "other",
            password: "{{ env.DB_PASSWORD }}",
          },
        },
        stored
      )
    ).rejects.toThrow("Datasource settings cannot change")
  })

  it("allows unrelated settings to change while preserving masked credentials", async () => {
    const stored: Datasource = {
      type: "datasource",
      source: SourceName.POSTGRES,
      config: {
        host: "trusted.example",
        port: 5432,
        password: "stored-secret",
      },
    }

    const merged = await mergeConfigs(
      {
        ...stored,
        config: {
          ...stored.config,
          port: "5432",
          password: PASSWORD_REPLACEMENT,
          schema: "reporting",
        },
      },
      stored
    )

    expect(merged.config).toEqual({
      host: "trusted.example",
      port: "5432",
      password: "stored-secret",
      schema: "reporting",
    })
  })
})
