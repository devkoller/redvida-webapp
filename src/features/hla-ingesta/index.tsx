import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { AlertTriangle, CheckCircle2, FileUp, Loader2, Upload } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { API_URL, ENDPOINTS } from "@/api/config"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { TablaErrores } from "./components/tabla-errores"
import { ESTATUS_LOTE, type Lote, type ResultadoIngesta } from "./data/schema"

const EXTENSIONES = ".csv,.xlsx,.xls,.hml,.xml"

/**
 * Carga de lotes de tipificación HLA.
 *
 * La subida no usa `usePost` porque necesita `multipart/form-data` y progreso
 * de carga: un archivo de 5,000 filas tarda lo suficiente como para que una
 * barra estática parezca que se colgó.
 */
export function HlaIngestaPage() {
	const [arrastrando, setArrastrando] = useState(false)
	const [progreso, setProgreso] = useState(0)
	const [resultado, setResultado] = useState<ResultadoIngesta | null>(null)
	const [nombreArchivo, setNombreArchivo] = useState("")
	const inputRef = useRef<HTMLInputElement>(null)
	const queryClient = useQueryClient()

	const { data: lotes } = useQuery<Lote[]>({
		queryKey: ["hla-lotes"],
		queryFn: async () => {
			const { data } = await axios.get(`${API_URL}${ENDPOINTS.hlaLotes}`, {
				params: { limit: 10 },
			})
			return data?.data ?? []
		},
	})

	const subida = useMutation({
		mutationFn: async (archivo: File) => {
			const formulario = new FormData()
			formulario.append("archivo", archivo)

			const { data } = await axios.post<{ data: ResultadoIngesta }>(
				`${API_URL}${ENDPOINTS.hlaLotes}`,
				formulario,
				{
					onUploadProgress: (evento) => {
						if (!evento.total) return
						setProgreso(Math.round((evento.loaded * 100) / evento.total))
					},
				},
			)
			return data.data
		},
		onSuccess: (data) => {
			setResultado(data)
			setProgreso(0)
			queryClient.invalidateQueries({ queryKey: ["hla-lotes"] })

			if (data.estatus === "completado") {
				toast.success(
					`${data.procesados} tipificaciones cargadas` +
						(data.donadores_actualizados.length > 0
							? ` · ${data.donadores_actualizados.length} donador(es) pasaron a disponible`
							: ""),
				)
			} else {
				toast.error(`El lote fue rechazado: ${data.errores} error(es). No se escribió nada`)
			}
		},
		onError: (error) => {
			setProgreso(0)
			const mensaje = axios.isAxiosError(error)
				? (error.response?.data?.message ?? "No fue posible subir el archivo")
				: "No fue posible subir el archivo"
			toast.error(mensaje)
		},
	})

	const procesar = (archivo?: File | null) => {
		if (!archivo) return
		setResultado(null)
		setNombreArchivo(archivo.name)
		subida.mutate(archivo)
	}

	return (
		<div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
			<header className="mb-8">
				<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
					Carga de tipificaciones HLA
				</h1>
				<p className="text-muted-foreground mt-2 text-sm">
					Archivos CSV, XLSX o HML del laboratorio. El lote se valida completo antes de escribir
					nada: si una sola fila es inválida, no se carga ninguna.
				</p>
			</header>

			{/* ------------------------------------------------------------ Dropzone */}
			<div
				onDragOver={(e) => {
					e.preventDefault()
					setArrastrando(true)
				}}
				onDragLeave={() => setArrastrando(false)}
				onDrop={(e) => {
					e.preventDefault()
					setArrastrando(false)
					procesar(e.dataTransfer.files?.[0])
				}}
				className={cn(
					"rounded-xl border-2 border-dashed p-10 text-center transition-colors",
					arrastrando ? "border-primary bg-primary/5" : "border-input",
					subida.isPending && "pointer-events-none opacity-60",
				)}
			>
				<input
					ref={inputRef}
					type="file"
					accept={EXTENSIONES}
					className="sr-only"
					onChange={(e) => procesar(e.target.files?.[0])}
					aria-label="Seleccionar archivo de tipificación"
				/>

				{subida.isPending ? (
					<div className="space-y-3">
						<Loader2 aria-hidden className="text-primary-accent mx-auto size-8 animate-spin" />
						<p className="text-sm font-medium">Procesando {nombreArchivo}…</p>
						<Progress value={progreso} className="mx-auto max-w-xs" />
						<p className="text-muted-foreground text-xs">
							Se valida el archivo completo antes de escribir. No cierre esta pestaña.
						</p>
					</div>
				) : (
					<>
						<FileUp aria-hidden className="text-muted-foreground mx-auto size-8" />
						<p className="mt-3 text-sm font-medium">
							Arrastre el archivo aquí o selecciónelo
						</p>
						<p className="text-muted-foreground mt-1 text-xs">
							CSV, XLSX o HML · columnas: codigo_registro, locus, alelo_1, alelo_2
						</p>
						<Button className="mt-5" onClick={() => inputRef.current?.click()}>
							<Upload className="size-4" />
							Seleccionar archivo
						</Button>
					</>
				)}
			</div>

			{/* ------------------------------------------------------------ Resultado */}
			{resultado && (
				<section className="mt-8 space-y-4">
					<Card
						className={
							resultado.estatus === "completado"
								? "border-success/40 bg-success/5"
								: "border-destructive/40 bg-destructive/5"
						}
					>
						<CardContent className="flex flex-wrap items-center gap-4 p-5">
							{resultado.estatus === "completado" ? (
								<CheckCircle2 aria-hidden className="text-success size-6 shrink-0" />
							) : (
								<AlertTriangle aria-hidden className="text-destructive size-6 shrink-0" />
							)}
							<div className="min-w-0 flex-1">
								<p className="font-medium">
									{resultado.estatus === "completado"
										? `Lote #${resultado.lote_id} cargado`
										: `Lote #${resultado.lote_id} rechazado — no se escribió ninguna fila`}
								</p>
								<p className="text-muted-foreground mt-0.5 text-sm">
									{resultado.total_registros} fila(s) leídas · {resultado.procesados} procesadas ·{" "}
									{resultado.errores} con error
								</p>
							</div>
							{resultado.donadores_actualizados.length > 0 && (
								<Badge variant="default">
									{resultado.donadores_actualizados.length} donador(es) disponibles
								</Badge>
							)}
						</CardContent>
					</Card>

					{resultado.detalle_errores.length > 0 && (
						<div>
							<h2 className="mb-3 text-lg font-semibold">Qué corregir</h2>
							<TablaErrores errores={resultado.detalle_errores} nombreArchivo={nombreArchivo} />
						</div>
					)}
				</section>
			)}

			{/* --------------------------------------------------------- Lotes previos */}
			<section className="mt-12">
				<h2 className="mb-3 text-lg font-semibold">Lotes recientes</h2>
				{!lotes || lotes.length === 0 ? (
					<p className="text-muted-foreground text-sm">Todavía no se ha cargado ningún lote.</p>
				) : (
					<div className="overflow-x-auto rounded-lg border">
						<table className="w-full text-sm">
							<thead className="bg-muted/50">
								<tr className="text-left">
									<th className="px-4 py-2.5 font-medium">#</th>
									<th className="px-4 py-2.5 font-medium">Archivo</th>
									<th className="px-4 py-2.5 font-medium">Formato</th>
									<th className="px-4 py-2.5 font-medium">Estatus</th>
									<th className="px-4 py-2.5 text-right font-medium">Procesadas</th>
									<th className="px-4 py-2.5 text-right font-medium">Errores</th>
								</tr>
							</thead>
							<tbody>
								{lotes.map((lote) => (
									<tr key={lote.id} className="border-t">
										<td className="text-muted-foreground px-4 py-2.5 tabular-nums">{lote.id}</td>
										<td className="max-w-[16rem] truncate px-4 py-2.5">{lote.nombre_archivo}</td>
										<td className="px-4 py-2.5">
											<Badge variant="outline">{lote.formato}</Badge>
										</td>
										<td className="px-4 py-2.5">
											<Badge
												variant={ESTATUS_LOTE[lote.estatus]?.variante ?? "outline"}
												className={ESTATUS_LOTE[lote.estatus]?.clase}
											>
												{ESTATUS_LOTE[lote.estatus]?.etiqueta ?? lote.estatus}
											</Badge>
										</td>
										<td className="px-4 py-2.5 text-right tabular-nums">
											{lote.procesados}/{lote.total_registros}
										</td>
										<td className="px-4 py-2.5 text-right tabular-nums">
											{lote.errores > 0 ? (
												<span className="text-destructive font-medium">{lote.errores}</span>
											) : (
												"—"
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>
		</div>
	)
}

export default HlaIngestaPage
