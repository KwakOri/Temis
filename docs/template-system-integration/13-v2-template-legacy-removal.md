# 13. 과도기 `v2-template` 시스템 제거 검토

최종 수정: 2026-07-15

상태: 검토 완료, 제거 작업 진행 중

## 목적

`legacy-studio-operating-model.md`가 운영 제외·폐기 대상으로 분류한 과도기
`v2-template` 시스템(`/v2-template`, `/api/v2/*`, `/api/admin/v2/*`,
`v2_templates` 계열)을 실제로 제거하기 전에, Legacy와 Studio 두 운영 시스템에
영향이 없는지 코드·DB 양쪽에서 확인한다.

## 결론

`v2-template` 시스템은 코드·DB 양쪽에서 거의 완전히 격리되어 있어 제거 자체는
안전하다. 유일한 예외는 `src/types/time-table/` 디렉토리로, 이 안의 일부
파일은 Legacy 템플릿 수백 개가 실제로 공유해서 쓰고 있으므로 디렉토리 단위가
아니라 파일 단위로 분리해서 다뤄야 한다.

## 격리 확인 결과

### DB

`v2_templates`는 `templates`와 FK로 연결되지 않은 완전 독립 루트다. 자식
테이블 3개(`v2_template_render_configs`, `_revisions`, `_drafts`)도 전부
`v2_templates(id)`만 참조하며, `shop_templates` / `template_access` /
`template_purchase_requests` / Studio 테이블(`template_studio_*`) 중 어느
것도 `v2_templates`를 참조하지 않는다.

```sql
-- supabase/migrations/20260414000200_create_v2_template_schema.sql
v2_templates (독립 root, templates 미참조)
├── v2_template_render_configs      (template_id → v2_templates.id)
├── v2_template_render_config_revisions
└── v2_template_render_config_drafts
```

v2 관련 migration은 2개뿐이다.

- [`20260414000200_create_v2_template_schema.sql`](../../supabase/migrations/20260414000200_create_v2_template_schema.sql)
- [`20260427000100_allow_duplicate_v2_template_names.sql`](../../supabase/migrations/20260427000100_allow_duplicate_v2_template_names.sql)

**보안 참고**: v2 테이블에는 RLS가 적용된 적이 없고, 9~11단계에서 진행한 anon
권한 축소 작업(`REVOKE ... FROM PUBLIC, anon, authenticated`)도 v2 테이블은
대상으로 삼지 않았다. 제거 전까지는 anon key로 접근 가능한 잠재 위험이 남아
있다는 뜻이다. 이번 제거 작업으로 테이블 자체가 사라지므로 별도 REVOKE
migration은 만들지 않는다.

### 라우트

`/v2-template/*`, `/admin/template-editor/*`(v2 전용 admin 편집기),
`/template-editor`(`/admin/template-editor`로 보내는 redirect shim) 모두
admin nav·sidebar 어디에도 링크되어 있지 않다. URL을 직접 입력해야만 접근
가능한 완전 orphan 상태다.

```ts
// src/app/(root)/template-editor/page.tsx
redirect('/admin/template-editor'); // 어디서도 링크되지 않음
```

### 코드 경계

`src/utils/v2/`, `src/hooks/v2/`, `src/contexts/v2/`, `src/lib/v2/`,
`src/services/v2_*`, `src/services/admin/v2_*`를 이 경로 바깥에서 import하는
곳은 `src/app/(root)/admin/template-editor/**`(그 자체가 v2 admin UI) 뿐이다.
Legacy나 Studio 코드는 이 경로들을 전혀 참조하지 않는다.

### 이름 함정: "v2"가 붙었지만 Studio 소속인 것

`scripts/check-template-studio-runtime-v2-ui.tsx`와 npm script
`check:template-studio:runtime-v2-ui`는 이름에 "v2"가 있지만 실제로는
**Template Studio runtime UI의 두 번째 버전**을 검증하는 스크립트로,
`v2_templates`와 무관하다. import 대상이 전부
`src/app/(root)/template-studio/**`, `src/utils/template-studio/**`임을 직접
확인했다. **제거 대상이 아니다.**

## 유일한 예외: `src/types/time-table/`

이 디렉토리는 Legacy 템플릿(`/time-table-tester`, `/team-time-table/{id}` 등)의
핵심 타입 정의 위치인데, v2-template 시스템의 `tsconfig.v2-runtime.json`이 그
중 일부 파일을 함께 include하고 있다. 파일별 실제 import 현황을 grep으로 전수
확인한 결과는 다음과 같다.

