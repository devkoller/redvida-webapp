import { AlertTriangle, ShieldAlert } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { ENDPOINTS } from "@/api/config"
import type { ApiError } from "@/api/fetchApi"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { usePost } from "@/hooks/usePost"
import { JUSTIFICACION_MINIMA, type IdentidadRevelada } from "../data/schema"

/**
 * Diálogo de revelación de identidad.
 *
 * Es la acción más sensible del sistema: el único punto donde un código se
 * traduce a una persona. Tres decisiones deliberadas:
 *
 * 1. **El botón está deshabilitado hasta escribir 20 caracteres reales.** No es
 *    una validación al enviar: es imposible pulsarlo antes.
 * 2. **La advertencia de que queda auditado es lo primero que se lee**, no una
 *    nota al pie.
 * 3. **Se pide la referencia del caso clínico.** No es obligatoria para el
 *    backend, pero preguntarla hace que quien revela se detenga a pensar para
 *    qué lo está haciendo.
 */
export function DialogoRevelar({
	codigoRegistro,
	busquedaId,
	onCerrar,
}: {
	codigoRegistro: string
	busquedaId: string
	onCerrar: () => void
}) {
	const [justificacion, setJustificacion] = useState("")
	const [referenciaCaso, setReferenciaCaso] = useState("")
	const [identidad, setIdentidad] = useState<IdentidadRevelada | null>(null)

	const { execute, loading, error } = usePost<IdentidadRevelada>()
	const apiError = error as ApiError | null

	const caracteres = justificacion.trim().length
	const suficiente = caracteres >= JUSTIFICACION_MINIMA

	const revelar = async () => {
		if (!suficiente) return
		try {
			const resultado = await execute({
				url: ENDPOINTS.revelar(codigoRegistro),
				body: {
					justificacion: justificacion.trim(),
					busqueda_id: busquedaId,
					referencia_caso: referenciaCaso.trim() || null,
				},
			})
			setIdentidad(resultado)
			toast.success("Identidad revelada. La acción quedó registrada de forma permanente")
		} catch {
			// Se muestra abajo.
		}
	}

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="titulo-revelar"
			className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
			onClick={(evento) => {
				if (evento.target === evento.currentTarget) onCerrar()
			}}
		>
			<Card className="max-h-[90dvh] w-full max-w-lg overflow-y-auto">
				<CardContent className="space-y-5 p-6">
					{identidad ? (
						<>
							<h2 id="titulo-revelar" className="text-lg font-semibold">
								Identidad del donador
							</h2>
							<dl className="space-y-2 text-sm">
								{[
									["Código", identidad.codigo_registro],
									[
										"Nombre",
										[identidad.nombre, identidad.apellido_pat, identidad.apellido_mat]
											.filter(Boolean)
											.join(" "),
									],
									["Correo", identidad.email],
									["Teléfono", identidad.telefono || "—"],
									["Celular", identidad.celular || "—"],
									["Estatus", identidad.estatus],
								].map(([etiqueta, valor]) => (
									<div key={etiqueta} className="flex gap-3">
										<dt className="text-muted-foreground w-24 shrink-0">{etiqueta}</dt>
										<dd className="font-medium break-all">{valor}</dd>
									</div>
								))}
							</dl>
							<div className="bg-muted/50 flex gap-2.5 rounded-lg p-3">
								<ShieldAlert aria-hidden className="text-muted-foreground mt-0.5 size-4 shrink-0" />
								<p className="text-muted-foreground text-xs leading-relaxed">
									Esta consulta quedó registrada de forma permanente e inalterable, junto con su
									justificación, la fecha y su dirección IP.
								</p>
							</div>
							<Button className="w-full" onClick={onCerrar}>
								Cerrar
							</Button>
						</>
					) : (
						<>
							<div className="flex gap-3">
								<AlertTriangle aria-hidden className="text-warning mt-0.5 size-6 shrink-0" />
								<div>
									<h2 id="titulo-revelar" className="text-lg font-semibold">
										Revelar la identidad de {codigoRegistro}
									</h2>
									<p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
										Está por levantar la seudonimización de un donador.{" "}
										<strong className="text-foreground">
											Esta acción queda registrada de forma permanente
										</strong>{" "}
										con su usuario, la justificación que escriba, la fecha y su dirección IP. El
										registro no se puede modificar ni borrar.
									</p>
								</div>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="justificacion">
									Justificación clínica
									<span className="text-destructive" aria-label="obligatorio">
										*
									</span>
								</Label>
								<textarea
									id="justificacion"
									rows={4}
									value={justificacion}
									onChange={(e) => setJustificacion(e.target.value)}
									placeholder="Explique por qué necesita conocer la identidad de este donador: diagnóstico del paciente, etapa del protocolo, qué se hará con el contacto…"
									className="border-input bg-background focus-visible:ring-ring w-full resize-y rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
									aria-describedby="contador-justificacion"
								/>
								<p
									id="contador-justificacion"
									className={suficiente ? "text-success text-xs" : "text-muted-foreground text-xs"}
									aria-live="polite"
								>
									{caracteres} / {JUSTIFICACION_MINIMA} caracteres mínimos
								</p>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="referencia">Referencia del caso</Label>
								<input
									id="referencia"
									value={referenciaCaso}
									onChange={(e) => setReferenciaCaso(e.target.value)}
									placeholder="Folio interno del caso clínico"
									className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
								/>
							</div>

							{apiError && (
								<div
									role="alert"
									className="border-destructive/40 bg-destructive/5 rounded-lg border p-3"
								>
									<p className="text-destructive text-sm">{apiError.message}</p>
								</div>
							)}

							<div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
								<Button variant="outline" onClick={onCerrar}>
									Cancelar
								</Button>
								<Button variant="destructive" onClick={revelar} disabled={!suficiente || loading}>
									{loading ? "Revelando…" : "Revelar identidad"}
								</Button>
							</div>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	)
}

export default DialogoRevelar
