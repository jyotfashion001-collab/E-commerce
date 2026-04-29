import { setBaseUrl } from "@workspace/api-client-react";

const basePath = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

export const apiBase = import.meta.env.VITE_API_BASE ?? `${basePath}/api`;

export function initApiBaseUrl(): void {
  setBaseUrl(import.meta.env.VITE_API_BASE ?? null);
}
