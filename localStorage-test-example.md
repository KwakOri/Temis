# localStorage 페이지별 격리 테스트 가이드

페이지별 localStorage 격리가 정상적으로 작동하는지 확인하는 방법입니다.

## 구현 완료 사항

### 1. 페이지별 localStorage 유틸리티 생성
- `src/utils/pageAwareLocalStorage.ts`: 페이지 ID를 기반으로 한 localStorage 관리 시스템
- 각 페이지의 URL 경로에서 고유 ID를 추출하여 localStorage 키에 포함
- 예: `/time-table/ef9fa34f-47c8-4e8e-8ed4-b84ef8eae020` → `template-timetable-data-ef9fa34f-47c8-4e8e-8ed4-b84ef8eae020`

### 2. 기존 localStorage 유틸리티들 업데이트
다음 파일들이 새로운 페이지별 시스템을 사용하도록 업데이트되었습니다:
- `src/app/(root)/time-table/ef9fa34f-47c8-4e8e-8ed4-b84ef8eae020/_utils/localStorage.ts`
- `src/app/(root)/time-table/_template/_utils/localStorage.ts`
- `src/app/(root)/sample/_utils/localStorage.ts`
- `src/app/(root)/time-table/83b56e00-b93b-4dc0-81ff-0521c891ee26 copy/_utils/localStorage.ts`
- `src/hooks/useTimeTableState.ts`

## 테스트 방법

### 1. 개발 서버 실행
```bash
npm run dev
```

### 2. 페이지별 데이터 격리 테스트

#### A. 첫 번째 페이지에서 데이터 입력
1. `http://localhost:3000/time-table/ef9fa34f-47c8-4e8e-8ed4-b84ef8eae020` 접속
2. 타임테이블 데이터를 수정 (시간, 설명, 테마 등)
3. 브라우저 개발자 도구 → Application → Local Storage에서 확인
   - 키: `template-timetable-data-ef9fa34f-47c8-4e8e-8ed4-b84ef8eae020`
   - 키: `template-timetable-theme-ef9fa34f-47c8-4e8e-8ed4-b84ef8eae020`

#### B. 두 번째 페이지에서 독립적인 데이터 확인
1. `http://localhost:3000/time-table/_template` 접속
2. 첫 번째 페이지의 데이터가 나타나지 않는 것을 확인
3. 새로운 데이터 입력
4. 브라우저 개발자 도구에서 확인
   - 키: `template-timetable-data-template`
   - 키: `template-timetable-theme-template`

#### C. 샘플 페이지에서 독립성 확인
1. `http://localhost:3000/sample` 접속
2. 이전 페이지들의 데이터와 독립적으로 작동하는 것을 확인

### 3. localStorage 디버깅 도구 사용

브라우저 콘솔에서 다음 함수들을 사용하여 확인:

```javascript
// 모든 페이지별 localStorage 키 확인
import { debugStorage } from '@/utils/pageAwareLocalStorage';
debugStorage.logAllKeys();

// 특정 페이지의 데이터 확인
debugStorage.logPageData('ef9fa34f-47c8-4e8e-8ed4-b84ef8eae020');
debugStorage.logPageData('template');
```

## 작동 원리

### 1. 페이지 ID 추출
```typescript
// URL: /time-table/ef9fa34f-47c8-4e8e-8ed4-b84ef8eae020
// 추출된 pageId: "ef9fa34f-47c8-4e8e-8ed4-b84ef8eae020"

// URL: /time-table/_template  
// 추출된 pageId: "template"
```

### 2. 키 생성
```typescript
// 기존: "template-timetable-data"
// 새로운 방식: "template-timetable-data-ef9fa34f-47c8-4e8e-8ed4-b84ef8eae020"
```

### 3. 자동 페이지 인식
- Next.js의 `usePathname()` 훅을 사용하여 현재 경로 감지
- 경로 변경 시 자동으로 해당 페이지의 localStorage 사용

## 장점

1. **완전한 격리**: 각 페이지의 데이터가 서로 영향을 주지 않음
2. **자동화**: 개발자가 수동으로 페이지별 처리를 할 필요 없음
3. **기존 코드 호환**: 기존 localStorage 사용 코드를 거의 그대로 유지
4. **디버깅 지원**: 페이지별 데이터 확인 및 관리 도구 제공
5. **타입 안전성**: TypeScript 지원으로 안전한 데이터 처리

## 주의사항

- 페이지 이동 시 이전 페이지의 데이터는 자동으로 저장되지 않음
- 각 페이지별로 독립적인 localStorage 공간을 가지므로 전역 상태 공유가 필요한 경우 별도 처리 필요
- 페이지 URL 구조가 변경되면 기존 데이터에 접근할 수 없을 수 있음