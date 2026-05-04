#!/usr/bin/env node

function startService(name, directory, entrypoint) {
  console.log(`Starting ${name} in combined process mode...`)
  process.chdir(directory)
  require(entrypoint)
}

startService("app", "/app", "/app/dist/index.js")
startService("worker", "/worker", "/worker/dist/index.js")
process.chdir("/app")
