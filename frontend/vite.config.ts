import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    base: "/", // Ensure all paths are root-relative
    plugins: [react(), tsconfigPaths()],
    resolve: {
        alias: {
            "@": resolve(__dirname, "./src"),
            shared: resolve(__dirname, "../shared"),
        },
        conditions: ["import", "module", "browser", "default"],
        mainFields: ["browser", "module", "main"],
        extensions: [
            ".mjs",
            ".js",
            ".mts",
            ".ts",
            ".jsx",
            ".tsx",
            ".json",
            ".d.ts",
        ],
    },
    server: {
        watch: {
            usePolling: true,
        },
        host: "0.0.0.0", // needed for the Docker Container port mapping to work
        strictPort: true,
        port: 5173,
        // HTTPS is intentionally disabled - TLS termination happens at Caddy (edge proxy)
        // This is standard practice: single TLS layer at the edge, HTTP between internal services
        // Frontend certs are mounted but not used (available if architecture changes)
        // https: {
        //  key: "/certs/frontend/key.pem",
        //  cert: "/certs/frontend/cert.pem",
        // },
        // Vite's default host and CORS checks stay on: Caddy forwards Host: localhost,
        // and the page origin is https://localhost:8444
    },
});
