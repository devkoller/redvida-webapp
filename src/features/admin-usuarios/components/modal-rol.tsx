import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, X } from "lucide-react"
import { useState } from "react"

import { ApiError } from "@/api/fetchApi"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { crearRol } from "../api"

/**
 * Alta de un rol nuevo. Nace sin permisos y sin `es_sistema`: se le otorgan
 * permisos después, desde `DrawerRol`, y siempre se podrá eliminar mientras no
 * tenga a nadie asignado.
 */
export function ModalNuevoRol({ onCerrar }: { onCerrar: () => void }) {
	const [clave, setClave] = useState("")
	const [nombre, setNombre] = useState("")
	const [descripcion, setDescripcion] = useState("")
	const [error, setError] = useState<string | null>(null)
	const queryClient = useQueryClient()

	const crear = useMutation({
		mutationFn: () => crearRol({ clave: clave.trim(), nombre: nombre.trim(), descripcion: descripcion.trim() }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-roles"] })
			onCerrar()
		},
		onError: (fallo) => setError(fallo instanceof ApiError ? fallo.message : "No fue posible crear el rol"),
	})

	const enviar = (evento: React.FormEvent) => {
		evento.preventDefault()
		setError(null)
		if (!clave.trim() || !nombre.trim()) {
			setError("La clave y el nombre son obligatorios")
			return
		}
		crear.mutate()
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="titulo-nuevo-rol"
			onKeyDown={(e) => e.key === "Escape" && onCerrar()}
		>
			<Card className="w-full max-w-md">
				<CardContent className="pt-6">
					<div className="mb-4 flex items-start justify-between">
						<h2 id="titulo-nuevo-rol" className="text-lg font-semibold">
							Nuevo rol
						</h2>
						<Button variant="ghost" size="icon" onClick={onCerrar} aria-label="Cerrar">
							<X className="size-4" />
						</Button>
					</div>

					<form onSubmit={enviar} className="space-y-4">
						<div className="grid gap-2">
							<Label htmlFor="nueva-clave">Clave</Label>
							<Input
								id="nueva-clave"
								value={clave}
								onChange={(e) => setClave(e.target.value)}
								placeholder="coordinador_regional"
								autoComplete="off"
								required
							/>
							<p className="text-muted-foreground text-xs">
								Minúsculas y guion bajo, sin espacios. No se podrá cambiar después de crear el rol.
							</p>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="nuevo-rol-nombre">Nombre</Label>
							<Input
								id="nuevo-rol-nombre"
								value={nombre}
								onChange={(e) => setNombre(e.target.value)}
								required
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="nuevo-rol-descripcion">Descripción (opcional)</Label>
							<Input
								id="nuevo-rol-descripcion"
								value={descripcion}
								onChange={(e) => setDescripcion(e.target.value)}
							/>
						</div>

						{error && <p className="text-destructive text-sm">{error}</p>}

						<div className="flex justify-end gap-2">
							<Button type="button" variant="outline" onClick={onCerrar}>
								Cancelar
							</Button>
							<Button type="submit" disabled={crear.isPending}>
								{crear.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
								Crear rol
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}
