/**
 * Copia de un GLB sin texturas · utilidad de comprobación
 *
 * `GLTFLoader` resuelve las imágenes con `createObjectURL` y `Image`, que no
 * existen fuera del navegador. Las comprobaciones de pose van del esqueleto, así
 * que las texturas sobran: se eliminan del JSON y se conserva el resto intacto.
 *
 * **Solo se usa en los scripts de comprobación**, nunca en la aplicación.
 */

function cabecera(longitud: number, tipo: number) {
	const b = Buffer.alloc(8)
	b.writeUInt32LE(longitud, 0)
	b.writeUInt32LE(tipo, 4)
	return b
}

export function sinTexturas(datos: Buffer): ArrayBuffer {
	const total = datos.readUInt32LE(8)
	let offset = 12
	let json: any = null
	let bin: Buffer | null = null

	while (offset < total) {
		const len = datos.readUInt32LE(offset)
		const tipo = datos.readUInt32LE(offset + 4)
		const trozo = datos.subarray(offset + 8, offset + 8 + len)
		if (tipo === 0x4e4f534a) json = JSON.parse(trozo.toString("utf8"))
		if (tipo === 0x004e4942) bin = Buffer.from(trozo)
		offset += 8 + len + ((4 - (len % 4)) % 4)
	}

	delete json.images
	delete json.textures
	delete json.samplers
	json.extensionsUsed = (json.extensionsUsed ?? []).filter((e: string) => !e.includes("texture"))
	for (const material of json.materials ?? []) {
		delete material.normalTexture
		delete material.occlusionTexture
		delete material.emissiveTexture
		delete material.extensions
		if (material.pbrMetallicRoughness) {
			delete material.pbrMetallicRoughness.baseColorTexture
			delete material.pbrMetallicRoughness.metallicRoughnessTexture
		}
	}

	const relleno = (n: number, con: number) => Buffer.alloc((4 - (n % 4)) % 4, con)
	const jsonBuf = Buffer.from(JSON.stringify(json), "utf8")
	const jsonPad = relleno(jsonBuf.length, 0x20)
	const binPad = bin ? relleno(bin.length, 0) : Buffer.alloc(0)

	const cuerpo = Buffer.concat([
		cabecera(jsonBuf.length + jsonPad.length, 0x4e4f534a),
		jsonBuf,
		jsonPad,
		...(bin ? [cabecera(bin.length + binPad.length, 0x004e4942), bin, binPad] : []),
	])

	const salida = Buffer.alloc(12 + cuerpo.length)
	salida.writeUInt32LE(0x46546c67, 0)
	salida.writeUInt32LE(2, 4)
	salida.writeUInt32LE(salida.length, 8)
	cuerpo.copy(salida, 12)

	return salida.buffer.slice(
		salida.byteOffset,
		salida.byteOffset + salida.byteLength,
	) as ArrayBuffer
}
