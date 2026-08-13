# 00. 확정된 의사결정

확정일: 2026-07-30

## 1. 적용 범위

관리자 페이지를 제외하고 소비자가 접하는 모든 서비스 영역을 다국어 지원
대상으로 한다.

포함되는 대상:

- 메인, 인증, 상점, 상품 상세, 포트폴리오, 맞춤 주문, 작업 일정
- 마이페이지, 구매·주문 이력, 접근 거부, 모바일/PWA 안내
- Studio 및 Legacy 템플릿 실행 화면의 모든 플랫폼 UI
- 소비자에게 보이는 상품명·설명·구매 안내·포트폴리오 콘텐츠
- 템플릿 제작자가 제공한 입력 라벨, placeholder, 상태명, 캔버스 정적 문구
- 인증·비밀번호·구매·권한 관련 거래 이메일
- 소비자 공개 페이지의 metadata, SEO, 접근성 문구
- API 오류 중 소비자에게 표시되는 메시지

관리자 페이지의 내비게이션, 버튼, 폼, 관리자 전용 오류 문구는 번역하지 않는다.
다만 소비자에게 노출할 번역 콘텐츠를 등록하기 위한 import/API/데이터 계약은
다국어 지원 기반 작업에 포함한다.

## 2. 사용자 작성 콘텐츠의 경계

다음은 미번역 UI가 아니라 사용자가 소유한 원문이므로 자동 번역하지 않는다.

- 방송 제목과 방송 시간
- 메모와 주문 요청 내용
- 작가명과 프로필명
- 사용자가 입력하거나 업로드한 기타 콘텐츠

즉, 관리자 페이지를 제외한 모든 **제품·운영·템플릿 저작 콘텐츠**는 번역
대상이지만, 사용자별 입력값은 언어를 바꾸어도 원문과 저장값을 유지한다.

## 3. 공개 원칙

영어 또는 일본어 번역이 완료되지 않은 영역은 해당 locale에서 비공개로 한다.

- 개발·이행 중에는 한국어 fallback을 기술적 안전장치로 사용할 수 있다.
- fallback이 동작한다는 이유로 해당 locale을 출시 완료로 판단하지 않는다.
- 필수 UI, 공개 운영 콘텐츠, 활성 템플릿, 거래 이메일이 모두 준비된 뒤
  locale을 공개한다.
- 미번역 한국어 콘텐츠를 영어·일본어 canonical URL, sitemap, `hreflang`에
  노출하지 않는다.
- 특정 상품이나 템플릿만 번역이 미완료라면 해당 항목을 그 locale의 목록과
  직접 접근에서 모두 비공개로 한다.

## 4. 채택한 권장안

| 항목               | 확정 방향                                                           |
| ------------------ | ------------------------------------------------------------------- |
| 지원 locale        | `ko`, `en`, `ja`                                                    |
| 기본 locale        | `ko`                                                                |
| 출시 순서          | 한국어 기반 전환 → 영어 → 일본어                                    |
| 소비자 URL         | 기본 언어를 포함해 `/ko/...`, `/en/...`, `/ja/...` prefix 사용      |
| 기존 URL           | locale-prefixed URL로 호환 redirect                                 |
| 번역 런타임        | `next-intl` PoC 통과 후 도입                                        |
| locale 저장        | cookie + 로그인 사용자의 `users.preferred_locale`                   |
| 운영 콘텐츠        | 도메인별 translation table                                          |
| 번역 콘텐츠 입력   | 초기에는 검증된 CSV/JSON import, 필요 시 관리자 입력 UI를 별도 개발 |
| API 오류           | 안정적인 error code를 반환하고 UI에서 번역                          |
| Studio 콘텐츠      | document locale map에 명시적 번역 저장, 자동 번역 금지              |
| Legacy 콘텐츠      | 공통 UI와 템플릿별 locale map을 사용                                |
| Legacy 출력 언어   | 서비스 UI locale과 `weekdayOption`/`monthOption`을 분리             |
| 가격               | KRW 금액 유지, locale별 표시 형식만 변경                            |
| 시간               | 방송 wall-clock 값 유지, 날짜·타임스탬프만 locale 포맷              |
| 이메일             | 인증·비밀번호·구매·권한 관련 거래 이메일 포함                       |
| 공개 readiness     | 대상 locale의 소비자 노출 범위 번역 완료 전 비공개                  |
| 관리자 페이지 번역 | 제외                                                                |

## 4.1 2026-07-31 검토 반영 결정

