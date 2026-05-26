"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useVerifyEmail } from "@/hooks/query/useAuth";
import Link from "next/link";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");
  const [hasAttempted, setHasAttempted] = useState(false);

  const verifyEmailMutation = useVerifyEmail();

  useEffect(() => {
    // Prevent multiple verification attempts
    if (hasAttempted) {
      return;
    }

    if (!token) {
      setStatus("error");
      setMessage("인증 토큰이 없습니다.");
      setHasAttempted(true);
      return;
    }

    const verifyEmail = async () => {
      try {
        setHasAttempted(true);
        await verifyEmailMutation.mutateAsync({ token });

        setStatus("success");
        setMessage(
          "이메일 인증이 완료되었습니다. 회원가입이 성공적으로 처리되었습니다."
        );

        // 3초 후 메인 페이지로 리다이렉트
        setTimeout(() => {
          router.push("/");
        }, 3000);
      } catch (error) {
        console.error("Email verification error:", error);
        setStatus("error");
        setMessage(
          error instanceof Error ? error.message : "인증 중 오류가 발생했습니다."
        );
      }
    };

    verifyEmail();
  }, [token, router]); // Remove verifyEmailMutation from dependencies

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-light via-timetable-card-bg to-tertiary px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 md:h-24 md:w-24 border-b-2 border-primary mx-auto"></div>
          <p className="mt-3 md:mt-4 text-sm md:text-base text-dark-gray/70">
            이메일 인증 중...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-light via-timetable-card-bg to-tertiary py-6 md:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="overflow-hidden rounded-2xl border border-tertiary bg-timetable-form-bg shadow-xl">
          <div
            className={`h-2 ${
              status === "success" ? "bg-primary" : "bg-red-500"
            }`}
          />
          <div className="p-6 md:p-8">
            <div className="text-center">
              {status === "success" ? (
                <>
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 border border-primary/20 rounded-full mb-5">
                    <svg
                      className="w-8 h-8 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h1 className="text-2xl font-bold text-dark-gray mb-4">
                    인증 완료!
                  </h1>
                  <p className="text-dark-gray/70 mb-6 leading-relaxed">
                    {message}
                  </p>
                  <p className="text-sm text-dark-gray/60 mb-4">
                    3초 후 자동으로 메인 페이지로 이동합니다.
                  </p>
                </>
              ) : (
                <>
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                    <svg
                      className="w-8 h-8 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                  <h1 className="text-2xl font-bold text-dark-gray mb-4">
                    인증 실패
                  </h1>
                  <p className="text-dark-gray/70 mb-6">{message}</p>
                </>
              )}

              <div className="space-y-3">
                <Link
                  href="/"
                  className="block w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white shadow-lg transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  메인 페이지로 이동
                </Link>
                {status === "error" && (
                  <Link
                    href="/auth"
                    className="block w-full rounded-xl border border-tertiary bg-white px-4 py-3 font-semibold text-dark-gray transition-colors hover:bg-tertiary"
                  >
                    로그인 페이지로 이동
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-light via-timetable-card-bg to-tertiary px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 md:h-24 md:w-24 border-b-2 border-primary mx-auto"></div>
            <p className="mt-3 md:mt-4 text-sm md:text-base text-dark-gray/70">
              로딩 중...
            </p>
          </div>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
