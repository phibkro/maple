/**
 * Run after `bun --filter=@maple/web build`. Inspects Vite's production manifest,
 * not source syntax, so a static dependency that defeats splitting fails the check.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { gzipSync } from "node:zlib"

interface Chunk {
  readonly file: string
  readonly isEntry?: boolean
  readonly isDynamicEntry?: boolean
  readonly imports?: ReadonlyArray<string>
}

type Manifest = Readonly<Record<string, Chunk>>

const routes = [
  "services/list",
  "services/detail",
  "overview",
  "agent-sessions/list",
  "integrations",
  "dashboards/list",
  "replays/list",
  "traces/list",
  "logs/list",
] as const

const dist = join(import.meta.dirname, "..", "dist")
const manifest: Manifest = JSON.parse(
  readFileSync(join(dist, ".vite", "manifest.json"), "utf8"),
)
const gzipBytes = (file: string): number =>
  gzipSync(readFileSync(join(dist, file))).byteLength

const entries = Object.entries(manifest).filter(([, chunk]) => chunk.isEntry)
if (entries.length === 0) throw new Error("No Vite entries in production manifest")

const visited = new Set<string>()
const visit = (key: string): void => {
  if (visited.has(key)) return
  visited.add(key)
  const chunk = manifest[key]
  if (chunk === undefined) throw new Error(`Missing manifest chunk: ${key}`)
  for (const dependency of chunk.imports ?? []) visit(dependency)
}
for (const [key] of entries) visit(key)

const startupFiles = new Set(
  [...visited].map((key) => manifest[key]?.file).filter((file): file is string => file !== undefined),
)
const initialGzipBytes = [...startupFiles]
  .filter((file) => file.endsWith(".js"))
  .reduce((sum, file) => sum + gzipBytes(file), 0)

const errors: Array<string> = []
for (const route of routes) {
  const source = `src/page/${route}/view.ts`
  const view = manifest[source] ??
    Object.entries(manifest).find(([key]) => key.endsWith(`/${source}`))?.[1]
  if (view === undefined || !view.isDynamicEntry) {
    errors.push(`${route}: no dynamic entry for its view`)
    continue
  }
  if (startupFiles.has(view.file)) errors.push(`${route}: view chunk appears in the startup graph`)
  console.log(`${route.padEnd(22)} ${String(gzipBytes(view.file)).padStart(9)} gzip bytes — ${view.file}`)
}

console.log(`Startup JS: ${initialGzipBytes} gzip bytes across ${startupFiles.size} static chunks`)
if (errors.length > 0) throw new Error(errors.join("\n"))
console.log("PASS: all selected views are outside the startup graph")
