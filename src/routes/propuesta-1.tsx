import { createFileRoute, redirect } from "@tanstack/react-router"

/**
 * `/propuesta-1` fue la ruta de la propuesta de rediseño; ahora es la portada.
 * Se conserva como redirección para que los enlaces ya compartidos sigan
 * funcionando.
 */
export const Route = createFileRoute("/propuesta-1")({
	beforeLoad: () => {
		throw redirect({ to: "/", replace: true })
	},
})
