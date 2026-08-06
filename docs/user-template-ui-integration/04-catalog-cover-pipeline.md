# 04. 카탈로그 대표 이미지 파이프라인

상태: 구현 완료 (2026-08-06, local Supabase·browser smoke 통과; remote R2 test prefix smoke 실행 대기)  
선행 조건: 03단계 마이페이지가 fallback으로 동작

## 1. 목표

Legacy 정적 파일에 의존하지 않고 Studio 시간표와 Studio 썸네일의 카탈로그용
대표 이미지를 관리자가 등록해 `templates.thumbnail_url`로 제공한다.

이 단계는 사용자 런타임 결과 저장과 별개다. 카탈로그 cover는 템플릿 상품을
설명하는 관리자 관리 자산이다.

## 2. 명명과 경계

DB 컬럼 이름은 기존 호환을 위해 `thumbnail_url`을 유지한다. 문서와 코드에서는
다음 두 의미를 구분한다.

- catalog cover: 목록·상점·마이페이지 대표 이미지
- thumbnail template output: 사용자가 `/thumbnail/{id}`에서 생성하는 PNG

사용자 결과물을 `templates.thumbnail_url`에 저장하지 않는다.

## 3. 초기 필수 구현: 관리자 업로드

04단계의 필수 구현 경로는 관리자 업로드 하나로 제한한다.

- 상품 관리 또는 템플릿 Hub에서 대표 이미지 선택
- MIME type과 크기 제한 검증
- R2 업로드
- 성공 후 `templates.thumbnail_url` 갱신

업로드가 없거나 실패해도 02단계에서 정의한 종류별 placeholder를 사용하므로
마이페이지와 상점 이용을 막지 않는다.

## 4. 후속 개선: 발행본 기반 생성

다음 기능은 04단계 완료 조건에 포함하지 않는다. 관리자 업로드가 안정화된 뒤
별도 04.5단계 또는 후속 작업으로 진행한다.

- 관리자 preview가 published document와 기본 runtime values를 렌더
- 공용 `StudioRenderer`/PNG exporter로 이미지 생성
- 관리자가 결과를 확인한 뒤 대표 이미지로 등록

발행 트랜잭션 자체는 대표 이미지 생성 실패 때문에 실패하지 않게 한다.
자동 생성 작업을 추가하더라도 게시 후 명시적 `대표 이미지 생성` 또는 비동기
작업으로 분리한다.

## 5. API와 서비스 구현 결과

04단계의 관리자 등록 경로를 다음으로 고정했다.

```text
상품 관리 `/admin/template-products/{templateId}`
→ React Query `useUploadCatalogCover` / `useDeleteCatalogCover`
→ `AdminCatalogCoverService`
→ POST/DELETE `/api/admin/templates/{id}/catalog-cover`
→ 관리자 인증·Studio 종류 검증
→ R2 `getCatalogCoverR2Prefix()` 기반 key 생성
→ `templates.thumbnail_url`
```

기본 production prefix는 `uploads/catalog-covers/{templateId}/{uuid}.{ext}`다.
원격 R2 smoke에서는 실행 프로세스에 다음처럼 단일 test run prefix를 주입한다.

```text
CATALOG_COVER_R2_PREFIX=uploads/catalog-covers/_test/<run-id>
→ uploads/catalog-covers/_test/<run-id>/{templateId}/{uuid}.{ext}
```

- `CATALOG_COVER_R2_PREFIX`는 `uploads/catalog-covers/_test/<run-id>` 형식만 허용한다.
  production prefix나 임의의 넓은 prefix를 지정하면 API가 즉시 실패한다.
- test mode의 교체·삭제는 현재 test prefix 아래의 managed 객체만 대상으로 한다.
  production URL이나 다른 run의 URL은 R2 삭제 대상으로 취급하지 않는다.
- `templates.thumbnail_url`은 local Supabase에만 기록한다. 원격 Supabase metadata에는
  test 객체 정보를 기록하지 않는다.
- `image/png`, `image/jpeg`, `image/webp`만 허용하며 최대 크기는 10MB다.
- Legacy 템플릿은 기존 정적 cover 경계를 유지하고 이 API의 대상에서 제외한다.
- 업로드 API는 새 R2 객체를 먼저 만든 뒤 DB URL을 갱신한다. DB 갱신 실패 시 신규
  객체를 best-effort 삭제한다.
- 교체는 DB 갱신 성공 후 이전 관리 R2 객체를 삭제한다. 이전 삭제 실패는 응답의
  `cleanupWarning`과 서버 로그로 남기며, 새 cover 등록 성공을 실패로 되돌리지 않는다.
- 삭제는 DB `thumbnail_url`을 먼저 비운 뒤 관리 R2 객체를 best-effort 삭제한다.
  외부 URL이나 Legacy 정적 URL은 R2 삭제 대상으로 취급하지 않는다.
- 관리 R2 key는 현재 실행 prefix와 공개 URL origin을 함께 확인한 경우에만 삭제한다.
  임의 외부 URL 삭제는 허용하지 않는다.

## 6. 이미지 규격

초기 기준:

- 목록 표시 비율: 16:9
- 권장 크기: 1280 × 720
- 허용 MIME: PNG, JPEG, WebP
- 업로드 최대 크기: 10MB
- 투명 PNG는 카드 배경 위에서 확인

Studio 시간표의 원본 캔버스가 16:9가 아니면 contain 또는 cover 정책을 관리자
미리보기에서 명확히 보여준다. 원본 문서를 임의로 변형하지 않는다.

