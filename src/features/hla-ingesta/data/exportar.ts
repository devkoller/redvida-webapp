import ExcelJS from "exceljs"

import type { ErrorFila } from "./schema"

/**
 * Exporta el reporte de errores a Excel.
 *
 * Quien corrige el archivo trabaja en Excel, no en el navegador: entregarle el
 * reporte en su propia herramienta —con la columna de línea a la izquierda— es
 * lo que convierte "el lote falló" en una lista de correcciones accionable.
 */
export async function exportarErrores(errores: ErrorFila[], nombreArchivo: string): Promise<void> {
	const libro = new ExcelJS.Workbook()
	libro.creator = "RedVida"
	libro.created = new Date()

	const hoja = libro.addWorksheet("Errores")

	hoja.columns = [
		{ header: "Línea", key: "linea", width: 10 },
		{ header: "Código de registro", key: "codigo_registro", width: 22 },
		{ header: "Locus", key: "locus", width: 10 },
		{ header: "Campo", key: "campo", width: 18 },
		{ header: "Qué corregir", key: "mensaje", width: 70 },
	]

	hoja.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }
	hoja.getRow(1).fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FF7B0D1E" },
	}
	hoja.getRow(1).alignment = { vertical: "middle" }
	hoja.getRow(1).height = 22

	for (const error of errores) {
		hoja.addRow({
			linea: error.linea,
			codigo_registro: error.codigo_registro ?? "",
			locus: error.locus ?? "",
			campo: error.campo ?? "",
			mensaje: error.mensaje,
		})
	}

	// La columna del mensaje es larga; sin ajuste de texto queda ilegible.
	hoja.getColumn("mensaje").alignment = { wrapText: true, vertical: "top" }
	hoja.autoFilter = { from: "A1", to: "E1" }
	hoja.views = [{ state: "frozen", ySplit: 1 }]

	const buffer = await libro.xlsx.writeBuffer()
	const blob = new Blob([buffer], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	})

	const base = nombreArchivo.replace(/\.[^.]+$/, "")
	const enlace = document.createElement("a")
	enlace.href = URL.createObjectURL(blob)
	enlace.download = `errores-${base}-${new Date().toISOString().slice(0, 10)}.xlsx`
	enlace.click()
	// Sin esto el blob queda retenido en memoria mientras viva la pestaña.
	URL.revokeObjectURL(enlace.href)
}
