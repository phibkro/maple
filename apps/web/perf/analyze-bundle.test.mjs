import { Result } from "effect"
import { test } from "node:test"
import assert from "node:assert/strict"
import { closure } from "./analyze-bundle.mjs"

await test("startup follows static imports, deduplicates cycles, and excludes lazy routes", () => {
	const graph = {
		shell: { imports: ["runtime", "shared"], dynamicImports: ["route"] },
		runtime: { imports: ["shared"] },
		shared: { imports: ["runtime"] },
		route: { imports: ["shared", "heavy"] },
		heavy: {},
	}
	assert.deepEqual(
		[...Result.getOrThrow(closure(graph, ["shell"]))].sort((left, right) => left.localeCompare(right)),
		["runtime", "shared", "shell"],
	)
	assert.deepEqual(
		[...Result.getOrThrow(closure(graph, ["route"]))].sort((left, right) => left.localeCompare(right)),
		["heavy", "route", "runtime", "shared"],
	)
})

await test("missing static dependencies invalidate the measurement", () => {
	const result = closure({ shell: { imports: ["missing"] } }, ["shell"])
	assert.equal(Result.isFailure(result), true)
	Result.match(result, {
		onFailure: (error) => assert.match(error.message, /Missing manifest chunk/),
		onSuccess: () => assert.fail("Expected invalid manifest failure"),
	})
})
