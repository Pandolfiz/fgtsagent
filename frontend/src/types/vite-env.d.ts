/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_META_APP_ID: string
  readonly VITE_APP_META_CONFIG_ID: string
  // mais variáveis de ambiente aqui se necessário
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