## 7. UI 적용 범위

- 마이페이지 공용 카드
- 상점 목록
- 상점 상세
- 관리자 Template Hub 목록 또는 상품 편집 preview

모든 소비자는 2단계의 동일 resolver를 사용한다.

## 8. 실패와 복구 정책

- cover 없음 또는 로드 실패: 종류별 placeholder
- 업로드 실패: 템플릿 발행·사용자 실행과 분리되어 기존 cover/fallback 유지
- DB 갱신 실패: 신규 R2 객체 삭제를 시도하고 오류 응답
- 교체·삭제 후 이전 R2 정리 실패: `cleanupWarning`과 운영 cleanup 로그 대상
- 기존 외부 URL: 교체 시 외부 자산을 삭제하지 않고 새 관리 자산으로 대체

## 9. 관리자 UI와 소비자 적용

- 기존 상품 관리 화면에 Studio 시간표/썸네일 전용 대표 이미지 선택·미리보기·등록·교체·삭제
  UI를 추가했다.
- 권장 16:9, 1280×720 안내를 표시하지만 원본 문서나 캔버스를 변형하지 않는다.
- 상점 상세 `TemplateDetailContent`도 02단계의 동일 resolver와 종류별 placeholder를
  사용한다. Studio 템플릿에서 Legacy `/thumbnail/{id}.png`를 추측하지 않는다.
- React Query mutation 성공 시 관리자 목록·상세·Hub·상점·사용자 템플릿 query를
  invalidate한다.
- 발행본 기반 자동 생성이나 사용자 썸네일 결과 저장은 구현하지 않았다.

## 10. local DB + remote R2 격리 smoke workflow

이 단계의 실제 업로드 smoke는 local Supabase metadata와 원격 R2 test prefix를
분리해서 실행한다.

1. local Supabase를 시작하고 03 fixture를 local DB에만 생성한다.
2. 고유한 run id를 만든 뒤 `CATALOG_COVER_R2_PREFIX`를
   `uploads/catalog-covers/_test/<run-id>`로 설정한 상태에서 Next dev server를
   시작한다. 이 환경변수는 서버 route가 읽으므로 서버 시작 전에 주입해야 한다.
3. local fixture의 Studio timetable 또는 thumbnail 템플릿에서 업로드 → 교체 →
   삭제를 실행한다. DB 확인은 local Supabase에서만 수행한다.
4. cleanup은 먼저 dry-run으로 해당 run prefix 아래 객체만 확인한다.
5. 객체가 test prefix 밖에 없음을 확인한 뒤에만 같은 prefix로 `--apply` cleanup을
   실행한다. cleanup 도구는 Supabase를 import하거나 호출하지 않는다.

```text
# 예시: 실제 run id로 바꾸고, local Supabase 환경을 유지한 채 실행
CATALOG_COVER_R2_PREFIX=uploads/catalog-covers/_test/<run-id> npm run dev:local

# 별도 터미널: 기본 dry-run
CATALOG_COVER_R2_PREFIX=uploads/catalog-covers/_test/<run-id> \
  npm run cleanup:catalog-cover:test:r2

# 목록과 prefix를 다시 확인한 뒤에만 명시적 삭제
CATALOG_COVER_R2_PREFIX=uploads/catalog-covers/_test/<run-id> \
  npm run cleanup:catalog-cover:test:r2 -- --apply
```

`CATALOG_COVER_R2_PREFIX`가 없으면 catalog cover API는 production prefix를 사용하고,
cleanup 도구는 명시적 test prefix가 없으므로 실행을 거부한다. 따라서 cleanup
실수로 `uploads/catalog-covers/` 전체 또는 production cover를 삭제하는 경로를
허용하지 않는다.

## 11. 검증

- `check:user-template-ui:catalog-cover`: MIME/크기, managed key allowlist, 외부 URL 차단
- `check:user-template-ui:consumer`: 공용 resolver·카드 계약
- `npx tsc --noEmit`: PASS
- 대상 Prettier: PASS
- `git diff --check`: PASS
- `fixtures-03-create.sql`/`fixtures-03-cleanup.sql`: local `psql -v ON_ERROR_STOP=1` create·cleanup PASS,
  최종 `remaining_03_users=0`, `remaining_03_templates=0`, `remaining_03_team_rows=0,0,0,0`
- `npm run check:user-template-ui:my-page-browser`: local fixture 기준 loading/error/전체 empty/필터
  empty/runtime error 복귀 링크와 desktop/mobile/team-template smoke 통과. 강제 error 시나리오에서
  React Query retry를 모두 차단하도록 checker를 보완했다.
- 관리자 catalog-cover upload/replace/delete의 실제 browser·R2 smoke는 dev server와 R2 자격 증명이
  필요하므로 아직 실행하지 않았다.

## 12. 완료 조건

- [x] 관리자 업로드만으로 Studio 템플릿의 `thumbnail_url`을 등록할 수 있다.
- [x] cover 업로드 실패가 템플릿 발행이나 사용자 실행을 막지 않는다.
- [x] 교체·삭제 시 R2 orphan 정책이 정의된다.
- [x] 마이페이지와 상점이 동일한 cover resolver/URL을 표시한다.
- [x] cover가 없어도 기존 fallback이 유지된다.
- [x] 사용자 썸네일 결과와 catalog cover가 혼동되지 않는다.
- [x] 발행본 기반 자동 생성이 04단계 필수 범위에 포함되지 않았음이 UI와
      운영 문서에 명확하다.
