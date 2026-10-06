import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichText } from "@/components/ui/rich-text"
import { Textarea } from "@/components/ui/textarea"
import {
	CAMPOS_OCULTOS_NARRATIVA,
	CAMPOS_SOLO_NARRATIVA,
	SLUG_NARRATIVA,
	TIPOS_BLOQUE,
	type BloqueCms,
	type CampoBloque,
} from "../data/schema"

/**
 * Campos de un bloque, generados desde la descripción de su tipo en
 * `TIPOS_BLOQUE`. Agregar un tipo es describirlo allí, no construir otra
 * pantalla. La autoridad de validación es el servidor: si algo pasa el
 * formulario y no el esquema, la API responde 400 con el campo exacto.
 *
 * No lleva botones: la página que lo usa decide dónde van Guardar y Cancelar.
 */
export function FormularioBloque({
	bloque,
	contenido,
	onCambio,
	soloLectura = false,
	slugPagina,
}: {
	bloque: BloqueCms
	contenido: Record<string, any>
	onCambio: (contenido: Record<string, any>) => void
	soloLectura?: boolean
	/** Para ocultar los campos que no aplican a la página (ver `schema.ts`). */
	slugPagina?: string
}) {
	const definicion = TIPOS_BLOQUE[bloque.tipo]
	if (!definicion) return null

	const cambiar = (clave: string, valor: unknown) => onCambio({ ...contenido, [clave]: valor })

	const cambiarElemento = (clave: string, indice: number, subclave: string, valor: unknown) => {
		const lista = [...(contenido[clave] ?? [])]
		lista[indice] = { ...lista[indice], [subclave]: valor }
		onCambio({ ...contenido, [clave]: lista })
	}

	const agregarElemento = (campo: CampoBloque) => {
		const vacio = Object.fromEntries((campo.elemento ?? []).map((s) => [s.clave, ""]))
		onCambio({ ...contenido, [campo.clave]: [...(contenido[campo.clave] ?? []), vacio] })
	}

	const quitarElemento = (clave: string, indice: number) =>
		onCambio({
			...contenido,
			[clave]: (contenido[clave] ?? []).filter((_: unknown, i: number) => i !== indice),
		})

	const control = (id: string, tipo: string, valor: string, alCambiar: (v: string) => void) =>
		tipo === "rico" ? (
			<RichText value={valor} onChange={alCambiar} labelledBy={`${id}-etiqueta`} readOnly={soloLectura} />
		) : tipo === "codigo" ? (
			<Textarea id={id} rows={8} className="font-mono text-xs" value={valor} onChange={(e) => alCambiar(e.target.value)} />
		) : (
			<Input id={id} className="bg-card" value={valor} onChange={(e) => alCambiar(e.target.value)} />
		)

	return (
		<div className="space-y-6">
			{definicion.campos
				.filter((campo) =>
					slugPagina === SLUG_NARRATIVA
						? !CAMPOS_OCULTOS_NARRATIVA.includes(campo.clave)
						: !CAMPOS_SOLO_NARRATIVA.includes(campo.clave),
				)
				.map((campo) => {
				const id = `campo-${bloque.id}-${campo.clave}`
				return (
					<div key={campo.clave} className="space-y-2">
						<Label id={`${id}-etiqueta`} htmlFor={id} className="text-sm font-medium">
							{campo.etiqueta}
						</Label>

						{campo.tipo === "lista" ? (
							<div className="space-y-3">
								{((contenido[campo.clave] ?? []) as Record<string, string>[]).map((elemento, indice) => (
									<div key={indice} className="space-y-4 rounded-md border p-4">
										<div className="flex items-center justify-between">
											<span className="text-muted-foreground text-xs font-medium">
												{campo.etiqueta} · #{indice + 1}
											</span>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="text-destructive"
												aria-label={`Quitar elemento ${indice + 1} de ${campo.etiqueta}`}
												onClick={() => quitarElemento(campo.clave, indice)}
											>
												<Trash2 className="size-4" />
											</Button>
										</div>
										{(campo.elemento ?? []).map((sub) => {
											const subId = `${id}-${indice}-${sub.clave}`
											return (
												<div key={sub.clave} className="space-y-2">
													<Label id={`${subId}-etiqueta`} htmlFor={subId} className="text-muted-foreground text-xs">
														{sub.etiqueta}
													</Label>
													{control(subId, sub.tipo, elemento[sub.clave] ?? "", (v) =>
														cambiarElemento(campo.clave, indice, sub.clave, v),
													)}
												</div>
											)
										})}
									</div>
								))}
								<Button type="button" variant="outline" onClick={() => agregarElemento(campo)}>
									<Plus className="size-4" />
									Agregar
								</Button>
							</div>
						) : (
							control(id, campo.tipo, contenido[campo.clave] ?? "", (v) => cambiar(campo.clave, v))
						)}

						{campo.ayuda && <p className="text-muted-foreground text-xs">{campo.ayuda}</p>}
					</div>
				)
			})}
		</div>
	)
}
