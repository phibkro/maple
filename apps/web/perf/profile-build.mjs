import { spawn } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { resolve, join } from "node:path"
import { performance } from "node:perf_hooks"
import { BenchmarkError, runBenchmark, stringifyJson } from "./json.mjs"

await runBenchmark("build", async () => {
	const destination = resolve(process.argv[2])
	const count = Number(process.argv[3] ?? 3)
	mkdirSync(destination, { recursive: true })
	const samples = []
	for (let index = 0; index < count; index += 1) {
		const start = performance.now()
		const child = spawn("bun", ["run", "--cwd", "apps/web", "build"], {
			stdio: ["ignore", "pipe", "pipe"],
		})
		let log = ""
		child.stdout.on("data", (chunk) => {
			log += chunk
		})
		child.stderr.on("data", (chunk) => {
			log += chunk
		})
		const code = await new Promise((resolve, reject) => {
			child.once("error", reject)
			child.once("exit", resolve)
		})
		const milliseconds = performance.now() - start
		writeFileSync(join(destination, `build-${index}.log`), log)
		if (code !== 0)
			return Promise.reject(
				new BenchmarkError({
					operation: "build",
					message: `Production build ${index} failed. Read ${destination}/build-${index}.log`,
				}),
			)
		samples.push({ index, milliseconds })
		writeFileSync(join(destination, "build-times.json"), stringifyJson(samples))
		console.log(stringifyJson({ index, milliseconds }))
	}
})
