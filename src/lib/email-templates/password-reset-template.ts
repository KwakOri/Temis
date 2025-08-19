import { EmailTemplateData } from './index';

export function generatePasswordResetTemplate(data: EmailTemplateData): string {
  const { baseUrl, token } = data;
  const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Temis 비밀번호 재설정</title>
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
            비밀번호 재설정 🔐
          </div>
          
          <div style="font-size: 16px; color: #555; margin-bottom: 30px; line-height: 1.6;">
            안녕하세요,<br><br>
            비밀번호 재설정 요청을 받았습니다. 아래 버튼을 클릭하여 새 비밀번호를 설정해 주세요.
          </div>
          
          <!-- Reset Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: #1e3a8a; color: white; text-decoration: none; padding: 15px 30px; border-radius: 5px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 8px rgba(30, 58, 138, 0.3);">
              🔑 비밀번호 재설정
            </a>
          </div>
          
          <!-- Fallback -->
          <div style="background: #f9fafb; border: 1px solid #d1d5db; border-radius: 6px; padding: 15px; margin: 20px 0; font-size: 14px; color: #6b7280;">
            <p style="margin: 0 0 12px 0;"><strong>버튼이 작동하지 않나요?</strong><br>
            아래 링크를 복사해서 브라우저 주소창에 붙여넣어 주세요:</p>
            <a href="${resetUrl}" style="color: #1e3a8a; word-break: break-all;">${resetUrl}</a>
          </div>
          
          <!-- Security Warning -->
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <h4 style="color: #92400e; font-size: 14px; font-weight: bold; margin: 0 0 10px 0;">⚠️ 보안 안내</h4>
            <ul style="margin: 0; padding-left: 20px; color: #78350f; font-size: 13px;">
              <li>이 링크는 24시간 후에 자동으로 만료됩니다</li>
              <li>본인이 요청하지 않은 경우, 이 이메일을 무시해 주세요</li>
              <li>보안을 위해 이 링크를 다른 사람과 공유하지 마세요</li>
              <li>비밀번호는 안전한 조합으로 설정해 주세요 (영문, 숫자, 특수문자 포함)</li>
            </ul>
          </div>
          
          <!-- Help Section -->
          <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <h4 style="color: #047857; font-size: 14px; font-weight: bold; margin: 0 0 10px 0;">💡 도움말</h4>
            <p style="margin: 0; color: #065f46; font-size: 13px;">
              비밀번호 재설정에 문제가 있거나 본인이 요청하지 않은 이메일이라면, 
              즉시 고객센터로 연락해 주세요.
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
          <p style="margin: 0 0 8px 0;"><strong>© 2024 Temis</strong></p>
          <p style="margin: 0 0 8px 0;">이 메일은 자동으로 발송되었습니다. 회신하지 마세요.</p>
          <p style="margin: 0;">보안 관련 문의사항이 있으시면 고객센터로 연락해 주세요.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}