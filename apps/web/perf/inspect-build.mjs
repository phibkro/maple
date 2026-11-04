import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { runBenchmark, stringifyJson } from "./json.mjs"

// Supplemental build only. Run after timing; keep the measured artifacts intact.
await runBenchmark("inspect-build", async () => {
	const root = resolve(
		process.env.BENCH_MAPLE_ROOT ?? resolve(dirname(fileURLToPath(import.meta.url)), "../../.."),
	)
	const { build } = await import(pathToFileURL(join(root, "apps/web/node_modules/vite/dist/node/index.js")))
	const destination = resolve(process.argv[2])
	mkdirSync(destination, { recursive: true })
	await build({
		root: join(root, "apps/web"),
		configFile: join(root, "apps/web/vite.config.ts"),
		build: { outDir: join(destination, "inspection-dist"), emptyOutDir: true },
		plugins: [
			{
				name: "maple-benchmark-module-inspection",
				generateBundle(_options, bundle) {
					const packages = new Map()
					const chunks = Object.values(bundle)
						.filter((output) => output.type === "chunk")
						.map((chunk) => {
							const modules = Object.entries(chunk.modules).filter(
								([, module]) => module.renderedLength > 0,
							)
							for (const [id, module] of modules) {
								const match = id.match(
									/\/node_modules\/\.bun\/([^/]+)\/node_modules\/((?:@[^/]+\/)?[^/]+)/,
								)
								if (!match) continue
								const key = `${match[2]}:${match[1]}`
								const current = packages.get(key) ?? {
									name: match[2],
									instance: match[1],
									modules: 0,
									renderedBytes: 0,
								}
								current.modules += 1
								current.renderedBytes += module.renderedLength
								packages.set(key, current)
							}
							return {
								file: chunk.fileName,
								isEntry: chunk.isEntry,
								isDynamicEntry: chunk.isDynamicEntry,
								imports: chunk.imports,
								modules: modules.map(([id, module]) => ({
									id: id.replace(`${root}/`, ""),
									renderedBytes: module.renderedLength,
								})),
							}
						})
					const instances = [...packages.values()].sort(
						(left, right) => right.renderedBytes - left.renderedBytes,
					)
					const byName = Map.groupBy(instances, (instance) => instance.name)
					writeFileSync(
						join(destination, "module-graph.json"),
						stringifyJson({
							packages: instances,
							multiplePackageInstances: [...byName]
								.filter(([, values]) => values.length > 1)
								.map(([name, values]) => ({ name, instances: values })),
							chunks,
						}),
					)
				},
			},
		],
	})
})
