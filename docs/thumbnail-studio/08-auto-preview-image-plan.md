# Phase 8. Thumbnail Studio 자동 미리보기 이미지 저장 계획

상태: 코드·원격 migration 적용 완료 (기존 게시 템플릿 preview 보정 대기)
작성일: 2026-08-29
대상: 관리자 Thumbnail Studio, 템플릿 목록·마이페이지·상점·주문 상세의 미리보기

## 1. 목적

Thumbnail Studio에서 템플릿을 발행할 때 현재 문서를 이미지로 렌더링해 저장하고,
관리자와 사용자 화면에서 템플릿 미리보기 썸네일로 사용한다.

여기서 “저장”은 초안 저장과 발행 저장을 구분한다.

- 초안 저장: 문서와 에셋만 저장한다. 아직 공개 소비자가 볼 대표 이미지는 갱신하지
  않는다.
- 발행 저장: 발행된 revision을 기준으로 자동 미리보기를 생성·업로드한다.
- 재시도/명시적 갱신: 미리보기 생성에 실패했거나 관리자가 다시 생성하고 싶은 경우
  별도 액션으로 같은 흐름을 실행한다.

초안 저장마다 이미지를 업로드하면 저장 빈도에 따라 R2 객체와 CDN 캐시가 불필요하게
증가하고, 아직 발행되지 않은 디자인이 외부에 노출될 수 있다. 따라서 첫 구현은
발행 시 생성하는 정책을 기본값으로 한다.

## 2. 검토 결과

### 2.1 현재 코드 상태

| 영역                  | 현재 상태                                                                                                             | 근거                                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Template Studio 저장  | 문서·runtime·revision·에셋만 저장하며 이미지 생성은 없음                                                              | `src/hooks/studio/use-studio-template-persistence.ts`, `src/services/server/templateStudioPersistenceService.ts`                            |
| PNG 렌더링            | `StudioExportRoot`와 `modern-screenshot` 기반 렌더링이 이미 있음. 현재 함수는 PNG를 다운로드만 함                     | `src/components/studio/runtime/studio-export-root.tsx`, `src/utils/template-studio/png-export.ts`                                           |
| 수동 대표 이미지      | `templates.thumbnail_url`에 catalog cover를 저장하고 목록·상점·마이페이지에서 사용함                                  | `src/app/api/admin/templates/[id]/catalog-cover/route.ts`, `src/utils/templates/consumer-template.ts`                                       |
| 임시 preview asset    | `template_studio_preview_assets`가 존재하지만 `run_id`, `preview_id`, 24시간 만료를 사용하는 런타임 이미지 registry임 | `supabase/migrations/20260707000000_create_template_studio_preview_assets.sql`, `src/app/api/admin/template-studio/preview-assets/route.ts` |
| R2 에셋               | Template Studio canonical prefix와 템플릿 삭제 시 prefix 정리 규칙이 있음                                             | `src/utils/template-studio/asset-storage.ts`, `src/lib/r2.ts`                                                                               |
| 소비자 cover fallback | 현재 `thumbnail_url` 후 placeholder/legacy 경로를 사용하며 Studio 자동 미리보기 필드는 없음                           | `src/utils/templates/consumer-template.ts`                                                                                                  |

### 2.2 결론

구현 가능성이 높다. 다만 자동 생성 이미지를 기존 `thumbnail_url`에 덮어쓰면 관리자가
등록한 catalog cover가 발행할 때마다 사라지므로, 자동 미리보기와 수동 대표 이미지를
별도 필드로 관리해야 한다.

임시 `template_studio_preview_assets` 테이블은 만료 정책과 템플릿 외래 키가 있어
영구 미리보기에는 적합하지 않다. 이 테이블은 현재 런타임 에셋 업로드·정리 용도로
그대로 유지하고, 새 저장 계약을 추가한다.

## 3. 목표와 비목표

### 목표

- 발행 revision과 일치하는 자동 미리보기 이미지를 저장한다.
- 수동 catalog cover가 있으면 계속 우선 표시한다.
- 수동 cover가 없을 때 자동 미리보기를 안전한 fallback으로 사용한다.
- 관리자 편집 화면과 사용자 화면이 동일한 renderer/export root를 사용한다.
- 입력값은 관리자의 임시 입력이나 특정 고객 데이터를 포함하지 않고 기본값·placeholder
  기준으로 생성한다.
