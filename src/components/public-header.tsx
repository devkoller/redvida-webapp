import { Link } from "@tanstack/react-router"
import { LayoutDashboard, Moon, Sun } from "lucide-react"

import { SelectorLogo } from "@/components/selector-logo"
import { SelectorPaleta } from "@/components/selector-paleta"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { archivoDeLogo } from "@/lib/logos"
import { useSessionStore } from "@/stores/sessionStore"

export function PublicHeader() {
	const { resolved, setTheme, logo } = useTheme()
	const archivoLogo = archivoDeLogo(logo)
	// Solo dice si HAY una sesión guardada en este equipo, para decidir si se
	// muestra el botón de acceso al panel. No es una comprobación de seguridad:
	// esa la hace el propio panel al cargar (ver `route.tsx` de `/admin`), así
	// que un token vencido simplemente redirige a `/login` al llegar allá.
	const hayPanel = useSessionStore((estado) => !!estado.accessToken)
	return (
		<header className="border-border/60 bg-background/85 sticky top-0 z-40 border-b backdrop-blur">
			<div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
				<Link to="/" className="flex items-center gap-2.5" aria-label="RedVida, ir al inicio">
					{archivoLogo ? (
						<img src={archivoLogo} alt="" aria-hidden className="size-9 shrink-0 object-contain" />
					) : (
						<span
							aria-hidden
							className="bg-primary text-primary-foreground grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-bold"
						>
							RV
						</span>
					)}
					<span className="text-base leading-tight font-semibold tracking-tight">
						Red<span className="text-primary-accent">Vida</span>
					</span>
				</Link>

				<div className="flex items-center gap-2">
					{/* En pantallas angostas el selector de logotipo no cabe junto al botón de registro, que es lo que importa. */}
					<div className="max-sm:hidden">
						<SelectorLogo />
					</div>
					<SelectorPaleta />

					<Button
						variant="ghost"
						size="icon"
						onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
						aria-label={resolved === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
					>
						{resolved === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
					</Button>

					{hayPanel && (
						<Button asChild variant="outline" className="hidden sm:inline-flex">
							<Link to="/admin">
								<LayoutDashboard className="size-4" aria-hidden="true" />
								Ir al panel
							</Link>
						</Button>
					)}

					<Button asChild>
						<Link to="/registro">Registrarme</Link>
					</Button>

				</div>
			</div>

		</header>
	)
}

export default PublicHeader
