# 01단계 수동·후속 검증 목록

01단계에서 자동화된 범위와 다음 단계에서 별도 확인할 범위를 분리한다.

## 01단계에서 완료한 자동 검증

- disposable local DB에서 `supabase db reset --local --no-seed --yes` 실행
- 빈 DB 전체 migration 적용
- schema/RPC, fixture, 목록, entitlement, runtime, 구매 승인 aggregate 검증
- 구매 plan checker 사용자·템플릿 cleanup 사후 확인
- 원격 Supabase 미접속

사후 read-only 결과:

```text
plan_check_user=0
plan_check_templates=0
```

## 아직 별도 확인이 필요한 항목

1. **브라우저 기반 UI/E2E**
   - 01단계 checker는 route handler와 local DB를 검증한다.
   - 마이페이지 카드, 실제 클릭 이동, 모바일 layout, 이미지 fallback은 02~04단계와 07단계 범위다.
2. **실제 정적 이미지 파일의 로딩**
   - response의 `thumbnail_url` 필드와 빈 값 계약만 확인했다.
   - 관리자 업로드와 종류별 placeholder는 04단계에서 검증한다.
3. **Legacy 동적 실행 route**
   - `getTemplateUseHref()`의 `/time-table/{id}` 계약은 확인했지만, 임의 canonical UUID를 받는 일반 dynamic route의 존재 여부는 03단계 전에 확정한다.
4. **원격 migration 상태**
   - 원격 Supabase는 의도적으로 읽지 않았다. 원격 반영은 08단계에서 별도 승인 후 검토한다.

## 자동화로 대체된 수동 절차

- SQL로 user/template/access를 직접 조작하는 대신 `check:user-template-ui:baseline`이 deterministic fixture를 만들고 정리한다.
- 브라우저 Console 호출 대신 route handler에 같은 URL/query/header/body를 전달한다.
- approval UI 대신 canonical RPC를 직접 호출해 transaction/idempotency를 확인한다.

## 후속 작업자가 확인할 명령

```bash
npm run check:user-template-ui:schema
npm run check:user-template-ui:baseline
npm run check:template-entitlement
npm run check:template-studio:runtime
npm run check:thumbnail-studio:runtime
npm run check:thumbnail-studio:integration
npm run check:purchase-plan-validation
```

이 목록은 01단계 결과를 부정하는 것이 아니라, DB/API 기준선 밖의 UI·remote 검증을
의도적으로 다음 단계 경계로 남긴 것이다.
