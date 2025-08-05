# TimeTable Unified Hooks System

CardInputConfig 기반의 통합 훅 시스템으로, 모든 페이지에서 동일한 훅을 재사용할 수 있도록 설계되었습니다.

## 📋 개요

기존에는 각 페이지마다 개별적으로 훅을 생성해야 했지만, CardInputFields 통합 성공 이후 CardInputConfig 타입을 활용하여 모든 페이지에서 하나의 훅 시스템을 공유할 수 있게 되었습니다.

## 🏗️ 아키텍처

```
useTimeTableEditor (메인 훅)
├── useTimeTableState (전역 상태)
├── useTimeTableData (데이터 관리) ← CardInputConfig 주입
├── useTimeTableTheme (테마 관리)
└── useTimeTablePersistence (지속성) ← CardInputConfig 포함
```

## 🚀 사용법

### 1. 메인 훅 사용 (권장)

```tsx
import { useTimeTableEditor } from '@/hooks';
import { CARD_INPUT_CONFIG } from './settings';

const TimeTablePage = () => {
  const {
    // 데이터 관련
    data, updateData, updateCard, updateCardField, toggleOffline,
    resetData, resetCard,
    
    // 테마 관련
    currentTheme, updateTheme, handleThemeChange, resetTheme,
    
    // 전역 상태 관련
    state, actions,
    
    // 지속성 관련
    saveData, loadPersistedData, clearAllData, autoSave,
    
    // 통합 관리
    resetAll, cardInputConfig, isInitialized
  } = useTimeTableEditor({ 
    cardInputConfig: CARD_INPUT_CONFIG,
    defaultTheme: "main",
    autoSaveDelay: 1000
  });

  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {/* 컴포넌트 내용 */}
    </div>
  );
};
```

### 2. 개별 훅 사용

```tsx
import { 
  useTimeTableData, 
  useTimeTableTheme, 
  useTimeTablePersistence 
} from '@/hooks';
import { CARD_INPUT_CONFIG } from './settings';

const MyComponent = () => {
  const { data, updateData } = useTimeTableData({ 
    cardInputConfig: CARD_INPUT_CONFIG 
  });
  const { currentTheme, updateTheme } = useTimeTableTheme("main");
  const { autoSave } = useTimeTablePersistence(
    data, 
    currentTheme, 
    CARD_INPUT_CONFIG
  );

  return <div>...</div>;
};
```

## 🔄 마이그레이션 가이드

### Before (기존 방식)

```tsx
// 각 페이지마다 개별 훅 파일들
/time-table/page1/_hooks/useTimeTableEditor.ts
/time-table/page2/_hooks/useTimeTableEditor.ts
/time-table/page3/_hooks/useTimeTableEditor.ts

// 사용
import { useTimeTableEditor } from '../_hooks';
const { data, updateData } = useTimeTableEditor();
```

### After (새로운 방식)

```tsx
// 통합 훅 시스템
/src/hooks/useTimeTableEditor.ts (하나만 존재)

// 사용
import { useTimeTableEditor } from '@/hooks';
import { CARD_INPUT_CONFIG } from './settings';

const { data, updateData } = useTimeTableEditor({ 
  cardInputConfig: CARD_INPUT_CONFIG 
});
```

## 🎯 주요 개선사항

### 1. 코드 중복 제거
- 기존: 각 페이지마다 유사한 훅 파일들 중복 생성
- 개선: 하나의 통합 훅으로 모든 페이지에서 재사용

### 2. 설정 기반 동적 초기화
- CardInputConfig를 받아서 데이터 구조 동적 생성
- 각 페이지별 고유한 필드 구성을 설정으로 주입

### 3. 호환성 보장
- localStorage에 CardInputConfig도 함께 저장
- 설정 변경 시 자동으로 데이터 구조 일치성 확인
- 불일치 시 새로운 기본값으로 자동 초기화

### 4. 유지보수성 향상
- 훅 로직 변경 시 한 곳에서만 수정
- TypeScript 지원으로 타입 안정성 보장
- 명확한 책임 분리와 모듈화

## 📦 훅별 책임

| 훅 이름 | 책임 | CardInputConfig 의존성 |
|---------|------|----------------------|
| `useTimeTableData` | 데이터 CRUD 관리 | ✅ 필드 구조 정의 |
| `useTimeTableTheme` | 테마 상태 관리 | ❌ 독립적 |
| `useTimeTablePersistence` | localStorage 관리 | ✅ 호환성 검증 |
| `useTimeTableState` | 전역 상태 관리 | ❌ 독립적 |
| `useTimeTableEditor` | 통합 관리 | ✅ 모든 훅에 전파 |

## 🔧 설정 예시

### CardInputConfig 예시

```typescript
export const CARD_INPUT_CONFIG: CardInputConfig = {
  fields: [
    {
      key: "time",
      type: "time",
      placeholder: "00:00",
      required: true,
      defaultValue: "09:00",
    },
    {
      key: "topic",
      type: "text",
      placeholder: "소제목 적는곳",
      defaultValue: "",
      maxLength: 50,
    },
    {
      key: "description",
      type: "textarea",
      placeholder: "메인 제목\n적는곳",
      defaultValue: "",
      maxLength: 200,
    },
  ],
  showLabels: false,
  offlineToggle: {
    label: "휴방",
    activeColor: "bg-[#3E4A82]",
    inactiveColor: "bg-gray-300",
  },
};
```

## 🧪 테스트 가이드

### 1. 기본 기능 테스트

```tsx
const TestComponent = () => {
  const { data, updateCardField, isInitialized } = useTimeTableEditor({
    cardInputConfig: TEST_CONFIG
  });

  useEffect(() => {
    if (isInitialized) {
      // 데이터 업데이트 테스트
      updateCardField(0, "time", "10:00");
      console.log("Updated data:", data[0]);
    }
  }, [isInitialized]);

  return <div>Test Component</div>;
};
```

### 2. 지속성 테스트

```tsx
// 1. 데이터 저장 후 새로고침
// 2. 동일한 CardInputConfig로 로드 → 데이터 복원 확인
// 3. 다른 CardInputConfig로 로드 → 새 기본값 확인
```

## 📚 추가 자료

- [CardInputConfig 타입 정의](/src/types/time-table/data.ts)
- [유틸리티 함수들](/src/utils/time-table/data.ts)
- [사용 예시](/src/app/(root)/time-table/type-test/)