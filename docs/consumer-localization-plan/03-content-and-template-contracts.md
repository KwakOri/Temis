# 03. 콘텐츠와 템플릿 번역 계약

## 1. 두 번역 계층

Temis 다국어 데이터는 제품 배포와 함께 움직이는 메시지와 운영 중 변경되는
콘텐츠로 나눈다.

```text
message catalog
├── 버튼, 라벨, 안내, validation, 상태 표시명
└── 코드 배포로 변경

localized content
├── 상품명/설명, 판매 안내, 포트폴리오 제목/설명
└── DB translation row로 변경
```

사용자가 작성한 주문 요청, 방송 제목, 메모, 프로필명은 어느 계층에도 넣지 않는다.

## 2. 운영 콘텐츠 스키마

기존 원문 column은 제거하지 않고 한국어 fallback으로 유지한다. locale별 table을
추가한다.

### 2.1 템플릿 공통 메타데이터

```text
template_translations
- template_id uuid references templates(id) on delete cascade
- locale text check in ('ko', 'en', 'ja')
- name text not null
- description text not null default ''
- detailed_description text null
- created_at / updated_at
- primary key(template_id, locale)
```

### 2.2 상점 전용 콘텐츠

```text
shop_template_translations
- shop_template_id uuid references shop_templates(id) on delete cascade
- locale text check in ('ko', 'en', 'ja')
- title text null
- detailed_description text null
- features jsonb or text[] null
- requirements text null
- purchase_instructions text null
- created_at / updated_at
- primary key(shop_template_id, locale)
```

`features`는 배열 순서가 UI 의미를 가지므로 locale row마다 완전한 배열을
저장한다. 원문 문자열을 key로 번역 lookup하지 않는다.

### 2.3 포트폴리오

```text
portfolio_translations
- portfolio_id uuid references portfolios(id) on delete cascade
- locale text check in ('ko', 'en', 'ja')
- title text not null
- description text not null default ''
- created_at / updated_at
- primary key(portfolio_id, locale)
```

### 2.4 fallback

조회 순서:

1. 요청 locale의 translation row
2. `ko` translation row
3. 기존 base table 원문

API 응답에는 실제 사용된 `content_locale`을 포함한다. 영어/일본어 공개
출시 전에는 fallback 콘텐츠가 있는 상품을 해당 locale catalog에서 숨기거나
명시적으로 원문 표시 정책을 적용한다. 조용히 한국어를 영어 콘텐츠처럼 SEO에
노출하지 않는다.

## 3. locale-aware 조회

locale별 콘텐츠가 필요한 API만 `locale`을 명시적으로 받는다.

```text
GET /api/shop/templates?sort=newest&locale=en
GET /api/shop/templates/{id}?locale=ja
GET /api/portfolios?category=all&page=1&locale=en
GET /api/user/templates?locale=ja
```

- route에서 `locale` allowlist를 검증한다.
- service 함수는 `locale: AppLocale`을 필수 인자로 받는다.
- React Query query key에 locale을 포함한다.
- mutation 후 invalidate도 현재 locale key와 locale 비의존 권한 key를
  구분한다.
- 번역 join 때문에 권한/판매 조건이 바뀌지 않게 먼저 base row를 필터하고
  translation을 조인한다.
- API cache를 사용할 경우 URL query를 cache key에 포함한다.

## 4. 사용자 선호 locale 스키마/API

migration 제안:

```sql
alter table public.users
  add column preferred_locale text null,
  add constraint users_preferred_locale_check
    check (preferred_locale in ('ko', 'en', 'ja'));
```

endpoint:

```text
GET /api/user/preferences
PUT /api/user/preferences/locale
body: { "locale": "en" }
```

`PUT`은 request body의 user id를 받지 않고 인증 token의 사용자만 갱신한다.
locale 변경은 구매/템플릿 runtime state와 별개라 기존 저장 JSON을 migration하지
않는다.

## 5. 이메일

거래 이메일은 수신자의 `preferred_locale`을 사용한다.

대상:

- welcome/verification/reset-password
- template access granted
- 구매/맞춤 주문 상태 알림

계약:

- locale은 email template 함수의 명시적 인자다.
- 사용자의 locale이 null이면 요청이 시작된 locale, 없으면 `ko`를 사용한다.
- 링크는 locale-prefixed consumer URL을 사용한다.
- 제목과 plain text, HTML body를 함께 번역한다.
- 사용자명·상품명은 escape하고, 상품 콘텐츠는 해당 locale translation을 사용한다.
- 발송 로그에는 locale과 template key를 남기되 본문·개인정보를 남기지 않는다.

## 6. Studio 템플릿 계약

### 6.1 플랫폼 UI

`TemplateStudioRuntimeShell`과 form의 버튼, 상태, crop, 저장 안내는 전역
`studio-runtime` message namespace를 사용한다. 이 부분은 모든 Studio
템플릿에서 필수 번역이다.

### 6.2 저작 콘텐츠

기존 문서의 단일 문자열은 source text와 fallback으로 유지한다. 자동 번역은
하지 않는다. 다국어 저작이 필요한 템플릿만 명시적인 locale map을 가진다.

다음과 같은 document v7 확장을 제안한다.

