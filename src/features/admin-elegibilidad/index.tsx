import { useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { ApiError } from "@/api/fetchApi"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
	actualizarPregunta,
	eliminarPregunta,
	listarPreguntas,
	reordenarPreguntas,
	type PreguntaElegibilidad,
} from "./api"
import { ModalPregunta } from "./components/modal-pregunta"

const duracion = (pregunta: PreguntaElegibilidad): string => {
	if (pregunta.tipo_regla === "permanente") return "Descarta para siempre"
	if (pregunta.periodo_meses) return `${pregunta.periodo_meses} ${pregunta.periodo_meses === 1 ? "mes" : "meses"}`
	if (pregunta.periodo_dias) return `${pregunta.periodo_dias} ${pregunta.periodo_dias === 1 ? "día" : "días"}`
	return "—"
}

const agruparPorSeccion = (preguntas: PreguntaElegibilidad[]) => {
	const mapa = new Map<string, PreguntaElegibilidad[]>()
	for (const pregunta of preguntas) {
		const lista = mapa.get(pregunta.seccion) ?? []
		lista.push(pregunta)
		mapa.set(pregunta.seccion, lista)
	}
	return [...mapa.entries()]
}

/**
 * Administración del cuestionario de elegibilidad (RV-11).
 *
 * Sustituye a `elegibilidad.rules.ts`: las preguntas y sus reglas de
 * descarte/diferimiento ya no requieren un despliegue de código. Siguen
 * pendientes de validación clínica igual que antes — este panel no cambia esa
 * realidad, solo el mecanismo para ajustarlas mientras tanto.
 */
