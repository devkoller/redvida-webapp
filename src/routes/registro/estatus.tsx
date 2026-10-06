import { createFileRoute } from "@tanstack/react-router"

import { EstatusPage } from "@/features/estatus"

export const Route = createFileRoute("/registro/estatus")({
	component: EstatusPage,
})
