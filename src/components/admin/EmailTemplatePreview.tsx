"use client";

import {
  generateEmailVerificationTemplate,
  generatePasswordResetTemplate,
  generateWelcomeEmailTemplate,
  type EmailTemplateData,
} from "@/lib/email-templates";
import { useState } from "react";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  description: string;
}

const EmailTemplatePreview = () => {
  const [selectedTemplate, setSelectedTemplate] =
    useState<string>("verification");
  const [previewData, setPreviewData] = useState({
    name: "홍길동",
    email: "user@example.com",
  });
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const emailTemplates: EmailTemplate[] = [
    {
      id: "verification",
      name: "이메일 인증",
      subject: "[Temis] 이메일 인증을 완료해 주세요 ✨",
      description: "회원가입 시 발송되는 이메일 인증 템플릿",
    },
    {
      id: "welcome",
      name: "환영 메시지",
      subject: "[Temis] 환영합니다! 회원가입이 완료되었습니다.",
      description: "이메일 인증 완료 후 발송되는 환영 메시지",
    },
    {
      id: "password_reset",
      name: "비밀번호 재설정",
      subject: "[Temis] 비밀번호 재설정 요청",
      description: "비밀번호 재설정 요청 시 발송되는 템플릿",
    },
  ];

  const generatePreview = async () => {
    setIsLoading(true);
    try {
      // 임시 토큰 생성 (미리보기용)
      const dummyToken =
        "preview-token-" + Math.random().toString(36).substr(2, 9);

      const templateData: EmailTemplateData = {
        name: previewData.name,
        email: previewData.email,
        baseUrl: window.location.origin,
        token: dummyToken,
      };

      let htmlContent = "";

      // 동일한 템플릿 함수를 사용하여 일관성 보장
      switch (selectedTemplate) {
        case "verification":
          htmlContent = generateEmailVerificationTemplate(templateData);
          break;
        case "welcome":
          htmlContent = generateWelcomeEmailTemplate(templateData);
          break;
        case "password_reset":
          htmlContent = generatePasswordResetTemplate(templateData);
          break;
      }

      setPreviewHtml(htmlContent);
    } catch (error) {
      console.error("Preview generation failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestEmail = async () => {
    if (!previewData.email || !previewData.name) {
      alert("이름과 이메일을 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/send-test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          template: selectedTemplate,
          email: previewData.email,
          name: previewData.name,
        }),
      });

      if (response.ok) {
        alert("테스트 이메일이 성공적으로 발송되었습니다!");
      } else {
        const error = await response.text();
        alert(`이메일 발송 실패: ${error}`);
      }
    } catch (error) {
      console.error("Test email failed:", error);
      alert("이메일 발송 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
          📧 이메일 템플릿 미리보기
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* 설정 패널 */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* 템플릿 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이메일 템플릿 선택
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {emailTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  {
                    emailTemplates.find((t) => t.id === selectedTemplate)
                      ?.description
                  }
                </p>
              </div>

              {/* 미리보기 데이터 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  미리보기 데이터
                </label>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="이름"
                    value={previewData.name}
                    onChange={(e) =>
                      setPreviewData({ ...previewData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="email"
                    placeholder="이메일 주소"
                    value={previewData.email}
                    onChange={(e) =>
                      setPreviewData({ ...previewData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="space-y-3">
                <button
                  onClick={generatePreview}
                  disabled={isLoading}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? "로딩 중..." : "미리보기 생성"}
                </button>

                <button
                  onClick={sendTestEmail}
                  disabled={isLoading || !previewHtml}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? "발송 중..." : "테스트 이메일 발송"}
                </button>
              </div>

              {/* 템플릿 정보 */}
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="font-medium text-gray-900 mb-2">템플릿 정보</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <strong>제목:</strong>{" "}
                    {
                      emailTemplates.find((t) => t.id === selectedTemplate)
                        ?.subject
                    }
                  </p>
                  <p>
                    <strong>설명:</strong>{" "}
                    {
                      emailTemplates.find((t) => t.id === selectedTemplate)
                        ?.description
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 미리보기 패널 */}
          <div className="lg:col-span-2">
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-300">
                <h3 className="text-sm font-medium text-gray-700">
                  이메일 미리보기
                </h3>
              </div>
              <div className="h-96 lg:h-[600px] overflow-auto bg-white">
                {previewHtml ? (
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full h-full border-none"
                    title="Email Preview"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <div className="text-4xl mb-4">📧</div>
                      <p>미리보기 생성 버튼을 클릭하여</p>
                      <p>이메일 템플릿을 확인하세요.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplatePreview;
