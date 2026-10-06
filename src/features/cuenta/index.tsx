import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, Check, Copy, Loader2, ShieldCheck, ShieldOff, Smartphone } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { ENDPOINTS } from "@/api/config"
import fetchApi, { ApiError } from "@/api/fetchApi"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useSessionStore } from "@/stores/sessionStore"

interface EstadoMfa {
	habilitado: boolean
	obligatorio: boolean
	codigos_respaldo_restantes: number
	pocos_codigos: boolean
}

interface Enrolamiento {
	secreto: string
	uri: string
	qr: string
	etiqueta: string
}

export function CuentaPage() {
	const usuario = useSessionStore((estado) => estado.usuario)

	return (
		<div className="mx-auto max-w-2xl px-4 py-8">
			<h1 className="text-3xl font-bold tracking-tight">Mi cuenta</h1>

			<Card className="mt-6">
				<CardContent className="pt-6">
					<dl className="grid gap-3 text-sm sm:grid-cols-2">
						<div>
							<dt className="text-muted-foreground text-xs">Nombre</dt>
							<dd>{usuario?.nombre}</dd>
						</div>
						<div>
							<dt className="text-muted-foreground text-xs">Usuario</dt>
							<dd className="font-mono">{usuario?.usuario}</dd>
						</div>
						<div>
							<dt className="text-muted-foreground text-xs">Correo</dt>
							<dd>{usuario?.email}</dd>
						</div>
						<div>
							<dt className="text-muted-foreground text-xs">Roles</dt>
							<dd>{usuario?.roles.join(", ")}</dd>
						</div>
					</dl>
				</CardContent>
			</Card>

			<Separator className="my-8" />
			<SeccionMfa />
		</div>
	)
}

