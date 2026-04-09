export default {
  testEnvironment: "node",
  transform: {
    "^.+\\.ts?$": "@swc/jest",
  },
  moduleNameMapper: {
    "@supertoolmake/types": "<rootDir>/../types/src",
  },
}
