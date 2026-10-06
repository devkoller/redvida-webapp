import { useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { API_URL, ENDPOINTS } from "@/api/config"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

/**
 * Cambio de estatus. Modal chico a propósito (dos campos, cabe sin scroll).
 * El motivo es obligatorio: una baja sin motivo es indefendible ante el titular.
 */
export function DialogoEstatus({
	codigoRegistro,
	abierto,
	onAbiertoChange,
}: {
	codigoRegistro: string
	abierto: boolean
	onAbiertoChange: (abierto: boolean) => void
}) {
	const [estatus, setEstatus] = useState("")
	const [motivo, setMotivo] = useState("")
	const [guardando, setGuardando] = useState(false)
	const [intentado, setIntentado] = useState(false)
	const queryClient = useQueryClient()

	const faltaEstatus = intentado && !estatus
	const faltaMotivo = intentado && motivo.trim().length === 0

	const cerrar = (valor: boolean) => {
		onAbiertoChange(valor)
		if (!valor) {
			setEstatus("")
			setMotivo("")
			setIntentado(false)
		}
	}

	const guardar = async () => {
		setIntentado(true)
		if (!estatus || motivo.trim().length === 0) return
		setGuardando(true)
		try {
			await axios.patch(
				`${API_URL}${ENDPOINTS.adminDonadores}/${encodeURIComponent(codigoRegistro)}/estatus`,
				{ estatus, motivo: motivo.trim() },
			)
			toast.success("Estatus actualizado")
			queryClient.invalidateQueries({ queryKey: ["admin-donador", codigoRegistro] })
			queryClient.invalidateQueries({ queryKey: ["admin-donadores"] })
			cerrar(false)
		} catch (error) {
			toast.error(
				axios.isAxiosError(error)
					? (error.response?.data?.message ?? "No fue posible actualizar el estatus")
					: "No fue posible actualizar el estatus",
			)
		} finally {
			setGuardando(false)
		}
	}

	return (
		<Dialog open={abierto} onOpenChange={cerrar}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Cambiar estatus del donador</DialogTitle>
					<DialogDescription>
						Se aplica a {codigoRegistro}. El motivo queda registrado en la bitácora de auditoría.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="nuevo-estatus">
							Nuevo estatus<span className="text-destructive ms-0.5">*</span>
						</Label>
						<Select value={estatus} onValueChange={setEstatus}>
							<SelectTrigger
								id="nuevo-estatus"
								className="bg-card w-full"
								aria-invalid={faltaEstatus}
							>
								<SelectValue placeholder="Seleccione" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="disponible">Disponible</SelectItem>
								<SelectItem value="suspendido">Suspendido</SelectItem>
								<SelectItem value="baja">Baja</SelectItem>
							</SelectContent>
						</Select>
						<p className="text-destructive min-h-5 text-xs">
							{faltaEstatus ? "Seleccione el nuevo estatus." : ""}
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="motivo-estatus">
							Motivo<span className="text-destructive ms-0.5">*</span>
						</Label>
						<Textarea
							id="motivo-estatus"
							rows={3}
							value={motivo}
							onChange={(e) => setMotivo(e.target.value)}
							aria-invalid={faltaMotivo}
							placeholder="Por qué cambia el estatus de este donador"
						/>
						<p className="text-destructive min-h-5 text-xs">
							{faltaMotivo ? "El motivo es obligatorio." : ""}
						</p>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => cerrar(false)} disabled={guardando}>
						Cancelar
					</Button>
					<Button onClick={guardar} disabled={guardando}>
						{guardando && <Loader2 className="size-4 animate-spin" />}
						Aplicar cambio
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
