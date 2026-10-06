import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react-swc"
import path from "path"
import { defineConfig, loadEnv } from "vite"

/**
 * `__DEMO__` enciende el modo demostración del registro (ver `src/api/demo.ts`).
 *
 * Se resuelve **en compilación** a un literal `true`/`false`, no a una lectura
 * de `import.meta.env` en ejecución: así no hay forma de encenderlo desde el
 * navegador —ni con un parámetro en la URL, ni tocando `sessionStorage`— y el
 * único interruptor es quien compila o arranca el servidor.
 *
 * `loadEnv` lee los archivos `.env` además de las variables del proceso, de
 * modo que `VITE_DEMO=1` funciona igual puesta en `.env.development.local` que
 * escrita delante del comando.
 */
export default defineConfig(({ mode }) => ({
	define: {
		__DEMO__: JSON.stringify(loadEnv(mode, process.cwd(), "VITE_").VITE_DEMO === "1"),
	},
	plugins: [
		// Debe ir ANTES del plugin de React: genera `routeTree.gen.ts` a partir
		// de `src/routes/` y React necesita ver el archivo ya generado.
		tanstackRouter({ target: "react", autoCodeSplitting: true }),
		react(),
		tailwindcss(),
	],
	resolve: {
		alias: { "@": path.resolve(__dirname, "./src") },
	},
	server: {
		port: 5173,
	},
}))
