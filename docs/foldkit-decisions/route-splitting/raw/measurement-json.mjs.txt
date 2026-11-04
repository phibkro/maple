import { Effect, Schema } from "effect"

// Artifact I/O uses the same typed JSON boundary as other repository scripts.
const Json = Schema.fromJsonString(Schema.Unknown)
export const parseJson = Schema.decodeUnknownSync(Json)
export const stringifyJson = Schema.encodeSync(Json)

export class BenchmarkError extends Schema.TaggedError()("@maple/perf/BenchmarkError", {
	message: Schema.String,
	operation: Schema.String,
}) {}

export const runBenchmark = (operation, run) =>
	Effect.runPromise(
		Effect.tryPromise({
			try: run,
			catch: (cause) =>
				cause instanceof BenchmarkError
					? cause
					: new BenchmarkError({ operation, message: String(cause) }),
		}).pipe(
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
