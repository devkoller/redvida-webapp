import { Loader2 } from "lucide-react"
import { useState } from "react"

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TIPOS_BLOQUE, TIPOS_SOLO_NARRATIVA, type BloqueCms } from "../data/schema"

const Girando = ({ cuando }: { cuando: boolean }) => (cuando ? <Loader2 className="size-4 animate-spin" /> : null)

export function DialogoPublicar({
	abierto,
	onAbiertoChange,
	titulo,
	pendiente,
	onPublicar,
}: {
	abierto: boolean
	onAbiertoChange: (v: boolean) => void
	titulo: string
	pendiente: boolean
	onPublicar: (comentario: string) => void
}) {
	const [comentario, setComentario] = useState("")
	return (
		<Dialog open={abierto} onOpenChange={(v) => !pendiente && onAbiertoChange(v)}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Publicar «{titulo}»</DialogTitle>
					<DialogDescription>
						El sitio público mostrará el borrador actual de inmediato. Queda en el historial y se puede
						revertir.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-2">
					<Label htmlFor="comentario-publicacion">Comentario (opcional)</Label>
					<Input
						id="comentario-publicacion"
						className="bg-card"
						value={comentario}
						onChange={(e) => setComentario(e.target.value)}
						placeholder="Qué cambió y por qué"
					/>
					<p className="text-muted-foreground min-h-5 text-xs">Ayuda a saber qué revertir si algo sale mal.</p>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onAbiertoChange(false)} disabled={pendiente}>
						Cancelar
					</Button>
					<Button
						onClick={() => {
							onPublicar(comentario)
							setComentario("")
						}}
						disabled={pendiente}
					>
						<Girando cuando={pendiente} />
						Publicar en el sitio
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

export function DialogoAgregarBloque({
	abierto,
	onAbiertoChange,
	pendiente,
	onAgregar,
}: {
	abierto: boolean
	onAbiertoChange: (v: boolean) => void
	pendiente: boolean
	onAgregar: (tipo: string) => void
}) {
	const [tipo, setTipo] = useState("texto")
	return (
		<Dialog open={abierto} onOpenChange={(v) => !pendiente && onAbiertoChange(v)}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Agregar bloque</DialogTitle>
					<DialogDescription>Se agrega al final del borrador y pasa a su edición.</DialogDescription>
				</DialogHeader>
				<div className="space-y-2">
					<Label htmlFor="tipo-bloque">Tipo de bloque</Label>
					<Select value={tipo} onValueChange={setTipo}>
						<SelectTrigger id="tipo-bloque" className="bg-card w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{Object.entries(TIPOS_BLOQUE)
								.filter(([clave]) => !TIPOS_SOLO_NARRATIVA.includes(clave))
								.map(([clave, valor]) => (
								<SelectItem key={clave} value={clave}>
									{valor.etiqueta}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<p className="text-muted-foreground min-h-10 text-xs">{TIPOS_BLOQUE[tipo]?.descripcion}</p>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onAbiertoChange(false)} disabled={pendiente}>
						Cancelar
					</Button>
					<Button onClick={() => onAgregar(tipo)} disabled={pendiente}>
						<Girando cuando={pendiente} />
						Agregar bloque
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

export function DialogoEliminarBloque({
	bloque,
	pendiente,
	onCerrar,
	onConfirmar,
}: {
	bloque: BloqueCms | null
	pendiente: boolean
	onCerrar: () => void
	onConfirmar: (id: number) => void
}) {
	const nombre = bloque ? (TIPOS_BLOQUE[bloque.tipo]?.etiqueta ?? bloque.tipo) : ""
	return (
		<AlertDialog open={!!bloque} onOpenChange={(v) => !v && !pendiente && onCerrar()}>
			<AlertDialogContent className="sm:max-w-md">
				<AlertDialogHeader>
					<AlertDialogTitle>Eliminar el bloque «{nombre}»</AlertDialogTitle>
					<AlertDialogDescription>
						Se quita del borrador. El sitio público no cambia hasta que publique, y las versiones ya
						publicadas conservan este bloque.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={pendiente}>Cancelar</AlertDialogCancel>
					<Button variant="destructive" disabled={pendiente} onClick={() => bloque && onConfirmar(bloque.id)}>
						<Girando cuando={pendiente} />
						Eliminar bloque
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}

export function DialogoRevertir({
	version,
	pendiente,
	onCerrar,
	onConfirmar,
}: {
	version: { id: number; numero_version: number } | null
	pendiente: boolean
	onCerrar: () => void
	onConfirmar: (id: number) => void
}) {
	return (
		<AlertDialog open={!!version} onOpenChange={(v) => !v && !pendiente && onCerrar()}>
			<AlertDialogContent className="sm:max-w-md">
				<AlertDialogHeader>
					<AlertDialogTitle>Revertir a la versión {version?.numero_version}</AlertDialogTitle>
					<AlertDialogDescription>
						Se crea una versión nueva con ese contenido y el sitio la muestra de inmediato. Nada se pierde:
						las versiones actuales siguen en el historial.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={pendiente}>Cancelar</AlertDialogCancel>
					<Button disabled={pendiente} onClick={() => version && onConfirmar(version.id)}>
						<Girando cuando={pendiente} />
						Revertir
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
