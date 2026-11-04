import { implementPage } from "../../lazy-page-contract"
import { contract } from "./page.contract"

import { init, update } from "./update"
import { breadcrumbsOf, view } from "./view"

/** `/logs/$logId`: one instance per log key, so picking another log mounts a fresh page. */
export const page = implementPage(contract, {
	init,
	update,
	view,
	breadcrumbs: breadcrumbsOf,
})
