import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Trash2, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { ApiError } from "@/api/fetchApi"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
	actualizarPermisosRol,
	actualizarRol,
	detalleRol,
	eliminarRol,
	type Permiso,
} from "../api"

/** Agrupa el catálogo de permisos por módulo, para no presentar 20 casillas en una sola lista plana. */
const agruparPorModulo = (permisos: Permiso[]) => {
	const grupos = new Map<string, Permiso[]>()
	for (const permiso of permisos) {
		const lista = grupos.get(permiso.modulo) ?? []
		lista.push(permiso)
		grupos.set(permiso.modulo, lista)
	}
	return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b))
}

/**
 * Detalle y edición de un rol: nombre/descripción/estado y su conjunto de
 * permisos. La `clave` no se muestra como editable a propósito: es inmutable
 * en el servidor (ver `roles.service.ts`).
 */
export function DrawerRol({
	rolId,
	catalogo,
	onCerrar,
}: {
	rolId: number
	catalogo: Permiso[]
	onCerrar: () => void
}) {
	const queryClient = useQueryClient()

	const [nombre, setNombre] = useState("")
	const [descripcion, setDescripcion] = useState("")
	const [permisosElegidos, setPermisosElegidos] = useState<string[]>([])

	const { data, isLoading } = useQuery({
		queryKey: ["admin-rol", rolId],
		queryFn: () => detalleRol(rolId),
	})

	useEffect(() => {
		if (!data) return
		setNombre(data.rol.nombre)
		setDescripcion(data.rol.descripcion ?? "")
		setPermisosElegidos(data.permisos)
	}, [data])

	const invalidar = () => {
		queryClient.invalidateQueries({ queryKey: ["admin-rol", rolId] })
		queryClient.invalidateQueries({ queryKey: ["admin-roles"] })
		queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] })
	}

	const guardarDatos = useMutation({
		mutationFn: () => actualizarRol(rolId, { nombre: nombre.trim(), descripcion: descripcion.trim() || null }),
		onSuccess: () => {
			toast.success("Rol actualizado")
			invalidar()
		},
		onError: (fallo) => toast.error(fallo instanceof ApiError ? fallo.message : "No fue posible guardar"),
	})

	const alternarActivo = useMutation({
		mutationFn: (activo: boolean) => actualizarRol(rolId, { activo }),
		onSuccess: (_r, activo) => {
			toast.success(activo ? "Rol activado" : "Rol desactivado")
			invalidar()
		},
		onError: (fallo) =>
			toast.error(fallo instanceof ApiError ? fallo.message : "No fue posible cambiar el estado"),
	})

	const guardarPermisos = useMutation({
		mutationFn: () => actualizarPermisosRol(rolId, permisosElegidos),
		onSuccess: () => {
			toast.success("Permisos actualizados")
			invalidar()
		},
		onError: (fallo) =>
			toast.error(fallo instanceof ApiError ? fallo.message : "No fue posible actualizar los permisos"),
	})

	const eliminar = useMutation({
		mutationFn: () => eliminarRol(rolId),
		onSuccess: () => {
			toast.success("Rol eliminado")
			invalidar()
			onCerrar()
		},
		onError: (fallo) => toast.error(fallo instanceof ApiError ? fallo.message : "No fue posible eliminar el rol"),
	})

	const alternarPermiso = (clave: string) =>
		setPermisosElegidos((previo) =>
			previo.includes(clave) ? previo.filter((p) => p !== clave) : [...previo, clave],
		)

	const grupos = useMemo(() => agruparPorModulo(catalogo), [catalogo])
	const permisosCambiaron =
		data && JSON.stringify([...permisosElegidos].sort()) !== JSON.stringify([...data.permisos].sort())
	const datosCambiaron =
		data && (nombre.trim() !== data.rol.nombre || (descripcion.trim() || null) !== data.rol.descripcion)

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-label="Detalle del rol"
			className="fixed inset-0 z-50 flex justify-end bg-black/50"
			onClick={(evento) => {
				if (evento.target === evento.currentTarget) onCerrar()
			}}
		>
			<div className="bg-background flex h-full w-full max-w-lg flex-col overflow-y-auto shadow-xl">
				<div className="border-border bg-background sticky top-0 flex items-center justify-between border-b px-5 py-4">
					<div>
						<p className="font-mono text-sm font-bold">{data?.rol.clave ?? "…"}</p>
						{data?.rol.es_sistema && (
							<Badge variant="outline" className="mt-1">
								Rol de sistema
							</Badge>
						)}
					</div>
					<Button variant="ghost" size="icon" onClick={onCerrar} aria-label="Cerrar">
						<X className="size-4" />
					</Button>
				</div>

				{isLoading && <p className="text-muted-foreground p-5 text-sm">Cargando…</p>}

				{data && (
					<div className="space-y-6 p-5">
						<section className="space-y-3">
							<h3 className="text-sm font-semibold">Datos</h3>
							<div className="grid gap-2">
								<Label htmlFor="r-nombre">Nombre</Label>
								<Input id="r-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
							</div>
							<div className="grid gap-2">
								<Label htmlFor="r-descripcion">Descripción</Label>
								<Input
									id="r-descripcion"
									value={descripcion}
									onChange={(e) => setDescripcion(e.target.value)}
								/>
							</div>
							<div className="flex items-center justify-between gap-3 pt-1">
								<div className="flex items-center gap-2">
									<span className="text-sm">Estado</span>
									<Badge variant={data.rol.activo ? "default" : "outline"}>
										{data.rol.activo ? "Activo" : "Desactivado"}
									</Badge>
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={(data.rol.es_sistema && data.rol.activo) || alternarActivo.isPending}
									title={
										data.rol.es_sistema && data.rol.activo
											? "Un rol de sistema no se puede desactivar entero"
											: undefined
									}
									onClick={() => alternarActivo.mutate(!data.rol.activo)}
								>
									{data.rol.activo ? "Desactivar" : "Activar"}
								</Button>
							</div>
							<div className="flex justify-end">
								<Button
									type="button"
									size="sm"
									disabled={!datosCambiaron || guardarDatos.isPending}
									onClick={() => guardarDatos.mutate()}
								>
									{guardarDatos.isPending && <Loader2 className="size-4 animate-spin" />}
									Guardar datos
								</Button>
							</div>
						</section>

						<Separator />

						<section className="space-y-3">
							<div className="flex items-baseline justify-between">
								<h3 className="text-sm font-semibold">Permisos</h3>
								<span className="text-muted-foreground text-xs">
									{permisosElegidos.length} de {catalogo.length}
								</span>
							</div>
							<div className="space-y-4">
								{grupos.map(([modulo, permisos]) => (
									<div key={modulo}>
										<p className="text-muted-foreground mb-1.5 text-xs font-medium uppercase">
											{modulo}
										</p>
										<div className="grid gap-1.5 sm:grid-cols-2">
											{permisos.map((permiso) => (
												<label key={permiso.clave} className="flex items-start gap-2 text-sm">
													<Checkbox
														checked={permisosElegidos.includes(permiso.clave)}
														onCheckedChange={() => alternarPermiso(permiso.clave)}
														className="mt-0.5"
													/>
													<span>
														<span className="font-mono text-xs">{permiso.clave}</span>
														{permiso.descripcion && (
															<span className="text-muted-foreground block text-xs">
																{permiso.descripcion}
															</span>
														)}
													</span>
												</label>
											))}
										</div>
									</div>
								))}
							</div>
							<div className="flex justify-end">
								<Button
									type="button"
									size="sm"
									disabled={!permisosCambiaron || guardarPermisos.isPending}
									onClick={() => guardarPermisos.mutate()}
								>
									{guardarPermisos.isPending && <Loader2 className="size-4 animate-spin" />}
									Guardar permisos
								</Button>
							</div>
						</section>

						{!data.rol.es_sistema && (
							<>
								<Separator />
								<section className="space-y-3">
									<h3 className="text-destructive text-sm font-semibold">Zona de riesgo</h3>
									<Button
										type="button"
										variant="destructive"
										size="sm"
										disabled={data.rol.total_usuarios > 0 || eliminar.isPending}
										title={
											data.rol.total_usuarios > 0
												? "Reasigne a las personas que tienen este rol antes de eliminarlo"
												: undefined
										}
										onClick={() => {
											if (confirm(`¿Eliminar el rol "${data.rol.nombre}"?`)) eliminar.mutate()
										}}
									>
										{eliminar.isPending ? (
											<Loader2 className="size-4 animate-spin" aria-hidden="true" />
										) : (
											<Trash2 className="size-4" aria-hidden="true" />
										)}
										Eliminar rol
									</Button>
								</section>
							</>
						)}
					</div>
				)}
			</div>
		</div>
	)
}
