import { implementPage } from "../../../lazy-page-contract"
import { contract } from "./page.contract"

import { contextChanged, init, routeChanged, update } from "./update"
import { titleOf, view } from "./view"
import { platformSource } from "../../../../shell/source-link"

/** `/infra/aws/$kind/$name`: one resource's charts; another resource is a new instance. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	contextChanged,
	view,
	source: () => platformSource("aws"),
	breadcrumbs: (model) => [
		{ label: "Infrastructure", href: "/infra" },
		{ label: "AWS", href: "/infra/aws" },
		{ label: titleOf(model) },
	],
})
