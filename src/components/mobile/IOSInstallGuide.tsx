'use client'

interface IOSInstallGuideProps {
  browserName: string
}

export default function IOSInstallGuide({ browserName }: IOSInstallGuideProps) {
  const getSafariSteps = () => (
    <>
      <div className="step-item">
        <div className="step-number">1</div>
        <div className="step-content">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">공유 버튼 터치</h3>
          <p className="text-gray-600">
            Safari 하단의 <strong>공유 버튼 (↗️)</strong>을 터치하세요
          </p>
        </div>
      </div>

      <div className="step-item">
        <div className="step-number">2</div>
        <div className="step-content">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">홈 화면에 추가</h3>
          <p className="text-gray-600">
            공유 메뉴에서 <strong>&quot;홈 화면에 추가&quot;</strong>를 선택하세요
          </p>
        </div>
      </div>

      <div className="step-item">
        <div className="step-number">3</div>
        <div className="step-content">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">앱 이름 설정</h3>
          <p className="text-gray-600">
            원하는 앱 이름을 입력하거나 기본값 <strong>&quot;Temis&quot;</strong>를 사용하세요
          </p>
        </div>
      </div>

      <div className="step-item">
        <div className="step-number">4</div>
        <div className="step-content">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">추가 완료</h3>
          <p className="text-gray-600">
            우상단의 <strong>&quot;추가&quot;</strong> 버튼을 터치하여 홈 화면에 앱을 추가하세요
          </p>
        </div>
      </div>
    </>
  )

  const getChromeSteps = () => (
    <>
      <div className="step-item">
        <div className="step-number">1</div>
        <div className="step-content">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Safari에서 열기</h3>
          <p className="text-gray-600 mb-3">
            Chrome에서는 홈 화면 추가가 제한적입니다.<br />
            <strong>Safari</strong>에서 다시 열어주세요.
          </p>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-blue-800 text-sm">
              💡 <strong>팁:</strong> 이 주소를 복사하여 Safari에서 열어보세요
            </p>
          </div>
        </div>
      </div>

      <div className="step-item">
        <div className="step-number">2</div>
        <div className="step-content">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Safari에서 설치</h3>
          <p className="text-gray-600">
            Safari에서 위의 Safari 가이드를 따라 설치해주세요
          </p>
        </div>
      </div>
    </>
  )

  const getStepsByBrowser = () => {
    if (browserName.toLowerCase().includes('safari')) {
      return getSafariSteps()
    } else {
      return getChromeSteps()
    }
  }

  const isSafari = browserName.toLowerCase().includes('safari')

  return (
    <div className="ios-guide bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
      {/* 헤더 */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 text-white rounded-full mb-4 text-2xl">
          🍎
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          iPhone/iPad에서 설치하기
        </h2>
        <p className="text-gray-600">
          {isSafari 
            ? 'Safari 브라우저에서 Temis 앱을 홈 화면에 추가하세요' 
            : 'Safari 브라우저 사용을 권장합니다'
          }
        </p>
      </div>

      {/* Safari가 아닌 경우 경고 메시지 */}
      {!isSafari && (
        <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-3">
            <div className="text-amber-600 text-xl">⚠️</div>
            <div>
              <h4 className="font-semibold text-amber-800 mb-1">브라우저 안내</h4>
              <p className="text-amber-700 text-sm">
                iOS에서는 <strong>Safari 브라우저</strong>를 사용해야 홈 화면에 앱을 추가할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 설치 단계 */}
      <div className="steps-container space-y-6">
        {getStepsByBrowser()}
      </div>

      {/* iOS 특별 안내사항 */}
      <div className="mt-6 p-4 bg-blue-100 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <div className="text-blue-600 text-xl">📱</div>
          <div>
            <h4 className="font-semibold text-blue-800 mb-2">iOS 사용법</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 홈 화면의 Temis 아이콘을 터치하여 실행</li>
              <li>• 전체 화면으로 앱처럼 사용 가능</li>
              <li>• 상단 상태바 색상이 앱 테마로 변경됨</li>
              <li>• Safari 주소창이 숨겨져 더 넓은 화면 사용</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Safari인 경우에만 추가 팁 표시 */}
      {isSafari && (
        <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-start gap-3">
            <div className="text-green-600 text-xl">✅</div>
            <div>
              <h4 className="font-semibold text-green-800 mb-1">완벽 지원</h4>
              <p className="text-green-700 text-sm">
                Safari에서 모든 PWA 기능을 완벽하게 사용할 수 있습니다!
              </p>
            </div>
          </div>
        </div>
      )}

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
          background: linear-gradient(135deg, #3B82F6, #1D4ED8);
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