import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "path";

export default defineConfig({
	base: "/", // Ensure all paths are root-relative
	plugins: [react(), tsconfigPaths()],
	resolve: {
		alias: {
			// Order matters: more specific aliases first
			"@/types": resolve(__dirname, "./src/@types"),
			"@": resolve(__dirname, "./src"),
			shared: resolve(__dirname, "../shared"),
		},
		// Explicitly handle @types as a local directory, not a scoped package
		conditions: ['import', 'module', 'browser', 'default'],
		mainFields: ['browser', 'module', 'main'],
		extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json', '.d.ts'],
	},
	server: {
		watch: {
			usePolling: true,
		},
		host: "0.0.0.0", // needed for the Docker Container port mapping to work
		strictPort: true,
		port: 5173,
		// https: {
		// 	key: "/app/certs/key.pem",
		// 	cert: "/app/certs/cert.pem",
		// },
		allowedHosts: true, // Allow requests from all hosts
		cors: { origin: true }, // Enable CORS with origin true
	},
});
