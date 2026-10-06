import { createFileRoute } from "@tanstack/react-router"

import { AvisoPrivacidadPage } from "@/features/aviso-privacidad"

export const Route = createFileRoute("/aviso-privacidad")({
	component: AvisoPrivacidadPage,
})
