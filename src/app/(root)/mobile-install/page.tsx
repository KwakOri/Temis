"use client";

import AndroidInstallGuide from "@/components/mobile/AndroidInstallGuide";
import { useDeviceDetection } from "@/components/mobile/DeviceDetector";
import IOSInstallGuide from "@/components/mobile/IOSInstallGuide";
import { ArrowLeft, CheckCircle, Monitor, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function MobileInstallPage() {
  const router = useRouter();
  const deviceInfo = useDeviceDetection();
  const [mounted, setMounted] = useState(false);

  // 클라이언트 사이드 렌더링 확인
  useEffect(() => {
    setMounted(true);
  }, []);

  // 로딩 중일 때 표시할 컴포넌트
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 safe-area-top safe-area-bottom">
      {/* 헤더 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">모바일 앱 설치</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 현재 상태 표시 */}
        <div className="mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-white/20">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                {deviceInfo.isMobile ? (
                  <Smartphone className="w-6 h-6 text-blue-600" />
                ) : (
                  <Monitor className="w-6 h-6 text-blue-600" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  현재 환경
                </h2>
                <p className="text-gray-600 text-sm">
                  {deviceInfo.isMobile ? "모바일 디바이스" : "데스크톱/태블릿"}{" "}
                  · {deviceInfo.browserName}
                </p>
              </div>
            </div>

            {/* 설치 상태 */}
            {deviceInfo.isStandalone ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-800 font-medium">
                  이미 PWA 앱으로 실행 중입니다!
                </span>
              </div>
            ) : deviceInfo.isInstallable ? (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-blue-800 text-sm">
                  💡 이 디바이스에서 홈 화면에 앱을 설치할 수 있습니다
                </p>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-700 text-sm">
                  현재 브라우저에서는 제한적으로 지원됩니다
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 디바이스별 가이드 */}
        <div className="space-y-6">
          {deviceInfo.isMobile ? (
            // 모바일 디바이스에서는 해당 OS 가이드만 표시
            deviceInfo.isAndroid ? (
              <AndroidInstallGuide browserName={deviceInfo.browserName} />
            ) : deviceInfo.isIOS ? (
              <IOSInstallGuide browserName={deviceInfo.browserName} />
            ) : (
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <p className="text-gray-600 text-center">
                  현재 디바이스는 감지되지 않았습니다. 아래 가이드를 참고하세요.
                </p>
              </div>
            )
          ) : (
            // 데스크톱에서는 모든 가이드 표시
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  모바일에서 앱으로 사용하기
                </h2>
                <p className="text-gray-600">
                  모바일 디바이스에서 아래 가이드를 따라 Temis를 앱처럼
                  사용해보세요
                </p>
              </div>

              <AndroidInstallGuide browserName="Chrome" />
              <IOSInstallGuide browserName="Safari" />
            </>
          )}
        </div>

        {/* 도움말 */}
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-start gap-3">
            <div className="text-yellow-600 text-xl">❓</div>
            <div>
              <h4 className="font-semibold text-yellow-800 mb-1">
                설치에 문제가 있나요?
              </h4>
              <p className="text-yellow-700 text-sm">
                브라우저를 새로고침하거나 다른 브라우저에서 시도해보세요.
              </p>
              <p className="text-yellow-700 text-sm">
                iOS의 경우 safari 브라우저만 지원합니다
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
