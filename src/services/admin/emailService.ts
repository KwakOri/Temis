import {
  EmailTestResponse,
  SendTestEmailData,
  SendTestEmailResponse,
} from "@/types/admin";

export class AdminEmailService {
  private static baseUrl = "/api/email";

  static async testConnection(): Promise<EmailTestResponse> {
    const response = await fetch(`${this.baseUrl}/test`);

    if (!response.ok) {
      throw new Error("SMTP 연결 테스트에 실패했습니다.");
    }

    return response.json();
  }

  static async sendTestEmail(
    data: SendTestEmailData
  ): Promise<SendTestEmailResponse> {
    const response = await fetch(`${this.baseUrl}/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "테스트 이메일 전송에 실패했습니다.");
    }

    return response.json();
  }
}
