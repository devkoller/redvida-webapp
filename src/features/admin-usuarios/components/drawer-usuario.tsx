import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { KeyRound, Loader2, Trash2, X } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { ApiError } from "@/api/fetchApi"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useSessionStore } from "@/stores/sessionStore"
import {
	actualizarRolesUsuario,
	actualizarUsuario,
	detalleUsuario,
	eliminarUsuario,
	restablecerPassword,
	type PasswordRestablecida,
	type Rol,
} from "../api"
import { ModalPasswordTemporal } from "./modal-password-temporal"

const fecha = (iso: string | null) =>
	iso ? new Date(iso).toLocaleString("es-MX") : "—"

/**
 * Detalle y edición de un usuario administrativo.
 *
 * Nadie edita sus propios roles ni resetea su propia contraseña desde aquí —
 * el backend lo rechaza (`usuarios.service.ts`) y esta pantalla lo refleja
 * deshabilitando esas acciones en vez de dejar que fallen en el servidor.
 */
export function DrawerUsuario({
	usuarioId,
	roles,
	onCerrar,
}: {
	usuarioId: number
	roles: Rol[]
	onCerrar: () => void
}) {
	const queryClient = useQueryClient()
	const miId = useSessionStore((estado) => estado.usuario?.id)
	const esUnoMismo = usuarioId === miId

	const [nombre, setNombre] = useState("")
	const [email, setEmail] = useState("")
	const [rolesElegidos, setRolesElegidos] = useState<string[]>([])
	const [passwordNueva, setPasswordNueva] = useState<PasswordRestablecida | null>(null)

	const { data, isLoading } = useQuery({
		queryKey: ["admin-usuario", usuarioId],
		queryFn: () => detalleUsuario(usuarioId),
	})

	useEffect(() => {
		if (!data) return
		setNombre(data.usuario.nombre)
		setEmail(data.usuario.email)
		setRolesElegidos(data.roles.map((rol) => rol.clave))
	}, [data])

	const invalidar = () => {
		queryClient.invalidateQueries({ queryKey: ["admin-usuario", usuarioId] })
		queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] })
		queryClient.invalidateQueries({ queryKey: ["admin-roles"] })
	}

	const guardarDatos = useMutation({
		mutationFn: () => actualizarUsuario(usuarioId, { nombre: nombre.trim(), email: email.trim() }),
		onSuccess: () => {
			toast.success("Datos actualizados")
			invalidar()
		},
		onError: (fallo) =>
			toast.error(fallo instanceof ApiError ? fallo.message : "No fue posible guardar los cambios"),
	})

	const alternarActivo = useMutation({
		mutationFn: (activo: boolean) => actualizarUsuario(usuarioId, { activo }),
		onSuccess: (_r, activo) => {
			toast.success(activo ? "Cuenta activada" : "Cuenta desactivada")
			invalidar()
		},
		onError: (fallo) =>
			toast.error(fallo instanceof ApiError ? fallo.message : "No fue posible cambiar el estado"),
	})

	const guardarRoles = useMutation({
		mutationFn: () => actualizarRolesUsuario(usuarioId, rolesElegidos),
		onSuccess: () => {
			toast.success("Roles actualizados")
			invalidar()
		},
		onError: (fallo) =>
			toast.error(fallo instanceof ApiError ? fallo.message : "No fue posible actualizar los roles"),
	})

	const resetPassword = useMutation({
		mutationFn: () => restablecerPassword(usuarioId),
		onSuccess: (resultado) => {
			setPasswordNueva(resultado)
			invalidar()
		},
		onError: (fallo) =>
			toast.error(fallo instanceof ApiError ? fallo.message : "No fue posible restablecer la contraseña"),
	})

	const eliminar = useMutation({
		mutationFn: () => eliminarUsuario(usuarioId),
		onSuccess: () => {
			toast.success("Usuario eliminado")
			invalidar()
			onCerrar()
		},
		onError: (fallo) =>
			toast.error(fallo instanceof ApiError ? fallo.message : "No fue posible eliminar el usuario"),
	})

	const alternarRol = (clave: string) =>
		setRolesElegidos((previo) =>
			previo.includes(clave) ? previo.filter((r) => r !== clave) : [...previo, clave],
		)

	const rolesCambiaron =
		data && JSON.stringify([...rolesElegidos].sort()) !== JSON.stringify(data.roles.map((r) => r.clave).sort())
	const datosCambiaron = data && (nombre.trim() !== data.usuario.nombre || email.trim() !== data.usuario.email)

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-label="Detalle del usuario"
			className="fixed inset-0 z-50 flex justify-end bg-black/50"
			onClick={(evento) => {
				if (evento.target === evento.currentTarget) onCerrar()
			}}
		>
			<div className="bg-background flex h-full w-full max-w-lg flex-col overflow-y-auto shadow-xl">
				<div className="border-border bg-background sticky top-0 flex items-center justify-between border-b px-5 py-4">
					<div>
						<p className="font-mono text-sm font-bold">{data?.usuario.usuario ?? "…"}</p>
						{esUnoMismo && (
							<Badge variant="outline" className="mt-1">
								Esta es su propia cuenta
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
								<Label htmlFor="d-nombre">Nombre completo</Label>
								<Input id="d-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
							</div>
							<div className="grid gap-2">
								<Label htmlFor="d-email">Correo electrónico</Label>
								<Input
									id="d-email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
								/>
							</div>
							<div className="flex items-center justify-between gap-3 pt-1">
								<div className="flex items-center gap-2">
									<span className="text-sm">Cuenta activa</span>
									<Badge variant={data.usuario.activo ? "default" : "outline"}>
										{data.usuario.activo ? "Activa" : "Desactivada"}
									</Badge>
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={esUnoMismo || alternarActivo.isPending}
									title={esUnoMismo ? "No puede desactivar su propia cuenta" : undefined}
									onClick={() => alternarActivo.mutate(!data.usuario.activo)}
								>
									{data.usuario.activo ? "Desactivar" : "Activar"}
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
							<h3 className="text-sm font-semibold">Roles</h3>
							{esUnoMismo ? (
								<p className="text-muted-foreground text-sm">
									No puede cambiar sus propios roles. Pida a otra persona con permiso{" "}
									<code>admin:users</code> que lo haga.
								</p>
							) : (
								<>
									<div className="grid gap-2 sm:grid-cols-2">
										{roles.map((rol) => (
											<label key={rol.clave} className="flex items-center gap-2 text-sm">
												<Checkbox
													checked={rolesElegidos.includes(rol.clave)}
													onCheckedChange={() => alternarRol(rol.clave)}
													disabled={!rol.activo}
												/>
												{rol.nombre}
												{!rol.activo && (
													<span className="text-muted-foreground text-xs">(inactivo)</span>
												)}
											</label>
										))}
									</div>
									<div className="flex justify-end">
										<Button
											type="button"
											size="sm"
											disabled={!rolesCambiaron || guardarRoles.isPending}
											onClick={() => guardarRoles.mutate()}
										>
											{guardarRoles.isPending && <Loader2 className="size-4 animate-spin" />}
											Guardar roles
										</Button>
									</div>
								</>
							)}
							<div>
								<p className="text-muted-foreground mb-1 text-xs">Permisos efectivos (por sus roles)</p>
								<div className="flex flex-wrap gap-1">
									{data.permisos.length ? (
										data.permisos.map((permiso) => (
											<Badge key={permiso} variant="secondary" className="font-mono text-[10px]">
												{permiso}
											</Badge>
										))
									) : (
										<span className="text-muted-foreground text-sm">Sin permisos</span>
									)}
								</div>
							</div>
						</section>

						<Separator />

						<section className="space-y-3">
							<h3 className="text-sm font-semibold">Acceso</h3>
							<p className="text-muted-foreground text-sm">
								{data.sesiones_activas} sesión(es) activa(s) ·{" "}
								{data.usuario.mfa_habilitado ? "MFA activado" : "MFA no activado"} · último acceso{" "}
								{fecha(data.usuario.ultimo_acceso)}
							</p>
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={esUnoMismo || resetPassword.isPending}
								title={
									esUnoMismo
										? "Para cambiar su propia contraseña use \"Mi cuenta y seguridad\""
										: undefined
								}
								onClick={() => resetPassword.mutate()}
							>
								{resetPassword.isPending ? (
									<Loader2 className="size-4 animate-spin" aria-hidden="true" />
								) : (
									<KeyRound className="size-4" aria-hidden="true" />
								)}
								Restablecer contraseña
							</Button>
						</section>

						<Separator />

						<section className="space-y-3">
							<h3 className="text-destructive text-sm font-semibold">Zona de riesgo</h3>
							<Button
								type="button"
								variant="destructive"
								size="sm"
								disabled={esUnoMismo || eliminar.isPending}
								title={esUnoMismo ? "No puede eliminar su propia cuenta" : undefined}
								onClick={() => {
									if (confirm(`¿Eliminar la cuenta "${data.usuario.usuario}"? Esta acción se puede revertir solo desde la base de datos.`)) {
										eliminar.mutate()
									}
								}}
							>
								{eliminar.isPending ? (
									<Loader2 className="size-4 animate-spin" aria-hidden="true" />
								) : (
									<Trash2 className="size-4" aria-hidden="true" />
								)}
								Eliminar usuario
							</Button>
						</section>
					</div>
				)}
			</div>

			{passwordNueva && (
				<ModalPasswordTemporal
					titulo="Contraseña restablecida"
					usuario={data?.usuario.usuario ?? ""}
					password={passwordNueva.password_temporal}
					onCerrar={() => setPasswordNueva(null)}
				/>
			)}
		</div>
	)
}
