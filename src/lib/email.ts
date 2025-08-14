import { TokenType } from "@/types/supabase-types";
import { NodemailerService } from "@/lib/nodemailer";

/**
 * 이메일 서비스 클래스
 * 비밀번호 리셋 및 회원가입 초대 이메일 발송
 */
export class EmailService {
  private static getBaseUrl(): string {
    // 서버 사이드에서는 절대 URL이 필요
    if (typeof window === 'undefined') {
      // 서버 사이드 - 개발 환경에서는 LOCAL URL 우선 사용
      const isLocal = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
      
      if (isLocal && process.env.NEXT_PUBLIC_APP_URL_LOCAL) {
        return process.env.NEXT_PUBLIC_APP_URL_LOCAL;
      }
      
      return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
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
    type: "password_reset" | "signup_invite" | "welcome"
  ): Promise<boolean> {
    try {
      // 서버 사이드에서는 직접 NodemailerService 호출
      if (typeof window === 'undefined') {
        console.log("Sending email directly via NodemailerService");
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
      console.log("Sending email via API:", apiUrl);
      
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
    const resetUrl = `${this.getBaseUrl()}/auth/reset-password?token=${token}`;
    
    const subject = "[Temis] 비밀번호 재설정 요청";
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .button { 
            display: inline-block; 
            background: #007bff; 
            color: white; 
            text-decoration: none; 
            padding: 12px 24px; 
            border-radius: 5px; 
            margin: 20px 0;
          }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>비밀번호 재설정</h2>
          </div>
          
          <p>안녕하세요,</p>
          
          <p>비밀번호 재설정 요청을 받았습니다. 아래 버튼을 클릭하여 새 비밀번호를 설정해 주세요.</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">비밀번호 재설정</a>
          </div>
          
          <p>위 버튼이 작동하지 않는 경우, 다음 링크를 복사하여 브라우저에 붙여넣어 주세요:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          
          <p><strong>주의사항:</strong></p>
          <ul>
            <li>이 링크는 24시간 후에 만료됩니다.</li>
            <li>본인이 요청하지 않은 경우, 이 이메일을 무시해 주세요.</li>
            <li>보안을 위해 링크를 다른 사람과 공유하지 마세요.</li>
          </ul>
          
          <div class="footer">
            <p>© 2024 Temis. All rights reserved.</p>
            <p>이 메일은 자동으로 발송되었습니다. 회신하지 마세요.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(email, subject, htmlContent, "password_reset");
  }

  /**
   * 회원가입 초대 이메일 발송
   */
  static async sendSignupInviteEmail(
    email: string,
    token: string
  ): Promise<boolean> {
    const signupUrl = `${this.getBaseUrl()}/auth/signup?token=${token}`;
    
    const subject = "[Temis] 회원가입 초대";
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .button { 
            display: inline-block; 
            background: #28a745; 
            color: white; 
            text-decoration: none; 
            padding: 12px 24px; 
            border-radius: 5px; 
            margin: 20px 0;
          }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Temis 회원가입 초대</h2>
          </div>
          
          <p>안녕하세요,</p>
          
          <p>Temis 서비스 사용을 위해 초대되었습니다. 아래 버튼을 클릭하여 회원가입을 완료해 주세요.</p>
          
          <div style="text-align: center;">
            <a href="${signupUrl}" class="button">회원가입 하기</a>
          </div>
          
          <p>위 버튼이 작동하지 않는 경우, 다음 링크를 복사하여 브라우저에 붙여넣어 주세요:</p>
          <p><a href="${signupUrl}">${signupUrl}</a></p>
          
          <p><strong>주의사항:</strong></p>
          <ul>
            <li>이 초대 링크는 72시간 후에 만료됩니다.</li>
            <li>이미 계정이 있는 경우, 이 이메일을 무시해 주세요.</li>
            <li>보안을 위해 링크를 다른 사람과 공유하지 마세요.</li>
          </ul>
          
          <p>Temis에서 제공하는 다양한 기능을 활용해 보세요!</p>
          
          <div class="footer">
            <p>© 2024 Temis. All rights reserved.</p>
            <p>이 메일은 자동으로 발송되었습니다. 회신하지 마세요.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(email, subject, htmlContent, "signup_invite");
  }

  /**
   * 회원가입 완료 알림 이메일 발송
   */
  static async sendWelcomeEmail(
    email: string,
    name: string
  ): Promise<boolean> {
    const loginUrl = `${this.getBaseUrl()}/auth`;
    
    const subject = "[Temis] 환영합니다! 회원가입이 완료되었습니다.";
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .button { 
            display: inline-block; 
            background: #007bff; 
            color: white; 
            text-decoration: none; 
            padding: 12px 24px; 
            border-radius: 5px; 
            margin: 20px 0;
          }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Temis에 오신 것을 환영합니다!</h2>
          </div>
          
          <p>안녕하세요 ${name}님,</p>
          
          <p>Temis 회원가입이 성공적으로 완료되었습니다. 이제 모든 기능을 사용하실 수 있습니다.</p>
          
          <div style="text-align: center;">
            <a href="${loginUrl}" class="button">로그인 하기</a>
          </div>
          
          <p><strong>이제 다음과 같은 기능을 이용할 수 있습니다:</strong></p>
          <ul>
            <li>시간표 생성 및 편집</li>
            <li>다양한 테마 적용</li>
            <li>이미지 내보내기</li>
            <li>소셜 미디어 연동</li>
          </ul>
          
          <p>문의사항이 있으시면 언제든지 연락해 주세요.</p>
          
          <div class="footer">
            <p>© 2024 Temis. All rights reserved.</p>
            <p>이 메일은 자동으로 발송되었습니다.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(email, subject, htmlContent, "welcome");
  }
}