- 업로드 실패가 문서 발행 성공을 되돌리지 않으며, 기존에 정상인 미리보기도 지우지
  않는다.

### 비목표

- 모든 키 입력 또는 모든 초안 autosave마다 서버 이미지를 만드는 것
- 자동 미리보기로 `templates.thumbnail_url`을 교체하는 것
- DB에 Base64/data URI를 저장하는 것
- 서버에 별도 headless browser 렌더링 인프라를 도입하는 것
- 첫 단계에서 모든 과거 revision의 이미지 이력을 보관하는 것

## 4. 제품·데이터 계약

### 4.1 이미지 출처와 표시 우선순위

| 순서 | 필드/출처                                    | 의미                                                      |
| ---- | -------------------------------------------- | --------------------------------------------------------- |
| 1    | `templates.thumbnail_url`                    | 관리자가 직접 등록한 catalog cover. 기존 의미를 유지한다. |
| 2    | `templates.studio_preview_url`               | 발행된 Studio 문서에서 자동 생성한 최신 미리보기.         |
| 3    | 기존 종류별 placeholder 또는 안전한 fallback | 이미지가 없거나 로드에 실패한 경우                        |

`studio_preview_url`이 있어도 수동 cover를 숨기거나 삭제하지 않는다. 관리자 목록에는
두 이미지의 출처를 구분해 표시한다.

### 4.2 렌더링 값

- 발행 revision의 document를 사용한다.
- runtime 값은 `createStudioInitialRuntimeValues()` 계열의 초기 값으로 만든다.
- 빈 text input은 실제 runtime 값으로 placeholder를 저장하지 않는다. 화면에 placeholder가
  보이더라도 제출 값은 빈 문자열이다.
- 현재 관리자가 편집 중인 임시 runtime 값, 특정 사용자 입력, 주문 데이터를 이미지에
  포함하지 않는다.
- 필수 입력이 비어 있는 경우의 미리보기 표시는 기존 placeholder 규칙을 따르되,
  placeholder를 실제 입력값으로 오인하지 않도록 metadata와 검증 결과를 분리한다.

### 4.3 공개 범위

발행 전 초안에는 자동 미리보기 URL을 만들지 않는다.

자동 미리보기 PNG는 템플릿의 공개 여부와 관계없이 **공개 R2 자산**으로 운영한다.
썸네일 이미지는 편집 문서나 사용자 입력 원본에 비해 민감도가 낮고, 현재 catalog
cover와 같은 표시 자산이므로 첫 운영 단계에서는 signed URL, 인증 proxy 또는 별도
비공개 버킷을 도입하지 않는다.

이 결정은 템플릿 자체의 접근 권한을 공개한다는 뜻이 아니다.

- 템플릿 편집 문서, revision, 사용자 입력과 주문 데이터는 기존 인증·권한 검사를
  계속 적용한다.
- 일반 사용자 API는 사용자가 접근 가능한 템플릿만 반환한다. 다만 응답으로 전달된
  미리보기 URL 자체는 인증 없이 열릴 수 있다.
- 미리보기 PNG에는 관리자의 임시 runtime 값, 특정 고객 입력, 주문 정보와 원본 편집
  데이터를 포함하지 않는다.
- R2 객체 key는 UUID·revision·content hash 기반으로 만들어 단순 순차 추측을 어렵게
  한다.
- 버킷의 객체 목록 조회 기능은 공개하지 않고, 개별 공개 URL로만 전달한다.
- DB에는 `studio_preview_url`과 `studio_preview_file_key`를 함께 저장해 교체·삭제와 향후
  저장소 정책 변경이 가능하게 한다.

현재 `uploadFileToR2Key()`의 공개 URL 계약을 그대로 사용한다. 나중에 미리보기에
개인정보·미공개 캠페인·고객 전용 시안처럼 민감한 내용이 포함되기 시작하면 별도
비공개 버킷과 짧은 만료의 GET signed URL 또는 인증 proxy를 도입한다. 이 전환 시에도
DB에 저장된 `file_key`를 기준으로 URL 제공 방식만 변경할 수 있게 한다.

