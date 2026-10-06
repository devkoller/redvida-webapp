import { createFileRoute } from "@tanstack/react-router"

import { CuentaPage } from "@/features/cuenta"

/**
 * La cuenta propia no lleva `RequierePermiso`: cualquiera con sesión debe poder
 * gestionar su segundo factor, incluso quien no tenga ninguna sección asignada.
 */
export const Route = createFileRoute("/admin/cuenta")({
	component: CuentaPage,
})
