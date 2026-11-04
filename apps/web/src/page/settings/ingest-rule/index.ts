import { implementPage } from "../../lazy-page-contract"
import { contract } from "./page.contract"

import { ingestionHref } from "./hrefs"

import { init, update } from "./update"
import { view } from "./view"

/** `/settings/ingestion/rules/new` and `/settings/ingestion/rules/:id`: one instance per rule, or the new one. */
export const page = implementPage(contract, {
	init,
	update,
	view,
	breadcrumbs: () => [
		{ label: "Settings", href: "/settings" },
		{ label: "Ingestion", href: ingestionHref() },
	],
})