## 5. 권장 아키텍처

```text
초안 저장
  └─ 문서·에셋 persistence만 수행

발행 저장
  ├─ publish_template_studio_document() → published revision 번호 반환
  ├─ 별도 StudioExportRoot를 준비
  ├─ 기본값·placeholder runtime으로 renderStudioPng() 실행
  ├─ POST /api/admin/template-studio/templates/{id}/preview
  │    ├─ 관리자 인증·revision 검증
  │    ├─ R2 업로드
  │    └─ templates.studio_preview_* metadata 갱신
  └─ 목록/카탈로그 query invalidate 및 성공·경고 피드백
```

문서 발행과 R2 업로드는 하나의 분산 트랜잭션으로 묶이지 않는다. 따라서 발행을 먼저
확정하고 미리보기 업로드가 실패하면 이전 미리보기는 유지한 채 재시도할 수 있어야
한다. 새 이미지 업로드 후 DB 갱신이 실패하면 새 R2 객체를 best-effort로 삭제하고,
삭제 실패 객체는 운영 정리 대상으로 기록한다.

## 6. 데이터베이스 변경 계획

### 6.1 `public.templates`에 최신 이미지 metadata 추가

첫 릴리스는 템플릿당 최신 미리보기 하나만 필요하므로 별도 이력 테이블보다 기존 부모
테이블에 nullable metadata를 추가한다.

제안 필드:

```text
studio_preview_url          TEXT NULL
studio_preview_file_key     TEXT NULL
studio_preview_revision_no  INTEGER NULL CHECK (studio_preview_revision_no > 0)
studio_preview_mime_type    TEXT NULL
studio_preview_byte_size    BIGINT NULL CHECK (studio_preview_byte_size >= 0)
studio_preview_updated_at   TIMESTAMPTZ NULL
```

`file_key`를 함께 저장해야 URL 규칙이 변경되거나 이전 객체를 정리할 때 R2 key를
안전하게 식별할 수 있다. 기존 행은 모두 NULL로 시작한다. `thumbnail_url`과 기존
catalog-cover 데이터는 migration에서 변경하지 않는다.

### 6.2 서비스·타입 반영

- `TemplateStudioTemplateRow`, `TemplateStudioTemplateRecord`에 새 필드를 추가한다.
- `TEMPLATE_STUDIO_TEMPLATE_COLUMNS`와 `toTemplateRecord()`를 갱신한다.
- `src/types/supabase.ts`가 생성 산출물이라면 migration 적용 후 같은 방식으로 갱신한다.
- preview metadata가 없는 구형 응답도 `null`로 정상 매핑한다.

### 6.3 이력 보관이 필요해질 때

revision별 복원·감사·비교가 요구되면 나중에
`template_studio_template_previews(template_id, revision_no, file_key, ...)` 테이블을
추가한다. 첫 구현에서 과거 revision 전체를 자동 생성하지 않고, 최신 pointer 필드로
운영 복잡도를 낮춘다.

## 7. 단계별 구현 계획

### 7.1 Phase 8-0 — 계약과 안전장치 (구현 완료)

1. 초안 저장과 발행 저장의 preview 생성 정책을 feature flag 또는 명시적 설정으로
   고정한다.
2. 자동 미리보기는 공개 R2 자산으로 운영하고, 편집 문서와 사용자 데이터의 기존
   접근 권한은 유지한다.
3. PNG 기준 캔버스 크기와 최대 업로드 용량을 정한다. 기본은 기존 Studio canvas와
   동일한 크기, PNG, 10MB 이하로 시작하고 실제 결과를 측정해 더 낮출 수 있다.
4. preview 실패 시 발행을 유지하고 `미리보기 재시도`를 제공하는 운영 정책을 확정한다.

### 7.2 Phase 8-1 — schema와 persistence layer (완료)

1. 새 Supabase migration으로 `public.templates.studio_preview_*` 필드를 추가한다. migration
   `20260829030000_add_template_studio_preview_metadata.sql`은 temis 원격 프로젝트에
   적용되었다.
