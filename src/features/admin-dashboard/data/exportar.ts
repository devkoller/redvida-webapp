import ExcelJS from "exceljs"

/**
 * Exporta el tablero a Excel.
 *
 * Una hoja por bloque en vez de todo apilado: quien arma el informe trimestral
 * necesita pegar una tabla concreta, no recortarla de una hoja gigante.
 */
export async function exportarDashboard(datos: {
	kpis: Record<string, number>
	cobertura_tipificacion: { completos: number; parciales: number; porcentaje: number }
	registros_por_mes: { mes: string; total: number }[]
	distribucion_sexo: { sexo: string; total: number }[]
	distribucion_estado: { estado: string; total: number }[]
	distribucion_edad: { rango: string; total: number }[]
	busquedas: { total: number; con_resultados: number; tasa_coincidencia: number }
}): Promise<void> {
	const libro = new ExcelJS.Workbook()
	libro.creator = "RedVida"
	libro.created = new Date()

	const encabezar = (hoja: ExcelJS.Worksheet) => {
		hoja.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }
		hoja.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7B0D1E" } }
		hoja.getRow(1).height = 20
	}

	const resumen = libro.addWorksheet("Resumen")
	resumen.columns = [
		{ header: "Indicador", key: "indicador", width: 34 },
		{ header: "Valor", key: "valor", width: 14 },
	]
	const etiquetas: Record<string, string> = {
		total_registrados: "Total de registrados",
		pre_registro: "En pre-registro",
		verificados: "Correo verificado",
		elegibles: "Elegibles",
		tipificados: "Tipificados",
		disponibles: "Disponibles para búsqueda",
		suspendidos: "Suspendidos",
		bajas: "Bajas",
	}
	for (const [clave, valor] of Object.entries(datos.kpis)) {
		resumen.addRow({ indicador: etiquetas[clave] ?? clave, valor })
	}
	resumen.addRow({})
	resumen.addRow({ indicador: "Perfiles 10/10 completos", valor: datos.cobertura_tipificacion.completos })
	resumen.addRow({ indicador: "Perfiles parciales", valor: datos.cobertura_tipificacion.parciales })
	resumen.addRow({
		indicador: "Cobertura de tipificación (%)",
		valor: datos.cobertura_tipificacion.porcentaje,
	})
	resumen.addRow({})
	resumen.addRow({ indicador: "Búsquedas realizadas", valor: datos.busquedas.total })
	resumen.addRow({ indicador: "Con al menos un candidato", valor: datos.busquedas.con_resultados })
	resumen.addRow({ indicador: "Tasa de coincidencia (%)", valor: datos.busquedas.tasa_coincidencia })
	encabezar(resumen)

	const bloques: [string, string, { header: string; key: string; width: number }[], unknown[]][] = [
		[
			"Registros por mes",
			"mes",
			[
				{ header: "Mes", key: "mes", width: 14 },
				{ header: "Registros", key: "total", width: 12 },
			],
			datos.registros_por_mes,
		],
		[
			"Por edad",
			"rango",
			[
				{ header: "Rango de edad", key: "rango", width: 18 },
				{ header: "Donadores", key: "total", width: 12 },
			],
			datos.distribucion_edad,
		],
		[
			"Por sexo",
			"sexo",
			[
				{ header: "Sexo", key: "sexo", width: 18 },
				{ header: "Donadores", key: "total", width: 12 },
			],
			datos.distribucion_sexo,
		],
		[
			"Por estado",
			"estado",
			[
				{ header: "Estado", key: "estado", width: 26 },
				{ header: "Donadores", key: "total", width: 12 },
			],
			datos.distribucion_estado,
		],
	]

	for (const [nombre, , columnas, filas] of bloques) {
		const hoja = libro.addWorksheet(nombre)
		hoja.columns = columnas
		for (const fila of filas) hoja.addRow(fila as never)
		encabezar(hoja)
	}

	const buffer = await libro.xlsx.writeBuffer()
	const blob = new Blob([buffer], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	})

	const enlace = document.createElement("a")
	enlace.href = URL.createObjectURL(blob)
	enlace.download = `redvida-tablero-${new Date().toISOString().slice(0, 10)}.xlsx`
	enlace.click()
	URL.revokeObjectURL(enlace.href)
}
