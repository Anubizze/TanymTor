import { ApiError } from "./api-error";
import { LOCAL_DATA_MODE } from "./data-mode";

export { ApiError } from "./api-error";

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setApiToken(token: string | null): void {
  authToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

const REQUEST_TIMEOUT_MS = 12_000;

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (LOCAL_DATA_MODE) {
    const requestToken = authToken;
    const { localApi } = await import("./local-api");
    try {
      return await localApi<T>(path, init, requestToken);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && !path.endsWith("/login")) {
        onUnauthorized?.();
      }
      throw error;
    }
  }
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers,
      credentials: "include",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(408, "Сервер не ответил. Проверьте Postgres и бэкенд.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
  } & T;

  if (!response.ok) {
    if (response.status === 401 && !path.endsWith("/login")) onUnauthorized?.();
    throw new ApiError(
      response.status,
      data.error ?? `Ошибка запроса (${response.status})`
    );
  }

  return data;
}
