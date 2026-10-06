import { createFileRoute } from "@tanstack/react-router"

import { DerechosArcoPage } from "@/features/arco/DerechosArcoPage"

export const Route = createFileRoute("/derechos-arco")({
	component: DerechosArcoPage,
})
