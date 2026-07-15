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
11. [1~10단계 구현 검토와 후속 보완 항목](./11-implementation-review-remediation.md)
12. [사용자 runtime 이미지 브라우저 로컬 저장 계획](./12-user-runtime-browser-image-storage.md)
13. [과도기 `v2-template` 시스템 제거 검토](./13-v2-template-legacy-removal.md)

1~10단계는 번호 순서로 진행한 구현 문서이며, 11단계는 구현 완료 후 발견한
보완 항목과 현재 처리·보류 상태를 기록한 검토 문서다. 12단계는 이연했던 사용자
runtime 이미지의 crop 처리 결과를 서버에 보내지 않고 브라우저 IndexedDB에만
저장하는 후속 개발 계획이다. 13단계는 운영 제외 대상인 과도기 `v2-template`
시스템을 Legacy·Studio에 영향 없이 제거하기 위한 격리 검토와 제거 순서다.

## 운영 참고 문서

- [Legacy·Studio 템플릿 운영 모델](./legacy-studio-operating-model.md)
  - 기존 템플릿과 새 Studio(v2) 템플릿의 구분, 공통 판매·권한 구조, 엔진별
    제작·실행 경로를 설명한다.
  - 과도기 `/v2-template` 시스템은 운영 대상에서 제외하고 별도 폐기 대상으로
    분류한다.

## 진행 상태

| 단계 | 상태 | 완료일 |
| --- | --- | --- |
| 1. Preview/API 보안 | 완료 | 2026-07-15 |
| 2. 공통 루트 컬럼 | 완료 | 2026-07-15 |
| 3. Studio FK 통합 | 완료 | 2026-07-15 |
| 4. Studio persistence 서비스 전환 | 완료 | 2026-07-15 |
| 5. 이용 권한 의미 통합 | 완료 | 2026-07-15 |
| 6. 구매·권한 데이터 정합성 | 완료 | 2026-07-15 |
| 7. 관리자·상점·마이페이지 통합 | 완료 | 2026-07-15 |
| 8. 사용자별 Studio 실행 상태 | 완료 | 2026-07-15 |
| 9. 브라우저 직접 DB 접근 축소 | 완료(우선 대상 범위) | 2026-07-15 |
| 10. 파일럿 E2E와 배포 준비 | 완료(로컬 검증) | 2026-07-15 |
| 11. 구현 검토와 후속 보완 | P0/P1/P2 해결 완료(우선 대상 범위) | 2026-07-15 |
| 12. 사용자 runtime 이미지 브라우저 저장 | 핵심 구현 완료(실제 브라우저 E2E 미실시) | 2026-07-15 |
| 13. 과도기 v2-template 제거 | 로컬 제거 완료(원격 반영은 사용자가 직접) | 2026-07-16 |

1~3단계 검증 결과:

- 원격 복제 데이터에 pending migration 적용 성공
- 빈 로컬 DB에서 전체 `supabase db reset --local --no-seed` 성공
- 원격 public 데이터 재복원 및 기준 건수 일치
- Template Studio persistence/API smoke check 성공
- preview API의 미인증 `401`, 일반 사용자 `403`, 관리자 성공 사례 확인
- `tsc --noEmit` 및 변경 파일 ESLint 성공
- 최초 검토에서 production build가 `/admin` prerender 오류로 실패했으나 이후
  별도 작업에서 해결했다.

## 전체 완료 기준

- [x] 레거시와 Studio 템플릿이 `templates.id` 하나로 판매·권한과 연결된다.
- [x] `is_public` 값이 이용 권한을 우회하지 않는다.
- [x] Studio 문서와 사용자 입력은 인증된 서버 API를 통해서만 읽고 쓴다.
- [x] 사용자 A의 저장값을 사용자 B가 조회하거나 수정할 수 없다.
- [x] 일반 판매, 개인 맞춤, 작가, 관리자, 미구매 사용자 시나리오가
      통합 테스트(route handler 직접 호출, `check:pilot-e2e` +
      `check:personalized-template-flow`)로 검증된다. 실제 브라우저 E2E는
      별도 작업으로 이연.
- [x] 모든 신규 마이그레이션이 원격 복제 데이터가 있는 로컬 DB에서 처음부터
      재현된다.
- [x] anon key로 entitlement 구성 테이블(`templates`/`shop_templates`/
      `template_plans`/`artists`/`template_artists`)을 변조할 수 없다.
- [x] 구매 요청·승인에서 plan-template 관계가 항상 일치한다.

10단계 문서(`10-pilot-e2e-rollout.md`)에 원격 반영 전 산출물(적용 migration
순서, 데이터 점검 SQL, rollback 전략, smoke test 체크리스트, 모니터링
항목)을 정리했다. **원격 migration 적용과 운영 데이터 변경은 사용자가 직접
수행한다** — 이 초기화 작업 전체에서 원격 DB는 조회 목적으로만 사용했고
한 번도 변경하지 않았다.

구현 완료 후 재검토에서 anon 권한 우회, 구매 plan-template 관계 검증 누락,
Studio runtime payload·R2 수명주기, production build와 E2E 범위 문제를 확인했고,
이번에 전부 우선 대상 범위로 해결했다(신규 migration
`20260715080000`/`20260715090000`, 신규 검증 스크립트 5개). Publishable/Secret
key 전환과 앱 전체 API·DB 권한 전수 개편, 실제 브라우저 E2E는 별도 작업으로
이연했다. 사용자 runtime 이미지는 R2·DB에 보관하지 않고 crop 처리 PNG Blob만
동일 브라우저의 IndexedDB에 저장한다. source file은 폐기하며, 선택 파일과 처리
결과에는 각각 최대 20 MiB를 적용한다. 상세 내용은
`11-implementation-review-remediation.md`와
`12-user-runtime-browser-image-storage.md`를 따른다.
