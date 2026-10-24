#!/usr/bin/env node
const { parsed: existingConfig } = require("dotenv").config()
const updateDotEnv = require("update-dotenv")

async function init() {
  let config = {
    APPS_PORT: "4001",
    WORKER_PORT: "4002",
    CLUSTER_PORT: "10000",
    JWT_SECRET: "testsecret",
    ENCRYPTION_KEY: "testsecret",
    INTERNAL_API_KEY: "budibase",
    MINIO_ACCESS_KEY: "budibase",
    MINIO_SECRET_KEY: "budibase",
    REDIS_URL: "localhost:6379",
    REDIS_PASSWORD: "budibase",
    MINIO_URL: "http://localhost:4004",
    COUCH_DB_URL: "http://budibase:budibase@localhost:4005",
    COUCH_DB_USERNAME: "budibase",
    COUCH_DB_PASSWORD: "budibase",
    PLATFORM_URL: "http://localhost:10000",
    APPS_URL: "http://localhost:4001",
    WORKER_URL: "http://localhost:4002",
    APPS_SERVICE: "app-service",
    WORKER_SERVICE: "worker-service",
    DEPLOYMENT_ENVIRONMENT: "development",
    ENABLE_EMAIL_TEST_MODE: "1",
    VERSION: "0.0.0+local",
    PASSWORD_MIN_LENGTH: "1",
  }

  config = { ...config, ...existingConfig }

  await updateDotEnv(config)
}

init().then(() => {
  console.log(".env checked! 🎉")
})
