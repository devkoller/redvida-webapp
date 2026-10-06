import { useBlocker, useNavigate } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { useMemo, useState } from "react"

import { BackLink, PageHeader, PageShell } from "@/components/layout/Page"
import { ErrorState } from "@/components/layout/States"
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
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RichText } from "@/components/ui/rich-text"
import { Skeleton } from "@/components/ui/skeleton"
import { usePublicarDocumento, useVersionDocumento, useVersionesDocumento } from "./api"
import type { ConfigDocumento } from "./config"
import { aHtmlEditable } from "./convertir"

/** Editor de la versión siguiente del aviso, partiendo de una versión existente. */
export function NuevaVersionDocumento({ doc, base }: { doc: ConfigDocumento; base?: string }) {
	const versiones = useVersionesDocumento(doc)
	const baseElegida = base ?? versiones.data?.find((v) => v.vigente)?.version
	const origen = useVersionDocumento(doc, baseElegida)

	const volver = <BackLink to={doc.rutaAdmin}>{doc.titulo}</BackLink>

	if (versiones.isError || origen.isError)
		return (
			<PageShell width="narrow">
				<PageHeader breadcrumb={volver} title={`Nueva versión: ${doc.titulo}`} />
				<Card>
					<CardContent>
						<ErrorState onRetry={() => (versiones.isError ? versiones.refetch() : origen.refetch())} />
					</CardContent>
				</Card>
			</PageShell>
		)

	if (!origen.data)
		return (
			<PageShell width="narrow">
				<PageHeader breadcrumb={volver} title={`Nueva versión: ${doc.titulo}`} />
				<Skeleton className="h-96 rounded-xl" />
			</PageShell>
		)

	// `key`: al cambiar de versión base el editor arranca con su texto.
	return <Editor key={origen.data.version} doc={doc} base={origen.data.version} contenidoBase={origen.data.contenido} />
}

function Editor({ doc, base, contenidoBase }: { doc: ConfigDocumento; base: string; contenidoBase: string }) {
	const navegar = useNavigate()
	const publicar = usePublicarDocumento(doc)
	const inicial = useMemo(() => aHtmlEditable(contenidoBase), [contenidoBase])
	const [original, setOriginal] = useState(inicial)
	const [contenido, setContenido] = useState(inicial)
	const [confirmando, setConfirmando] = useState(false)
	const sucio = contenido !== original

	const bloqueo = useBlocker({ shouldBlockFn: () => sucio, withResolver: true })

	const volver = () => navegar({ to: doc.rutaAdmin as never })
	const confirmar = () =>
		publicar.mutate(contenido, {
			onSuccess: () => {
				setOriginal(contenido)
				setConfirmando(false)
				// El guardián ya no estorba: el contenido quedó publicado.
				setTimeout(volver, 0)
			},
			onError: () => setConfirmando(false),
		})

	return (
		<PageShell width="narrow">
			<PageHeader
				breadcrumb={<BackLink to={doc.rutaAdmin}>{doc.titulo}</BackLink>}
				title={`Nueva versión: ${doc.titulo}`}
				description={`Parte del texto de la versión ${base}. Al publicar se crea la versión siguiente; ${base} queda en el historial.`}
			/>

			<form
				className="space-y-6"
				onSubmit={(e) => {
					e.preventDefault()
					if (sucio) setConfirmando(true)
				}}
			>
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Texto del documento</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<Label id="etiqueta-aviso" className="sr-only">
							Texto de {doc.titulo.toLowerCase()}
						</Label>
						<RichText
							value={contenido}
							onChange={setContenido}
							labelledBy="etiqueta-aviso"
							encabezados={[2, 3, 4]}
							extras
							className="[&_.ql-editor]:min-h-[28rem]"
						/>
						{doc.marcadores && (
							<p className="text-muted-foreground text-xs">
								Los marcadores <code>{doc.marcadores}</code> se sustituyen en el sitio con los datos del
								responsable configurados en cumplimiento; déjelos tal cual para que el texto siga vigente si
								esos datos cambian.
							</p>
						)}
					</CardContent>
				</Card>

				<div className="flex items-center justify-end gap-2">
					<span className="text-muted-foreground me-auto text-xs" aria-live="polite">
						{sucio ? "Hay cambios sin publicar" : "Sin cambios respecto a la versión base"}
					</span>
					<Button type="button" variant="outline" onClick={volver}>
						Cancelar
					</Button>
					<Button type="submit" disabled={!sucio || publicar.isPending}>
						Publicar nueva versión
					</Button>
				</div>
			</form>

			<AlertDialog open={confirmando} onOpenChange={(v) => !publicar.isPending && setConfirmando(v)}>
				<AlertDialogContent className="sm:max-w-md">
					<AlertDialogHeader>
						<AlertDialogTitle>Publicar una nueva versión: {doc.titulo}</AlertDialogTitle>
						<AlertDialogDescription>
							Es un documento legal. {doc.efecto} La versión {base} queda en el historial y la acción queda en la bitácora de auditoría.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={publicar.isPending}>Revisar de nuevo</AlertDialogCancel>
						<Button onClick={confirmar} disabled={publicar.isPending}>
							{publicar.isPending && <Loader2 className="size-4 animate-spin" />}
							Publicar versión
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog open={bloqueo.status === "blocked"}>
				<AlertDialogContent className="sm:max-w-md">
					<AlertDialogHeader>
						<AlertDialogTitle>Hay cambios sin publicar</AlertDialogTitle>
						<AlertDialogDescription>Si sale ahora, lo que escribió en el documento se perderá.</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => bloqueo.reset?.()}>Seguir editando</AlertDialogCancel>
						<AlertDialogAction onClick={() => bloqueo.proceed?.()}>Salir sin publicar</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</PageShell>
	)
}
