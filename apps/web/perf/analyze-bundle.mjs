import { Effect, Result } from "effect"
import { createHash } from "node:crypto"
import { BenchmarkError, parseJson, runBenchmark, stringifyJson } from "./json.mjs"
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from "node:fs"
import { resolve, join, relative } from "node:path"
import { gzipSync, brotliCompressSync, constants } from "node:zlib"
import { pathToFileURL } from "node:url"

export const closure = (manifest, roots) => {
	const visited = new Set()
	const visit = (key) => {
		if (visited.has(key)) return Result.succeed(undefined)
		const chunk = manifest[key]
		if (!chunk)
			return Result.fail(
				new BenchmarkError({
					operation: "static-closure",
					message: `Missing manifest chunk: ${key}`,
				}),
			)
		visited.add(key)
		for (const imported of chunk.imports ?? []) {
			const result = visit(imported)
			if (Result.isFailure(result)) return result
		}
		return Result.succeed(undefined)
	}
	for (const root of roots) {
		const result = visit(root)
		if (Result.isFailure(result)) return result
	}
	return Result.succeed(visited)
}

export const analyzeBundle = (directory) =>
	Effect.try({
		try: () =>
			Result.gen(function* () {
				const manifest = parseJson(readFileSync(join(directory, ".vite/manifest.json"), "utf8"))
				const html = readFileSync(join(directory, "index.html"), "utf8")
				// Only scripts actually loaded by this document are startup roots. A Worker
				// entry or a separate document's entry does not belong in its static closure.
				const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/g)].map(
					(match) => match[1],
				)
				const entries = Object.entries(manifest).filter(
					([, chunk]) =>
						chunk.isEntry && scripts.some((src) => src.replace(/^\//, "") === chunk.file),
				)
				if (!entries.length)
					yield* Result.fail(
						new BenchmarkError({
							operation: "bundle",
							message: "No document scripts matched the production manifest",
						}),
					)
				const initial = yield* closure(
					manifest,
					entries.map(([key]) => key),
				)
				const filesFor = (keys) =>
					new Set(
						[...keys].map((key) => manifest[key].file).filter((file) => /\.[cm]?js$/.test(file)),
					)
				const initialFiles = filesFor(initial)
				const sizes = new Map()
				const cacheDirectory = process.env.BUNDLE_COMPRESSION_CACHE
				if (cacheDirectory) mkdirSync(cacheDirectory, { recursive: true })
				const measure = (files) => {
					let raw = 0,
						gzip = 0,
						brotli = 0
					for (const file of files) {
						let size = sizes.get(file)
						if (!size) {
							const data = readFileSync(join(directory, file))
							const hash = createHash("sha256").update(data).digest("hex")
							const cacheFile = cacheDirectory
								? join(cacheDirectory, `gzip9-br11-${hash}.json`)
								: undefined
							if (cacheFile && existsSync(cacheFile))
								size = parseJson(readFileSync(cacheFile, "utf8"))
							else {
								size = {
									raw: data.byteLength,
									gzip: gzipSync(data, { level: 9 }).byteLength,
									brotli: brotliCompressSync(data, {
										params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
									}).byteLength,
								}
								if (cacheFile) writeFileSync(cacheFile, stringifyJson(size))
							}
							sizes.set(file, size)
						}
						raw += size.raw
						gzip += size.gzip
						brotli += size.brotli
					}
					return { chunks: files.size, raw, gzip, brotli }
				}
				const allFiles = new Set()
				const walk = (dir) => {
					for (const name of readdirSync(dir)) {
						const path = join(dir, name)
						if (statSync(path).isDirectory()) walk(path)
						else if (/\.[cm]?js$/.test(path)) allFiles.add(relative(directory, path))
					}
				}
				walk(directory)
				const lazy = {}
				for (const [key, chunk] of Object.entries(manifest).filter(
					([, chunk]) => chunk.isDynamicEntry,
				)) {
					const payload = filesFor(yield* closure(manifest, [key]))
					for (const initialFile of initialFiles) payload.delete(initialFile)
					lazy[key] = {
						file: chunk.file,
						inStartup: initialFiles.has(chunk.file),
						...measure(payload),
					}
				}
				const initialSize = measure(initialFiles)
				const totalSize = measure(allFiles)

				return {
					compression: { gzipLevel: 9, brotliQuality: 11 },
					entries: entries.map(([key]) => key),
					initial: initialSize,
					total: totalSize,
					initialFiles: [...initialFiles].sort((left, right) => left.localeCompare(right)),
					lazy,
					largestInitial: [...initialFiles]
						.map((file) => ({ file, ...sizes.get(file) }))
						.sort((left, right) => right.raw - left.raw)
						.slice(0, 15),
				}
			}),
		catch: (cause) => new BenchmarkError({ operation: "bundle", message: String(cause) }),
	}).pipe(
		Effect.flatMap((result) =>
			Result.match(result, { onFailure: Effect.fail, onSuccess: Effect.succeed }),
		),
	)

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
	await runBenchmark("bundle", async () => {
		const result = await Effect.runPromise(analyzeBundle(resolve(process.argv[2] ?? "dist")))
		const json = stringifyJson(result)
		if (process.argv[3]) writeFileSync(resolve(process.argv[3]), json)
		console.log(json)
	})
}
