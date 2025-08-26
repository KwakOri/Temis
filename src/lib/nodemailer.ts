import nodemailer from "nodemailer";

/**
 * Nodemailer 서비스 클래스
 * Gmail SMTP를 사용한 이메일 발송
 */
export class NodemailerService {
  private static transporter: nodemailer.Transporter | null = null;

  /**
   * SMTP 설정 및 연결 생성
   */
  private static createTransporter(): nodemailer.Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_PASS;

    if (!gmailUser || !gmailPass) {
      throw new Error("Gmail 환경 변수가 설정되지 않았습니다.");
    }

    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPass, // Gmail 앱 비밀번호 사용
      },
      // Gmail의 보안 설정
      tls: {
        rejectUnauthorized: false,
      },
    });

    return this.transporter;
  }

  /**
   * 연결 테스트
   */
  static async verifyConnection(): Promise<boolean> {
    try {
      const transporter = this.createTransporter();
      await transporter.verify();
      console.log("✅ SMTP 연결이 성공적으로 확인되었습니다.");
      return true;
    } catch (error) {
      console.error("❌ SMTP 연결 실패:", error);
      return false;
    }
  }

  /**
   * 이메일 발송
   */
  static async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    type?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const transporter = this.createTransporter();
      const gmailUser = process.env.GMAIL_USER;

      if (!gmailUser) {
        throw new Error("Gmail 사용자 이메일이 설정되지 않았습니다.");
      }

      const mailOptions = {
        from: {
          name: "Temis",
          address: gmailUser,
        },
        to: options.to,
        subject: options.subject,
        html: options.html,
        // 추적을 위한 헤더 추가
        headers: {
          "X-Email-Type": options.type || "notification",
          "X-Mailer": "Temis-NodeMailer",
        },
      };

      const result = await transporter.sendMail(mailOptions);

      console.log("✅ 이메일 발송 성공:", {
        messageId: result.messageId,
        to: options.to,
        subject: options.subject,
        type: options.type,
      });

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      console.error("❌ 이메일 발송 실패:", error);
      
      let errorMessage = "이메일 발송 중 오류가 발생했습니다.";
      
      if (error instanceof Error) {
        // Gmail 특정 에러 메시지 처리
        if (error.message.includes("Invalid login")) {
          errorMessage = "Gmail 인증 실패: 이메일 또는 비밀번호를 확인해주세요.";
        } else if (error.message.includes("Daily sending quota exceeded")) {
          errorMessage = "일일 발송 한도를 초과했습니다.";
        } else if (error.message.includes("Invalid recipient")) {
          errorMessage = "수신자 이메일 주소가 올바르지 않습니다.";
        } else {
          errorMessage = `이메일 발송 실패: ${error.message}`;
        }
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 여러 이메일 일괄 발송 (관리자용)
   */
  static async sendBulkEmails(emails: Array<{
    to: string;
    subject: string;
    html: string;
    type?: string;
  }>): Promise<{ 
    success: number; 
    failed: number; 
    results: Array<{ email: string; success: boolean; error?: string }> 
  }> {
    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (const email of emails) {
      const result = await this.sendEmail(email);
      
      results.push({
        email: email.to,
        success: result.success,
        error: result.error,
      });

      if (result.success) {
        successCount++;
      } else {
        failedCount++;
      }

      // 일괄 발송 시 레이트 리밋 방지를 위한 지연
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      success: successCount,
      failed: failedCount,
      results,
    };
  }

  /**
   * 연결 종료
   */
  static closeConnection(): void {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
      console.log("📧 SMTP 연결이 종료되었습니다.");
    }
  }
}