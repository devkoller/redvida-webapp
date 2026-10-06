import Markdown from "react-markdown"

import { ENDPOINTS } from "@/api/config"
import { useFetch } from "@/hooks/useFetch"
import type { AvisoPrivacidad } from "@/types/api"

/** Las versiones editadas desde el panel son HTML; las anteriores, Markdown. */
export const esHtml = (texto: string) => texto.trimStart().startsWith("<")

const formatearFecha = (iso: string | null) =>
	iso
		? new Date(iso).toLocaleDateString("es-MX", {
				day: "numeric",
				month: "long",
				year: "numeric",
			})
		: null

/**
 * Página pública del aviso de privacidad.
 *
 * El texto no está en el front: viene de `rv_aviso_privacidad`, que es la
 * versión efectivamente publicada. Así lo que lee el público y lo que quedó
 * registrado como vigente cuando alguien entregó sus datos son el mismo texto,
 * y no dos copias que pueden divergir.
 */
export function AvisoPrivacidadPage() {
	const { response: aviso, loading } = useFetch<AvisoPrivacidad>({
		url: ENDPOINTS.avisoPrivacidad,
		staleTime: 30 * 1000,
	})

	return (
		<div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
			{loading && <p className="text-muted-foreground">Cargando…</p>}

			{!loading && !aviso && (
				<div role="alert" className="border-destructive/40 bg-destructive/5 rounded-lg border p-4">
					<p className="text-destructive text-sm font-medium">
						No fue posible cargar el aviso de privacidad.
					</p>
				</div>
			)}

			{aviso && (
				<>
					<div className="text-muted-foreground mb-8 flex flex-wrap gap-x-4 gap-y-1 text-xs">
						<span>
							Versión <strong className="text-foreground">{aviso.version}</strong>
						</span>
						{aviso.vigente_desde && <span>Vigente desde {formatearFecha(aviso.vigente_desde)}</span>}
					</div>

					{esHtml(aviso.contenido) ? (
						<>
							<h1 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">
								Aviso de privacidad
							</h1>
							{/* El servidor lo sanitiza al guardar: lista blanca de etiquetas de formato. */}
							<article
								className="contenido-rico text-muted-foreground text-sm leading-relaxed"
								dangerouslySetInnerHTML={{ __html: aviso.contenido }}
							/>
						</>
					) : (
					<article className="space-y-3 text-sm leading-relaxed">
						<Markdown
							components={{
								h1: ({ children }) => (
									<h1 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">{children}</h1>
								),
								h2: ({ children }) => (
									<h2 className="text-primary-accent mt-8 mb-2 text-lg font-semibold">{children}</h2>
								),
								p: ({ children }) => <p className="text-muted-foreground">{children}</p>,
								ul: ({ children }) => (
									<ul className="text-muted-foreground list-disc space-y-1.5 pl-5">{children}</ul>
								),
								ol: ({ children }) => (
									<ol className="text-muted-foreground list-decimal space-y-1.5 pl-5">
										{children}
									</ol>
								),
								strong: ({ children }) => (
									<strong className="text-foreground font-semibold">{children}</strong>
								),
								code: ({ children }) => (
									<code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">{children}</code>
								),
								hr: () => <hr className="border-border my-6" />,
								blockquote: ({ children }) => (
									<blockquote className="border-warning bg-warning/10 text-foreground rounded-r border-l-4 px-4 py-3 text-sm">
										{children}
									</blockquote>
								),
							}}
						>
							{aviso.contenido}
						</Markdown>
					</article>
					)}
				</>
			)}
		</div>
	)
}

export default AvisoPrivacidadPage
