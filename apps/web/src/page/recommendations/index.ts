import { implementPage } from "../lazy-page-contract"
import { contract } from "./page.contract"

import { init, update } from "./update"
import { breadcrumbsOf, view } from "./view"

/** `/recommendations/$recommendationKey`: one instance per recommendation. */
export const page = implementPage(contract, {
	init,
	update,
	view,
	breadcrumbs: breadcrumbsOf,
})
