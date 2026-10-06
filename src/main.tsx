import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { ApiError } from "@/api/fetchApi"
import { instalarInterceptoresGlobales } from "@/api/interceptores"
import { ThemeProvider } from "@/components/theme-provider"
import "./index.css"
import { routeTree } from "./routeTree.gen"

// Varias pantallas del panel usan el axios global en vez de `fetchApi`.
instalarInterceptoresGlobales()

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 10_000,
			refetchOnWindowFocus: false,
			retry: (intentos, error) => {
				// Un 4xx no mejora reintentando: los datos enviados son los que son.
				// Reintentar solo tiene sentido ante fallos de red o del servidor.
				const status = error instanceof ApiError ? error.status : 0
				if (status >= 400 && status < 500) return false
				return intentos < 2
			},
		},
		mutations: { retry: false },
	},
})

const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	scrollRestoration: true,
})

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router
	}
}

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<ThemeProvider>
				<RouterProvider router={router} />
			</ThemeProvider>
		</QueryClientProvider>
	</StrictMode>,
)
