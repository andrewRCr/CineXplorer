import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import fs from "fs";

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
			key: fs.readFileSync("/workspaces/infrastructure/dev-certs/key.pem"),
			cert: fs.readFileSync("/workspaces/infrastructure/dev-certs/cert.pem"),
		},
		hmr: {
			protocol: "wss",
			host: "localhost",
			port: 5173,
		},
	},
});
