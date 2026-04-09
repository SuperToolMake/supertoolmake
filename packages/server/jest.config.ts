import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import type { Config } from "jest"

const baseConfig: Config = {
  setupFiles: ["./src/tests/jestEnv.ts"],
  moduleFileExtensions: ["js", "mjs", "cjs", "jsx", "ts", "tsx", "json", "node", "svelte"],
  setupFilesAfterEnv: ["./src/tests/jestSetup.ts"],
  globalSetup: "./../../globalSetup.ts",
  transform: {
    "^.+\\.ts?$": "@swc/jest",
    "^.+\\.js?$": "@swc/jest",
    "^.+\\.svelte?$": "<rootDir>/scripts/svelteTransformer.js",
  },
  transformIgnorePatterns: ["/node_modules/(?!svelte/|esm-env/|devalue/).*"],
  moduleNameMapper: {
    "@supertoolmake/backend-core/(.*)": "<rootDir>/../backend-core/$1",
    "@supertoolmake/shared-core/(.*)": "<rootDir>/../shared-core/$1",
    "@supertoolmake/backend-core": "<rootDir>/../backend-core/src",
    "@supertoolmake/shared-core": "<rootDir>/../shared-core/src",
    "@supertoolmake/types": "<rootDir>/../types/src",
    "@supertoolmake/string-templates/(.*)": ["<rootDir>/../string-templates/$1"],
    "@supertoolmake/string-templates": ["<rootDir>/../string-templates/src"],
  },
}

const config: Config = {
  ...baseConfig,
  collectCoverageFrom: [
    "src/**/*.{js,ts}",
    "../backend-core/src/**/*.{js,ts}",
    // The use of coverage with couchdb view functions breaks tests
    "!src/db/views/staticViews.*",
    "!src/**/*.spec.{js,ts}",
    "!src/tests/**/*.{js,ts}",
    // The use of coverage in the JS runner breaks tests by inserting
    // coverage functions into code that will run inside of the isolate.
    "!src/jsRunner/**/*.{js,ts}",
  ],
  coverageReporters: ["lcov", "json", "clover"],
}

const configDir = dirname(fileURLToPath(import.meta.url))
process.env.TOP_LEVEL_PATH = join(configDir, "..", "..")

export default config
