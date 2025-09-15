import {
  GetTemplateAccessParams,
  GetTemplateAccessResponse,
  RevokeAccessParams,
  TemplateAccessData,
} from "@/types/admin";

export class AdminAccessService {
  private static baseUrl = "/api/admin";

  static async getTemplateAccess(
    params: GetTemplateAccessParams
  ): Promise<GetTemplateAccessResponse> {
    const response = await fetch(
      `${this.baseUrl}/template-access?templateId=${params.templateId}`
    );

    if (!response.ok) {
      throw new Error("템플릿 접근 권한 목록을 가져오는데 실패했습니다.");
    }

    return response.json();
  }

  static async grantAccess(data: TemplateAccessData): Promise<void> {
    const response = await fetch(`${this.baseUrl}/template-access`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "접근 권한 부여에 실패했습니다.");
    }
  }

  static async updateAccess(data: TemplateAccessData): Promise<void> {
    const response = await fetch(`${this.baseUrl}/template-access`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "접근 권한 업데이트에 실패했습니다.");
    }
  }

  static async revokeAccess(params: RevokeAccessParams): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/template-access?templateId=${params.templateId}&userId=${params.userId}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "접근 권한 취소에 실패했습니다.");
    }
  }
}