계획 문서를 코드베이스와 대조 검토한 뒤 추가로 확정한 항목이다. §4의 제품
방향을 바꾸지 않고 구현 계약을 좁힌다.

| 항목                 | 확정 방향                                                                              |
| -------------------- | -------------------------------------------------------------------------------------- |
| middleware           | 기존 `src/middleware.ts`에 maintenance·locale 판정을 합성. 새 파일 추가 금지           |
| maintenance redirect | 목적지를 `/`가 아니라 `/{resolvedLocale}`로 변경                                       |
| fallback 용어        | `message fallback`(production 금지)과 `content fallback`(preview·rollback 한정)을 분리 |
| 번역 대상 판정 기준  | 스키마 컬럼이 아니라 실제 렌더링 지점                                                  |
| plan 기능 표시명     | translation table이 아니라 message catalog                                             |
| 한국어 원문          | 번역 착수 전에 화면 간 문구를 정본 하나로 통일                                         |
| plan 기능 정본       | 상세 화면 문구를 정본으로 확정. 구매 모달을 그에 맞춰 재작성                           |
| API 응답 shape       | 요청 locale 텍스트만 반환. base 컬럼 동시 반환 금지                                    |
| redirect 코드        | 이행 308, 롤백 307, maintenance 307                                                    |
| unprefixed redirect  | 영구 유지. 제거 대상은 `?lang` 해석과 localStorage 읽기뿐                              |
| 폰트                 | locale별 서체 교체 금지. 단일 stack 공유. 전략은 Phase 0에서 선택                      |
| 폰트 변경 취급       | 번역 commit과 분리하고 Legacy·Studio 양쪽 PNG 회귀 검증 대상에 포함                    |
| 호환 계층 제거 기준  | Phase 0 계측 기준선 대비 비율 + 연속 관측 기간                                         |

번역 대상에서 제외하기로 확정한 컬럼:

```text
shop_templates.title
shop_templates.features
shop_templates.requirements
templates.detailed_description
template_products.*
```

모두 소비자 화면에 렌더링되는 지점이 없다. 상세 근거는
[01 §2.7](./01-current-state-and-scope.md#27-소비자-콘텐츠-컬럼의-실사용-범위),
계약은 [03 §2.0](./03-content-and-template-contracts.md#20-필드-소유권)에 있다.

`next-intl` PoC는 제품 방향을 다시 선택하는 단계가 아니라 현재 Next.js/PWA 구성의
기술 호환성을 확인하는 단계다. 호환 문제가 있으면 같은 locale·message·routing
계약을 유지하는 내부 provider로 대체한다.

## 5. 구현에 미치는 영향

### 콘텐츠 readiness 단위

공개 단위는 페이지 번역 여부만이 아니다.

```text
locale 공개
├── 공통 UI
├── 핵심 사용자 흐름
├── 해당 locale에 노출할 모든 상품/포트폴리오
├── 해당 locale에 노출할 모든 활성 템플릿
├── 거래 이메일
└── metadata/SEO/PWA/접근성
```

### 템플릿 readiness

- Studio는 활성 document의 플랫폼 UI와 저작 locale map을 모두 검수한다.
- Legacy는 공통 UI뿐 아니라 각 활성 템플릿의 라벨·placeholder·정적 문구를
  검수한다.
- 템플릿별 `weekdayOption`/`monthOption`은 디자인 출력 설정이므로 UI locale
  변경으로 자동 변경하지 않는다.
- 번역되지 않은 템플릿은 해당 locale의 상점, 마이페이지 실행 링크, 직접
  실행 경로에서 비공개 처리한다.

### 데이터 readiness

- translation row는 `draft → reviewed → published` 상태로 공개 readiness를
  판정한다.
- 목록 API와 상세 API가 같은 공개 조건을 사용해야 한다.
- locale별 React Query cache key를 분리해야 한다.
- 한국어 base column fallback은 rollback을 위해 유지하되 공개 판정에는
  사용하지 않는다.

## 6. 남은 항목의 성격

제품 방향에 대한 주요 의사결정은 완료되었다. 다음은 구현 단계에서 확정할
세부사항이며 위 결정을 변경하지 않는다.

- CSV/JSON import file schema와 검수 명령
- feature flag의 실제 저장 위치와 이름
- 첫 Legacy 파일럿 템플릿 ID
- locale별 번역 검수 담당자와 배포 승인 절차
- 폰트 전략의 최종 선택 (CJK 웹폰트 subset 도입 또는 시스템 fallback stack 명시)
- 각 locale에 공개할 활성 템플릿 목록
- 호환 계층 제거 임계값의 기준선 실측치
