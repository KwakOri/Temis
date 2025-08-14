import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth/jwt";
import { UserService } from "@/lib/supabase";
import { NodemailerService } from "@/lib/nodemailer";

export async function GET(request: NextRequest) {
  try {
    // 개발 환경에서만 접근 가능
    if (process.env.NEXT_PUBLIC_ENVIRONMENT !== "development") {
      return NextResponse.json(
        { error: "개발 환경에서만 사용할 수 있습니다." },
        { status: 403 }
      );
    }

    // 관리자 권한 확인
    const authHeader = request.headers.get("authorization");
    const token = request.cookies.get("auth-token")?.value || authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const payload = verifyJWT(token);
    if (!payload) {
      return NextResponse.json(
        { error: "유효하지 않은 토큰입니다." },
        { status: 401 }
      );
    }

    const currentUser = await UserService.findById(payload.userId);
    if (!currentUser) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 관리자 권한 확인
    const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
    if (!adminEmails.includes(currentUser.email)) {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다." },
        { status: 403 }
      );
    }

    // SMTP 연결 테스트
    const connectionTest = await NodemailerService.verifyConnection();
    
    return NextResponse.json(
      {
        message: connectionTest 
          ? "SMTP 연결이 정상적으로 작동합니다." 
          : "SMTP 연결에 문제가 있습니다.",
        success: connectionTest,
        timestamp: new Date().toISOString(),
        config: {
          gmailUser: process.env.GMAIL_USER ? "✅ 설정됨" : "❌ 설정되지 않음",
          gmailPass: process.env.GMAIL_PASS ? "✅ 설정됨" : "❌ 설정되지 않음",
          appUrl: process.env.NEXT_PUBLIC_APP_URL ? "✅ 설정됨" : "❌ 설정되지 않음",
          environment: process.env.NEXT_PUBLIC_ENVIRONMENT || "설정되지 않음",
        },
      },
      { status: connectionTest ? 200 : 500 }
    );
  } catch (error) {
    console.error("SMTP test error:", error);
    return NextResponse.json(
      { 
        error: "SMTP 테스트 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류"
      },
      { status: 500 }
    );
  }
}

// 테스트 이메일 발송
export async function POST(request: NextRequest) {
  try {
    // 개발 환경에서만 접근 가능
    if (process.env.NEXT_PUBLIC_ENVIRONMENT !== "development") {
      return NextResponse.json(
        { error: "개발 환경에서만 사용할 수 있습니다." },
        { status: 403 }
      );
    }

    // 관리자 권한 확인
    const authHeader = request.headers.get("authorization");
    const token = request.cookies.get("auth-token")?.value || authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const payload = verifyJWT(token);
    if (!payload) {
      return NextResponse.json(
        { error: "유효하지 않은 토큰입니다." },
        { status: 401 }
      );
    }

    const currentUser = await UserService.findById(payload.userId);
    if (!currentUser) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 관리자 권한 확인
    const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
    if (!adminEmails.includes(currentUser.email)) {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { to } = body;

    if (!to) {
      return NextResponse.json(
        { error: "수신자 이메일을 입력해주세요." },
        { status: 400 }
      );
    }

    // 테스트 이메일 발송
    const result = await NodemailerService.sendEmail({
      to,
      subject: "[Temis] 이메일 테스트",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; background: #f8f9fa; padding: 20px; border-radius: 5px; }
            .content { padding: 20px; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>📧 Temis 이메일 테스트</h2>
              <p>이 메일이 정상적으로 수신되었다면 SMTP 설정이 올바릅니다!</p>
            </div>
            
            <div class="content">
              <p><strong>발송 시간:</strong> ${new Date().toLocaleString("ko-KR")}</p>
              <p><strong>발송 대상:</strong> ${to}</p>
              <p><strong>환경:</strong> ${process.env.NEXT_PUBLIC_ENVIRONMENT}</p>
              
              <h3>✅ 테스트 항목</h3>
              <ul>
                <li>SMTP 연결 ✓</li>
                <li>Gmail 인증 ✓</li>
                <li>이메일 발송 ✓</li>
                <li>HTML 렌더링 ✓</li>
              </ul>
            </div>
            
            <div class="footer">
              <p>© 2024 Temis. 이 메일은 테스트 목적으로 발송되었습니다.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      type: "test",
    });

    if (result.success) {
      return NextResponse.json(
        {
          message: "테스트 이메일이 성공적으로 발송되었습니다.",
          messageId: result.messageId,
          to,
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: result.error || "테스트 이메일 발송에 실패했습니다." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Test email error:", error);
    return NextResponse.json(
      { 
        error: "테스트 이메일 발송 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류"
      },
      { status: 500 }
    );
  }
}