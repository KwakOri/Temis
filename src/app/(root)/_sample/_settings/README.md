# 카드 입력 필드 설정 가이드

## 개요

`settings.ts` 파일의 `CARD_INPUT_CONFIG`를 수정하여 카드의 입력 필드를 쉽게 변경할 수 있습니다.

## 사용법

### 1. 기본 설정 위치

파일: `src/app/(root)/sample/_settings/settings.ts`

```typescript
// 개발자 전용: 카드 입력 필드 구성
// 이 부분만 수정하면 카드의 입력 필드가 변경됩니다
export const CARD_INPUT_CONFIG: CardInputConfig = {
  fields: [
    // 여기에 필드들을 정의하세요
  ],
  showLabels: false, // 라벨 표시 여부
  offlineToggle: {   // 오프라인 토글 설정
    label: "휴방",
    activeColor: "bg-[#3E4A82]",
    inactiveColor: "bg-gray-300",
  },
};
```

### 2. 지원되는 필드 타입

- `text`: 단일 줄 텍스트 입력
- `textarea`: 여러 줄 텍스트 입력
- `time`: 시간 선택
- `select`: 드롭다운 선택
- `number`: 숫자 입력

### 3. 필드 추가 예시

```typescript
export const CARD_INPUT_CONFIG: CardInputConfig = {
  fields: [
    {
      key: 'time',
      type: 'time',
      placeholder: '00:00',
      required: true,
      defaultValue: '09:00',
    },
    {
      key: 'title',
      type: 'text',
      placeholder: '제목을 입력하세요',
      maxLength: 50,
    },
    {
      key: 'description',
      type: 'textarea',
      placeholder: '상세 내용',
      maxLength: 200,
    },
    {
      key: 'priority',
      type: 'select',
      placeholder: '우선순위',
      options: [
        { value: 'low', label: '낮음' },
        { value: 'normal', label: '보통' },
        { value: 'high', label: '높음' },
      ],
      defaultValue: 'normal',
    },
    {
      key: 'duration',
      type: 'number',
      placeholder: '소요 시간(분)',
    },
  ],
  showLabels: false,
};
```

### 4. 필드 속성 설명

- `key`: 필드의 고유 식별자 (필수)
- `type`: 입력 필드 타입 (필수)
- `placeholder`: 플레이스홀더 텍스트 (필수)
- `label`: 필드 라벨 (showLabels가 true일 때 표시)
- `required`: 필수 입력 여부
- `maxLength`: 최대 글자 수 (text, textarea)
- `options`: 선택 옵션들 (select 타입)
- `defaultValue`: 기본값

### 5. 추가 설정

- `showLabels`: 필드 라벨 표시 여부
- `offlineToggle`: 오프라인 토글 버튼 설정
  - `label`: 토글 버튼 옆 라벨
  - `activeColor`: 활성화 시 색상 (Tailwind CSS 클래스)
  - `inactiveColor`: 비활성화 시 색상 (Tailwind CSS 클래스)

## 주의사항

1. **타입 안전성**: `key` 값은 TypeScript 타입과 호환되어야 합니다
2. **기존 필드**: `time`, `topic`, `description`은 기본 렌더러를 사용합니다
3. **새 필드**: 추가한 필드는 자동으로 적절한 입력 컴포넌트가 생성됩니다
4. **한 곳에서 관리**: 모든 설정을 settings.ts에서 통합 관리합니다

## 빠른 변경 예시

### 기본 시간표
```typescript
fields: [
  { key: 'time', type: 'time', placeholder: '00:00', required: true },
  { key: 'topic', type: 'text', placeholder: '주제' },
  { key: 'description', type: 'textarea', placeholder: '설명' },
]
```

### 업무용 시간표
```typescript
fields: [
  { key: 'time', type: 'time', placeholder: '00:00', required: true },
  { key: 'task', type: 'text', placeholder: '업무명', required: true },
  { key: 'priority', type: 'select', placeholder: '우선순위', 
    options: [
      { value: 'low', label: '낮음' },
      { value: 'high', label: '높음' }
    ]
  },
]
```

### 학습용 시간표
```typescript
fields: [
  { key: 'time', type: 'time', placeholder: '00:00', required: true },
  { key: 'subject', type: 'text', placeholder: '과목명', required: true },
  { key: 'goal', type: 'textarea', placeholder: '학습 목표' },
  { key: 'difficulty', type: 'select', placeholder: '난이도',
    options: [
      { value: 'easy', label: '쉬움' },
      { value: 'normal', label: '보통' },
      { value: 'hard', label: '어려움' }
    ]
  },
]
```

변경 후 개발 서버를 재시작하면 새로운 필드 구성이 적용됩니다.

## 통합 관리

모든 카드 설정을 settings.ts의 `CARD_INPUT_CONFIG` 한 곳에서 관리합니다:
- 입력 필드 구성
- 라벨 표시 여부  
- 오프라인 토글 설정

이를 통해 일관되고 단순한 설정 관리가 가능합니다.