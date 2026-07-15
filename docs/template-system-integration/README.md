# 템플릿 시스템 통합 개발 개요

최종 수정: 2026-07-15

## 목표

기존 `templates`를 모든 템플릿의 공통 식별자이자 비즈니스 루트로 사용한다.
레거시 템플릿과 Template Studio 템플릿은 제작·렌더 엔진만 구분하고, 판매,
구매, 사용자 이용 권한, 작가 연결은 기존 시스템을 함께 사용한다.

```text
templates
├── template_access
├── template_purchase_requests
├── template_artists
├── shop_templates
├── legacy render data
└── template_studio_documents / revisions / drafts / assets
```

## 확정한 데이터 의미

| 데이터 | 의미 |
| --- | --- |
| `templates.template_engine` | `legacy` 또는 `studio` 제작·렌더 엔진 |
| `templates.status` | `draft`, `published`, `archived` 발행 상태 |
| `templates.is_public` | 일반 판매 상품인지 개인 맞춤 상품인지 나타내는 상품 분류 |
| `shop_templates.is_shop_visible` | 상점 목록 노출 여부 |
| `template_access` | 사용자가 실제 템플릿을 이용할 수 있는 권한 |
| `template_artists` | 작가 본인의 템플릿 이용·관리 연결 |

`is_public = true`는 무료 또는 무권한 이용을 뜻하지 않는다. 이용 가능 여부는
관리자, `template_access`, 연결 작가 여부로 판정한다. 향후 무료 배포가 필요하면
`access_mode` 같은 별도 필드를 추가한다.

## 로컬 우선 개발 원칙

- 원격 Supabase 프로젝트 ref는 `ajlgjdwkjyayrnocdfpj`이다.
- 원격 DB는 기준 데이터 조회와 로컬 복제에만 사용한다.
- 개발 마이그레이션은 로컬 DB에만 적용한다.
- 원격 `db push`, migration repair, rollback은 이 작업에서 실행하지 않는다.
- 모든 개발과 로컬 검증이 끝난 뒤 원격 반영은 사용자가 직접 수행한다.
- RLS를 권한 시스템의 핵심으로 사용하지 않는다. 브라우저의 직접 DB 접근을
  제거하고 서버 API에서 인증·권한을 판정한 뒤 DB 권한을 축소한다.

## 2026-07-15 개발 기준점

- 작업 전 커밋: `2ace7e92`
- 원격 마지막 마이그레이션: `20260518010000`
- 저장소에만 있는 Studio 마이그레이션:
  - `20260705000000`
  - `20260707000000`
  - `20260709000000`
- 원격 데이터를 로컬에 복제한 뒤 확인한 주요 건수:
  - `templates`: 81
  - `users`: 370
  - `template_access`: 155
  - `template_purchase_requests`: 57
  - `shop_templates`: 10
- 원격 Storage 객체는 없었으며 DB 메타데이터만 복제 대상이다.

복제 덤프는 저장소 밖의 제한된 임시 파일로 만들고, 복원 후 삭제한다. 운영
데이터 또는 비밀정보를 커밋하지 않는다.

## 단계별 문서

1. [Preview/API 보안 정비](./01-preview-api-security.md)
2. [`templates` 공통 루트 컬럼](./02-unified-template-root-schema.md)
3. [Studio 부모 테이블 제거와 FK 통합](./03-studio-schema-relink.md)
4. [Studio persistence 서비스 전환](./04-studio-persistence-service.md)
5. [이용 권한 의미 통합](./05-entitlement-semantics.md)
6. [구매·권한 데이터 정합성](./06-purchase-access-reconciliation.md)
7. [관리자·상점·마이페이지 통합](./07-admin-shop-my-page-integration.md)
8. [사용자별 Studio 실행 상태](./08-user-runtime-state.md)
9. [직접 DB 접근 축소](./09-direct-db-access-hardening.md)
10. [파일럿 E2E와 배포 준비](./10-pilot-e2e-rollout.md)

단계는 번호 순서로 진행한다. 1~3단계는 이번 작업 범위이고, 4단계부터는 후속
작업이다.

## 진행 상태

| 단계 | 상태 | 완료일 |
| --- | --- | --- |
| 1. Preview/API 보안 | 완료 | 2026-07-15 |
| 2. 공통 루트 컬럼 | 완료 | 2026-07-15 |
| 3. Studio FK 통합 | 완료 | 2026-07-15 |
| 4~10 | 대기 | - |

1~3단계 검증 결과:

- 원격 복제 데이터에 pending migration 적용 성공
- 빈 로컬 DB에서 전체 `supabase db reset --local --no-seed` 성공
- 원격 public 데이터 재복원 및 기준 건수 일치
- Template Studio persistence/API smoke check 성공
- preview API의 미인증 `401`, 일반 사용자 `403`, 관리자 성공 사례 확인
- `tsc --noEmit` 및 변경 파일 ESLint 성공
- production build는 컴파일·타입 검사까지 성공했으나 `/admin` prerender의 번들
  런타임 오류로 최종 완료되지 않았다. 이 관리자 빌드 문제는 별도 진단 대상으로
  남긴다.

## 전체 완료 기준

- 레거시와 Studio 템플릿이 `templates.id` 하나로 판매·권한과 연결된다.
- `is_public` 값이 이용 권한을 우회하지 않는다.
- Studio 문서와 사용자 입력은 인증된 서버 API를 통해서만 읽고 쓴다.
- 사용자 A의 저장값을 사용자 B가 조회하거나 수정할 수 없다.
- 일반 판매, 개인 맞춤, 작가, 관리자, 미구매 사용자 시나리오가 E2E로 검증된다.
- 모든 신규 마이그레이션이 원격 복제 데이터가 있는 로컬 DB에서 처음부터
  재현된다.
