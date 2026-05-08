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
   * Override in a subclass to implement token refresh.
   * Called once when a 401 is received; the original request is retried afterward.
   * Throw here to propagate the 401 instead of retrying.
   */
  protected async onUnauthorized(): Promise<void> {
    throw new Error("401 Unauthorized — override onUnauthorized() to handle token refresh");
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
        lastError = new Error(`${res.status} ${res.statusText} — ${url}`);

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
