import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { ApiError } from "@/api/fetchApi"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
	actualizarPregunta,
	crearPregunta,
	type PreguntaElegibilidad,
	type TipoReglaElegibilidad,
} from "../api"

const claseCampo =
	"border-input bg-transparent shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"

/**
 * Alta o edición de una pregunta del cuestionario de elegibilidad.
 *
 * `tipo_regla` decide qué campos aplican: "permanente" pide el motivo que se
 * guarda al descartar; "temporal" pide el periodo de espera, en meses O en
 * días (nunca ambos — lo exige también el CHECK de la base). Cambiar el tipo
 * limpia los campos del tipo anterior para no arrastrar un motivo o un
 * periodo que ya no tiene sentido.
 */
export function ModalPregunta({
	pregunta,
	secciones,
	onCerrar,
}: {
	pregunta: PreguntaElegibilidad | null
	secciones: string[]
	onCerrar: () => void
}) {
	const editando = !!pregunta
	const [clave, setClave] = useState(pregunta?.clave ?? "")
	const [texto, setTexto] = useState(pregunta?.texto ?? "")
	const [seccion, setSeccion] = useState(pregunta?.seccion ?? secciones[0] ?? "")
	const [tipoRegla, setTipoRegla] = useState<TipoReglaElegibilidad>(pregunta?.tipo_regla ?? "permanente")
	const [descarte, setDescarte] = useState(pregunta?.descripcion_descarte ?? "")
	const [unidad, setUnidad] = useState<"meses" | "dias">(pregunta?.periodo_dias ? "dias" : "meses")
	const [periodo, setPeriodo] = useState(String(pregunta?.periodo_meses ?? pregunta?.periodo_dias ?? ""))
	const [porConfirmar, setPorConfirmar] = useState(pregunta?.por_confirmar ?? false)
	const [error, setError] = useState<string | null>(null)
	const queryClient = useQueryClient()

	const guardar = useMutation({
		mutationFn: () => {
			const datos = {
				texto: texto.trim(),
				seccion: seccion.trim(),
				tipo_regla: tipoRegla,
				descripcion_descarte: tipoRegla === "permanente" ? descarte.trim() : null,
				periodo_meses: tipoRegla === "temporal" && unidad === "meses" ? Number(periodo) : null,
				periodo_dias: tipoRegla === "temporal" && unidad === "dias" ? Number(periodo) : null,
				por_confirmar: porConfirmar,
			}
			return editando
				? actualizarPregunta(pregunta.id, datos)
				: crearPregunta({ ...datos, clave: clave.trim() })
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-elegibilidad"] })
			toast.success(editando ? "Pregunta actualizada" : "Pregunta creada")
			onCerrar()
		},
		onError: (fallo) =>
			setError(fallo instanceof ApiError ? fallo.message : "No fue posible guardar la pregunta"),
	})

	const enviar = (evento: React.FormEvent) => {
		evento.preventDefault()
		setError(null)
		if (!texto.trim() || !seccion.trim() || (!editando && !clave.trim())) {
			setError("Complete los campos obligatorios")
			return
		}
		if (tipoRegla === "permanente" && !descarte.trim()) {
			setError("Indique el motivo que se registra al descartar")
			return
		}
		if (tipoRegla === "temporal" && (!periodo || Number(periodo) <= 0)) {
			setError("Indique un periodo de espera mayor a cero")
			return
		}
		guardar.mutate()
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="titulo-pregunta"
			onKeyDown={(e) => e.key === "Escape" && onCerrar()}
		>
			<Card className="max-h-[90dvh] w-full max-w-lg overflow-y-auto">
				<CardContent className="pt-6">
					<div className="mb-4 flex items-start justify-between">
						<h2 id="titulo-pregunta" className="text-lg font-semibold">
							{editando ? "Editar pregunta" : "Nueva pregunta"}
						</h2>
						<Button variant="ghost" size="icon" onClick={onCerrar} aria-label="Cerrar">
							<X className="size-4" />
						</Button>
					</div>

					<form onSubmit={enviar} className="space-y-4">
						{!editando && (
							<div className="grid gap-2">
								<Label htmlFor="p-clave">Clave</Label>
								<Input
									id="p-clave"
									value={clave}
									onChange={(e) => setClave(e.target.value)}
									placeholder="antecedente_x"
									autoComplete="off"
								/>
								<p className="text-muted-foreground text-xs">
									Minúsculas y guion bajo. Es la que se guarda con cada respuesta; no se puede
									cambiar después de crear la pregunta.
								</p>
							</div>
						)}

						<div className="grid gap-2">
							<Label htmlFor="p-texto">Texto de la pregunta</Label>
							<textarea
								id="p-texto"
								value={texto}
								onChange={(e) => setTexto(e.target.value)}
								rows={2}
								className={claseCampo}
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="p-seccion">Sección</Label>
							<Input
								id="p-seccion"
								value={seccion}
								onChange={(e) => setSeccion(e.target.value)}
								list="secciones-existentes"
							/>
							<datalist id="secciones-existentes">
								{secciones.map((s) => (
									<option key={s} value={s} />
								))}
							</datalist>
						</div>

						<fieldset className="grid gap-2">
							<legend className="text-sm font-medium">Si la persona responde "sí"...</legend>
							<RadioGroup
								value={tipoRegla}
								onValueChange={(v) => setTipoRegla(v as TipoReglaElegibilidad)}
							>
								<label className="flex items-center gap-2 text-sm">
									<RadioGroupItem value="permanente" />
									La descarta para siempre
								</label>
								<label className="flex items-center gap-2 text-sm">
									<RadioGroupItem value="temporal" />
									La difiere un tiempo, desde la fecha del evento
								</label>
							</RadioGroup>
						</fieldset>

						{tipoRegla === "permanente" ? (
							<div className="grid gap-2">
								<Label htmlFor="p-descarte">Motivo de descarte</Label>
								<Input
									id="p-descarte"
									value={descarte}
									onChange={(e) => setDescarte(e.target.value)}
									placeholder="Se guarda tal cual en el expediente de elegibilidad"
								/>
							</div>
						) : (
							<div className="grid gap-2">
								<Label htmlFor="p-periodo">Periodo de espera</Label>
								<div className="flex gap-2">
									<Input
										id="p-periodo"
										type="number"
										min={1}
										value={periodo}
										onChange={(e) => setPeriodo(e.target.value)}
										className="max-w-28"
									/>
									<RadioGroup
										value={unidad}
										onValueChange={(v) => setUnidad(v as "meses" | "dias")}
										className="grid-flow-col items-center gap-4"
									>
										<label className="flex items-center gap-1.5 text-sm">
											<RadioGroupItem value="meses" /> meses
										</label>
										<label className="flex items-center gap-1.5 text-sm">
											<RadioGroupItem value="dias" /> días
										</label>
									</RadioGroup>
								</div>
							</div>
						)}

						<label className="flex items-start gap-2 text-sm">
							<Checkbox
								checked={porConfirmar}
								onCheckedChange={(v) => setPorConfirmar(v === true)}
								className="mt-0.5"
							/>
							<span>
								Pendiente de confirmar por el área médica
								<span className="text-muted-foreground block text-xs">
									El formulario público la señala como criterio provisional.
								</span>
							</span>
						</label>

						{error && <p className="text-destructive text-sm">{error}</p>}

						<div className="flex justify-end gap-2">
							<Button type="button" variant="outline" onClick={onCerrar}>
								Cancelar
							</Button>
							<Button type="submit" disabled={guardar.isPending}>
								{guardar.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
								Guardar
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}
