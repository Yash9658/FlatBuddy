import { apiBaseUrl } from "@/lib/constants";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type ApiOptions = RequestInit & {
  token?: string | null;
  skipAuthRefresh?: boolean;
};

type ApiAuthHandlers = {
  refreshAccessToken: () => Promise<string | null>;
  handleAuthFailure?: () => void;
};

let apiAuthHandlers: ApiAuthHandlers | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function configureApiAuthHandlers(handlers: ApiAuthHandlers | null) {
  apiAuthHandlers = handlers;
}

async function tryRefreshAccessToken() {
  if (!apiAuthHandlers) {
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = apiAuthHandlers.refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

function parseResponseBody(text: string) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { token, headers, body, skipAuthRefresh = false, ...rest } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...rest,
    body,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const text = await response.text();
  const data = parseResponseBody(text);

  if (!response.ok) {
    if (response.status === 401 && token && !skipAuthRefresh) {
      const refreshedToken = await tryRefreshAccessToken();

      if (refreshedToken) {
        return apiFetch<T>(path, {
          ...options,
          token: refreshedToken,
          skipAuthRefresh: true,
        });
      }

      apiAuthHandlers?.handleAuthFailure?.();
    }

    const message =
      typeof data === "object" && data !== null && "message" in data
        ? String(data.message)
        : typeof data === "string" && data.trim()
          ? data
        : "Request failed.";
    throw new ApiError(response.status, message);
  }

  return data as T;
}
