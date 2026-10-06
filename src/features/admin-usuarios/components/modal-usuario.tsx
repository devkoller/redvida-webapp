import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, X } from "lucide-react"
import { useState } from "react"

import { ApiError } from "@/api/fetchApi"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { crearUsuario, type Rol, type UsuarioCreado } from "../api"

/**
 * Alta de una cuenta administrativa.
 *
 * La contraseña NO se pide aquí: la genera el servidor (ver
 * `usuarios.service.ts`) y se muestra una sola vez después, con
 * `ModalPasswordTemporal`. Quien crea la cuenta solo decide identidad y roles.
 */
export function ModalCrearUsuario({
	roles,
	onCerrar,
	onCreado,
}: {
	roles: Rol[]
	onCerrar: () => void
	onCreado: (resultado: UsuarioCreado) => void
}) {
	const [usuario, setUsuario] = useState("")
	const [email, setEmail] = useState("")
	const [nombre, setNombre] = useState("")
	const [rolesElegidos, setRolesElegidos] = useState<string[]>([])
	const [error, setError] = useState<string | null>(null)
	const queryClient = useQueryClient()

	const crear = useMutation({
		mutationFn: () =>
			crearUsuario({ usuario: usuario.trim(), email: email.trim(), nombre: nombre.trim(), roles: rolesElegidos }),
		onSuccess: (resultado) => {
			queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] })
			queryClient.invalidateQueries({ queryKey: ["admin-roles"] })
			onCreado(resultado)
		},
		onError: (fallo) => setError(fallo instanceof ApiError ? fallo.message : "No fue posible crear el usuario"),
	})

	const alternarRol = (clave: string) =>
		setRolesElegidos((previo) =>
			previo.includes(clave) ? previo.filter((r) => r !== clave) : [...previo, clave],
		)

	const enviar = (evento: React.FormEvent) => {
		evento.preventDefault()
		setError(null)
		if (!usuario.trim() || !email.trim() || !nombre.trim()) {
			setError("Usuario, correo y nombre son obligatorios")
			return
		}
		crear.mutate()
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="titulo-crear-usuario"
			onKeyDown={(e) => e.key === "Escape" && onCerrar()}
		>
			<Card className="max-h-[90dvh] w-full max-w-lg overflow-y-auto">
				<CardContent className="pt-6">
					<div className="mb-4 flex items-start justify-between">
						<h2 id="titulo-crear-usuario" className="text-lg font-semibold">
							Nuevo usuario
						</h2>
						<Button variant="ghost" size="icon" onClick={onCerrar} aria-label="Cerrar">
							<X className="size-4" />
						</Button>
					</div>

					<form onSubmit={enviar} className="space-y-4">
						<div className="grid gap-2">
							<Label htmlFor="nuevo-usuario">Usuario</Label>
							<Input
								id="nuevo-usuario"
								value={usuario}
								onChange={(e) => setUsuario(e.target.value)}
								placeholder="nombre.apellido"
								autoComplete="off"
								required
							/>
							<p className="text-muted-foreground text-xs">
								Solo minúsculas, números, puntos, guiones y guion bajo. Es lo que se teclea para
								entrar, no se muestra al público.
							</p>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="nuevo-nombre">Nombre completo</Label>
							<Input
								id="nuevo-nombre"
								value={nombre}
								onChange={(e) => setNombre(e.target.value)}
								required
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="nuevo-email">Correo electrónico</Label>
							<Input
								id="nuevo-email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
							/>
						</div>

						<fieldset className="grid gap-2">
							<legend className="mb-1 text-sm font-medium">Roles</legend>
							<div className="grid max-h-48 gap-2 overflow-y-auto rounded-md border p-3 sm:grid-cols-2">
								{roles
									.filter((rol) => rol.activo)
									.map((rol) => (
										<label key={rol.clave} className="flex items-center gap-2 text-sm">
											<Checkbox
												checked={rolesElegidos.includes(rol.clave)}
												onCheckedChange={() => alternarRol(rol.clave)}
											/>
											{rol.nombre}
										</label>
									))}
							</div>
							<p className="text-muted-foreground text-xs">
								Puede dejarlo sin roles y asignarlos después; sin ninguno, la cuenta no verá
								ninguna sección del panel.
							</p>
						</fieldset>

						{error && <p className="text-destructive text-sm">{error}</p>}

						<div className="flex justify-end gap-2">
							<Button type="button" variant="outline" onClick={onCerrar}>
								Cancelar
							</Button>
							<Button type="submit" disabled={crear.isPending}>
								{crear.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
								Crear usuario
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}