2. migration에 제약조건과 필요한 인덱스/column comment를 추가한다.
3. Template Studio service와 공용 template 타입에 새 필드를 반영한다.
4. 기존 catalog cover API가 자동 필드를 수정하지 않는지 회귀 검증한다.

### 7.3 Phase 8-2 — 렌더링 API 분리 (구현 완료)

1. `src/utils/template-studio/png-export.ts`의 현재 `exportStudioPng()`를 다음 두
   계층으로 분리한다.
   - `renderStudioPng()`: `Blob` 또는 data URL을 반환한다.
   - `downloadStudioPng()`: 반환된 결과를 브라우저 다운로드로 연결한다.
2. 다운로드와 자동 업로드가 동일한 `modern-screenshot` 옵션, 이미지 임베딩, 폰트
   대기, canvas 크기를 공유하게 한다.
3. 관리자 편집 DOM을 직접 캡처하지 않는다. 선택 테두리·guide overlay가 없는
   `StudioExportRoot`를 숨김 또는 화면 밖에 렌더링해 캡처한다.
4. 이미지·폰트·layout readiness가 끝난 뒤 렌더링한다. 사용자 runtime shell에 이미
   있는 readiness 흐름을 공용 helper로 추출할 수 있으면 재사용한다.
5. 자동 미리보기에는 초기 runtime/placeholder만 주입하고, 편집기 store의 현재 고객용
   입력값은 사용하지 않는다.

### 7.4 Phase 8-3 — preview 업로드 API와 R2 저장 (구현 완료)

권장 endpoint:

```text
POST /api/admin/template-studio/templates/{templateId}/preview
Content-Type: multipart/form-data

revisionNo: number
file: image/png
```

응답:

```json
{
  "success": true,
  "templateId": "uuid",
  "preview": {
    "templateId": "uuid",
    "revisionNo": 3,
    "previewUrl": "https://...",
    "fileKey": "template-studio/.../previews/revision-3-<hash>.png",
    "mimeType": "image/png",
    "byteSize": 123456,
    "updatedAt": "2026-08-29T00:00:00.000Z"
  }
}
```

구현 규칙:

1. `requireTemplateStudioAdminActor()`로 관리자 인증을 확인한다.
2. 대상 템플릿이 Studio thumbnail이고 archived가 아닌지, 요청 revision이 현재
   published revision인지 서버에서 재검증한다. 오래된 publish 응답이면 `409`로
   거절한다.
3. `image/png`와 최대 크기를 검증하고, 내부 생성 이미지라도 클라이언트 MIME만
   신뢰하지 않는다.
4. 객체 key는 템플릿·revision·content hash를 포함한다. revision별 URL이 달라져
   CDN이 이전 이미지를 오래 제공하지 않게 한다.
5. R2 업로드 후 metadata를 갱신한다. 이전 객체 삭제는 DB 갱신 성공 뒤 best-effort로
   수행하고, 실패해도 현재 metadata를 되돌리지 않는다.
6. 같은 revision의 재시도는 idempotent하게 처리한다. 동일 hash면 기존 객체를
   재사용하거나 중복 업로드를 정리한다.
7. 템플릿 삭제 시 기존 canonical prefix 정리 범위에 preview 경로가 포함되는지
   확인한다. 포함되지 않으면 삭제 route에 명시적으로 추가한다.

이번 단계에서는 `uploadFileToR2Key()`의 공개 URL 계약을 유지한다. signed URL과 인증
proxy는 구현 범위에서 제외하며, 향후 미리보기의 정보 민감도가 높아질 때 별도 보안
단계로 추가한다. 업로드 API 자체는 계속 관리자 인증을 요구한다.

### 7.5 Phase 8-4 — 발행 흐름 연결 (구현 완료)

1. `use-studio-template-persistence.ts`의 publish 성공 결과에서 revision 번호를
   받는다.
2. publish 직후 `StudioExportRoot`를 준비하고 `renderStudioPng()` 결과를 preview API로
   업로드한다.
