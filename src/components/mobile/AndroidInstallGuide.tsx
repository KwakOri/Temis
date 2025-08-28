'use client'

interface AndroidInstallGuideProps {
  browserName: string
}

export default function AndroidInstallGuide({ browserName }: AndroidInstallGuideProps) {
  const getChromeSteps = () => (
    <>
      <div className="step-item">
        <div className="step-number">1</div>
        <div className="step-content">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">메뉴 열기</h3>
          <p className="text-gray-600">
            화면 우상단의 <strong>점 3개 메뉴(⋮)</strong>를 터치하세요
          </p>
        </div>
      </div>

      <div className="step-item">
        <div className="step-number">2</div>
        <div className="step-content">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">앱 설치</h3>
          <p className="text-gray-600">
            메뉴에서 <strong>&quot;앱 설치&quot;</strong> 또는 <strong>&quot;홈 화면에 추가&quot;</strong>를 터치하세요
          </p>
        </div>
      </div>

      <div className="step-item">
        <div className="step-number">3</div>
        <div className="step-content">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">설치 확인</h3>
          <p className="text-gray-600">
            팝업 창에서 <strong>&quot;설치&quot;</strong> 버튼을 터치하여 앱을 홈 화면에 추가하세요
          </p>
        </div>
      </div>
    </>
  )

  const getSamsungSteps = () => (
    <>
      <div className="step-item">
        <div className="step-number">1</div>
        <div className="step-content">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">메뉴 열기</h3>
          <p className="text-gray-600">
            화면 하단의 <strong>메뉴 버튼(☰)</strong> 또는 <strong>점 3개 메뉴(⋮)</strong>를 터치하세요
          </p>
        </div>
      </div>

      <div className="step-item">
        <div className="step-number">2</div>
        <div className="step-content">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">홈 화면에 추가</h3>
          <p className="text-gray-600">
            <strong>&quot;홈 화면에 추가&quot;</strong> 옵션을 선택하세요
          </p>
        </div>
      </div>

      <div className="step-item">
        <div className="step-number">3</div>
        <div className="step-content">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">설치 완료</h3>
          <p className="text-gray-600">
            <strong>&quot;추가&quot;</strong> 버튼을 터치하여 홈 화면에 앱 아이콘을 생성하세요
          </p>
        </div>
      </div>
    </>
  )

  const getFirefoxSteps = () => (
    <>
      <div className="step-item">
        <div className="step-number">1</div>
        <div className="step-content">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">메뉴 열기</h3>
          <p className="text-gray-600">
            화면 우상단의 <strong>점 3개 메뉴(⋮)</strong>를 터치하세요
          </p>
        </div>
      </div>

      <div className="step-item">
        <div className="step-number">2</div>
        <div className="step-content">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">홈 화면에 추가</h3>
          <p className="text-gray-600">
            <strong>&quot;홈 화면에 추가&quot;</strong> 옵션을 선택하세요
          </p>
        </div>
      </div>

      <div className="step-item">
        <div className="step-number">3</div>
        <div className="step-content">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">바로가기 생성</h3>
          <p className="text-gray-600">
            <strong>&quot;추가&quot;</strong> 버튼을 터치하여 바로가기를 생성하세요
          </p>
        </div>
      </div>
    </>
  )

  const getStepsByBrowser = () => {
    switch (browserName.toLowerCase()) {
      case 'chrome':
        return getChromeSteps()
      case 'samsung internet':
        return getSamsungSteps()
      case 'firefox':
        return getFirefoxSteps()
      default:
        return getChromeSteps() // 기본값으로 Chrome 가이드 사용
    }
  }

  return (
    <div className="android-guide bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
      {/* 헤더 */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 text-white rounded-full mb-4 text-2xl">
          🤖
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Android에서 설치하기
        </h2>
        <p className="text-gray-600">
          {browserName} 브라우저에서 Temis 앱을 홈 화면에 추가하세요
        </p>
      </div>

      {/* 설치 단계 */}
      <div className="steps-container space-y-6">
        {getStepsByBrowser()}
      </div>

      {/* 추가 정보 */}
      <div className="mt-6 p-4 bg-green-100 rounded-lg border border-green-200">
        <div className="flex items-start gap-3">
          <div className="text-green-600 text-xl">💡</div>
          <div>
            <h4 className="font-semibold text-green-800 mb-1">설치 후 이점</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• 홈 화면에서 바로 실행</li>
              <li>• 전체 화면 모드로 앱처럼 사용</li>
              <li>• 오프라인에서도 일부 기능 이용 가능</li>
              <li>• 빠른 로딩 속도</li>
            </ul>
          </div>
        </div>
      </div>

      <style jsx>{`
        .step-item {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }
        
        .step-number {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          background: linear-gradient(135deg, #10B981, #059669);
          color: white;
          border-radius: 50%;
          font-weight: bold;
          font-size: 0.9rem;
          flex-shrink: 0;
          margin-top: 0.125rem;
        }
        
        .step-content {
          flex: 1;
        }
      `}</style>
    </div>
  )
}