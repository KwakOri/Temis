import { EmailTemplateData } from "./index";

export interface TemplateAccessGrantedData extends EmailTemplateData {
  userName: string;
  templateName: string;
  baseUrl: string;
}

export function generateTemplateAccessGrantedTemplate(
  data: TemplateAccessGrantedData
): string {
  const { userName, templateName, baseUrl } = data;
  const myPageUrl = `${baseUrl}/my-page`;

  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Temis 결제 완료 안내</title>
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
            안녕하세요, ${userName} 님. ⭐
          </div>
          
          <div style="font-size: 16px; color: #555; margin-bottom: 20px; line-height: 1.6;">
            <strong>[TEMIS]</strong>를 이용해 주셔서 진심으로 감사합니다.
          </div>

          <div style="font-size: 16px; color: #555; margin-bottom: 20px; line-height: 1.6;">
            고객님의 결제가 정상적으로 완료되어, 해당 서비스 이용 권한을 부여해 드렸습니다.<br>
            <strong>이제 마이페이지에서 바로 이용하실 수 있습니다.</strong>
          </div>

          <!-- Template Info -->
          <div style="background: #f0f9ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 30px 0;">
            <h3 style="color: #1e3a8a; font-size: 16px; font-weight: bold; margin: 0 0 15px 0; text-align: center;">📋 구매 템플릿 정보</h3>
            <div style="text-align: center; padding: 15px; background: white; border-radius: 6px; font-size: 16px; color: #1e3a8a; font-weight: bold;">
              ${templateName}
            </div>
          </div>
          
          <!-- Access Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${myPageUrl}" style="display: inline-block; background: #1e3a8a; color: white; text-decoration: none; padding: 15px 30px; border-radius: 5px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 8px rgba(30, 58, 138, 0.3);">
              🎨 마이페이지에서 사용하기
            </a>
          </div>

          <div style="font-size: 16px; color: #555; margin-bottom: 20px; line-height: 1.6;">
            궁금한 사항이나 이용 중 불편하신 점이 있으시면 언제든지 문의해 주시기 바랍니다.<br>
            앞으로도 더 나은 서비스로 보답드리겠습니다.
          </div>

          <div style="font-size: 16px; color: #555; margin-bottom: 10px; line-height: 1.6;">
            감사합니다.
          </div>

          <div style="font-size: 16px; color: #1e3a8a; font-weight: bold; margin-bottom: 20px;">
            [TEMIS 드림]
          </div>
          
          <!-- Fallback -->
          <div style="background: #f9fafb; border: 1px solid #d1d5db; border-radius: 6px; padding: 15px; margin: 20px 0; font-size: 14px; color: #6b7280;">
            <p style="margin: 0 0 12px 0;"><strong>버튼이 작동하지 않나요?</strong><br>
            아래 링크를 복사해서 브라우저 주소창에 붙여넣어 주세요:</p>
            <a href="${myPageUrl}" style="color: #1e3a8a; word-break: break-all;">${myPageUrl}</a>
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