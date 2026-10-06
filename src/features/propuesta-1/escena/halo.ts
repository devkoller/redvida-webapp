import * as THREE from "three"

/**
 * Textura de resplandor, compartida · RV-L3.1
 *
 * Un degradado radial generado en un lienzo 2D: no hay que descargar ninguna
 * imagen. La usan la esfera y las dos figuras, así que se crea **una sola vez**
 * para toda la escena — son tres mallas mirando a la misma textura en memoria.
 *
 * La curva importa más que los colores: una caída lineal se lee como un disco
 * con borde, y lo que se busca es que no haya borde en ninguna parte.
 */
let compartida: THREE.Texture | null = null

export function texturaHalo(): THREE.Texture {
	if (compartida) return compartida

	const lado = 128
	const lienzo = document.createElement("canvas")
	lienzo.width = lienzo.height = lado
	const ctx = lienzo.getContext("2d")!

	const g = ctx.createRadialGradient(lado / 2, lado / 2, 0, lado / 2, lado / 2, lado / 2)
	g.addColorStop(0, "rgba(255,246,230,1)")
	g.addColorStop(0.12, "rgba(255,214,160,0.85)")
	g.addColorStop(0.35, "rgba(255,157,92,0.35)")
	g.addColorStop(0.7, "rgba(255,120,60,0.08)")
	g.addColorStop(1, "rgba(255,120,60,0)")

	ctx.fillStyle = g
	ctx.fillRect(0, 0, lado, lado)

	compartida = new THREE.CanvasTexture(lienzo)
	compartida.colorSpace = THREE.SRGBColorSpace
	return compartida
}

/**
 * Material de resplandor aditivo.
 *
 * Sin escritura ni test de profundidad: el resplandor tiene que poder pasar por
 * delante de la geometría sin recortarse contra ella. El orden lo fija
 * `renderOrder`, no la profundidad.
 */
export function materialHalo(opacidad: number): THREE.MeshBasicMaterial {
	return new THREE.MeshBasicMaterial({
		map: texturaHalo(),
		transparent: true,
		opacity: opacidad,
		blending: THREE.AdditiveBlending,
		depthWrite: false,
		depthTest: false,
		toneMapped: false,
	})
}
