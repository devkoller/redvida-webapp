import { getRouteApi, useBlocker, useNavigate } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { useState } from "react"

import { BackLink, PageHeader, PageShell } from "@/components/layout/Page"
import { EmptyState, ErrorState } from "@/components/layout/States"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { usePermission } from "@/stores/sessionStore"
import { useBorrador, useOperacionesPagina } from "../api"
import { FormularioBloque } from "../components/formulario-bloque"
import { TIPOS_BLOQUE, type BloqueCms } from "../data/schema"

const ruta = getRouteApi("/admin/contenido/$paginaId/bloques/$bloqueId")

export function BloqueCmsPage() {
	const { paginaId, bloqueId } = ruta.useParams()
	const { data, isPending, isError, refetch } = useBorrador(Number(paginaId))

	const volver = <BackLink to={`/admin/contenido/${paginaId}`}>{data?.pagina.titulo ?? "Página"}</BackLink>

	if (isPending)
		return (
			<PageShell width="narrow">
				<PageHeader breadcrumb={volver} title="Cargando bloque…" />
				<Skeleton className="h-96 rounded-xl" />
			</PageShell>
		)
	if (isError)
		return (
			<PageShell width="narrow">
				<PageHeader breadcrumb={volver} title="Bloque" />
				<Card>
					<CardContent>
						<ErrorState onRetry={() => refetch()} />
					</CardContent>
				</Card>
			</PageShell>
		)

	const bloque = data.bloques.find((b) => b.id === Number(bloqueId))
	if (!bloque || !data.pagina.editable)
		return (
			<PageShell width="narrow">
				<PageHeader breadcrumb={volver} title="Bloque" />
				<Card>
					<CardContent>
						<EmptyState
							title={bloque ? "Esta página no es editable" : "Este bloque no existe"}
							description={bloque ? undefined : "Puede que se haya eliminado del borrador."}
						/>
					</CardContent>
				</Card>
			</PageShell>
		)

	// `key`: al pasar de un bloque a otro el formulario arranca limpio.
	return <Editor key={bloque.id} bloque={bloque} paginaId={Number(paginaId)} titulo={data.pagina.titulo} slugPagina={data.pagina.slug} />
}

function Editor({
	bloque,
	paginaId,
	titulo,
	slugPagina,
}: {
	bloque: BloqueCms
	paginaId: number
	titulo: string
	slugPagina: string
}) {
	const navegar = useNavigate()
	const puedeEscribir = usePermission("cms:write")
	const { guardarBloque } = useOperacionesPagina(paginaId)
	const definicion = TIPOS_BLOQUE[bloque.tipo]

	const [original, setOriginal] = useState<Record<string, any>>(bloque.contenido ?? {})
	const [contenido, setContenido] = useState(original)
	const sucio = JSON.stringify(contenido) !== JSON.stringify(original)

	// El historial del navegador ya no se pierde por accidente: si hay cambios sin
	// guardar, "atrás" y los enlaces piden confirmación en vez de tirar lo escrito.
	const bloqueo = useBlocker({ shouldBlockFn: () => sucio, withResolver: true })

	const volver = () => navegar({ to: "/admin/contenido/$paginaId", params: { paginaId: String(paginaId) } })

	const guardar = () =>
		guardarBloque.mutate(
			{ id: bloque.id, contenido },
			{ onSuccess: () => setOriginal(contenido) },
		)

	return (
		<PageShell width="narrow">
			<PageHeader
				breadcrumb={<BackLink to={`/admin/contenido/${paginaId}`}>{titulo}</BackLink>}
				title={definicion?.etiqueta ?? bloque.tipo}
				description={definicion?.descripcion}
				actions={!bloque.visible && <Badge variant="secondary">Oculto en el sitio</Badge>}
			/>

			{!definicion ? (
				<Card>
					<CardContent>
						<EmptyState title="Este tipo de bloque no tiene editor" description={`Tipo: ${bloque.tipo}`} />
					</CardContent>
				</Card>
			) : (
				<form
					className="space-y-6"
					onSubmit={(e) => {
						e.preventDefault()
						if (puedeEscribir && sucio) guardar()
					}}
				>
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Contenido</CardTitle>
						</CardHeader>
						<CardContent>
							<fieldset disabled={!puedeEscribir} className="min-w-0">
								<FormularioBloque bloque={bloque} contenido={contenido} onCambio={setContenido} soloLectura={!puedeEscribir} slugPagina={slugPagina} />
							</fieldset>
						</CardContent>
					</Card>

					<div className="flex items-center justify-end gap-2">
						<span className="text-muted-foreground me-auto text-xs" aria-live="polite">
							{sucio ? "Hay cambios sin guardar" : "Todo guardado"}
						</span>
						<Button type="button" variant="outline" onClick={volver}>
							{sucio ? "Cancelar" : "Volver a la página"}
						</Button>
						{puedeEscribir && (
							<Button type="submit" disabled={!sucio || guardarBloque.isPending}>
								{guardarBloque.isPending && <Loader2 className="size-4 animate-spin" />}
								Guardar bloque
							</Button>
						)}
					</div>
				</form>
			)}

			<AlertDialog open={bloqueo.status === "blocked"}>
				<AlertDialogContent className="sm:max-w-md">
					<AlertDialogHeader>
						<AlertDialogTitle>Hay cambios sin guardar</AlertDialogTitle>
						<AlertDialogDescription>
							Si sale ahora, lo que escribió en este bloque se perderá.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => bloqueo.reset?.()}>Seguir editando</AlertDialogCancel>
						<AlertDialogAction onClick={() => bloqueo.proceed?.()}>Salir sin guardar</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</PageShell>
	)
}
