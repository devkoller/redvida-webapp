/**
 * Configuración de la API.
 *
 * `VITE_API_URL` se inyecta en tiempo de compilación. El default apunta al
 * servidor local para que `pnpm dev` funcione sin `.env`.
 */
export const API_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3000/v1"

/** Endpoints, centralizados para que una ruta no se escriba a mano dos veces. */
export const ENDPOINTS = {
	health: "/health",

	catalogo: (tipo: string) => `/catalogos/${tipo}`,
	estadosPorPais: (paisId: number | string) => `/catalogos/paises/${paisId}/estados`,
	municipiosPorEstado: (estadoId: number | string) => `/catalogos/estados/${estadoId}/municipios`,

	donadores: "/donadores",
	requestOtp: "/donadores/request-otp",
	verifyOtp: "/donadores/verify-otp",
	cuestionario: "/donadores/elegibilidad/cuestionario",
	elegibilidad: "/donadores/elegibilidad",
	elegibilidadActual: "/donadores/elegibilidad/actual",
	estatusPorCodigo: (codigo: string) => `/donadores/estatus/${encodeURIComponent(codigo)}`,
	citasDisponibilidad: "/citas/disponibilidad",
	citas: "/citas",
	adminCitas: "/citas/admin",
	adminConfiguracionCitas: "/citas/admin/configuracion",
	adminBloqueosCitas: "/citas/admin/bloqueos",
	adminBloqueoCitas: (fecha: string) => `/citas/admin/bloqueos/${encodeURIComponent(fecha)}`,
	adminCita: (id: number) => `/citas/admin/${id}`,

	portalOtp: "/portal/otp",
	portalSesion: "/portal/sesion",
	portalMe: "/portal/me",
	portalElegibilidad: "/portal/elegibilidad",
	portalCita: "/portal/cita",
	portalComprobante: "/portal/cita/comprobante",
	portalBaja: "/portal/baja",

	consentimientoVigente: "/consentimiento/vigente",
	consentimientoAceptar: "/consentimiento/aceptar",
	constancia: (id: string) => `/consentimiento/constancia/${encodeURIComponent(id)}`,

	login: "/auth/login",
	refresh: "/auth/refresh",
	logout: "/auth/logout",
	perfil: "/auth/perfil",
	cambiarPassword: "/auth/cambiar-password",
	validarPassword: "/auth/validar-password",
	mfaVerificar: "/auth/mfa/verificar",
	mfaEstado: "/auth/mfa/estado",
	mfaEnrolar: "/auth/mfa/enrolar",
	mfaConfirmar: "/auth/mfa/confirmar",
	mfaDesactivar: "/auth/mfa/desactivar",
	mfaCodigos: "/auth/mfa/codigos",

	/** Snapshot publicado de una página. Pública y cacheada con ETag. */
	contenido: (slug: string) => `/contenido/${encodeURIComponent(slug)}`,

	cmsPaginas: "/cms/paginas",
	cmsBloques: (paginaId: number | string) => `/cms/paginas/${paginaId}/bloques`,
	cmsBloque: (bloqueId: number | string) => `/cms/bloques/${bloqueId}`,
	cmsOrden: (paginaId: number | string) => `/cms/paginas/${paginaId}/orden`,
	cmsPublicar: (paginaId: number | string) => `/cms/paginas/${paginaId}/publicar`,
	cmsVersiones: (paginaId: number | string) => `/cms/paginas/${paginaId}/versiones`,
	cmsRevertir: (paginaId: number | string, versionId: number | string) =>
		`/cms/paginas/${paginaId}/revertir/${versionId}`,
	cmsMedia: "/cms/media",

	arcoDerechos: "/arco/derechos",
	arcoSolicitud: "/arco/solicitud",
	arcoFolio: (folio: string) => `/arco/solicitud/${encodeURIComponent(folio)}`,
	arco: "/arco",
	arcoResumen: "/arco/resumen",
	arcoSolicitudAdmin: (id: number | string) => `/arco/${id}`,
	arcoRevocar: (id: number | string) => `/arco/${id}/revocar`,

	avisoPrivacidad: "/cumplimiento/aviso-privacidad",
	estadoCumplimiento: "/cumplimiento/estado",

	hlaLotes: "/hla/lotes",
	hlaLote: (id: number | string) => `/hla/lotes/${id}`,
	hlaErroresLote: (id: number | string) => `/hla/lotes/${id}/errores`,
	hlaPerfil: (codigo: string) => `/hla/donador/${encodeURIComponent(codigo)}`,
	hlaTrazabilidad: (codigo: string) =>
		`/hla/donador/${encodeURIComponent(codigo)}/trazabilidad`,

	buscarCompatibilidad: "/compatibilidad/buscar",
	historialBusquedas: "/compatibilidad/historial",
	revelar: (codigo: string) => `/compatibilidad/revelar/${encodeURIComponent(codigo)}`,

	dashboard: "/admin/dashboard",
	adminDonadores: "/admin/donadores",

	elegibilidadPreguntas: "/admin/elegibilidad/preguntas",
	elegibilidadPregunta: (id: number | string) => `/admin/elegibilidad/preguntas/${id}`,
	elegibilidadPreguntasOrden: "/admin/elegibilidad/preguntas/orden",

	adminUsuarios: "/admin/usuarios",
	adminUsuario: (id: number | string) => `/admin/usuarios/${id}`,
	adminUsuarioRoles: (id: number | string) => `/admin/usuarios/${id}/roles`,
	adminUsuarioResetPassword: (id: number | string) => `/admin/usuarios/${id}/restablecer-password`,
	adminRoles: "/admin/roles",
	adminRol: (id: number | string) => `/admin/roles/${id}`,
	adminRolPermisos: (id: number | string) => `/admin/roles/${id}/permisos`,
	adminPermisos: "/admin/permisos",

	retencionPoliticas: "/cumplimiento/retencion/politicas",
	retencionSimular: (id: number | string) => `/cumplimiento/retencion/politicas/${id}/simular`,
	retencionAplicar: "/cumplimiento/retencion/aplicar",
	retencionHistorial: "/cumplimiento/retencion/historial",

	auditoria: "/admin/auditoria",
	auditoriaFacetas: "/admin/auditoria/facetas",
	auditoriaExportar: "/admin/auditoria/exportar",

	muestras: "/muestras",
	muestrasPorDonador: (codigo: string) => `/muestras/donador/${encodeURIComponent(codigo)}`,
} as const
