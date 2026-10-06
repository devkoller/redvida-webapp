import { Outlet, createRootRoute, useRouterState } from "@tanstack/react-router"

import { PublicFooter } from "@/components/public-footer"
import { PublicHeader } from "@/components/public-header"
import { Toaster } from "@/components/ui/sonner"

export const Route = createRootRoute({
	component: RootLayout,
	notFoundComponent: NotFound,
})

function RootLayout() {
	const ruta = useRouterState({ select: (estado) => estado.location.pathname })

	// El panel trae su propio encabezado, navegación y `<main>`. Envolverlo
	// además con el armazón público anidaría dos `<main id="contenido">`, lo que
	// rompe tanto el enlace de salto como la navegación por regiones del lector
	// de pantalla. El login sí conserva el armazón público: es la puerta de
	// entrada y conviene que mantenga la identidad y el vínculo al sitio.
	if (ruta.startsWith("/admin")) {
		return (
			<>
				{/* WCAG 2.4.1: permite saltar la navegación con teclado. */}
				<a href="#contenido" className="skip-link">
					Saltar al contenido
				</a>
				<Outlet />
				<Toaster richColors closeButton position="top-center" />
			</>
		)
	}

	return (
		<div className="flex min-h-dvh flex-col">
			{/* WCAG 2.4.1: permite saltar la navegación con teclado. */}
			<a href="#contenido" className="skip-link">
				Saltar al contenido
			</a>
			<PublicHeader />
			<main id="contenido" className="flex-1">
				<Outlet />
			</main>
			<PublicFooter />
			<Toaster richColors closeButton position="top-center" />
		</div>
	)
}

function NotFound() {
	return (
		<div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
			<p className="text-primary-accent text-sm font-semibold">Error 404</p>
			<h1 className="mt-2 text-3xl font-bold tracking-tight">No encontramos esta página</h1>
			<p className="text-muted-foreground mt-3">
				Es posible que el enlace haya cambiado o que la dirección esté mal escrita.
			</p>
			<a
				href="/"
				className="bg-primary text-primary-foreground mt-6 rounded-md px-5 py-2.5 text-sm font-medium"
			>
				Volver al inicio
			</a>
		</div>
	)
}
