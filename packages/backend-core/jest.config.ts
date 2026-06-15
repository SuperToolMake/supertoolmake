import type { Config } from "jest"

const baseConfig: Config = {
  setupFiles: ["./tests/jestEnv.ts"],
  globalSetup: "./../../globalSetup.ts",
  setupFilesAfterEnv: ["./tests/jestSetup.ts"],
  transform: {
    "^.+\\.ts?$": "@swc/jest",
    "^.+\\.js?$": "@swc/jest",
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(archiver|compress-commons|crc32-stream|zip-stream|is-stream)/)",
  ],
  moduleNameMapper: {
    "@supertoolmake/types": "<rootDir>/../types/src",
    "@supertoolmake/shared-core": ["<rootDir>/../shared-core/src"],
  },
}

const config: Config = {
  ...baseConfig,
  collectCoverageFrom: ["src/**/*.{js,ts}"],
  coverageReporters: ["lcov", "json", "clover"],
}

process.env.DISABLE_PINO_LOGGER = "1"

export default config
