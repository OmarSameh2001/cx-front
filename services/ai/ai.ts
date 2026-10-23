import { HttpService } from "../http";
import type { FormGenerateRequest } from "@/dto/ai/form-generate";
import type { FormCreatePayload } from "@/dto/form/form";

export class AiService extends HttpService {
  // Drafts a form without saving it; can take 5–60s, sometimes ~2 min.
  // Errors arrive as HttpError: 503 "ai_unavailable", 502 "ai_generation_failed",
  // 422 invalid request (see .fields).
  async generateForm(req: FormGenerateRequest) {
    return this.post<FormCreatePayload>("/ai/forms/generate", req);
  }
}