function SeccionMfa() {
	const queryClient = useQueryClient()
	const [enrolamiento, setEnrolamiento] = useState<Enrolamiento | null>(null)
	const [codigo, setCodigo] = useState("")
	const [respaldos, setRespaldos] = useState<string[] | null>(null)

	const { data: estado, isLoading } = useQuery({
		queryKey: ["mfa", "estado"],
		queryFn: () => fetchApi.get<EstadoMfa>(ENDPOINTS.mfaEstado),
	})

	const invalidar = () => queryClient.invalidateQueries({ queryKey: ["mfa"] })

	const enrolar = useMutation({
		mutationFn: () => fetchApi.post<Enrolamiento>(ENDPOINTS.mfaEnrolar),
		onSuccess: setEnrolamiento,
		onError: (e) => toast.error(e instanceof ApiError ? e.message : "No fue posible iniciar"),
	})

	const confirmar = useMutation({
		mutationFn: () =>
			fetchApi.post<{ codigos_respaldo: string[] }>(ENDPOINTS.mfaConfirmar, {
				codigo: codigo.trim(),
			}),
		onSuccess: (datos) => {
			setRespaldos(datos.codigos_respaldo)
			setEnrolamiento(null)
			setCodigo("")
			invalidar()
			toast.success("Segundo factor activado")
		},
		onError: (e) => toast.error(e instanceof ApiError ? e.message : "No fue posible confirmar"),
	})

	const desactivar = useMutation({
		mutationFn: () => fetchApi.post(ENDPOINTS.mfaDesactivar, { codigo: codigo.trim() }),
		onSuccess: () => {
			setCodigo("")
			invalidar()
			toast.success("Segundo factor desactivado")
		},
		onError: (e) => toast.error(e instanceof ApiError ? e.message : "No fue posible desactivar"),
	})

	const regenerar = useMutation({
		mutationFn: () =>
			fetchApi.post<{ codigos_respaldo: string[] }>(ENDPOINTS.mfaCodigos, {
				codigo: codigo.trim(),
			}),
		onSuccess: (datos) => {
			setRespaldos(datos.codigos_respaldo)
			setCodigo("")
			invalidar()
			toast.success("Códigos regenerados. Los anteriores ya no sirven")
		},
		onError: (e) => toast.error(e instanceof ApiError ? e.message : "No fue posible regenerar"),
	})

	if (isLoading) return <p className="text-muted-foreground text-sm">Cargando…</p>

	// Los respaldos se muestran una sola vez, así que ocupan la pantalla entera
	// hasta que la persona confirme haberlos guardado.
	if (respaldos) return <CodigosRespaldo codigos={respaldos} alCerrar={() => setRespaldos(null)} />

	return (
		<section aria-labelledby="titulo-mfa">
			<div className="flex flex-wrap items-center gap-3">
				<h2 id="titulo-mfa" className="text-lg font-semibold">
					Verificación en dos pasos
				</h2>
				{estado?.habilitado ? (
					<Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600">
						<ShieldCheck className="size-3" aria-hidden="true" />
						Activa
					</Badge>
				) : (
					<Badge variant="outline">
						<ShieldOff className="size-3" aria-hidden="true" />
						Inactiva
					</Badge>
				)}
				{estado?.obligatorio && <Badge variant="outline">Obligatoria para su rol</Badge>}
			</div>

			<p className="text-muted-foreground mt-2 text-sm">
				Añade un código temporal desde su teléfono al iniciar sesión. Con ella, saber su
				contraseña deja de ser suficiente para entrar a su cuenta.
			</p>

			{estado?.pocos_codigos && (
				<div
					role="alert"
					className="border-amber-500/40 bg-amber-500/10 mt-4 flex items-start gap-2 rounded-md border p-3 text-sm"
				>
					<AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
					<span>
						Le quedan {estado.codigos_respaldo_restantes} códigos de respaldo. Si se queda sin
						ellos y pierde el teléfono, no podrá entrar. Conviene regenerarlos.
					</span>
				</div>
			)}

			<Card className="mt-4">
				<CardContent className="space-y-4 pt-6">
					{!estado?.habilitado && !enrolamiento && (
						<Button onClick={() => enrolar.mutate()} disabled={enrolar.isPending}>
							{enrolar.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
							<Smartphone className="size-4" aria-hidden="true" />
							Activar verificación en dos pasos
						</Button>
					)}

					{enrolamiento && (
						<div className="space-y-4">
							<ol className="text-sm">
								<li>1. Abra su aplicación de autenticación y escanee este código:</li>
							</ol>
							<img
								src={enrolamiento.qr}
								alt={`Código QR para configurar la verificación en dos pasos de ${enrolamiento.etiqueta}`}
								className="rounded-lg border bg-white p-2"
								width={240}
								height={240}
							/>
							<details className="text-sm">
								<summary className="cursor-pointer">¿No puede escanear el código?</summary>
								<p className="text-muted-foreground mt-2">
									Escriba esta clave manualmente en su aplicación:
								</p>
								<code className="bg-muted mt-1 block rounded px-2 py-1 font-mono text-xs break-all">
									{enrolamiento.secreto}
								</code>
							</details>

							<div className="space-y-2">
								<Label htmlFor="codigo-confirmar" className="block">
									2. Escriba el código que aparece en su aplicación
								</Label>
								<Input
									id="codigo-confirmar"
									value={codigo}
									onChange={(e) => setCodigo(e.target.value)}
									autoComplete="one-time-code"
									placeholder="000000"
									className="max-w-[12rem] text-center font-mono tracking-[0.3em]"
								/>
							</div>

							<div className="flex gap-2">
								<Button
									onClick={() => confirmar.mutate()}
									disabled={confirmar.isPending || codigo.trim().length < 6}
								>
									{confirmar.isPending && (
										<Loader2 className="size-4 animate-spin" aria-hidden="true" />
									)}
									Confirmar y activar
								</Button>
								<Button
									variant="ghost"
									onClick={() => {
										setEnrolamiento(null)
										setCodigo("")
									}}
								>
									Cancelar
								</Button>
							</div>
						</div>
					)}

					{estado?.habilitado && (
						<div className="space-y-4">
							<p className="text-sm">
								Códigos de respaldo disponibles: <strong>{estado.codigos_respaldo_restantes}</strong>
							</p>

							<div className="space-y-2">
								<Label htmlFor="codigo-accion" className="block">
									Para cualquier cambio, confirme con un código actual
								</Label>
								<Input
									id="codigo-accion"
									value={codigo}
									onChange={(e) => setCodigo(e.target.value)}
									autoComplete="one-time-code"
									placeholder="000000"
									className="max-w-[12rem] text-center font-mono tracking-[0.3em]"
								/>
							</div>

							<div className="flex flex-wrap gap-2">
								<Button
									variant="outline"
									onClick={() => regenerar.mutate()}
									disabled={regenerar.isPending || codigo.trim().length < 6}
								>
									Regenerar códigos de respaldo
								</Button>
								{/* Sin el botón siquiera cuando el rol lo exige: el backend
								    devuelve 403, pero ofrecerlo solo genera frustración. */}
								{!estado.obligatorio && (
									<Button
										variant="destructive"
										onClick={() => desactivar.mutate()}
										disabled={desactivar.isPending || codigo.trim().length < 6}
									>
										Desactivar
									</Button>
								)}
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</section>
	)
}

function CodigosRespaldo({ codigos, alCerrar }: { codigos: string[]; alCerrar: () => void }) {
	const [guardados, setGuardados] = useState(false)

	const copiar = async () => {
		await navigator.clipboard.writeText(codigos.join("\n"))
		toast.success("Códigos copiados")
	}

	return (
		<section aria-labelledby="titulo-respaldos">
			<h2 id="titulo-respaldos" className="text-lg font-semibold">
				Sus códigos de respaldo
			</h2>
			<div
				role="alert"
				className="border-amber-500/40 bg-amber-500/10 mt-3 flex items-start gap-2 rounded-md border p-3 text-sm"
			>
				<AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
				<span>
					<strong>No se volverán a mostrar.</strong> Guárdelos en un lugar seguro: son la única
					forma de entrar si pierde el acceso a su teléfono. Cada uno sirve una sola vez.
				</span>
			</div>

			<Card className="mt-4">
				<CardHeader>
					<CardDescription>10 códigos de un solo uso</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<ul className="bg-muted grid grid-cols-2 gap-2 rounded-md p-4 font-mono text-sm">
						{codigos.map((codigo) => (
							<li key={codigo}>{codigo}</li>
						))}
					</ul>

					<div className="flex flex-wrap items-center gap-3">
						<Button variant="outline" onClick={copiar}>
							<Copy className="size-4" aria-hidden="true" />
							Copiar todos
						</Button>
						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={guardados}
								onChange={(e) => setGuardados(e.target.checked)}
								className="size-4"
							/>
							Ya los guardé en un lugar seguro
						</label>
						<Button onClick={alCerrar} disabled={!guardados} className="ml-auto">
							<Check className="size-4" aria-hidden="true" />
							Continuar
						</Button>
					</div>
				</CardContent>
			</Card>
		</section>
	)
}