3. 저장·발행 중복 실행을 막고, 기존 저장 피드백 모달/토스트 계약과 연결한다.
4. 문서 발행 성공 + preview 성공은 성공 토스트로 표시한다.
5. 문서 발행 성공 + preview 실패는 발행을 실패로 표시하지 않고, 기존 미리보기 유지와
   함께 `발행 완료, 미리보기 생성 실패` 경고 및 재시도 액션을 표시한다.
6. 브라우저가 없는 import/backfill 경로는 preview를 만들지 않고 별도 명시적 생성
   작업으로 처리한다.

### 7.6 Phase 8-5 — 관리자·소비자 화면 연결 (구현 완료)

1. `src/app/(root)/admin/template-studio/_components/template-studio-admin-list-client.tsx`
   에서 수동 cover와 자동 preview를 구분해 렌더한다.
2. 카드 문구를 `대표 이미지 등록됨`, `자동 미리보기 생성됨`, `미리보기 없음`처럼
   출처가 드러나도록 정리한다. 수동 cover 관리 진입점은 유지한다.
3. `src/utils/templates/consumer-template.ts`의 resolver와 관련 API/query가
   `studio_preview_url`을 받도록 확장한다.
4. 소비자 표시 우선순위는 `thumbnail_url → studio_preview_url → 기존 fallback`으로
   유지한다. Studio 템플릿이 아닌 legacy/v2 템플릿의 fallback 동작은 바꾸지 않는다.
5. 사용자 템플릿·상점·상세·주문 후보 API의 select/normalizer/query cache를 점검한다.
6. preview 업로드 성공 뒤 관리자 목록과 필요한 소비자 query를 invalidate한다.

### 7.7 Phase 8-6 — 기존 템플릿 보정과 운영 정리 (운영 적용 대기)

1. 현재 게시된 Studio thumbnail 중 미리보기가 없는 템플릿을 조회하는 dry-run을 만든다.
2. 관리자가 확인한 allowlist만 명시적 재생성 작업으로 처리한다. 과거 revision 전체를
   일괄 변환하지 않는다.
3. 수동 catalog cover가 있는 템플릿은 자동 preview 생성 후에도 수동 cover가 우선인지
   확인한다.
4. orphan R2 객체, metadata가 없는 객체, 이전 revision 객체의 정리 작업과 보존 기간을
   문서화한다.

## 8. 테스트 계획

### 8.1 단위·서비스 검증

- cover resolver가 수동 `thumbnail_url`을 자동 preview보다 우선하는지 확인한다.
- `thumbnail_url`이 비어 있을 때만 `studio_preview_url`을 사용하는지 확인한다.
- template record의 null metadata와 구형 응답을 정상 처리한다.
- `renderStudioPng()`와 `downloadStudioPng()`가 같은 렌더 결과를 사용하는지 확인한다.
- placeholder는 화면에 보일 수 있지만 runtime 제출 값과 저장 JSON에 들어가지 않는지
  확인한다.
- revision이 오래된 preview 업로드를 API가 거절하는지 확인한다.
- MIME, 크기, 인증 실패, 존재하지 않는 템플릿, archived 템플릿을 검증한다.

### 8.2 통합·브라우저 시나리오

1. 초안 저장만 했을 때 `studio_preview_*`가 갱신되지 않는다.
2. 발행하면 선택 테두리·guide 없이 clean thumbnail이 생성된다.
3. 발행 후 관리자 목록에 자동 미리보기가 표시되고, 수동 cover가 있으면 수동 cover가
   계속 표시된다.
4. 같은 템플릿을 다시 발행하면 새 revision URL로 교체되고 이전 CDN 이미지가 남지
   않는다.
5. 이미지·폰트 로드가 늦어도 렌더 readiness 후 캡처한다.
6. preview API가 실패해도 문서 발행은 완료되고 경고와 재시도 버튼이 나타난다.
7. 재시도 성공 뒤 query가 갱신되어 새 이미지가 보인다.
8. 필수 입력이 비어 있는 템플릿은 placeholder 표시 정책과 실제 다운로드/검증 정책이
   기존 계약과 일치한다.
