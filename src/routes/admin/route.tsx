import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"
import { useEffect } from "react"

import { registrarCierreDeSesion } from "@/api/interceptores"
import { AdminShell } from "@/features/auth/AdminShell"
import { useSessionStore } from "@/stores/sessionStore"

/**
 * Guard de todo el panel administrativo.
 *
 * Es una comprobación **de navegación**, no de seguridad: solo evita mostrar
 * pantallas que no van a poder cargar datos. Quien manipule el store del
 * navegador podrá ver el armazón vacío del panel, pero cada petición seguirá
 * exigiendo un token válido y el permiso correspondiente en el servidor.
 */
export const Route = createFileRoute("/admin")({
	beforeLoad: ({ location }) => {
		if (!useSessionStore.getState().accessToken) {
			throw redirect({
				to: "/login",
				search: { redirigir: location.href },
				replace: true,
			})
		}
	},
	component: AdminLayout,
})

function AdminLayout() {
	const navegar = Route.useNavigate()

	// Si el refresh caduca o se revoca a mitad de sesión, el interceptor limpia
	// el store; esto es lo que saca al usuario del panel en ese momento en vez
	// de dejarlo ante una pantalla que falla en cada petición.
	useEffect(() => {
		registrarCierreDeSesion(() => {
			navegar({ to: "/login", replace: true })
		})
	}, [navegar])

	return (
		<AdminShell>
			<Outlet />
		</AdminShell>
	)
}
