/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_API_URL: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}

/**
 * ¿Se compiló el modo demostración del registro? Lo inyecta `vite.config.ts`
 * como literal, para que la rama desaparezca del paquete de producción.
 */
declare const __DEMO__: boolean