| 파일 | Legacy import 수 | v2 import 수 | 판정 |
| --- | --- | --- | --- |
| `data.ts` | 463 | 14 | **제거 금지** — Legacy 핵심 타입 |
| `theme.ts` | 543 | 8 | **제거 금지** |
| `image.ts` | 91 | 1 | **제거 금지** |
| `template-data.ts` | 1 | 0 | Legacy 전용, 대상 아님 |
| `template-render-config.ts` | 0 | 83 | 제거 가능 |
| `template-editor-ui.ts` | 0 | 16 | 제거 가능 |
| `template-runtime-ui.ts` | 0 | 2 | 제거 가능 |
| `template-creation.ts` | 0 | 2 | 제거 가능 |

앞 3개 파일(`data.ts`/`theme.ts`/`image.ts`)은 Legacy 템플릿 수백 개가 직접
import하므로 여기서 하나라도 지우면 Legacy 전체가 깨진다. v2 쪽은 이 shared
타입을 빌려 쓰는 입장이었을 뿐이다. 뒤 4개 파일은 v2 전용이므로 제거해도
Legacy·Studio에 영향이 없다.

## 제거 대상 인벤토리

1. **Frontend 라우트**: `src/app/(root)/v2-template/**`,
   `src/app/(root)/admin/template-editor/**`,
   `src/app/(root)/template-editor/page.tsx`
2. **API 라우트**: `src/app/api/v2/**`, `src/app/api/admin/v2/**`
3. **격리된 지원 코드**: `src/utils/v2/**`, `src/hooks/v2/**`,
   `src/contexts/v2/**`, `src/lib/v2/**`, `src/services/v2_template_service.ts`,
   `src/services/v2_template_render_config_service.ts`,
   `src/services/admin/v2_template_asset_service.ts`,
   `src/services/admin/v2_template_render_config_service.ts`,
   `src/hooks/query/useV2Templates.ts`,
   `src/hooks/query/useV2TemplateRenderConfig.ts`,
   `src/hooks/query/useAdminV2TemplateRenderConfig.ts`
4. **`src/types/time-table/`의 v2 전용 4개 파일만** (위 표 참고,
   `data.ts`/`theme.ts`/`image.ts`/`template-data.ts`는 제외)
5. **Scripts**: `scripts/import-v2-template-from-figma.ts`,
   `scripts/import-v2-template-from-figma-v2.ts`,
   `scripts/cleanup-v2-r2-orphans.ts`, `scripts/check-v2-orderkey.ts`
6. **`package.json`**: `import:v2:figma`, `import:v2:figma:v2`,
   `cleanup:v2:r2-orphans`, `lint:v2-runtime`, `typecheck:v2-runtime`,
   `check:v2-runtime`, `check:v2-orderkey`
7. **`tsconfig.v2-runtime.json`**
8. **DB**: `v2_templates`, `v2_template_render_configs`,
   `v2_template_render_config_revisions`, `v2_template_render_config_drafts`와
   관련 trigger 함수 2개 — 신규 DROP migration (로컬 검증 후 원격은 사용자가
   직접 적용)
9. **R2**: 테이블·코드를 지우기 전에 먼저
   `npm run cleanup:v2:r2-orphans -- --apply`로 남은 object를 정리한다.

## 권장 순서

1. `v2_templates` 최근 데이터 유무 read-only 점검 (실사용 흔적 있는지 확인)
2. R2 orphan 정리 먼저 실행 (앱 코드가 살아있을 때 참조 스캔이 가능하므로)
3. 프론트/API/격리 유틸 코드 삭제 → `tsc --noEmit`/ESLint로 즉시 검증
4. `package.json` / `tsconfig.v2-runtime.json` 정리
5. 로컬 DB DROP migration 작성 → `supabase db reset --local`로 빈 DB부터
   재현 검증
6. `src/types/supabase.ts`에서 v2 테이블 타입만 제거 (원격에는 아직 테이블이
   남아 있으므로 remote 대상 `gen:types`를 그대로 실행하면 안 됨)
7. 기존 회귀 스크립트 재실행 (`check:template-studio:*`, `check:pilot-e2e`,
   `check:personalized-template-flow` 등)로 Legacy·Studio 영향 없음을 재확인
8. `npm run build` 성공 확인
9. 원격 migration 적용과 원격 R2 정리는 사용자가 직접 수행한다

## 완료 기준

- [ ] 코드에서 `v2-template`/`v2_template` 참조가 인벤토리 목록 밖에는 남지
      않는다 (Studio의 `runtime-v2-ui` 관련은 예외).
- [ ] `src/types/time-table/data.ts`/`theme.ts`/`image.ts`/`template-data.ts`는
      수정하지 않는다.
- [ ] 로컬 DB에서 v2 테이블 DROP migration이 빈 DB부터 재현된다.
- [ ] `tsc --noEmit`, ESLint, `npm run build`가 통과한다.
- [ ] Legacy(`time-table-tester`, `team-time-table/*`)와 Studio 관련 회귀
      스크립트가 모두 그대로 통과한다.
- [ ] 원격 DB·R2 반영은 사용자가 직접 수행한다.
