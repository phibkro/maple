import { readFileSync } from "node:fs"
import { Effect, Schema } from "effect"
import {
	submodelCatalog,
	generateSubmodelCatalog,
	writeSubmodelCatalog,
} from "../apps/web/submodel-catalog.config.ts"
class CatalogError extends Schema.TaggedError()("@maple/scripts/SubmodelCatalogError", {
	message: Schema.String,
	path: Schema.String,
}) {}
const io = (operation) =>
	Effect.try({
		try: operation,
		catch: (cause) => new CatalogError({ message: String(cause), path: submodelCatalog.catalog }),
	})
const main = Effect.gen(function* () {
	if (process.argv.includes("--check")) {
		const current = yield* io(() => readFileSync(submodelCatalog.catalog, "utf8"))
		const generated = yield* io(() => generateSubmodelCatalog(submodelCatalog))
		if (current !== generated.code)
			return yield* Effect.fail(
				new CatalogError({
					message: "Submodel catalog is stale. Run bun run submodels:generate.",
					path: submodelCatalog.catalog,
				}),
			)
	} else {
		const result = yield* io(() => writeSubmodelCatalog(submodelCatalog))
		yield* Effect.log(`Generated ${result.contractFiles.length} lazy Submodel entries`)
	}
})
await Effect.runPromise(
	main.pipe(
		Effect.catch((error) =>
			Effect.logError(error.message).pipe(
				Effect.andThen(
					Effect.sync(() => {
						process.exitCode = 1
					}),
				),
			),
		),
	),
)
