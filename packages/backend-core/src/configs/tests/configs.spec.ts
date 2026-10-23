import { ConfigType } from "@supertoolmake/types"
import { generator, structures } from "../../../tests"
import { DBTestConfiguration, testEnv } from "../../../tests/extra"
import { getGlobalDB } from "../../context"
import env from "../../environment"
import * as configs from "../configs"

const DEFAULT_URL = "http://localhost:10000"
const ENV_URL = "http://env.com"

describe("configs", () => {
  const config = new DBTestConfiguration()

  const setDbPlatformUrl = async (dbUrl: string) => {
    const db = getGlobalDB()
    const existing = await db
      .get(configs.generateConfigID(ConfigType.SETTINGS))
      .catch(() => undefined)
    const settingsConfig = {
      ...(existing as any),
      _id: configs.generateConfigID(ConfigType.SETTINGS),
      type: ConfigType.SETTINGS,
      config: {
        ...(existing as any)?.config,
        platformUrl: dbUrl,
      },
    }
    await configs.save(settingsConfig)
  }

  const clearDbPlatformUrl = async () => {
    const db = getGlobalDB()
    const existing = await db
      .get<any>(configs.generateConfigID(ConfigType.SETTINGS))
      .catch(() => undefined)
    if (existing?.config?.platformUrl) {
      delete existing.config.platformUrl
      await configs.save(existing)
    }
  }

  describe("getPlatformUrl", () => {
    beforeEach(async () => {
      testEnv.selfHosted()
    })

    it("gets the default url", async () => {
      await config.doInTenant(async () => {
        await clearDbPlatformUrl()
        const url = await configs.getPlatformUrl()
        expect(url).toBe(DEFAULT_URL)
      })
    })

    it("gets the platform url from the environment", async () => {
      await config.doInTenant(async () => {
        await clearDbPlatformUrl()
        env._set("PLATFORM_URL", ENV_URL)
        const url = await configs.getPlatformUrl()
        expect(url).toBe(ENV_URL)
      })
    })

    it("gets the platform url from the database", async () => {
      await config.doInTenant(async () => {
        const dbUrl = generator.url()
        await setDbPlatformUrl(dbUrl)
        const url = await configs.getPlatformUrl()
        expect(url).toBe(dbUrl)
      })
    })
  })

  describe("getSettingsConfig", () => {
    beforeAll(async () => {
      testEnv.selfHosted()
      env._set("PLATFORM_URL", "")
    })

    it("returns the platform url with an existing config", async () => {
      await config.doInTenant(async () => {
        const dbUrl = generator.url()
        await setDbPlatformUrl(dbUrl)
        const config = await configs.getSettingsConfig()
        expect(config.platformUrl).toBe(dbUrl)
      })
    })

    it("returns the platform url without an existing config", async () => {
      await config.doInTenant(async () => {
        await clearDbPlatformUrl()
        const config = await configs.getSettingsConfig()
        expect(config.platformUrl).toBe(DEFAULT_URL)
      })
    })
  })

  describe("getGoogleDatasourceConfig", () => {
    function setEnvVars() {
      env.GOOGLE_CLIENT_SECRET = "test"
      env.GOOGLE_CLIENT_ID = "test"
    }

    function unsetEnvVars() {
      env.GOOGLE_CLIENT_SECRET = undefined
      env.GOOGLE_CLIENT_ID = undefined
    }

    beforeEach(() => {
      testEnv.selfHosted()
    })

    it("returns from config", async () => {
      await config.doInTenant(async () => {
        const db = getGlobalDB()
        const existing = await db
          .get(configs.generateConfigID(ConfigType.GOOGLE))
          .catch(() => undefined)
        const googleDoc = structures.sso.googleConfigDoc()
        await configs.save({ ...(existing as any), ...googleDoc })
        const config = await configs.getGoogleDatasourceConfig()
        expect(config).toEqual(googleDoc.config)
      })
    })

    it("falls back to env vars when config is disabled", async () => {
      await config.doInTenant(async () => {
        const db = getGlobalDB()
        const existing = await db
          .get(configs.generateConfigID(ConfigType.GOOGLE))
          .catch(() => undefined)
        if (existing) {
          await db.remove(existing)
        }
        setEnvVars()
        const config = await configs.getGoogleDatasourceConfig()
        unsetEnvVars()
        expect(config).toEqual({
          activated: true,
          clientID: "test",
          clientSecret: "test",
        })
      })
    })

    it("returns undefined when no config and no env vars", async () => {
      await config.doInTenant(async () => {
        const db = getGlobalDB()
        const existing = await db
          .get(configs.generateConfigID(ConfigType.GOOGLE))
          .catch(() => undefined)
        if (existing) {
          await db.remove(existing)
        }
        const config = await configs.getGoogleDatasourceConfig()
        expect(config).toBeUndefined()
      })
    })
  })
})
