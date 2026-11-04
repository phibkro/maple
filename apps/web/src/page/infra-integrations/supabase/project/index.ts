import { implementPage } from "../../../lazy-page-contract"
import { contract } from "./page.contract"

import { contextChanged, init, routeChanged, update } from "./update"
import { titleOf, view } from "./view"
import { platformSource } from "../../../../shell/source-link"

/** `/infra/supabase/$projectRef`: one project's charts; a new ref is a new instance. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	contextChanged,
	view,
	source: () => platformSource("supabase"),
	breadcrumbs: (model) => [
		{ label: "Infrastructure", href: "/infra" },
		{ label: "Supabase", href: "/infra/supabase" },
		{ label: titleOf(model) },
	],
})
