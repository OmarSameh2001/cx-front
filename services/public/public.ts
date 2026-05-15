import { HTTP_ENV } from "@/utils/config/http-env";
import type {
  PublicForm,
  PublicSubmitRequest,
  PublicSubmitResponse,
} from "@/dto/public/public";

const baseUrl = HTTP_ENV.API_URL ?? "";

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      // ignore parse failure
    }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

export const PublicService = {
  async getForm(token: string): Promise<PublicForm> {
    const res = await fetch(`${baseUrl}/public/forms/${encodeURIComponent(token)}`);
    return jsonOrThrow<PublicForm>(res);
  },
  async submit(
    token: string,
    payload: PublicSubmitRequest
  ): Promise<PublicSubmitResponse> {
    const res = await fetch(
      `${baseUrl}/public/forms/${encodeURIComponent(token)}/submit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    return jsonOrThrow<PublicSubmitResponse>(res);
  },
};
