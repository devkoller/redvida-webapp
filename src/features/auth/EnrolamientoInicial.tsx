import { useMutation, useQuery } from "@tanstack/react-query"
import { AlertTriangle, Check, Copy, Loader2, ShieldAlert, Smartphone } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { ENDPOINTS } from "@/api/config"
import fetchApi, { ApiError } from "@/api/fetchApi"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { UsuarioSesion } from "@/stores/sessionStore"

interface Enrolamiento {
	secreto: string
	uri: string
	qr: string
	etiqueta: string
}

interface RespuestaConfirmar {
	codigos_respaldo: string[]
	access_token?: string
	refresh_token?: string
	usuario?: UsuarioSesion
}

/**
 * Enrolamiento del segundo factor **desde el login**.
 *
 * Es el caso de quien pertenece a un rol con MFA obligatorio y todavía no lo ha
 * configurado: el login le niega el token hasta que tenga segundo factor, y
 * configurarlo requeriría un token. Sin esta pantalla el bloqueo es mutuo y la
 * cuenta queda inaccesible.
 *
 * La credencial que lo desbloquea es el `mfa_token`, que solo se emite tras
 * validar la contraseña: esta vía no abre nada que la contraseña no abriera ya.
 */
export function EnrolamientoInicial({
	mfaToken,
	alEntrar,
	alCancelar,
}: {
	mfaToken: string
	alEntrar: (sesion: { access_token: string; refresh_token: string; usuario: UsuarioSesion }) => void
	alCancelar: () => void
}) {
	const [codigo, setCodigo] = useState("")
	const [error, setError] = useState<string | null>(null)
	const [respaldos, setRespaldos] = useState<string[] | null>(null)
	const [sesion, setSesion] = useState<RespuestaConfirmar | null>(null)
	const [guardados, setGuardados] = useState(false)

	const { data: enrolamiento, isLoading } = useQuery({
		queryKey: ["mfa", "enrolar", mfaToken],
		queryFn: () => fetchApi.post<Enrolamiento>(ENDPOINTS.mfaEnrolar, { mfa_token: mfaToken }),
		// Sin reintentos: el `mfa_token` vive 5 minutos y reintentar sobre uno
		// caducado solo alarga la espera antes del mensaje real.
		retry: false,
		staleTime: Infinity,
	})

	const confirmar = useMutation({
		mutationFn: () =>
			fetchApi.post<RespuestaConfirmar>(ENDPOINTS.mfaConfirmar, {
				mfa_token: mfaToken,
				codigo: codigo.trim(),
			}),
		onSuccess: (datos) => {
			// Se guardan los códigos y la sesión, pero **no se entra todavía**:
			// los respaldos solo se muestran una vez y hay que darle a la persona
			// la oportunidad de copiarlos antes de que la pantalla desaparezca.
			setRespaldos(datos.codigos_respaldo)
			setSesion(datos)
		},
		onError: (fallo) =>
			setError(fallo instanceof ApiError ? fallo.message : "No fue posible confirmar el código"),
	})

	const entrar = () => {
		if (sesion?.access_token && sesion.refresh_token && sesion.usuario) {
			alEntrar({
				access_token: sesion.access_token,
				refresh_token: sesion.refresh_token,
				usuario: sesion.usuario,
			})
		}
	}

	const copiar = async () => {
		await navigator.clipboard.writeText((respaldos ?? []).join("\n"))
		toast.success("Códigos copiados")
	}

	// ------------------------------------------------------- Códigos ---
	if (respaldos) {
		return (
			<div className="mx-auto flex w-full max-w-lg flex-col justify-center px-4 py-16">
				<Card>
					<CardHeader>
						<CardTitle className="text-2xl">Guarde sus códigos de respaldo</CardTitle>
						<CardDescription>
							Son la única forma de entrar si pierde el acceso a su teléfono.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div
							role="alert"
							className="border-amber-500/40 bg-amber-500/10 flex items-start gap-2 rounded-md border p-3 text-sm"
						>
							<AlertTriangle
								className="mt-0.5 size-4 shrink-0 text-amber-600"
								aria-hidden="true"
							/>
							<span>
								<strong>No se volverán a mostrar.</strong> Cada uno sirve una sola vez.
							</span>
						</div>

						<ul className="bg-muted grid grid-cols-2 gap-2 rounded-md p-4 font-mono text-sm">
							{respaldos.map((c) => (
								<li key={c}>{c}</li>
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
								Ya los guardé
							</label>
						</div>

						<Button onClick={entrar} disabled={!guardados} className="w-full">
							<Check className="size-4" aria-hidden="true" />
							Entrar al panel
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	// ---------------------------------------------------- Enrolamiento ---
	return (
		<div className="mx-auto flex w-full max-w-lg flex-col justify-center px-4 py-16">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-2xl">
						<Smartphone className="size-5" aria-hidden="true" />
						Configure la verificación en dos pasos
					</CardTitle>
					<CardDescription>
						Su rol la requiere. Solo hay que hacerlo una vez.
					</CardDescription>
				</CardHeader>

				<CardContent>
					{isLoading && (
						<p className="text-muted-foreground flex items-center gap-2 text-sm">
							<Loader2 className="size-4 animate-spin" aria-hidden="true" />
							Generando su código…
						</p>
					)}

					{!isLoading && !enrolamiento && (
						<div
							role="alert"
							className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border p-3 text-sm"
						>
							No fue posible iniciar la configuración. Vuelva a iniciar sesión.
						</div>
					)}

					{enrolamiento && (
						<form
							className="space-y-5"
							onSubmit={(evento) => {
								evento.preventDefault()
								setError(null)
								confirmar.mutate()
							}}
						>
							{error && (
								<div
									role="alert"
									className="border-destructive/40 bg-destructive/10 text-destructive flex items-start gap-2 rounded-md border p-3 text-sm"
								>
									<ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
									<span>{error}</span>
								</div>
							)}

							<div>
								<p className="text-sm">
									<strong>1.</strong> Abra su aplicación de autenticación —Google
									Authenticator, Authy, 1Password— y escanee este código:
								</p>
								<img
									src={enrolamiento.qr}
									alt={`Código QR de configuración para ${enrolamiento.etiqueta}`}
									className="mt-3 rounded-lg border bg-white p-2"
									width={240}
									height={240}
								/>
							</div>

							<details className="text-sm">
								<summary className="cursor-pointer">¿No puede escanearlo?</summary>
								<p className="text-muted-foreground mt-2">
									Escriba esta clave manualmente en su aplicación:
								</p>
								<code className="bg-muted mt-1 block rounded px-2 py-1 font-mono text-xs break-all">
									{enrolamiento.secreto}
								</code>
							</details>

							<div className="space-y-2">
								<Label htmlFor="codigo-enrolar" className="block text-sm">
									<strong>2.</strong> Escriba el código de seis dígitos que aparece
								</Label>
								<Input
									id="codigo-enrolar"
									value={codigo}
									onChange={(e) => setCodigo(e.target.value)}
									autoComplete="one-time-code"
									inputMode="numeric"
									placeholder="000000"
									className="max-w-[12rem] text-center font-mono text-lg tracking-[0.3em]"
								/>
							</div>

							<Button
								type="submit"
								className="w-full"
								disabled={confirmar.isPending || codigo.trim().length < 6}
							>
								{confirmar.isPending && (
									<Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
								)}
								Activar y entrar
							</Button>

							<Button type="button" variant="ghost" className="w-full" onClick={alCancelar}>
								Volver
							</Button>
						</form>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
