import { HTTP_ENV } from "@/utils/config/http-env";

// Next.js extends RequestInit with `next` for server-side cache control.
type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
};

// Controls how failed requests are retried before throwing.
type RetryConfig = {
  // Total number of attempts (first try + retries).
  attempts: number;
  // Base delay between attempts in milliseconds.
  delayMs: number;
  // "exponential" doubles the delay each attempt; "fixed" keeps it constant.
  backoff: "fixed" | "exponential";
};

const DEFAULT_RETRY: RetryConfig = {
  attempts: 3,
  delayMs: 300,
  backoff: "exponential",
};

// Thrown for non-2xx responses. `message` carries the backend's `detail`
// when there is one, so it can be shown to the user as is.
export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
    // stable code from {"error": "..."} bodies, e.g. "form_has_submissions"
    public code?: string,
    // dotted locations of Pydantic errors, e.g. "body.customer.email"
    public fields: string[] = []
  ) {
    super(message);
    this.name = "HttpError";
  }
}

// Reads FastAPI's error body: {"detail": "msg", "error"?: "code"} for backend
// checks, or {"detail": [{"loc": [...], "msg": "Value error, ..."}]} for
// Pydantic validation.
export async function toHttpError(res: Response, fallback: string): Promise<HttpError> {
  let message: string | null = null;
  let code: string | undefined;
  const fields: string[] = [];
  try {
    const body = await res.json();
    const detail = body?.detail;
    if (typeof body?.error === "string") code = body.error;
    if (typeof detail === "string") message = detail;
    if (Array.isArray(detail)) {
      const msgs = detail
        .map((d) => (typeof d?.msg === "string" ? d.msg.replace(/^Value error, /, "") : null))
        .filter(Boolean);
      if (msgs.length > 0) message = msgs.join("; ");
      for (const d of detail) if (Array.isArray(d?.loc)) fields.push(d.loc.join("."));
    }
  } catch {
    // not JSON
  }
  return new HttpError(message ?? fallback, res.status, code, fields);
}

// Only reads are replayed: a write the server already applied before failing
// (e.g. a 502 from a proxy) must not run twice. 4xx is a decision, not a
// transient failure; 408/429 are the exceptions.
function isRetryable(status: number, method: string): boolean {
  if (method !== "GET" && method !== "HEAD") return false;
  return status >= 500 || status === 408 || status === 429;
}

export class HttpService {
  protected baseUrl: string;
  protected retryConfig: RetryConfig;

  // Track whether a token refresh is already in flight to avoid parallel refresh storms.
  private refreshPromise: Promise<void> | null = null;

  constructor(baseUrl?: string, retryConfig?: Partial<RetryConfig>) {
    this.baseUrl = baseUrl ?? HTTP_ENV.API_URL ?? "";
    this.retryConfig = { ...DEFAULT_RETRY, ...retryConfig };
  }

  /**
   * Called once when a 401 is received; the original request is retried afterward.
   * Posts to /auth/refresh so the backend can rotate the access cookie.
   * Throws if refresh fails so the original 401 propagates.
   */
  protected async onUnauthorized(): Promise<void> {
    const res = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      throw new Error(`Refresh failed: ${res.status} ${res.statusText}`);
    }
  }

  protected async fetch<T>(
    path: string,
    options: RequestOptions = {},
    // Internal flag: true on the single automatic retry after a refresh.
    isRetryAfterRefresh = false
  ): Promise<T> {
    const { body, next, ...rest } = options;
    const url = `${this.baseUrl}${path}`;

    // Serialize body and inject Content-Type only when a body is present.
    const init: RequestInit & { next?: RequestOptions["next"] } = {
      credentials: "include",
      ...rest,
      ...(body !== undefined && {
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json", ...rest.headers },
      }),
      ...(next && { next }),
    };

    const { attempts, delayMs, backoff } = this.retryConfig;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < attempts; attempt++) {
      const res = await fetch(url, init);

      // On 401, attempt a token refresh exactly once, then replay the request.
      // If this call is already the post-refresh retry, skip to avoid an infinite loop.
      if (res.status === 401 && !isRetryAfterRefresh) {
        // Deduplicate: if another request already triggered a refresh, wait for it.
        if (!this.refreshPromise) {
          this.refreshPromise = this.onUnauthorized().finally(() => {
            this.refreshPromise = null;
          });
        }

        await this.refreshPromise;

        // Replay the original request once with the new credentials.
        return this.fetch<T>(path, options, true);
      }

      if (!res.ok) {
        lastError = await toHttpError(res, `${res.status} ${res.statusText} — ${url}`);

        if (!isRetryable(res.status, (init.method ?? "GET").toUpperCase())) {
          throw lastError;
        }

        // Don't wait after the last attempt.
        if (attempt < attempts - 1) {
          const wait =
            backoff === "exponential"
              ? delayMs * 2 ** attempt
              : delayMs;
          await new Promise((r) => setTimeout(r, wait));
        }

        continue;
      }

      return res.json() as Promise<T>;
    }

    throw lastError;
  }

  protected get<T>(path: string, options?: Omit<RequestOptions, "method" | "body">) {
    return this.fetch<T>(path, { ...options, method: "GET" });
  }

  protected post<T>(path: string, body: unknown, options?: Omit<RequestOptions, "method" | "body">) {
    return this.fetch<T>(path, { ...options, method: "POST", body });
  }

  protected put<T>(path: string, body: unknown, options?: Omit<RequestOptions, "method" | "body">) {
    return this.fetch<T>(path, { ...options, method: "PUT", body });
  }

  protected patch<T>(path: string, body: unknown, options?: Omit<RequestOptions, "method" | "body">) {
    return this.fetch<T>(path, { ...options, method: "PATCH", body });
  }

  protected delete<T>(path: string, options?: Omit<RequestOptions, "method" | "body">) {
    return this.fetch<T>(path, { ...options, method: "DELETE" });
  }
}
