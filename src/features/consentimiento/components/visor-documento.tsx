import { ArrowDown, Check } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import Markdown from "react-markdown"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Visor del documento con **lectura obligatoria**.
 *
 * Un `IntersectionObserver` vigila un centinela colocado al final del texto.
 * Mientras no entre en el viewport del contenedor, `onLeido` no se dispara y el
 * botón de aceptar sigue deshabilitado: no debe existir forma de consentir sin
 * haber recorrido el documento.
 *
 * El observador se ancla al contenedor con scroll (`root`), no al viewport de
 * la página: el documento vive dentro de una caja con su propio scroll.
 */
export function VisorDocumento({
	contenido,
	leido,
	onLeido,
}: {
	contenido: string
	leido: boolean
	onLeido: () => void
}) {
	const contenedorRef = useRef<HTMLDivElement>(null)
	const centinelaRef = useRef<HTMLDivElement>(null)
	const [alFinal, setAlFinal] = useState(false)

	useEffect(() => {
		const contenedor = contenedorRef.current
		const centinela = centinelaRef.current
		if (!contenedor || !centinela) return

		const observador = new IntersectionObserver(
			([entrada]) => {
				if (entrada?.isIntersecting) {
					setAlFinal(true)
					onLeido()
				} else {
					setAlFinal(false)
				}
			},
			{ root: contenedor, threshold: 0.9 },
		)

		observador.observe(centinela)
		return () => observador.disconnect()
	}, [onLeido, contenido])

	const irAlFinal = () => {
		centinelaRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
	}

	return (
		<div className="relative">
			<div
				ref={contenedorRef}
				tabIndex={0}
				role="region"
				aria-label="Documento de consentimiento informado"
				className={cn(
					"border-input bg-card h-[26rem] overflow-y-auto rounded-lg border p-5 sm:p-6",
					"prose-headings:font-semibold",
				)}
			>
				<div className="space-y-3 text-sm leading-relaxed">
					{/* Las versiones editadas desde el panel son HTML (sanitizado en el
					    servidor); la inicial, Markdown. */}
					{contenido.trimStart().startsWith("<") ? (
						<div
							className="contenido-rico text-muted-foreground"
							dangerouslySetInnerHTML={{ __html: contenido }}
						/>
					) : (
					<Markdown
						components={{
							h1: ({ children }) => (
								<h2 className="mt-1 mb-3 text-lg font-bold tracking-tight">{children}</h2>
							),
							h2: ({ children }) => (
								<h3 className="text-primary-accent mt-6 mb-2 text-base font-semibold">{children}</h3>
							),
							p: ({ children }) => <p className="text-muted-foreground">{children}</p>,
							ul: ({ children }) => (
								<ul className="text-muted-foreground list-disc space-y-1.5 pl-5">{children}</ul>
							),
							ol: ({ children }) => (
								<ol className="text-muted-foreground list-decimal space-y-1.5 pl-5">{children}</ol>
							),
							strong: ({ children }) => (
								<strong className="text-foreground font-semibold">{children}</strong>
							),
							hr: () => <hr className="border-border my-5" />,
							blockquote: ({ children }) => (
								<blockquote className="border-warning bg-warning/10 text-foreground rounded-r border-l-4 py-2 pl-4 text-sm">
									{children}
								</blockquote>
							),
						}}
					>
						{contenido}
					</Markdown>
					)}

					{/* Centinela: al hacerse visible se marca el documento como leído. */}
					<div ref={centinelaRef} className="h-1" aria-hidden />
				</div>
			</div>

			{/* Indicador de que falta contenido por leer. */}
			{!alFinal && (
				<div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-3">
					<Button
						type="button"
						size="sm"
						variant="secondary"
						onClick={irAlFinal}
						className="pointer-events-auto shadow-md"
					>
						<ArrowDown className="size-4" />
						Continuar leyendo
					</Button>
				</div>
			)}

			<p
				className={cn(
					"mt-2 flex items-center gap-1.5 text-xs",
					leido ? "text-success" : "text-muted-foreground",
				)}
				aria-live="polite"
			>
				{leido ? (
					<>
						<Check className="size-3.5" />
						Documento leído por completo
					</>
				) : (
					"Debe leer el documento hasta el final para poder aceptarlo"
				)}
			</p>
		</div>
	)
}

export default VisorDocumento