export function AdminElegibilidadPage() {
	const [editando, setEditando] = useState<PreguntaElegibilidad | null>(null)
	const [creando, setCreando] = useState(false)
	const queryClient = useQueryClient()

	const { data, isLoading } = useQuery({
		queryKey: ["admin-elegibilidad"],
		queryFn: listarPreguntas,
	})

	const preguntas = data ?? []
	const activas = preguntas.filter((p) => p.activo)
	const pendientes = activas.filter((p) => p.por_confirmar)
	const secciones = useMemo(() => [...new Set(preguntas.map((p) => p.seccion))], [preguntas])
	const grupos = useMemo(() => agruparPorSeccion(preguntas.filter((p) => p.activo)), [preguntas])
	const inactivas = preguntas.filter((p) => !p.activo)

	const invalidar = () => queryClient.invalidateQueries({ queryKey: ["admin-elegibilidad"] })

	/**
	 * Solo reordena DENTRO de la misma sección. `orden` es un contador global
	 * (así lo pide el CRUD del backend), pero si "Subir" pudiera cruzar a la
	 * sección anterior, la fila cambiaría de encabezado sin que quien lo pulsó
	 * lo pidiera — cambiar de sección se hace editando el campo "Sección", no
	 * empujando flechas.
	 */
	const mover = async (pregunta: PreguntaElegibilidad, direccion: -1 | 1) => {
		const delGrupo = preguntas
			.filter((p) => p.activo && p.seccion === pregunta.seccion)
			.sort((a, b) => a.orden - b.orden)
		const indice = delGrupo.findIndex((p) => p.id === pregunta.id)
		const vecino = delGrupo[indice + direccion]
		if (!vecino) return
		try {
			await reordenarPreguntas([
				{ id: pregunta.id, orden: vecino.orden },
				{ id: vecino.id, orden: pregunta.orden },
			])
			invalidar()
		} catch (fallo) {
			toast.error(fallo instanceof ApiError ? fallo.message : "No fue posible reordenar")
		}
	}

	const reactivar = async (pregunta: PreguntaElegibilidad) => {
		try {
			await actualizarPregunta(pregunta.id, { activo: true })
			toast.success("Pregunta reactivada")
			invalidar()
		} catch (fallo) {
			toast.error(fallo instanceof ApiError ? fallo.message : "No fue posible reactivar la pregunta")
		}
	}

	const eliminar = async (pregunta: PreguntaElegibilidad) => {
		if (!confirm(`¿Quitar "${pregunta.texto}" del cuestionario? Deja de presentarse, pero las respuestas ya guardadas no se tocan.`)) {
			return
		}
		try {
			await eliminarPregunta(pregunta.id)
			toast.success("Pregunta eliminada")
			invalidar()
		} catch (fallo) {
			toast.error(fallo instanceof ApiError ? fallo.message : "No fue posible eliminar la pregunta")
		}
	}

	return (
		<div className="mx-auto max-w-5xl px-4 py-8">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Elegibilidad</h1>
					<p className="text-muted-foreground mt-2">
						Preguntas del cuestionario de registro y cuánto tiempo bloquean si la respuesta es "sí".
						Cambiar cualquier valor aquí actualiza el formulario público de inmediato.
					</p>
				</div>
				<Button onClick={() => setCreando(true)}>
					<Plus className="size-4" aria-hidden="true" />
					Nueva pregunta
				</Button>
			</div>

			{pendientes.length > 0 && (
				<Card className="mt-6">
					<CardContent className="pt-6">
						<div
							role="status"
							className="border-amber-500/40 bg-amber-500/10 flex items-start gap-2 rounded-md border p-3 text-sm"
						>
							<AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
							<span>
								<strong>{pendientes.length}</strong> preguntas siguen pendientes de confirmar por el
								área médica. El formulario público las señala como criterio provisional.
							</span>
						</div>
					</CardContent>
				</Card>
			)}

			{isLoading && <p className="text-muted-foreground mt-6 text-sm">Cargando…</p>}

			<div className="mt-6 space-y-8">
				{grupos.map(([seccion, filas]) => (
					<section key={seccion}>
						<h2 className="text-lg font-semibold">{seccion}</h2>
						<div className="mt-3 space-y-2">
							{filas.map((pregunta, indice) => (
								<Card key={pregunta.id}>
									<CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
										<div className="min-w-0 flex-1">
											<div className="flex flex-wrap items-center gap-2">
												<p className="text-sm font-medium">{pregunta.texto}</p>
												<Badge variant={pregunta.tipo_regla === "permanente" ? "destructive" : "outline"}>
													{duracion(pregunta)}
												</Badge>
												{pregunta.por_confirmar && <Badge variant="secondary">Por confirmar</Badge>}
											</div>
											<code className="text-muted-foreground text-xs">{pregunta.clave}</code>
											{pregunta.tipo_regla === "permanente" && (
												<p className="text-muted-foreground mt-1 text-xs">
													Motivo registrado: {pregunta.descripcion_descarte}
												</p>
											)}
										</div>
										<div className="flex shrink-0 items-center gap-1">
											<Button
												variant="ghost"
												size="icon"
												onClick={() => mover(pregunta, -1)}
												disabled={indice === 0}
												aria-label="Subir"
											>
												<ArrowUp className="size-4" aria-hidden="true" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => mover(pregunta, 1)}
												disabled={indice === filas.length - 1}
												aria-label="Bajar"
											>
												<ArrowDown className="size-4" aria-hidden="true" />
											</Button>
											<Button variant="outline" size="sm" onClick={() => setEditando(pregunta)}>
												<Pencil className="size-4" aria-hidden="true" />
												Editar
											</Button>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => eliminar(pregunta)}
												aria-label="Eliminar"
											>
												<Trash2 className="text-destructive size-4" aria-hidden="true" />
											</Button>
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					</section>
				))}

				{inactivas.length > 0 && (
					<section>
						<h2 className="text-muted-foreground text-lg font-semibold">
							Desactivadas ({inactivas.length})
						</h2>
						<p className="text-muted-foreground mt-1 text-sm">
							Ya no se presentan en el formulario. Las respuestas que ya se guardaron con ellas no
							se ven afectadas.
						</p>
						<div className="mt-3 space-y-2">
							{inactivas.map((pregunta) => (
								<Card key={pregunta.id} className="opacity-60">
									<CardContent className="flex items-center justify-between gap-3 py-3">
										<p className="text-sm">{pregunta.texto}</p>
										<Button variant="outline" size="sm" onClick={() => reactivar(pregunta)}>
											Reactivar
										</Button>
									</CardContent>
								</Card>
							))}
						</div>
					</section>
				)}
			</div>

			{creando && <ModalPregunta pregunta={null} secciones={secciones} onCerrar={() => setCreando(false)} />}
			{editando && (
				<ModalPregunta pregunta={editando} secciones={secciones} onCerrar={() => setEditando(null)} />
			)}
		</div>
	)
}
