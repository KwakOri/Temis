"use client";

import { useState } from "react";

export default function EmailTestPanel() {
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
    details?: any;
  } | null>(null);

  const handleConnectionTest = async () => {
    setTesting(true);
    setResult(null);

    try {
      const response = await fetch("/api/email/test", {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          type: "success",
          message: data.message,
          details: data.config,
        });
      } else {
        setResult({
          type: "error",
          message: data.error || "SMTP 연결 테스트에 실패했습니다.",
          details: data.details,
        });
      }
    } catch (error) {
      setResult({
        type: "error",
        message: "테스트 요청 중 오류가 발생했습니다.",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail.trim()) {
      setResult({
        type: "error",
        message: "테스트 이메일 주소를 입력해주세요.",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      setResult({
        type: "error",
        message: "올바른 이메일 형식을 입력해주세요.",
      });
      return;
    }

    setSendingTest(true);
    setResult(null);

    try {
      const response = await fetch("/api/email/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ to: testEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          type: "success",
          message: `${testEmail}로 테스트 이메일을 발송했습니다.`,
          details: { messageId: data.messageId },
        });
        setTestEmail("");
      } else {
        setResult({
          type: "error",
          message: data.error || "테스트 이메일 발송에 실패했습니다.",
          details: data.details,
        });
      }
    } catch (error) {
      setResult({
        type: "error",
        message: "테스트 이메일 발송 중 오류가 발생했습니다.",
      });
    } finally {
      setSendingTest(false);
    }
  };

  // 프로덕션 환경에서는 표시하지 않음
  if (process.env.NEXT_PUBLIC_ENVIRONMENT === "production") {
    return null;
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">
            개발 모드 - 이메일 테스트 도구
          </h3>
          <p className="text-sm text-yellow-700 mt-1">
            SMTP 연결을 테스트하고 실제 이메일 발송을 확인할 수 있습니다.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* SMTP 연결 테스트 */}
        <div>
          <button
            onClick={handleConnectionTest}
            disabled={testing}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testing ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                테스트 중...
              </div>
            ) : (
              "SMTP 연결 테스트"
            )}
          </button>
        </div>

        {/* 테스트 이메일 발송 */}
        <div className="flex gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="테스트 이메일 주소"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            onClick={handleSendTestEmail}
            disabled={sendingTest || !testEmail.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendingTest ? "발송 중..." : "테스트 발송"}
          </button>
        </div>

        {/* 결과 표시 */}
        {result && (
          <div
            className={`p-4 rounded-md ${
              result.type === "success"
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <div className="flex">
              <div className="flex-shrink-0">
                {result.type === "success" ? (
                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p
                  className={`text-sm font-medium ${
                    result.type === "success" ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {result.message}
                </p>
                {result.details && (
                  <div className="mt-2 text-xs text-gray-600">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(result.details, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}