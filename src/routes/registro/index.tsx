import { createFileRoute } from "@tanstack/react-router"

import { RegistroPage } from "@/features/registro"

export const Route = createFileRoute("/registro/")({
	component: RegistroPage,
})
