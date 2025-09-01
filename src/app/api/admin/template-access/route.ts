import { requireAdmin } from "@/lib/auth/middleware";
import { TemplateAccessService } from "@/lib/templates";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("templateId");

    if (!templateId) {
      return NextResponse.json(
        { error: "templateId가 필요합니다." },
        { status: 400 }
      );
    }

    const accessList = await TemplateAccessService.getTemplateAccessList(
      templateId
    );

    return NextResponse.json({
      success: true,
      accessList,
    });
  } catch (error) {
    console.error("Template access fetch error:", error);
    return NextResponse.json(
      { error: "접근 권한 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { user } = adminCheck;
    const body = await request.json();
    const { templateId, userId, accessLevel } = body;

    if (!templateId || !userId || !accessLevel) {
      return NextResponse.json(
        { error: "필수 필드가 누락되었습니다." },
        { status: 400 }
      );
    }

    const access = await TemplateAccessService.grantAccess({
      template_id: templateId,
      user_id: Number(userId),
      access_level: accessLevel,
      granted_by: Number(user.userId),
    });

    // 사용자 정보와 템플릿 정보를 가져와서 메일 발송
    try {
      // 사용자 정보 조회
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        console.error('사용자 정보 조회 실패:', userError);
      } else {
        // 템플릿 정보 조회
        const { data: templateData, error: templateError } = await supabase
          .from('templates')
          .select('name')
          .eq('id', templateId)
          .single();

        if (templateError || !templateData) {
          console.error('템플릿 정보 조회 실패:', templateError);
        } else {
          // 메일 발송
          try {
            const response = await fetch("/api/email/template-access-granted", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({
                email: userData.email,
                userName: userData.name || '고객',
                templateName: templateData.name
              }),
            });

            if (!response.ok) {
              console.error('권한 부여 알림 메일 발송 실패');
            }
          } catch (emailError) {
            console.error('메일 발송 요청 실패:', emailError);
          }
        }
      }
    } catch (emailError) {
      console.error('메일 발송 중 오류:', emailError);
      // 메일 발송 실패는 전체 작업을 중단하지 않음
    }

    return NextResponse.json({
      success: true,
      message: "접근 권한이 부여되었습니다.",
      access,
    });
  } catch (error) {
    console.error("Template access grant error:", error);
    return NextResponse.json(
      { error: "접근 권한 부여 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const body = await request.json();
    const { templateId, userId, accessLevel } = body;

    if (!templateId || !userId || !accessLevel) {
      return NextResponse.json(
        { error: "필수 필드가 누락되었습니다." },
        { status: 400 }
      );
    }

    const access = await TemplateAccessService.updateAccess(
      templateId,
      Number(userId),
      accessLevel
    );

    return NextResponse.json({
      success: true,
      message: "접근 권한이 수정되었습니다.",
      access,
    });
  } catch (error) {
    console.error("Template access update error:", error);
    return NextResponse.json(
      { error: "접근 권한 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("templateId");
    const userId = searchParams.get("userId");

    if (!templateId || !userId) {
      return NextResponse.json(
        { error: "templateId와 userId가 필요합니다." },
        { status: 400 }
      );
    }

    await TemplateAccessService.revokeAccess(templateId, Number(userId));

    return NextResponse.json({
      success: true,
      message: "접근 권한이 제거되었습니다.",
    });
  } catch (error) {
    console.error("Template access revoke error:", error);
    return NextResponse.json(
      { error: "접근 권한 제거 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
