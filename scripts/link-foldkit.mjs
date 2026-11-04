import { Effect, Schema } from "effect"
/** Local two-repository development only. Lockfiles and package declarations stay unchanged. */
import {
	cpSync,
	existsSync,
	lstatSync,
	readdirSync,
	readFileSync,
	readlinkSync,
	renameSync,
	rmSync,
	writeFileSync,
} from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const source = resolve(process.argv[2] ?? join(root, "../foldkit"))
const unlink = process.argv.includes("--unlink")
const packages = [
	{ prefix: "foldkit@", name: "foldkit", path: "packages/foldkit" },
	{ prefix: "@foldkit+vite-plugin@", name: "@foldkit/vite-plugin", path: "packages/vite-plugin-foldkit" },
]
const Version = Schema.fromJsonString(Schema.Struct({ version: Schema.String }))
const readVersion = Schema.decodeUnknownSync(Version)
const marker = Schema.encodeSync(
	Schema.fromJsonString(Schema.Struct({ source: Schema.String, version: Schema.String })),
)
const store = join(root, "node_modules/.bun")
class LocalFoldkitError extends Schema.TaggedError()("@maple/scripts/LocalFoldkitError", {
	message: Schema.String,
	path: Schema.String,
}) {}
const failure = (message, path) => Effect.fail(new LocalFoldkitError({ message, path }))
const io = (path, operation) =>
	Effect.try({ try: operation, catch: (cause) => new LocalFoldkitError({ message: String(cause), path }) })
const main = Effect.gen(function* () {
	for (const pkg of packages) {
		const destination = join(source, pkg.path)
		if (!unlink && !existsSync(join(destination, "dist/index.js")))
			return yield* failure(`Build ${destination} before linking`, destination)
		const entries = yield* io(store, () =>
			readdirSync(store).filter((name) => name.startsWith(pkg.prefix)),
		)
		if (entries.length === 0)
			return yield* failure(`No installed ${pkg.name} packages found in ${store}`, store)
		for (const entry of entries) {
			const target = join(store, entry, "node_modules", pkg.name)
			const backup = `${target}.published`
			const isLink = yield* io(target, () => lstatSync(target).isSymbolicLink())
			if (unlink) {
				if (!existsSync(backup)) continue
				if (!isLink && !existsSync(join(target, ".foldkit-overlay.json")))
					return yield* failure(`Refusing to replace an unknown package: ${target}`, target)
				yield* io(target, () => rmSync(target, { recursive: true }))
				yield* io(target, () => renameSync(backup, target))
				yield* Effect.log(`Restored ${pkg.name}`)
				continue
			}
			const published = yield* io(target, () =>
				readVersion(readFileSync(join(target, "package.json"), "utf8")),
			)
			const local = yield* io(destination, () =>
				readVersion(readFileSync(join(destination, "package.json"), "utf8")),
			)
			if (published.version !== local.version)
				return yield* failure(
					`${pkg.name}: local ${local.version} does not match installed ${published.version}`,
					target,
				)
			if (isLink) {
				const link = yield* io(target, () => readlinkSync(target))
				if (resolve(dirname(target), link) !== destination)
					return yield* failure(`Refusing to replace an unknown link: ${target}`, target)
				if (!existsSync(backup))
					return yield* failure(`No preserved published package: ${target}`, target)
				yield* io(target, () => rmSync(target))
				yield* io(target, () => cpSync(backup, target, { recursive: true }))
			} else if (!existsSync(join(target, ".foldkit-overlay.json"))) {
				if (existsSync(backup))
					return yield* failure(`Preserved package already exists: ${backup}`, backup)
				yield* io(target, () => renameSync(target, backup))
				yield* io(target, () => cpSync(backup, target, { recursive: true }))
			}
			// Keep consumer peer resolution. Symlinking would resolve Effect from the
			// framework's workspace and introduce a second Effect runtime/type identity.
			yield* io(target, () => rmSync(join(target, "dist"), { recursive: true, force: true }))
			yield* io(target, () =>
				cpSync(join(destination, "dist"), join(target, "dist"), { recursive: true }),
			)
			yield* io(target, () =>
				writeFileSync(
					join(target, ".foldkit-overlay.json"),
					marker({ source: destination, version: local.version }),
				),
			)
			yield* Effect.log(
				`Overlaid ${pkg.name} ${local.version} from ${destination}; consumer dependencies retained`,
			)
		}
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
