import { createFileRoute, redirect } from "@tanstack/react-router"

import { LoginPage } from "@/features/auth/LoginPage"
import { useSessionStore } from "@/stores/sessionStore"

export const Route = createFileRoute("/login")({
	// El tipo de retorno se anota a mano para que `redirigir` quede como
	// propiedad *opcional*: devolver `{ redirigir: undefined }` la haría
	// obligatoria y todo `navigate({ to: "/login" })` tendría que arrastrar un
	// `search` vacío.
	validateSearch: (busqueda: Record<string, unknown>): { redirigir?: string } =>
		typeof busqueda.redirigir === "string" ? { redirigir: busqueda.redirigir } : {},
	beforeLoad: ({ search }) => {
		// Con sesión abierta el login no tiene sentido: se pasa directo al panel.
		if (useSessionStore.getState().accessToken) {
			throw redirect({ to: search.redirigir || "/admin/dashboard", replace: true })
		}
	},
	component: LoginPage,
})
