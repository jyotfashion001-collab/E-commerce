import { setBaseUrl } from "@workspace/api-client-react";

const basePath = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

export const apiBase = import.meta.env.https://jyotfashion.netlify.app/ ?? `${basePath}/api`;

export function initApiBaseUrl(): void {
  setBaseUrl(import.meta.env.https://jyotfashion.netlify.app/ ?? null);
}
