import { EmailTemplateData } from "./index";

export function generateEmailVerificationTemplate(
  data: EmailTemplateData
): string {
  const { name = "사용자", baseUrl, token } = data;
  const verifyUrl = `${baseUrl}/auth/verify?token=${token}`;

  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Temis 이메일 인증</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: #1e3a8a; color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: bold;">Temis</h1>
          <p style="margin: 0; font-size: 16px; opacity: 0.9;">시간표 생성 & 관리 플랫폼</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <div style="font-size: 18px; color: #1e3a8a; margin-bottom: 20px; font-weight: bold;">
            안녕하세요 ${name}님! 👋
          </div>
          
          <div style="font-size: 16px; color: #555; margin-bottom: 30px; line-height: 1.6;">
            <strong>Temis</strong>에 회원가입해 주셔서 진심으로 감사합니다.<br>
            아래 버튼을 클릭하여 이메일 인증을 완료하고, Temis의 모든 기능을 사용해보세요!
          </div>
          
          <!-- Verify Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" style="display: inline-block; background: #1e3a8a; color: white; text-decoration: none; padding: 15px 30px; border-radius: 5px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 8px rgba(30, 58, 138, 0.3);">
              ✨ 이메일 인증하기
            </a>
          </div>
          
          <!-- Features -->
          <div style="background: #f0f9ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 30px 0;">
            <h3 style="color: #1e3a8a; font-size: 16px; font-weight: bold; margin: 0 0 15px 0; text-align: center;">🎉 인증 완료 후 이용 가능한 기능</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 15px;">
              <div style="text-align: center; padding: 10px; background: white; border-radius: 6px; font-size: 14px; color: #1e3a8a;">📅 시간표 생성</div>
              <div style="text-align: center; padding: 10px; background: white; border-radius: 6px; font-size: 14px; color: #1e3a8a;">🎨 테마 커스터마이징</div>
              <div style="text-align: center; padding: 10px; background: white; border-radius: 6px; font-size: 14px; color: #1e3a8a;">📱 이미지 내보내기</div>
              
            </div>
          </div>
          
          <!-- Fallback -->
          <div style="background: #f9fafb; border: 1px solid #d1d5db; border-radius: 6px; padding: 15px; margin: 20px 0; font-size: 14px; color: #6b7280;">
            <p style="margin: 0 0 12px 0;"><strong>버튼이 작동하지 않나요?</strong><br>
            아래 링크를 복사해서 브라우저 주소창에 붙여넣어 주세요:</p>
            <a href="${verifyUrl}" style="color: #1e3a8a; word-break: break-all;">${verifyUrl}</a>
          </div>
          
          <!-- Warning -->
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <h4 style="color: #92400e; font-size: 14px; font-weight: bold; margin: 0 0 10px 0;">🔒 보안 안내</h4>
            <ul style="margin: 0; padding-left: 20px; color: #78350f; font-size: 13px;">
              <li>이 인증 링크는 24시간 후에 자동으로 만료됩니다</li>
              <li>본인이 요청하지 않은 경우, 이 이메일을 무시해 주세요</li>
              <li>보안을 위해 이 링크를 다른 사람과 공유하지 마세요</li>
            </ul>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
          <p style="margin: 0 0 8px 0;"><strong>© 2024 Temis</strong></p>
          <p style="margin: 0 0 8px 0;">이 메일은 자동으로 발송되었습니다. 회신하지 마세요.</p>
          <p style="margin: 0;">문의사항이 있으시면 고객센터로 연락해 주세요.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
