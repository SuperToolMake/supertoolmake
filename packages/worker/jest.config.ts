import type { Config } from "jest"

const config: Config = {
  globalSetup: "./../../globalSetup.ts",
  setupFiles: ["./src/tests/jestEnv.ts"],
  setupFilesAfterEnv: ["./src/tests/jestSetup.ts"],
  collectCoverageFrom: ["src/**/*.{js,ts}", "../backend-core/src/**/*.{js,ts}"],
  coverageReporters: ["lcov", "json", "clover"],
  transform: {
    "^.+\\.ts?$": "@swc/jest",
    "^.+\\.js?$": "@swc/jest",
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(archiver|compress-commons|crc32-stream|zip-stream|is-stream)/)",
  ],
  moduleNameMapper: {
    "@supertoolmake/backend-core/(.*)": "<rootDir>/../backend-core/$1",
    "@supertoolmake/backend-core": "<rootDir>/../backend-core/src",
    "@supertoolmake/types": "<rootDir>/../types/src",
    "@supertoolmake/shared-core": ["<rootDir>/../shared-core/src"],
    "@supertoolmake/string-templates": ["<rootDir>/../string-templates/src"],
  },
}

export default config
