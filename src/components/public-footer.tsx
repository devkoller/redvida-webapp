import { Link } from "@tanstack/react-router"

import { useTheme } from "@/components/theme-provider"
import { archivoDeLogo } from "@/lib/logos"

export function PublicFooter() {
	const { logo } = useTheme()
	const archivoLogo = archivoDeLogo(logo)

	return (
		<footer id="contacto" className="border-border/60 bg-muted/30 mt-auto scroll-mt-20 border-t">
			<div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
				<div>
					<div className="flex items-center gap-2.5">
						{archivoLogo ? (
							<img
								src={archivoLogo}
								alt=""
								aria-hidden
								className="size-9 shrink-0 object-contain"
							/>
						) : (
							<span
								aria-hidden
								className="bg-primary text-primary-foreground grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-bold"
							>
								RV
							</span>
						)}
						<span className="font-semibold tracking-tight">
							Red<span className="text-primary-accent">Vida</span>
						</span>
					</div>
					<p className="text-muted-foreground mt-3 max-w-xs text-sm leading-relaxed">
						Registro Público de Donadores Voluntarios de Células Madre Hematopoyéticas.
					</p>
				</div>

				<nav aria-label="Enlaces del sitio">
					<h2 className="text-sm font-semibold">El registro</h2>
					<ul className="text-muted-foreground mt-3 space-y-2 text-sm">
						<li>
							<Link to="/registro" className="hover:text-foreground transition-colors">
								Registrarme
							</Link>
						</li>
						<li>
							<Link to="/preguntas" className="hover:text-foreground transition-colors">
								Preguntas frecuentes
							</Link>
						</li>
						<li>
							<Link to="/registro/estatus" className="hover:text-foreground transition-colors">
								Consultar mi avance
							</Link>
						</li>
					</ul>
				</nav>

				<nav aria-label="Enlaces legales">
					<h2 className="text-sm font-semibold">Legal</h2>
					<ul className="text-muted-foreground mt-3 space-y-2 text-sm">
						<li>
							<a href="/aviso-privacidad" className="hover:text-foreground transition-colors">
								Aviso de privacidad
							</a>
						</li>
						<li>
							<a href="/derechos-arco" className="hover:text-foreground transition-colors">
								Derechos ARCO
							</a>
						</li>
					</ul>
					<p className="text-muted-foreground mt-4 text-xs leading-relaxed">
						La donación de células madre es <strong>voluntaria, altruista y gratuita</strong>. La
						Ley General de Salud prohíbe cualquier forma de lucro.
					</p>
				</nav>
			</div>

			<div className="border-border/60 border-t">
				<div className="text-muted-foreground mx-auto max-w-6xl px-4 py-5 text-xs sm:px-6">
					<p>
						Proyecto financiado por FODECIJAL para Atender Retos Sociales 2026 — COECyTJAL. Folio
						estatal 12207.
					</p>
				</div>
			</div>
		</footer>
	)
}

export default PublicFooter
