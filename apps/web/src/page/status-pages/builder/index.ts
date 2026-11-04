import { implementPage } from "../../lazy-page-contract"
import { contract } from "./page.contract"

import { statusPagesHref } from "../shared/commands"

import { init, update } from "./update"
import { view } from "./view"

/** `/status-pages/new`: the one-screen builder. */
export const page = implementPage(contract, {
	init,
	update,
	view,
	breadcrumbs: () => [
		{ label: "Status pages", href: statusPagesHref() },
		{ label: "New", isPageHeading: true },
	],
})
