#!/usr/bin/env node
import { access, mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const REPO_OWNER = "valfar-and-sons"
const REPO_NAME = "loremaster"
const NOTES_PATH = "misc/releasenotes"
const MIN_VERSION = "v1.0.0"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")

function ghHeaders() {
  const token = process.env.LOREMASTER_READ_TOKEN ?? process.env.GITHUB_TOKEN
  const headers = { Accept: "application/vnd.github+json" }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

function stripV(tag) {
  return tag.startsWith("v") ? tag.slice(1) : tag
}

function compareSemver(a, b) {
  const pa = stripV(a).split(".")
  const pb = stripV(b).split(".")
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const na = Number(pa[i] ?? "0")
    const nb = Number(pb[i] ?? "0")
    if (Number.isNaN(na) || Number.isNaN(nb)) {
      const sa = pa[i] ?? ""
      const sb = pb[i] ?? ""
      if (sa !== sb) return sa < sb ? -1 : 1
      continue
    }
    if (na !== nb) return na - nb
  }
  return 0
}

function stripBoilerplate(body) {
  return body
    .split("\n")
    .filter((line) => !/^Here's what's new in \*\*Loremaster\*\*/i.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimStart()
}

function tagFromName(name) {
  return name.match(/(v[\d.]+)\.md$/)?.[1] ?? null
}

async function fetchListing() {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${NOTES_PATH}`
  const res = await fetch(url, { headers: ghHeaders() })
  if (!res.ok) {
    throw new Error(`GitHub listing failed: ${res.status} ${res.statusText}`)
  }
  const items = await res.json()
  return items.filter((item) => item.type === "file" && item.name.endsWith(".md"))
}

async function fetchBody(downloadUrl) {
  const res = await fetch(downloadUrl, { headers: ghHeaders() })
  if (!res.ok) {
    throw new Error(`Download failed for ${downloadUrl}: ${res.status}`)
  }
  return await res.text()
}

const PUBLIC_PATH = resolve(ROOT, "public/releases.json")
const DATA_PATH = resolve(ROOT, "src/data/releases.json")

async function fileExists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

// The pages import src/data/releases.json statically, so it must exist for the
// build to compile. When a fetch fails we keep any cached copy that's already
// on disk; only a completely fresh checkout gets an empty list written so the
// build can still proceed.
async function ensureFallback() {
  const haveData = await fileExists(DATA_PATH)
  const havePublic = await fileExists(PUBLIC_PATH)
  if (haveData && havePublic) {
    console.warn("Keeping existing releases.json (using cached release notes).")
    return
  }
  const empty = "[]\n"
  await mkdir(dirname(PUBLIC_PATH), { recursive: true })
  await mkdir(dirname(DATA_PATH), { recursive: true })
  if (!havePublic) await writeFile(PUBLIC_PATH, empty)
  if (!haveData) await writeFile(DATA_PATH, empty)
  console.warn("No cached releases.json found; wrote an empty list so the build can continue.")
}

async function main() {
  console.log(`Fetching release notes from ${REPO_OWNER}/${REPO_NAME}/${NOTES_PATH}...`)
  const files = await fetchListing()
  console.log(`Found ${files.length} markdown files`)

  const entries = []
  for (const file of files) {
    const tag = tagFromName(file.name)
    if (!tag) {
      console.warn(`Skipping ${file.name} (no version tag)`)
      continue
    }
    if (compareSemver(tag, MIN_VERSION) < 0) {
      continue
    }
    const body = await fetchBody(file.download_url)
    entries.push({ tag, body: stripBoilerplate(body) })
  }

  entries.sort((a, b) => compareSemver(b.tag, a.tag))

  const json = JSON.stringify(entries, null, 2) + "\n"
  await mkdir(dirname(PUBLIC_PATH), { recursive: true })
  await mkdir(dirname(DATA_PATH), { recursive: true })
  await writeFile(PUBLIC_PATH, json)
  await writeFile(DATA_PATH, json)

  console.log(`Wrote ${entries.length} entries to public/releases.json and src/data/releases.json`)
}

main().catch(async (err) => {
  // Release notes are non-critical: a fetch failure (offline, missing token,
  // GitHub hiccup) shouldn't break the site build. Warn, fall back to cached
  // or empty data, and exit cleanly.
  console.warn(`Skipping release-notes refresh: ${err.message}`)
  try {
    await ensureFallback()
  } catch (fallbackErr) {
    console.error(`Failed to write fallback releases.json: ${fallbackErr.message}`)
    process.exit(1)
  }
})
