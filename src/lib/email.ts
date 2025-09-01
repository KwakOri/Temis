import { NodemailerService } from "@/lib/nodemailer";
import { 
  generateEmailVerificationTemplate, 
  generateWelcomeEmailTemplate, 
  generatePasswordResetTemplate,
  generateTemplateAccessGrantedTemplate,
  type EmailTemplateData 
} from "@/lib/email-templates";
import { TemplateAccessGrantedData } from "@/lib/email-templates/template-access-granted";

/**
 * 이메일 서비스 클래스
 * 비밀번호 리셋 및 회원가입 초대 이메일 발송
 */
export class EmailService {
  private static getBaseUrl(): string {
    // 서버 사이드에서는 절대 URL이 필요
    if (typeof window === "undefined") {
      // 서버 사이드 - 개발 환경에서는 LOCAL URL 우선 사용
      const isLocal =
        process.env.NODE_ENV === "development" ||
        process.env.NODE_ENV !== "production";

      if (isLocal && process.env.NEXT_PUBLIC_APP_URL_LOCAL) {
        return process.env.NEXT_PUBLIC_APP_URL_LOCAL;
      }

      return (
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.APP_URL ||
        "http://localhost:3000"
      );
    }
    // 클라이언트 사이드 (실제로는 사용되지 않아야 함)
    return window.location.origin;
  }

  /**
   * API를 통한 이메일 발송
   * 모든 이메일 발송은 API 라우터를 통해서만 처리
   */
  private static async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    type: "password_reset" | "signup_invite" | "welcome" | "template_access_granted"
  ): Promise<boolean> {
    try {
      // 서버 사이드에서는 직접 NodemailerService 호출
      if (typeof window === "undefined") {
        const result = await NodemailerService.sendEmail({
          to,
          subject,
          html: htmlContent,
          type,
        });
        return result.success;
      }

      // 클라이언트 사이드에서는 API 호출 (실제로는 사용되지 않아야 함)
      const baseUrl = this.getBaseUrl();
      const apiUrl = `${baseUrl}/api/email/send`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to,
          subject,
          html: htmlContent,
          type,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("API response not OK:", response.status, errorData);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error sending email:", error);
      return false;
    }
  }

  /**
   * 비밀번호 리셋 이메일 발송
   */
  static async sendPasswordResetEmail(
    email: string,
    token: string
  ): Promise<boolean> {
    const baseUrl = this.getBaseUrl();
    const subject = "[Temis] 비밀번호 재설정 요청";
    
    const templateData: EmailTemplateData = {
      baseUrl,
      token
    };
    
    const htmlContent = generatePasswordResetTemplate(templateData);
    return this.sendEmail(email, subject, htmlContent, "password_reset");
  }

  /**
   * 회원가입 초대 이메일 발송
   */
  static async sendSignupInviteEmail(
    email: string,
    token: string
  ): Promise<boolean> {
    const baseUrl = this.getBaseUrl();
    const subject = "[Temis] 회원가입 초대";
    
    // 초대 이메일은 기본적으로 환영 이메일 템플릿을 재사용
    const templateData: EmailTemplateData = {
      name: '초대받은 사용자',
      baseUrl,
      token
    };
    
    const htmlContent = generateWelcomeEmailTemplate(templateData);
    return this.sendEmail(email, subject, htmlContent, "signup_invite");
  }

  /**
   * 이메일 인증 이메일 발송 (공개 회원가입용)
   */
  static async sendEmailVerificationEmail(
    email: string,
    name: string,
    token: string
  ): Promise<boolean> {
    const baseUrl = this.getBaseUrl();
    const subject = "[Temis] 이메일 인증을 완료해 주세요 ✨";
    
    const templateData: EmailTemplateData = {
      name,
      email,
      baseUrl,
      token
    };
    
    const htmlContent = generateEmailVerificationTemplate(templateData);
    return this.sendEmail(email, subject, htmlContent, "signup_invite");
  }

  /**
   * 회원가입 완료 알림 이메일 발송
   */
  static async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    const baseUrl = this.getBaseUrl();
    const subject = "[Temis] 환영합니다! 회원가입이 완료되었습니다.";
    
    const templateData: EmailTemplateData = {
      name,
      email,
      baseUrl
    };
    
    const htmlContent = generateWelcomeEmailTemplate(templateData);
    return this.sendEmail(email, subject, htmlContent, "welcome");
  }

  /**
   * 템플릿 접근 권한 부여 알림 이메일 발송
   */
  static async sendTemplateAccessGrantedEmail(
    email: string,
    userName: string,
    templateName: string
  ): Promise<boolean> {
    const baseUrl = this.getBaseUrl();
    const subject = "[Temis] 결제 완료 안내 📋";
    
    const templateData: TemplateAccessGrantedData = {
      userName,
      templateName,
      baseUrl
    };
    
    const htmlContent = generateTemplateAccessGrantedTemplate(templateData);
    return this.sendEmail(email, subject, htmlContent, "template_access_granted");
  }
}
