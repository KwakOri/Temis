"use client";

interface MaintenanceModeProps {
  children: React.ReactNode;
}

export default function MaintenanceMode({ children }: MaintenanceModeProps) {
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

  if (isMaintenanceMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              사이트 점검 중
            </h1>
            <p className="text-gray-600 mb-6">
              더 나은 서비스 제공을 위해 임시 점검을 진행하고 있습니다.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">
              점검 안내
            </h2>
            <ul className="text-sm text-gray-600 space-y-1 text-left">
              <li>• 점검 완료 후 정상 서비스가 재개됩니다</li>
              <li>• 불편을 드려 죄송합니다</li>
              <li>
                • 자세한 내용은 테미스 공식 X @TEMISforyou 에서 확인하실 수
                있습니다
              </li>
            </ul>
          </div>

          <div className="text-xs text-gray-500">
            문의사항이 있으시면{" "}
            <a
              href="mailto:kwak9712@gmail.com"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              관리자에게 연락
            </a>
            해주세요.
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
