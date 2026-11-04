import { implementPage } from "../../../lazy-page-contract"
import { contract } from "./page.contract"

import { contextChanged, init, routeChanged, update } from "./update"
import { view } from "./view"
import { platformSource } from "../../../../shell/source-link"

/** `/infra/planetscale/$dbName`: one database's branches; a new database is a new instance. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	contextChanged,
	view,
	source: () => platformSource("planetscale"),
	breadcrumbs: (model) => [
		{ label: "Infrastructure", href: "/infra" },
		{ label: "PlanetScale", href: "/infra/planetscale" },
		{ label: model.dbName },
	],
})
