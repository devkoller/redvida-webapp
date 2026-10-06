import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import axios from "axios"
import { Loader2, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { API_URL, ENDPOINTS } from "@/api/config"
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

/** Herramienta de pruebas: borra al donador y libera su correo y CURP. */
export function EliminarDonador({ codigoRegistro }: { codigoRegistro: string }) {
	const [abierto, setAbierto] = useState(false)
	const [eliminando, setEliminando] = useState(false)
	const queryClient = useQueryClient()
	const navegar = useNavigate()

	const eliminar = async () => {
		setEliminando(true)
		try {
			await axios.delete(
				`${API_URL}${ENDPOINTS.adminDonadores}/${encodeURIComponent(codigoRegistro)}`,
			)
			toast.success("Donador eliminado. Su correo y CURP quedaron libres.")
			queryClient.removeQueries({ queryKey: ["admin-donador", codigoRegistro] })
			queryClient.invalidateQueries({ queryKey: ["admin-donadores"] })
			navegar({ to: "/admin/donadores", replace: true })
		} catch (error) {
			toast.error(
				axios.isAxiosError(error)
					? (error.response?.data?.message ?? "No fue posible eliminar al donador")
					: "No fue posible eliminar al donador",
			)
			setEliminando(false)
			setAbierto(false)
		}
	}

	return (
		<AlertDialog open={abierto} onOpenChange={setAbierto}>
			<AlertDialogTrigger asChild>
				<Button variant="outline" className="border-destructive/40 text-destructive">
					<Trash2 className="size-4" />
					Eliminar
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent className="sm:max-w-md">
				<AlertDialogHeader>
					<AlertDialogTitle>Eliminar al donador {codigoRegistro}</AlertDialogTitle>
					<AlertDialogDescription>
						Se borrarán el donador y sus citas, y su correo y CURP quedarán libres para volver a
						registrarse. Es una herramienta de pruebas, queda en la bitácora y no se puede deshacer.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
					<Button variant="destructive" onClick={eliminar} disabled={eliminando}>
						{eliminando && <Loader2 className="size-4 animate-spin" />}
						Eliminar definitivamente
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
