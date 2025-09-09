import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "path";

export default defineConfig({
	plugins: [react(), tsconfigPaths()],
	resolve: {
		alias: {
			"@": resolve(__dirname, "./src"),
			shared: resolve(__dirname, "../shared"),
		},
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
