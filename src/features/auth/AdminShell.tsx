import { Link, useNavigate } from "@tanstack/react-router"
import { LogOut, Menu, UserCog, X } from "lucide-react"
import { useState } from "react"

import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { archivoDeLogo } from "@/lib/logos"
import { useSessionStore } from "@/stores/sessionStore"
import { logout } from "./api"
import { seccionesVisibles } from "./secciones"

/**
 * Marca del panel.
 *
 * Apunta al sitio **público** (`/`), no a `/admin`: quien está operando el
 * panel y quiere ver cómo luce la portada —o salir de la parte administrativa
 * sin cerrar sesión— necesita una salida directa. `/admin` ya se llega desde
 * el resto de la navegación.
 */
function Marca() {
	const { logo } = useTheme()
	const archivoLogo = archivoDeLogo(logo)
	return (
		<Link
			to="/"
			className="flex shrink-0 items-center gap-2 font-semibold tracking-tight"
			aria-label="RedVida, ir al sitio público"
		>
			{archivoLogo ? (
				<img src={archivoLogo} alt="" aria-hidden className="size-6 object-contain" />
			) : (
				<span
					aria-hidden
					className="bg-primary text-primary-foreground grid size-6 place-items-center rounded text-[10px] font-bold"
				>
					RV
				</span>
			)}
			Red<span className="text-primary-accent">Vida</span>
			<span className="text-muted-foreground text-xs font-normal">Panel</span>
		</Link>
	)
}

/** Lista de secciones, compartida entre la sidebar de escritorio y el panel móvil. */
function NavLinks({ onNavegar }: { onNavegar?: () => void }) {
	const usuario = useSessionStore((estado) => estado.usuario)
	const visibles = seccionesVisibles(usuario)

	return (
		<nav aria-label="Secciones del panel" className="flex flex-col gap-1">
			{visibles.map(({ titulo, ruta, icono: Icono }) => (
				<Link
					key={ruta}
					to={ruta}
					onClick={onNavegar}
					className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
					activeProps={{ className: "bg-muted text-foreground font-medium" }}
				>
					<Icono className="size-4 shrink-0" aria-hidden="true" />
					{titulo}
				</Link>
			))}
		</nav>
	)
}

/**
 * Avatar + menú de cuenta.
 *
 * `align="start"` cuando vive al pie de la sidebar (se abre hacia la derecha,
 * no fuera de pantalla). `compacto` la reduce a solo el avatar —para la barra
 * superior de móvil, donde el nombre completo no tiene dónde truncarse: el
 * botón vive en un contenedor de ancho libre (`ml-auto`), no en una columna
 * fija como la sidebar.
 */
function CuentaMenu({ align, compacto = false }: { align: "start" | "end"; compacto?: boolean }) {
	const navigate = useNavigate()
	const usuario = useSessionStore((estado) => estado.usuario)
	const refreshToken = useSessionStore((estado) => estado.refreshToken)
	const cerrar = useSessionStore((estado) => estado.cerrar)

	const salir = async () => {
		// Se intenta revocar el refresh en el servidor, pero la sesión local se
		// cierra pase lo que pase: si la red falla, lo último que queremos es
		// dejar al usuario dentro del panel creyendo que ya salió.
		try {
			if (refreshToken) await logout(refreshToken)
		} catch {
			/* la sesión local se cierra igual */
		}
		cerrar()
		navigate({ to: "/login", replace: true })
	}

	const iniciales = (usuario?.nombre || usuario?.usuario || "?")
		.split(" ")
		.slice(0, 2)
		.map((parte) => parte[0]?.toUpperCase())
		.join("")

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size={compacto ? "icon" : "sm"}
					className={compacto ? "rounded-full" : "w-full justify-start gap-2 px-2"}
					aria-label={compacto ? "Menú de la cuenta" : undefined}
				>
					<span
						className="bg-primary/10 text-primary-accent flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
						aria-hidden="true"
					>
						{iniciales}
					</span>
					{!compacto && (
						<span className="min-w-0 flex-1 truncate text-left">{usuario?.nombre}</span>
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align={align} className="w-64">
				<DropdownMenuLabel className="font-normal">
					<p className="font-medium">{usuario?.nombre}</p>
					<p className="text-muted-foreground text-xs">{usuario?.email}</p>
					<p className="text-muted-foreground mt-1 text-xs">{usuario?.roles.join(" · ")}</p>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link to="/admin/cuenta">
						<UserCog className="mr-2 size-4" aria-hidden="true" />
						Mi cuenta y seguridad
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem onSelect={salir}>
					<LogOut className="mr-2 size-4" aria-hidden="true" />
					Cerrar sesión
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

/**
 * Armazón del panel administrativo: sidebar fija en escritorio.
 *
 * Antes era una barra horizontal en el header, pero el número de secciones ya
 * no cabe ahí (RV-10). En móvil la sidebar se vuelve un panel deslizante,
 * como en `PublicHeader`, sirviéndose del mismo patrón (backdrop + toggle).
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
	const [abierto, setAbierto] = useState(false)

	return (
		<div className="min-h-dvh">
			{/* Sidebar de escritorio: fija, a todo el alto. */}
			<aside className="bg-background fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r md:flex">
				<div className="flex h-14 items-center border-b px-4">
					<Marca />
				</div>
				<div className="flex-1 overflow-y-auto p-3">
					<NavLinks />
				</div>
				<div className="border-t p-3">
					<CuentaMenu align="start" />
				</div>
			</aside>

			{/* Barra superior solo en móvil: abre la sidebar como panel deslizante. */}
			<header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 flex h-14 items-center gap-2 border-b px-2 backdrop-blur md:hidden">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => setAbierto(true)}
					aria-label="Abrir menú del panel"
					aria-expanded={abierto}
					aria-controls="sidebar-movil"
				>
					<Menu className="size-5" aria-hidden="true" />
				</Button>
				<Marca />
				<div className="ml-auto">
					<CuentaMenu align="end" compacto />
				</div>
			</header>

			{/* Panel deslizante de móvil: backdrop + sidebar que entra desde la izquierda. */}
			{abierto && (
				<div className="fixed inset-0 z-50 md:hidden">
					<button
						type="button"
						className="absolute inset-0 bg-black/40"
						aria-label="Cerrar menú"
						onClick={() => setAbierto(false)}
					/>
					<div
						id="sidebar-movil"
						className="bg-background absolute inset-y-0 left-0 flex w-72 max-w-[80vw] flex-col border-r shadow-xl"
					>
						<div className="flex h-14 items-center justify-between border-b px-4">
							<Marca />
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setAbierto(false)}
								aria-label="Cerrar menú"
							>
								<X className="size-5" aria-hidden="true" />
							</Button>
						</div>
						<div className="flex-1 overflow-y-auto p-3">
							<NavLinks onNavegar={() => setAbierto(false)} />
						</div>
					</div>
				</div>
			)}

			<main id="contenido" className="md:pl-64">
				{children}
			</main>
		</div>
	)
}
