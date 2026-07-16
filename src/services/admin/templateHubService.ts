import type {
  TemplateHubErrorResponse,
  TemplateHubItem,
  TemplateHubItemResponse,
  TemplateHubListParams,
  TemplateHubListResponse,
  TemplateSalesType,
} from "@/types/template-hub";

/**
 * Hub API 오류를 UI가 `code`로 분기할 수 있게 보존하는 오류 타입.
 *
 * 서버가 내려준 관리자용 `message`를 그대로 노출하고, 판매 시작 실패처럼
 * 해결 항목이 여러 개인 경우 `reasons`를 함께 전달한다.
 */
export class TemplateHubRequestError extends Error {
  readonly code: TemplateHubErrorResponse["code"];
  readonly status: number;
  readonly reasons: TemplateHubErrorResponse["reasons"];

  constructor(
    response: TemplateHubErrorResponse,
    status: number
  ) {
    super(response.message);
    this.name = "TemplateHubRequestError";
    this.code = response.code;
    this.status = status;
    this.reasons = response.reasons;
  }
}

const parseError = async (
  response: Response
): Promise<TemplateHubRequestError> => {
  const body = (await response.json().catch(() => null)) as
    | Partial<TemplateHubErrorResponse>
    | { error?: string }
    | null;

  const code =
    body && "code" in body && body.code
      ? body.code
      : response.status === 404
      ? "TEMPLATE_NOT_FOUND"
      : response.status === 400
      ? "INVALID_PARAM"
      : "INTERNAL_ERROR";

  const message =
    (body && "message" in body && body.message) ||
    (body && "error" in body && body.error) ||
    "요청 처리 중 오류가 발생했습니다.";

  return new TemplateHubRequestError(
    {
      code,
      message,
      reasons: body && "reasons" in body ? body.reasons : undefined,
    },
    response.status
  );
};

export class AdminTemplateHubService {
  private static baseUrl = "/api/admin/template-hub";

  static async listTemplates(
    params?: TemplateHubListParams
  ): Promise<TemplateHubListResponse> {
    const query = new URLSearchParams();

    if (params?.limit !== undefined) query.set("limit", String(params.limit));
    if (params?.offset !== undefined) query.set("offset", String(params.offset));
    if (params?.search) query.set("search", params.search);
    if (params?.engine) query.set("engine", params.engine);
    if (params?.publicationStatus)
      query.set("publicationStatus", params.publicationStatus);
    if (params?.salesType) query.set("salesType", params.salesType);
    if (params?.saleStatus) query.set("saleStatus", params.saleStatus);

    const suffix = query.toString() ? `?${query.toString()}` : "";
    const response = await fetch(`${this.baseUrl}/templates${suffix}`);

    if (!response.ok) throw await parseError(response);

    return response.json();
  }

  static async updateSalesType(
    templateId: string,
    salesType: TemplateSalesType
  ): Promise<TemplateHubItem> {
    const response = await fetch(
      `${this.baseUrl}/templates/${templateId}/sales-type`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salesType }),
      }
    );

    if (!response.ok) throw await parseError(response);

    const result = (await response.json()) as TemplateHubItemResponse;
    return result.item;
  }

  static async updateSale(
    templateId: string,
    visible: boolean
  ): Promise<TemplateHubItem> {
    const response = await fetch(
      `${this.baseUrl}/templates/${templateId}/sale`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible }),
      }
    );

    if (!response.ok) throw await parseError(response);

    const result = (await response.json()) as TemplateHubItemResponse;
    return result.item;
  }
}
