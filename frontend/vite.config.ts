import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [react(), tsconfigPaths()],
	server: {
		watch: {
			usePolling: true,
		},
		host: "0.0.0.0", // needed for the Docker Container port mapping to work
		strictPort: true,
		port: 5173,
		https: {
			key: "/app/certs/key.pem",
			cert: "/app/certs/cert.pem",
		},
		hmr: {
			protocol: "wss",
			host: "localhost",
			port: 5173,
		},
	},
});