9. 접근 권한이 있는 사용자의 템플릿 응답에는 공개 preview URL이 포함되고, 접근 권한이
   없는 사용자는 템플릿 데이터 API 자체를 조회할 수 없다.
10. 공개 preview PNG에 임시 runtime 값, 특정 고객 입력, 주문 정보 또는 편집 문서
    데이터가 포함되지 않는다.
11. 템플릿 삭제 시 연결된 preview R2 객체와 metadata가 정리된다.

프로젝트 기본 검증은 `npm run lint`, `npx tsc --noEmit`, 관련 Thumbnail Studio
check script와 관리자·일반 사용자 브라우저 실측으로 수행한다. 이미지가 많은 저장소
규칙에 따라 production build는 기본 검증에서 제외한다.

## 9. 롤아웃과 롤백

### 롤아웃 순서

1. schema migration과 타입/service 변경
2. renderer 반환값 분리 및 API를 feature flag 뒤에 배포
3. 관리자 한정으로 발행 후 preview 생성
4. 수동 cover 우선 resolver와 관리자 목록 표시 활성화
5. 기존 allowlist 템플릿 preview 보정
6. 공개 preview URL을 사용하는 사용자 화면 fallback 활성화

### 롤백 원칙

- preview 생성 flag만 끄고 문서 발행·기존 catalog cover 기능은 유지한다.
- `studio_preview_*` metadata는 nullable이므로 기존 소비자 API는 자동 preview가 없어도
  기존 fallback으로 동작해야 한다.
- 이미 업로드된 preview 객체를 즉시 일괄 삭제하지 않는다. 영향 범위를 확인한 뒤
  orphan 정리 작업으로 제거한다.
- `thumbnail_url`을 자동 이미지로 되돌리거나 기존 수동 cover를 덮어쓰는 rollback은
  수행하지 않는다.

## 10. 완료 조건

- [x] 초안 저장과 발행 저장의 preview 정책이 코드·문서·화면에서 일치한다.
- [x] 발행 revision과 자동 preview metadata가 서로 일치한다.
- [x] 수동 catalog cover가 자동 preview보다 항상 우선한다.
- [x] 수동 cover가 없으면 자동 preview가 관리자와 허용된 소비자 화면에 표시된다.
- [x] editor guide/selection이 자동 이미지에 포함되지 않는다.
- [x] 자동 preview에 관리자의 임시 입력이나 고객 데이터가 포함되지 않는다.
- [x] preview 업로드 실패가 발행을 되돌리지 않고 재시도할 수 있다.
- [x] 오래된 revision 업로드, 인증 실패, 크기·MIME 오류가 서버에서 차단된다.
- [x] 공개·비공개 템플릿의 자동 미리보기를 공개 R2 자산으로 운영하는 정책이 문서와
  코드 계약에 반영된다.
- [x] 템플릿 삭제 시 preview metadata와 R2 객체가 정리된다.
- [x] 기존 legacy/v2 대표 이미지와 catalog cover 회귀가 없다.
- [x] lint, typecheck, 관련 check script와 정적 회귀 검증을 통과한다.

기존 게시 템플릿의 preview 보정은 allowlist 확인 후 별도 운영 작업으로 진행한다.
signed URL과 인증 proxy는 현재 완료 조건이 아니며, 미리보기 이미지의 정보 민감도가
높아질 때 재검토한다.

## 11. 관련 문서와 코드

- [Phase 5 — 사용자 런타임과 PNG 내보내기](./05-runtime-export.md)
- [Phase 6 — 저장, 발행과 카탈로그 통합](./06-persistence-catalog.md)
- [Phase 7 — 운영 테스트 후 개선 계획](./07-post-test-remediation-plan.md)
- `src/hooks/studio/use-studio-template-persistence.ts`
- `src/services/server/templateStudioPersistenceService.ts`
- `src/components/studio/runtime/studio-export-root.tsx`
- `src/utils/template-studio/png-export.ts`
- `src/app/api/admin/templates/[id]/catalog-cover/route.ts`
- `src/app/api/admin/template-studio/preview-assets/route.ts`
- `supabase/migrations/20260707000000_create_template_studio_preview_assets.sql`
