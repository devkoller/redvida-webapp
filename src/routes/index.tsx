import { createFileRoute } from "@tanstack/react-router"

import { Propuesta1Page } from "@/features/propuesta-1"

/** Portada: la landing narrativa. Ver `features/propuesta-1/index.tsx`. */
export const Route = createFileRoute("/")({
	component: Propuesta1Page,
})
