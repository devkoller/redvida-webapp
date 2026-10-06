import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { ApiError } from "@/api/fetchApi"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSessionStore } from "@/stores/sessionStore"
import { login } from "./api"
import { EnrolamientoInicial } from "./EnrolamientoInicial"
import { PasoMfa, type DesafioMfa } from "./PasoMfa"

const esquema = z.object({
	usuario: z.string().trim().min(1, "Indique su usuario o correo electrónico"),
	password: z.string().min(1, "Indique su contraseña"),
})

type Credenciales = z.infer<typeof esquema>

export function LoginPage() {
	const navigate = useNavigate()
	const { redirigir } = useSearch({ from: "/login" })
	const iniciar = useSessionStore((estado) => estado.iniciar)

	const [verPassword, setVerPassword] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [desafio, setDesafio] = useState<DesafioMfa | null>(null)

	/**
	 * Entrada al panel, una vez completada la autenticación.
	 *
	 * La comparten los dos caminos —con y sin segundo factor— para que el
	 * destino y la validación del `redirigir` se decidan en un solo sitio.
	 */
	const entrar = (datos: {
		access_token: string
		refresh_token: string
		usuario: Parameters<typeof iniciar>[0]["usuario"]
	}) => {
		iniciar({
			accessToken: datos.access_token,
			refreshToken: datos.refresh_token,
			usuario: datos.usuario,
		})
		// Solo se aceptan rutas internas, para que un enlace manipulado no pueda
		// usar el login como trampolín hacia un sitio externo. Sin destino previo
		// se va a `/admin`, que reparte según el rol.
		const destino =
			redirigir?.startsWith("/") && !redirigir.startsWith("//") ? redirigir : "/admin"
		navigate({ to: destino, replace: true })
	}

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<Credenciales>({ resolver: zodResolver(esquema) })

	const mutacion = useMutation({
		mutationFn: ({ usuario, password }: Credenciales) => login(usuario, password),
		onSuccess: (datos) => {
			// La respuesta tiene dos formas: la sesión completa, o un desafío de
			// segundo factor. Distinguirlas por `mfa_requerido` evita que un
			// cambio en el backend deje al frontend guardando una sesión vacía.
			if ("mfa_requerido" in datos && datos.mfa_requerido) {
				setDesafio(datos as unknown as DesafioMfa)
				return
			}
			entrar(datos)
		},
		onError: (fallo) => {
			setError(
				fallo instanceof ApiError
					? fallo.message
					: "No fue posible iniciar sesión. Intente de nuevo.",
			)
		},
	})

	const enviar = handleSubmit((datos) => {
		setError(null)
		mutacion.mutate(datos)
	})

	if (desafio) {
		const volver = () => {
			setDesafio(null)
			setError(null)
		}

		// Quien pertenece a un rol con MFA obligatorio y aún no lo ha configurado
		// necesita el código QR, no un campo donde escribir un código que todavía
		// no puede generar.
		return desafio.mfa_enrolado ? (
			<PasoMfa desafio={desafio} alEntrar={entrar} alCancelar={volver} />
		) : (
			<EnrolamientoInicial
				mfaToken={desafio.mfa_token}
				alEntrar={entrar}
				alCancelar={volver}
			/>
		)
	}

	return (
		<div className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-16">
			<Card>
				<CardHeader>
					<CardTitle className="text-2xl">Acceso administrativo</CardTitle>
					<CardDescription>
						Este panel es de uso exclusivo del personal autorizado del registro.
					</CardDescription>
				</CardHeader>

				<CardContent>
					<form onSubmit={enviar} className="space-y-5" noValidate>
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
							<Label htmlFor="usuario" className="block">
								Usuario o correo electrónico
							</Label>
							<Input
								id="usuario"
								autoComplete="username"
								autoFocus
								aria-invalid={!!errors.usuario}
								aria-describedby={errors.usuario ? "error-usuario" : undefined}
								{...register("usuario")}
							/>
							{errors.usuario && (
								<p id="error-usuario" className="text-destructive text-sm">
									{errors.usuario.message}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="password" className="block">
								Contraseña
							</Label>
							<div className="relative">
								<Input
									id="password"
									type={verPassword ? "text" : "password"}
									autoComplete="current-password"
									className="pr-10"
									aria-invalid={!!errors.password}
									aria-describedby={errors.password ? "error-password" : undefined}
									{...register("password")}
								/>
								<button
									type="button"
									onClick={() => setVerPassword((previo) => !previo)}
									className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex items-center px-3"
									aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
								>
									{verPassword ? (
										<EyeOff className="size-4" aria-hidden="true" />
									) : (
										<Eye className="size-4" aria-hidden="true" />
									)}
								</button>
							</div>
							{errors.password && (
								<p id="error-password" className="text-destructive text-sm">
									{errors.password.message}
								</p>
							)}
						</div>

						<Button type="submit" className="w-full" disabled={mutacion.isPending}>
							{mutacion.isPending && (
								<Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
							)}
							Entrar
						</Button>

						<p className="text-muted-foreground text-center text-xs">
							Los accesos a este panel quedan registrados en la bitácora de auditoría.
						</p>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}
