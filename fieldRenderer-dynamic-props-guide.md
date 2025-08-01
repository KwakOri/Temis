# FieldRenderer 컴포넌트 동적 속성 가이드

fieldRenderer 컴포넌트들이 `...props`를 통해 동적으로 HTML 속성을 받을 수 있도록 개선했습니다.

## 🎉 구현 완료 사항

✅ **DescriptionRenderer** - textarea의 모든 HTML 속성 지원
✅ **TopicRenderer** - input의 모든 HTML 속성 지원  
✅ **TimeRenderer** - 시간 입력 필드들의 개별 속성 지원

## 📋 각 컴포넌트별 사용법

### DescriptionRenderer

```typescript
// 기본 사용법
<DescriptionRenderer
  value={description}
  placeholder="설명을 입력하세요"
  handleDescriptionChange={setDescription}
/>

// 동적 속성 사용 예시
<DescriptionRenderer
  value={description}
  placeholder="설명을 입력하세요"
  handleDescriptionChange={setDescription}
  maxLength={500}           // 최대 500자
  rows={5}                  // 5줄 높이
  required={true}           // 필수 입력
  disabled={isReadOnly}     // 읽기 전용 모드
  spellCheck={false}        // 맞춤법 검사 비활성화
  onFocus={() => console.log('포커스됨')}
  onBlur={() => console.log('포커스 해제됨')}
  style={{ fontFamily: 'monospace' }}
  className="custom-textarea-class"
  aria-label="상세 설명 입력"
/>
```

**지원하는 속성들**:
- `maxLength`, `minLength` - 텍스트 길이 제한
- `rows`, `cols` - textarea 크기
- `required`, `disabled`, `readOnly` - 입력 상태
- `autoFocus`, `spellCheck` - 입력 동작
- `onFocus`, `onBlur`, `onKeyDown`, `onKeyUp` - 이벤트 핸들러
- `style`, `className` - 스타일링
- `aria-*` 속성들 - 접근성

### TopicRenderer

```typescript
// 기본 사용법
<TopicRenderer
  value={topic}
  placeholder="주제를 입력하세요"
  handleTopicChange={setTopic}
/>

// 동적 속성 사용 예시
<TopicRenderer
  value={topic}
  placeholder="주제를 입력하세요"
  handleTopicChange={setTopic}
  maxLength={50}            // 최대 50자
  required={true}           // 필수 입력
  autoComplete="off"        // 자동완성 비활성화
  pattern="[A-Za-z가-힣\s]+" // 한글/영문/공백만 허용
  title="한글, 영문, 공백만 입력 가능합니다"
  onKeyDown={(e) => {
    if (e.key === 'Enter') handleSubmit();
  }}
  className="custom-input-class"
  style={{ textAlign: 'center' }}
/>
```

**지원하는 속성들**:
- `maxLength`, `minLength` - 텍스트 길이 제한
- `pattern`, `title` - 입력 검증
- `required`, `disabled`, `readOnly` - 입력 상태
- `autoComplete`, `autoFocus` - 입력 동작
- 모든 input 이벤트 핸들러 (`onKeyDown`, `onFocus` 등)
- `style`, `className` - 스타일링

### TimeRenderer

```typescript
// 기본 사용법
<TimeRenderer
  hour={hour}
  minute={minute}
  handleHourChange={setHour}
  handleMinuteChange={setMinute}
/>

// 동적 속성 사용 예시
<TimeRenderer
  hour={hour}
  minute={minute}
  handleHourChange={setHour}
  handleMinuteChange={setMinute}
  // 시간 입력 필드 속성
  hourProps={{
    required: true,
    disabled: isReadOnly,
    onFocus: () => console.log('시간 필드 포커스'),
    className: "hour-input-custom"
  }}
  // 분 입력 필드 속성
  minuteProps={{
    required: true,
    disabled: isReadOnly,
    onFocus: () => console.log('분 필드 포커스'),
    className: "minute-input-custom"
  }}
  // 컨테이너 스타일링
  containerClassName="time-container-custom"
  separatorClassName="time-separator-custom"
/>
```

