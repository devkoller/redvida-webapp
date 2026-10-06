import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { ChevronLeft, ChevronRight, Loader2, Plus, ShieldCheck, Users } from "lucide-react"
import { useState } from "react"

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
import { cn } from "@/lib/utils"
import {
	catalogoPermisos,
	listarRoles,
	listarUsuarios,
	type Permiso,
	type Rol,
	type UsuarioCreado,
} from "./api"
import { DrawerRol } from "./components/drawer-rol"
import { DrawerUsuario } from "./components/drawer-usuario"
import { ModalCrearUsuario } from "./components/modal-usuario"
import { ModalPasswordTemporal } from "./components/modal-password-temporal"
import { ModalNuevoRol } from "./components/modal-rol"

const SIN_FILTRO = "__todos__"

/**
 * Usuarios, roles y permisos del panel (RV-10).
 *
 * Dos pestañas porque son dos objetos distintos con su propio ciclo de vida:
 * una cuenta (quién puede entrar) y un rol (qué puede hacer quien lo tenga).
 * El modelo es puramente RBAC — sin excepciones por usuario — así que
 * "otorgar o quitar un permiso" es en la práctica cambiar los permisos de un
 * rol, o cambiar qué roles tiene alguien. Ambas cosas se hacen aquí.
 */
export function AdminUsuariosPage() {
	const [pestana, setPestana] = useState<"usuarios" | "roles">("usuarios")

	const { data: roles } = useQuery({ queryKey: ["admin-roles"], queryFn: listarRoles })
	const { data: catalogo } = useQuery({ queryKey: ["admin-permisos"], queryFn: catalogoPermisos })

	return (
		<div className="mx-auto max-w-6xl px-4 py-8">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Usuarios y roles</h1>
				<p className="text-muted-foreground mt-2">
					Cuentas del personal que opera el panel, y qué permisos tiene cada rol. Los donadores no
					pasan por aquí: se identifican por correo, sin contraseña.
				</p>
			</div>

			<div className="mt-6 flex gap-1 border-b" role="tablist">
				<button
					role="tab"
					aria-selected={pestana === "usuarios"}
					onClick={() => setPestana("usuarios")}
					className={cn(
						"flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition-colors",
						pestana === "usuarios"
							? "border-primary text-foreground font-medium"
							: "text-muted-foreground border-transparent",
					)}
				>
					<Users className="size-4" aria-hidden="true" />
					Usuarios
				</button>
				<button
					role="tab"
					aria-selected={pestana === "roles"}
					onClick={() => setPestana("roles")}
					className={cn(
						"flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition-colors",
						pestana === "roles"
							? "border-primary text-foreground font-medium"
							: "text-muted-foreground border-transparent",
					)}
				>
					<ShieldCheck className="size-4" aria-hidden="true" />
					Roles y permisos
				</button>
			</div>

			<div className="mt-6">
				{pestana === "usuarios" ? (
					<PestanaUsuarios roles={roles ?? []} />
				) : (
					<PestanaRoles roles={roles ?? []} catalogo={catalogo ?? []} />
				)}
			</div>
		</div>
	)
}

