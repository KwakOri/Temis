import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/middleware";
import { EmailService } from "@/lib/email";

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const body = await request.json();
    const { email, userName, templateName } = body;

    if (!email || !userName || !templateName) {
      return NextResponse.json(
        { error: "필수 필드가 누락되었습니다. (email, userName, templateName)" },
        { status: 400 }
      );
    }

    // 메일 발송
    const emailSent = await EmailService.sendTemplateAccessGrantedEmail(
      email,
      userName,
      templateName
    );

    if (!emailSent) {
      return NextResponse.json(
        { error: "메일 발송에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "권한 부여 알림 메일이 발송되었습니다.",
    });
  } catch (error) {
    console.error("Template access granted email error:", error);
    return NextResponse.json(
      { error: "메일 발송 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}