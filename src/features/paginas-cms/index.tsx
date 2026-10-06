import { Link } from "@tanstack/react-router"

import { ErrorState } from "@/components/layout/States"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { RenderBloque } from "@/features/landing/components/bloques"
import { useContenidoPagina } from "@/features/landing/data/contenido"

/**
 * Página pública servida desde el CMS, por `slug`.
 *
 * Es lo que se edita en /admin/contenido: mismos bloques que la portada, otra
 * ruta. Los bloques no traen `<h1>` (los títulos de sección son `<h2>`), así
 * que el título de la página va como encabezado de primer nivel oculto a la
 * vista: lectores de pantalla y buscadores tienen su `<h1>` sin duplicar el
 * título que el bloque ya muestra.
 */
export function PaginaCmsPublica({ slug }: { slug: string }) {
	const { data, isPending, isError, refetch } = useContenidoPagina(slug)

	if (isPending)
		return (
			<div className="mx-auto max-w-3xl space-y-6 px-4 py-20 sm:px-6" aria-busy="true">
				<Skeleton className="h-10 w-3/4" />
				<Skeleton className="h-20 w-full" />
				<Skeleton className="h-20 w-full" />
			</div>
		)

	if (isError)
		return (
			<div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
				<h1 className="sr-only">Página no disponible</h1>
				<ErrorState
					title="No pudimos cargar esta página."
					description="Inténtelo de nuevo en unos momentos."
					onRetry={() => refetch()}
				/>
				<div className="flex justify-center">
					<Button asChild variant="outline">
						<Link to="/">Ir al inicio</Link>
					</Button>
				</div>
			</div>
		)

	return (
		<>
			<h1 className="sr-only">{data.titulo}</h1>
			{data.bloques.map((bloque, indice) => (
				<RenderBloque key={`${bloque.tipo}-${indice}`} bloque={bloque} indice={indice} />
			))}
		</>
	)
}

export default PaginaCmsPublica