function PestanaUsuarios({ roles }: { roles: Rol[] }) {
	const [busqueda, setBusqueda] = useState("")
	const [rol, setRol] = useState(SIN_FILTRO)
	const [pagina, setPagina] = useState(1)
	const [detalleId, setDetalleId] = useState<number | null>(null)
	const [creando, setCreando] = useState(false)
	const [creado, setCreado] = useState<UsuarioCreado | null>(null)

	const consulta = { busqueda: busqueda || undefined, rol: rol === SIN_FILTRO ? undefined : rol, page: pagina }

	const { data, isFetching } = useQuery({
		queryKey: ["admin-usuarios", consulta],
		queryFn: () => listarUsuarios(consulta),
		placeholderData: keepPreviousData,
	})

	const total = (data?.meta?.total as number) ?? 0
	const totalPaginas = (data?.meta?.paginas as number) ?? 1

	return (
		<div className="space-y-4">
			<Card>
				<CardContent className="flex flex-wrap items-end gap-4 pt-6">
					<div className="grid min-w-48 flex-1 gap-2">
						<Label htmlFor="f-busqueda" className="text-xs">
							Buscar
						</Label>
						<Input
							id="f-busqueda"
							value={busqueda}
							onChange={(e) => {
								setBusqueda(e.target.value)
								setPagina(1)
							}}
							placeholder="Usuario, nombre o correo"
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="f-rol" className="text-xs">
							Rol
						</Label>
						<Select
							value={rol}
							onValueChange={(v) => {
								setRol(v)
								setPagina(1)
							}}
						>
							<SelectTrigger id="f-rol" className="w-48">
								<SelectValue placeholder="Todos" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={SIN_FILTRO}>Todos</SelectItem>
								{roles.map((r) => (
									<SelectItem key={r.clave} value={r.clave}>
										{r.nombre}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<Button onClick={() => setCreando(true)} className="ml-auto">
						<Plus className="size-4" aria-hidden="true" />
						Nuevo usuario
					</Button>
				</CardContent>
			</Card>

			<div className="text-muted-foreground flex items-center gap-2 text-sm" aria-live="polite">
				{isFetching && <Loader2 className="size-3 animate-spin" aria-hidden="true" />}
				{data ? `${total.toLocaleString("es-MX")} usuarios` : "Cargando…"}
			</div>

			<Card>
				<CardContent className="p-0">
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Usuario</TableHead>
									<TableHead>Nombre</TableHead>
									<TableHead>Correo</TableHead>
									<TableHead>Roles</TableHead>
									<TableHead>Estado</TableHead>
									<TableHead className="text-right">Detalle</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data?.data.map((usuario) => (
									<TableRow key={usuario.id}>
										<TableCell className="font-mono text-sm">{usuario.usuario}</TableCell>
										<TableCell className="text-sm">{usuario.nombre}</TableCell>
										<TableCell className="text-muted-foreground text-sm">{usuario.email}</TableCell>
										<TableCell>
											<div className="flex flex-wrap gap-1">
												{usuario.roles.length ? (
													usuario.roles.map((r) => (
														<Badge key={r.clave} variant="outline">
															{r.nombre}
														</Badge>
													))
												) : (
													<span className="text-muted-foreground text-xs">sin roles</span>
												)}
											</div>
										</TableCell>
										<TableCell>
											<Badge variant={usuario.activo ? "default" : "outline"}>
												{usuario.activo ? "Activa" : "Desactivada"}
											</Badge>
										</TableCell>
										<TableCell className="text-right">
											<Button variant="ghost" size="sm" onClick={() => setDetalleId(usuario.id)}>
												Ver
											</Button>
										</TableCell>
									</TableRow>
								))}
								{data && !data.data.length && (
									<TableRow>
										<TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
											Ningún usuario coincide con los filtros.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>

			{totalPaginas > 1 && (
				<nav className="flex items-center justify-between" aria-label="Paginación">
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
						Página {pagina} de {totalPaginas}
					</span>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
						disabled={pagina >= totalPaginas}
					>
						Siguiente
						<ChevronRight className="size-4" aria-hidden="true" />
					</Button>
				</nav>
			)}

			{detalleId !== null && (
				<DrawerUsuario usuarioId={detalleId} roles={roles} onCerrar={() => setDetalleId(null)} />
			)}
			{creando && (
				<ModalCrearUsuario
					roles={roles}
					onCerrar={() => setCreando(false)}
					onCreado={(resultado) => {
						setCreando(false)
						setCreado(resultado)
					}}
				/>
			)}
			{creado && (
				<ModalPasswordTemporal
					titulo="Usuario creado"
					usuario={creado.usuario}
					password={creado.password_temporal}
					onCerrar={() => setCreado(null)}
				/>
			)}
		</div>
	)
}

function PestanaRoles({ roles, catalogo }: { roles: Rol[]; catalogo: Permiso[] }) {
	const [detalleId, setDetalleId] = useState<number | null>(null)
	const [creando, setCreando] = useState(false)

	return (
		<div className="space-y-4">
			<div className="flex justify-end">
				<Button onClick={() => setCreando(true)}>
					<Plus className="size-4" aria-hidden="true" />
					Nuevo rol
				</Button>
			</div>

			<Card>
				<CardContent className="p-0">
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Rol</TableHead>
									<TableHead>Descripción</TableHead>
									<TableHead>Usuarios</TableHead>
									<TableHead>Permisos</TableHead>
									<TableHead>Estado</TableHead>
									<TableHead className="text-right">Detalle</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{roles.map((rol) => (
									<TableRow key={rol.id}>
										<TableCell>
											<div className="flex items-center gap-2">
												<span className="text-sm font-medium">{rol.nombre}</span>
												{rol.es_sistema && <Badge variant="outline">Sistema</Badge>}
											</div>
											<code className="text-muted-foreground text-xs">{rol.clave}</code>
										</TableCell>
										<TableCell className="text-muted-foreground text-sm">
											{rol.descripcion ?? "—"}
										</TableCell>
										<TableCell className="text-sm">{rol.total_usuarios}</TableCell>
										<TableCell className="text-sm">{rol.total_permisos}</TableCell>
										<TableCell>
											<Badge variant={rol.activo ? "default" : "outline"}>
												{rol.activo ? "Activo" : "Desactivado"}
											</Badge>
										</TableCell>
										<TableCell className="text-right">
											<Button variant="ghost" size="sm" onClick={() => setDetalleId(rol.id)}>
												Ver
											</Button>
										</TableCell>
									</TableRow>
								))}
								{!roles.length && (
									<TableRow>
										<TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
											Cargando…
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>

			{detalleId !== null && (
				<DrawerRol rolId={detalleId} catalogo={catalogo} onCerrar={() => setDetalleId(null)} />
			)}
			{creando && <ModalNuevoRol onCerrar={() => setCreando(false)} />}
		</div>
	)
}
