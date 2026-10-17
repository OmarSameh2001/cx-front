import { HTTP_ENV } from "@/utils/config/http-env";
import { toHttpError } from "../http";
import type {
  PublicForm,
  PublicSubmitRequest,
  PublicSubmitResponse,
} from "@/dto/public/public";

const baseUrl = HTTP_ENV.API_URL ?? "";

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw await toHttpError(res, `${res.status} ${res.statusText}`);
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