**지원하는 속성들**:
- `hourProps`, `minuteProps` - 각 입력 필드의 개별 속성
- `containerClassName` - 전체 컨테이너 스타일
- `separatorClassName` - ":" 구분자 스타일

## 🔧 기술적 구현 방식

### 1. TypeScript 인터페이스 확장

```typescript
// DescriptionRenderer 예시
interface DescriptionRendererProps 
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'placeholder' | 'onChange'> {
  value: string;
  placeholder: string;
  handleDescriptionChange: (value: string) => void;
}
```

**핵심 포인트**:
- `React.TextareaHTMLAttributes` 또는 `React.InputHTMLAttributes` 확장
- `Omit`으로 충돌하는 속성들 제외 (`value`, `onChange` 등)
- 기존 필수 props는 그대로 유지

### 2. Props 스프레드 연산자

```typescript
const Component = ({ value, placeholder, handleChange, className, ...props }) => {
  return (
    <input
      value={value}
      placeholder={placeholder}
      className={mergedClassName}
      onChange={(e) => handleChange(e.target.value)}
      {...props}  // 모든 추가 속성들이 여기에 적용됨
    />
  );
};
```

### 3. 클래스 병합 로직

```typescript
const baseClassName = "기본-클래스들";
const finalClassName = className 
  ? `${baseClassName} ${className}`
  : baseClassName;
```

## 📝 실제 사용 예시

### maxLength가 있는 Description

```typescript
// TimeTableInputList에서 사용
<DescriptionRenderer
  value={day.description}
  placeholder="설명을 입력하세요"
  handleDescriptionChange={(value) => onChange(index, "description", value)}
  maxLength={100}
  rows={4}
  onKeyDown={(e) => {
    if (e.key === 'Tab') {
      // Tab 키로 다음 필드로 이동
      e.preventDefault();
      // 다음 필드로 포커스 이동 로직
    }
  }}
/>
```

### 입력 검증이 있는 Topic

```typescript
<TopicRenderer
  value={day.topic}
  placeholder="주제를 입력하세요"
  handleTopicChange={(value) => onChange(index, "topic", value)}
  maxLength={30}
  pattern="[가-힣A-Za-z0-9\s]+"
  title="한글, 영문, 숫자, 공백만 입력 가능합니다"
  required={true}
/>
```

### 접근성이 강화된 Time

```typescript
<TimeRenderer
  hour={hour}
  minute={minute}
  handleHourChange={setHour}
  handleMinuteChange={setMinute}
  hourProps={{
    "aria-label": "시간 입력",
    "aria-describedby": "time-help",
    required: true
  }}
  minuteProps={{
    "aria-label": "분 입력",
    "aria-describedby": "time-help",
    required: true
  }}
/>
```

## ✨ 장점

### 1. **유연성**
- 어떤 HTML 속성이든 동적으로 전달 가능
- 새로운 속성이 필요할 때마다 컴포넌트 수정 불필요

### 2. **타입 안전성**
- TypeScript가 유효하지 않은 속성 사용을 방지
- 자동완성으로 개발 경험 향상

### 3. **하위 호환성**
- 기존 사용법은 그대로 유지
- 점진적 업그레이드 가능

### 4. **접근성**
- `aria-*` 속성들을 쉽게 추가 가능
- 스크린 리더 지원 강화

### 5. **커스터마이징**
- `className`, `style`로 유연한 스타일링
- 이벤트 핸들러로 세밀한 동작 제어

## 🚀 다음 단계

이제 각 fieldRenderer 컴포넌트들이 완전히 유연해졌으므로:

1. **설정 기반 속성 전달**: 설정 파일에서 각 필드별 속성을 정의하고 자동으로 전달
2. **검증 로직 추가**: `pattern`, `maxLength` 등을 활용한 클라이언트 검증
3. **접근성 개선**: `aria-*` 속성들을 체계적으로 적용
4. **테마 시스템**: `className`을 통한 다양한 테마 지원

이제 어떤 HTML 속성이든 필요에 따라 동적으로 전달할 수 있습니다! 🎉