```ts
interface StudioDocumentLocalization {
  sourceLocale: AppLocale;
  metadata?: Partial<
    Record<
      AppLocale,
      {
        name?: string;
        description?: string;
      }
    >
  >;
  inputs?: Record<
    StudioInputId,
    Partial<
      Record<
        AppLocale,
        {
          label?: string;
          description?: string;
          placeholder?: string;
          optionLabels?: Record<string, string>;
        }
      >
    >
  >;
  timetable?: {
    dayLabels?: Record<
      StudioTimetableDayId,
      Partial<Record<AppLocale, string>>
    >;
    statusLabels?: Record<string, Partial<Record<AppLocale, string>>>;
  };
  staticText?: Record<StudioNodeId, Partial<Record<AppLocale, string>>>;
}
```

해석 순서:

1. 선택 locale의 명시적 값
2. `sourceLocale` 값 또는 기존 base string

`staticText`는 제작자가 locale별 디자인 적합성을 확인한 node만 opt-in한다.
텍스트 길이 때문에 디자인이 깨질 수 있으므로 자동으로 모든 text node를
등록하지 않는다.

### 6.3 schema migration

- document v6는 그대로 읽을 수 있다.
- v6 → v7 adapter는 `sourceLocale`만 추론/지정하고 기존 문자열을 이동하지 않는다.
- publish validator는 locale map의 input/node/option ID가 실제 document에
  존재하는지 검사한다.
- 지원 locale 값은 전역 allowlist와 같아야 한다.
- locale map 변경이 사용자 runtime value를 초기화하지 않아야 한다.
- locale은 runtime value에 저장하지 않는다.

### 6.4 기존 문서와의 일관성

기존 문서에서 “user-authored input label/canvas static text 자동 번역 제외”로
정한 원칙은 유지된다. 이번 확장은 자동 번역이 아니라 제작자가 제공한 번역을
표시할 수 있는 opt-in 데이터 계약이다.

## 7. Legacy 템플릿 계약

### 7.1 플랫폼 UI 우선

먼저 `src/components/TimeTable/**`의 공통 UI를 번역한다.

- 뒤로가기, 초기화, 저장, 업로드, 편집, 삭제
- 이미지 crop/save 모달
- 탭, 토글, empty/error/loading 상태
- 팀 저장과 Twitter 공유 안내
- 접근 보호 UI

공통 컴포넌트는 `AppLocale`을 prop으로 연쇄 전달하지 않고 consumer locale
provider를 사용한다.

### 7.2 캔버스 언어와 UI locale 분리

`weekdayOption`과 `monthOption`은 템플릿 결과물의 디자인 설정으로 남긴다.

```text
UI locale:      ko | en | ja
canvas setting: kr | en | jp
```

전역 locale을 바꿨다는 이유로 저장 이미지의 요일/월 표기가 바뀌면 안 된다.
향후 사용자가 출력 언어를 고를 수 있게 할 경우 별도의
`supportsOutputLocale` capability와 output locale control을 추가한다.

### 7.3 템플릿별 입력 카피

각 템플릿의 `_settings/settings.ts`에 있는 placeholder, offline label,
addon label은 제작 데이터다. 다음 optional 계약을 추가한다.

```ts
interface LegacyTemplateLocalization {
  sourceLocale: AppLocale;
  messages?: Partial<
    Record<
      AppLocale,
      {
        profilePlaceholder?: string;
        fieldPlaceholders?: Record<string, string>;
        fieldLabels?: Record<string, string>;
        addonLabels?: Record<string, string>;
        offlineLabel?: string;
      }
    >
  >;
}
```

원본 settings는 변경하지 않고 resolver가 locale map → source string 순으로
읽는다. input key를 기준으로 연결하고 한국어 원문을 lookup key로 사용하지 않는다.

### 7.4 전환 순서

1. `_sample` 또는 tester에서 resolver와 공통 UI 검증
2. 판매 중인 대표 단일 사용자 템플릿 1개
3. multi/offline memo/addon이 있는 복합 템플릿 1개
4. team template 1개
5. 나머지 판매/접근 중 템플릿
6. archived/비판매 템플릿은 필요 시 전환

각 템플릿은 별도 diff와 screenshot 기준을 갖는다. 81개 디렉터리를 기계적으로
한 commit에서 변경하지 않는다.

## 8. 사용자 콘텐츠 및 리뷰

- 방송 제목, 메모, profile text, 주문 요청은 원문 그대로 표시한다.
- 사용자 입력 언어를 감지해 번역하거나 표시를 차단하지 않는다.
- 랜딩 리뷰는 인용문이므로 무단으로 의미를 바꾸지 않는다.
  - 기본안: 원문 보존 + 검수된 번역 병기
  - 원문/번역 여부를 UI와 접근성 텍스트에서 구분
  - 검수되지 않은 locale에서는 해당 리뷰를 숨기거나 원문임을 명시
- 작가명, 상품 고유명, 브랜드명은 용어집을 따른다.

## 9. 콘텐츠 준비 완료 조건

locale별 공개 조건:

- 필수 UI message 100%
- 공개 상품의 name/description/구매 안내 100%
- 핵심 포트폴리오 제목/설명 100%
- 이메일 필수 템플릿 100%
- 법적/결제/환불 안내가 있다면 전문 검수 완료
- Studio/Legacy 파일럿 템플릿의 저작 라벨 검수 완료

번역 row가 없다는 사실을 숨기는 fallback은 개발·이행 편의를 위한 것이며
locale 출시 준비 완료를 뜻하지 않는다.
