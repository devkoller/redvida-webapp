import { useMutation } from "@tanstack/react-query"
import { KeyRound, Loader2, ShieldAlert, Smartphone } from "lucide-react"
import { useState } from "react"

import { ENDPOINTS } from "@/api/config"
import fetchApi, { ApiError } from "@/api/fetchApi"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { UsuarioSesion } from "@/stores/sessionStore"

export interface DesafioMfa {
	mfa_requerido: true
	mfa_enrolado: boolean
	mfa_token: string
	expira_en: string
}

interface RespuestaSesion {
	access_token: string
	refresh_token: string
	usuario: UsuarioSesion
	mfa_uso_respaldo?: boolean
	mfa_respaldos_restantes?: number
}

/**
 * Segundo paso del inicio de sesión.
 *
 * Acepta indistintamente el código de la aplicación y un código de respaldo: la
 * persona que llega aquí sin su teléfono ya tiene bastante con eso como para
 * además tener que encontrar el botón correcto.
 */
export function PasoMfa({
	desafio,
	alEntrar,
	alCancelar,
}: {
	desafio: DesafioMfa
	alEntrar: (sesion: RespuestaSesion) => void
	alCancelar: () => void
}) {
	const [codigo, setCodigo] = useState("")
	const [error, setError] = useState<string | null>(null)

	const verificar = useMutation({
		mutationFn: () =>
			fetchApi.post<RespuestaSesion>(ENDPOINTS.mfaVerificar, {
				mfa_token: desafio.mfa_token,
				codigo: codigo.trim(),
			}),
		onSuccess: alEntrar,
		onError: (fallo) =>
			setError(fallo instanceof ApiError ? fallo.message : "No fue posible verificar el código"),
	})

	return (
		<div className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-16">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-2xl">
						<Smartphone className="size-5" aria-hidden="true" />
						Verificación en dos pasos
					</CardTitle>
					<CardDescription>
						Escriba el código que muestra su aplicación de autenticación, o uno de sus códigos de
						respaldo.
					</CardDescription>
				</CardHeader>

				<CardContent>
					<form
						className="space-y-5"
						onSubmit={(evento) => {
							evento.preventDefault()
							setError(null)
							verificar.mutate()
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

						<div className="space-y-2">
							<Label htmlFor="codigo-mfa" className="block">
								Código de verificación
							</Label>
							<Input
								id="codigo-mfa"
								value={codigo}
								onChange={(evento) => setCodigo(evento.target.value)}
								// `one-time-code` deja que iOS y Android ofrezcan el código
								// directamente desde el teclado.
								autoComplete="one-time-code"
								inputMode="text"
								autoFocus
								placeholder="000000"
								className="text-center font-mono text-lg tracking-[0.3em]"
								aria-describedby="ayuda-mfa"
							/>
							<p id="ayuda-mfa" className="text-muted-foreground text-xs">
								Seis dígitos de su aplicación, o un código de respaldo con el formato
								ABCDE-FGHIJ.
							</p>
						</div>

						<Button
							type="submit"
							className="w-full"
							disabled={verificar.isPending || codigo.trim().length < 6}
						>
							{verificar.isPending && (
								<Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
							)}
							Verificar
						</Button>

						<Button type="button" variant="ghost" className="w-full" onClick={alCancelar}>
							Volver
						</Button>
					</form>

					<p className="text-muted-foreground mt-6 flex items-start gap-2 text-xs">
						<KeyRound className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
						Si perdió el acceso a su aplicación y ya no le quedan códigos de respaldo,
						comuníquese con la persona responsable del registro.
					</p>
				</CardContent>
			</Card>
		</div>
	)
}
