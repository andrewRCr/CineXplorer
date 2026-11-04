/// <reference types="vite/client" />

interface ViteTypeOptions {
    strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
    readonly VITE_BASE_URL?: string;
    readonly VITE_BASE_API_URL?: string;
    readonly VITE_NODE_ENV?: string;
    readonly VITE_APP_ENV?: string;
}
