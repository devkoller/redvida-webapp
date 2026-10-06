import { createFileRoute } from "@tanstack/react-router"

import { PaginaCmsPublica } from "@/features/paginas-cms"

export const Route = createFileRoute("/preguntas")({
	component: () => <PaginaCmsPublica slug="preguntas" />,
})
