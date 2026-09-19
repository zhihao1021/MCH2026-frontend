/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  /** 車程距離用的 OSRM 服務；未設定時走 OSRM 公共測試伺服器（見 api/routing.ts）。 */
  readonly VITE_ROUTING_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
