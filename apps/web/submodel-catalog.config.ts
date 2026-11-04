import path from "node:path"
import type { SubmodelCatalogOptions } from "@foldkit/vite-plugin"
export { generateSubmodelCatalog, writeSubmodelCatalog } from "@foldkit/vite-plugin"

export const submodelCatalog: SubmodelCatalogOptions = {
	directory: path.join(import.meta.dirname, "src/page"),
	catalog: path.join(import.meta.dirname, "src/page/lazy-catalog.generated.ts"),
	factoryModule: "./lazy-page",
	factoryExport: "createLazyPage",
	implementationFile: "index.ts",
	implementationExport: "page",
}
