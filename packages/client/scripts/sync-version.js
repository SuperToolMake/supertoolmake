#!/usr/bin/env node
import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "../../..")

function getLernaVersion() {
  const lernaPath = path.join(rootDir, "lerna.json")
  const lerna = JSON.parse(fs.readFileSync(lernaPath, "utf-8"))
  return lerna.version
}

function getLastReleaseTag() {
  try {
    const tags = execSync('git tag --list "v*" --sort=-v:refname --format="%(refname:lstrip=1)"', {
      encoding: "utf-8",
    })
    const tagList = tags
      .trim()
      .split("\n")
      .filter((t) => t)
    return tagList[0] || null
  } catch {
    return null
  }
}

function hasClientChangesSinceRelease(tag) {
  if (!tag) return true

  try {
    const clientDir = path.join(rootDir, "packages", "client", "src")
    const changes = execSync(
      `git diff ${tag} --name-only -- "${clientDir}/" 2>/dev/null || echo ""`,
      { encoding: "utf-8" }
    ).trim()
    return changes.length > 0
  } catch {
    return true
  }
}

function updatePackageVersion(pkgPath, version) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"))
  pkg.version = version
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
  console.log(`Updated ${pkgPath} to version ${version}`)
}

function commitAndPush(version) {
  try {
    execSync("git add packages/client/package.json", { encoding: "utf-8" })
    execSync(`git commit -m "chore: sync client version to v${version}"`, {
      encoding: "utf-8",
    })
    execSync("git push", { encoding: "utf-8" })
    console.log("Committed and pushed client version change")
  } catch {
    console.log("No changes to commit")
  }
}

async function main() {
  const lernaVersion = getLernaVersion()
  const lastReleaseTag = getLastReleaseTag()
  const clientPkgPath = path.resolve(__dirname, "..", "package.json")
  const currentVersion = JSON.parse(fs.readFileSync(clientPkgPath, "utf-8")).version

  console.log(`Lerna version: ${lernaVersion}`)
  console.log(`Last release tag: ${lastReleaseTag}`)
  console.log(`Current client version: ${currentVersion}`)

  let versionUpdated = false

  const changesSinceRelease = await hasClientChangesSinceRelease(lastReleaseTag)

  if (changesSinceRelease) {
    if (currentVersion !== lernaVersion) {
      updatePackageVersion(clientPkgPath, lernaVersion)
      versionUpdated = true
      console.log("Client code changed since last release → version synced to lerna.json")
    } else {
      console.log("Client code changed, but version already matches lerna.json")
    }
  } else {
    console.log("No client code changes since last release → keeping current version")
  }

  if (versionUpdated) {
    commitAndPush(lernaVersion)
  }
}

main().catch(console.error)
