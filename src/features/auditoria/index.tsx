import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { ChevronLeft, ChevronRight, Download, Eye, Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { API_URL, ENDPOINTS } from "@/api/config"
import fetchApi from "@/api/fetchApi"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { useSessionStore } from "@/stores/sessionStore"

interface EventoAuditoria {
	id: string
	usuario_id: number | null
	usuario_nombre: string | null
	accion: string
	entidad: string
	entidad_id: string | null
	datos_antes: unknown
	datos_despues: unknown
	ip: string | null
	user_agent: string | null
	ruta: string | null
	metodo_http: string | null
	createdAt: string
}

interface Facetas {
	acciones: { accion: string; total: string }[]
	entidades: string[]
	usuarios: { usuario_id: number; usuario_nombre: string }[]
}

/** Acciones que merecen destacarse: tocan identidad o consentimiento. */
const ACCIONES_CRITICAS = new Set([
	"identidad_revelada",
	"consentimiento_revocado",
	"acceso_denegado",
	"auditoria_exportada",
	"donador_suprimido",
	"retencion_aplicada",
])

const SIN_FILTRO = "__todos__"

export function AuditoriaPage() {
	const [filtros, setFiltros] = useState({
		accion: SIN_FILTRO,
		entidad: SIN_FILTRO,
		usuario_id: SIN_FILTRO,
		desde: "",
		hasta: "",
		texto: "",
	})
	const [pagina, setPagina] = useState(1)
	const [detalle, setDetalle] = useState<EventoAuditoria | null>(null)
	const [exportando, setExportando] = useState(false)

	const { data: facetas } = useQuery({
		queryKey: ["auditoria", "facetas"],
		queryFn: () => fetchApi.get<Facetas>(ENDPOINTS.auditoriaFacetas),
		staleTime: 5 * 60 * 1000,
	})

	const consulta = limpiar({ ...filtros, pagina })

	const { data, isFetching } = useQuery({
		queryKey: ["auditoria", "lista", consulta],
		queryFn: () =>
			fetchApi.get<{
				eventos: EventoAuditoria[]
				total: number
				pagina: number
				total_paginas: number
			}>(ENDPOINTS.auditoria, { qs: consulta }),
		placeholderData: keepPreviousData,
	})

	const actualizar = (clave: keyof typeof filtros, valor: string) => {
		setFiltros((previo) => ({ ...previo, [clave]: valor }))
		setPagina(1)
	}

	/**
	 * La exportación no pasa por `fetchApi`: devuelve un CSV, no el sobre JSON.
	 * Se usa `fetch` directo con el token, y el blob se descarga en el navegador.
	 */
	const exportar = async () => {
		setExportando(true)
		try {
			const parametros = new URLSearchParams(
				Object.entries(limpiar(filtros)).map(([k, v]) => [k, String(v)]),
			)
			const respuesta = await fetch(`${API_URL}${ENDPOINTS.auditoriaExportar}?${parametros}`, {
				headers: { Authorization: `Bearer ${useSessionStore.getState().accessToken}` },
			})
			if (!respuesta.ok) throw new Error("La exportación falló")

			const truncado = respuesta.headers.get("X-Export-Truncado")
			const blob = await respuesta.blob()
			const url = URL.createObjectURL(blob)
			const enlace = document.createElement("a")
			enlace.href = url
			enlace.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`
			enlace.click()
			URL.revokeObjectURL(url)

			if (truncado) {
				toast.warning(
					`La exportación se cortó en ${Number(truncado).toLocaleString("es-MX")} filas. Acote el rango de fechas para obtener el resto.`,
				)
			} else {
				toast.success("Exportación descargada")
			}
		} catch {
			toast.error("No fue posible exportar la bitácora")
		} finally {
			setExportando(false)
		}
	}

	return (
		<div className="mx-auto max-w-7xl px-4 py-8">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Bitácora de auditoría</h1>
					<p className="text-muted-foreground mt-2">
						Quién accedió a qué, cuándo y desde dónde. Los registros no se pueden modificar ni
						borrar, tampoco desde aquí.
					</p>
				</div>
				<Button variant="outline" onClick={exportar} disabled={exportando}>
					{exportando ? (
						<Loader2 className="size-4 animate-spin" aria-hidden="true" />
					) : (
						<Download className="size-4" aria-hidden="true" />
					)}
					Exportar a CSV
				</Button>
			</div>

			<Card className="mt-6">
				<CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
					<Filtro etiqueta="Acción" id="f-accion">
						<Select value={filtros.accion} onValueChange={(v) => actualizar("accion", v)}>
							<SelectTrigger id="f-accion">
								<SelectValue placeholder="Todas" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={SIN_FILTRO}>Todas</SelectItem>
								{facetas?.acciones.map(({ accion, total }) => (
									<SelectItem key={accion} value={accion}>
										{accion} ({total})
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Filtro>

					<Filtro etiqueta="Entidad" id="f-entidad">
						<Select value={filtros.entidad} onValueChange={(v) => actualizar("entidad", v)}>
							<SelectTrigger id="f-entidad">
								<SelectValue placeholder="Todas" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={SIN_FILTRO}>Todas</SelectItem>
								{facetas?.entidades.map((entidad) => (
									<SelectItem key={entidad} value={entidad}>
										{entidad}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Filtro>

					<Filtro etiqueta="Usuario" id="f-usuario">
						<Select value={filtros.usuario_id} onValueChange={(v) => actualizar("usuario_id", v)}>
							<SelectTrigger id="f-usuario">
								<SelectValue placeholder="Todos" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={SIN_FILTRO}>Todos</SelectItem>
								{facetas?.usuarios.map((usuario) => (
									<SelectItem key={usuario.usuario_id} value={String(usuario.usuario_id)}>
										{usuario.usuario_nombre}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Filtro>

					<Filtro etiqueta="Desde" id="f-desde">
						<Input
							id="f-desde"
							type="date"
							value={filtros.desde}
							onChange={(e) => actualizar("desde", e.target.value)}
						/>
					</Filtro>

					<Filtro etiqueta="Hasta" id="f-hasta">
						<Input
							id="f-hasta"
							type="date"
							value={filtros.hasta}
							onChange={(e) => actualizar("hasta", e.target.value)}
						/>
					</Filtro>

					<Filtro etiqueta="Buscar (usuario, ruta, identificador)" id="f-texto">
						<Input
							id="f-texto"
							value={filtros.texto}
							onChange={(e) => actualizar("texto", e.target.value)}
							placeholder="RVMX-…, /v1/admin/…"
						/>
					</Filtro>
				</CardContent>
			</Card>

			<div className="text-muted-foreground mt-4 flex items-center gap-2 text-sm" aria-live="polite">
				{isFetching && <Loader2 className="size-3 animate-spin" aria-hidden="true" />}
				{data ? `${data.total.toLocaleString("es-MX")} eventos` : "Cargando…"}
			</div>

			<Card className="mt-2">
				<CardContent className="p-0">
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Fecha</TableHead>
									<TableHead>Usuario</TableHead>
									<TableHead>Acción</TableHead>
									<TableHead>Entidad</TableHead>
									<TableHead>Identificador</TableHead>
									<TableHead>Origen</TableHead>
									<TableHead className="text-right">Detalle</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data?.eventos.map((evento) => (
									<TableRow key={evento.id}>
										<TableCell className="whitespace-nowrap text-xs">
											{new Date(evento.createdAt).toLocaleString("es-MX")}
										</TableCell>
										<TableCell className="text-sm">
											{evento.usuario_nombre ?? (
												<span className="text-muted-foreground">sin sesión</span>
											)}
										</TableCell>
										<TableCell>
											<Badge
												variant="outline"
												className={
													ACCIONES_CRITICAS.has(evento.accion)
														? "border-destructive/40 bg-destructive/10 text-destructive"
														: ""
												}
											>
												{evento.accion}
											</Badge>
										</TableCell>
										<TableCell className="text-sm">{evento.entidad}</TableCell>
										<TableCell className="font-mono text-xs">{evento.entidad_id ?? "—"}</TableCell>
										<TableCell className="font-mono text-xs">{evento.ip ?? "—"}</TableCell>
										<TableCell className="text-right">
											<Button variant="ghost" size="sm" onClick={() => setDetalle(evento)}>
												<Eye className="size-4" aria-hidden="true" />
												<span className="sr-only">Ver detalle del evento {evento.id}</span>
											</Button>
										</TableCell>
									</TableRow>
								))}
								{data && !data.eventos.length && (
									<TableRow>
										<TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
											Ningún evento coincide con los filtros.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>

			{data && data.total_paginas > 1 && (
				<nav className="mt-4 flex items-center justify-between" aria-label="Paginación">
					<Button
						variant="outline"
						size="sm"
						onClick={() => setPagina((p) => Math.max(1, p - 1))}
						disabled={pagina === 1}
					>
						<ChevronLeft className="size-4" aria-hidden="true" />
						Anterior
					</Button>
					<span className="text-muted-foreground text-sm">
						Página {data.pagina} de {data.total_paginas}
					</span>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setPagina((p) => Math.min(data.total_paginas, p + 1))}
						disabled={pagina >= data.total_paginas}
					>
						Siguiente
						<ChevronRight className="size-4" aria-hidden="true" />
					</Button>
				</nav>
			)}

			{detalle && <DetalleEvento evento={detalle} alCerrar={() => setDetalle(null)} />}
		</div>
	)
}

function Filtro({
	etiqueta,
	id,
	children,
}: {
	etiqueta: string
	id: string
	children: React.ReactNode
}) {
	return (
		<div className="space-y-2">
			<Label htmlFor={id} className="block text-sm">
				{etiqueta}
			</Label>
			{children}
		</div>
	)
}

function DetalleEvento({
	evento,
	alCerrar,
}: {
	evento: EventoAuditoria
	alCerrar: () => void
}) {
	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="titulo-evento"
			onKeyDown={(e) => e.key === "Escape" && alCerrar()}
		>
			<Card className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto">
				<CardContent className="space-y-4 pt-6">
					<h2 id="titulo-evento" className="text-xl font-semibold">
						Evento {evento.id} · {evento.accion}
					</h2>

					<dl className="grid gap-3 text-sm sm:grid-cols-2">
						<Dato termino="Fecha" valor={new Date(evento.createdAt).toLocaleString("es-MX")} />
						<Dato termino="Usuario" valor={evento.usuario_nombre ?? "sin sesión"} />
						<Dato termino="Entidad" valor={`${evento.entidad} ${evento.entidad_id ?? ""}`} />
						<Dato termino="Origen" valor={evento.ip ?? "—"} />
						<Dato
							termino="Petición"
							valor={`${evento.metodo_http ?? ""} ${evento.ruta ?? "—"}`.trim()}
						/>
						<Dato termino="Cliente" valor={evento.user_agent ?? "—"} />
					</dl>

					{!!evento.datos_antes && <Json titulo="Antes" valor={evento.datos_antes} />}
					{!!evento.datos_despues && <Json titulo="Después" valor={evento.datos_despues} />}

					<div className="flex justify-end">
						<Button onClick={alCerrar}>Cerrar</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

const Dato = ({ termino, valor }: { termino: string; valor: string }) => (
	<div>
		<dt className="text-muted-foreground text-xs">{termino}</dt>
		<dd className="break-words">{valor}</dd>
	</div>
)

const Json = ({ titulo, valor }: { titulo: string; valor: unknown }) => (
	<div>
		<p className="text-muted-foreground text-xs">{titulo}</p>
		<pre className="bg-muted mt-1 overflow-x-auto rounded-md p-3 text-xs">
			{JSON.stringify(valor, null, 2)}
		</pre>
	</div>
)

/** Quita los filtros vacíos para no mandar `accion=__todos__` al backend. */
const limpiar = <T extends Record<string, unknown>>(objeto: T): Record<string, unknown> =>
	Object.fromEntries(
		Object.entries(objeto).filter(([, valor]) => valor !== "" && valor !== SIN_FILTRO),
	)
