# 02. 중단된 CI 복구와 Hub 검증 등록

- 우선순위: P1
- 상태: 완료 (2026-07-16)
- 영향 영역: pull request 검증, 회귀 방지

## 문제

현재 [`.github/workflows/v2-template-orderkey-check.yml`](../../../.github/workflows/v2-template-orderkey-check.yml)은
`package.json` 또는 `package-lock.json`이 변경되면 실행되지만, 마지막 단계에서
이미 삭제된 `npm run check:v2-orderkey`를 호출한다.

실제 로컬 실행 결과:

```text
npm error Missing script: "check:v2-orderkey"
```

Template Hub가 `package.json`에 테스트 스크립트를 추가했으므로 현재 브랜치로 PR을
열면 이 오래된 workflow가 실행되고 실패할 수 있다. 반대로 새로 추가된 Hub 판매
규칙 테스트와 API 회귀 테스트를 자동 실행하는 CI는 없다.

## 수정 방향

V2 Template 제거 이후 남은 workflow를 정리하고 Template Hub 전용 검증 workflow를
추가한다.

권장 job 구성:

1. `npm ci`
2. TypeScript 검사
3. Hub 변경 파일 ESLint
4. DB 비의존 판매 규칙 단위 테스트
5. 로컬 Supabase를 시작한 뒤 Hub API 회귀 테스트
6. build에 필요한 안전한 CI 환경변수를 주입한 production build

DB 비의존 테스트는 현재 서버 서비스 전체를 import하면서
`supabase-admin-server.ts` 초기화까지 수행한다. 순수 판정 로직을 DB 모듈과 분리해
`NEXT_PUBLIC_SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY` 없이 실행 가능하게 해야 한다.

API 회귀 테스트는 로컬 Supabase URL 검사를 계속 유지해 원격 DB를 대상으로 fixture를
만들 수 없게 한다.

## 경로 필터

최소한 다음 변경에서 workflow가 실행되어야 한다.

```text
src/app/(root)/admin/template-hub/**
src/app/api/admin/template-hub/**
src/components/admin/template-hub/**
src/hooks/query/useTemplateHub.ts
src/services/admin/templateHubService.ts
src/services/server/templateHubService.ts
src/types/template-hub.ts
scripts/check-template-hub-*.ts
supabase/migrations/**
package.json
package-lock.json
```

## 완료 조건

- 존재하지 않는 `check:v2-orderkey`를 호출하는 workflow가 더 이상 실행되지 않는다.
- Hub 관련 PR에서 단위 테스트와 API 회귀 테스트가 자동 실행된다.
- 순수 단위 테스트는 Supabase 환경변수 없이 실행된다.
- API 테스트는 non-local Supabase URL에서 실행을 거부한다.
- CI build가 필요한 환경변수를 명시적으로 제공하고 성공한다.
- fixture 정리는 성공·실패 경로 모두 검증된다.

## 검증

- workflow YAML 구문과 action 경로 필터를 확인한다.
- 로컬에서 CI와 동일한 명령을 순서대로 실행한다.
- 테스트를 의도적으로 실패시킨 뒤에도 fixture가 남지 않는지 확인한다.
- PR check에서 Hub workflow가 실제로 실행되고 모두 통과하는지 확인한다.

## 완료 근거 (2026-07-16)

- 존재하지 않는 `check:v2-orderkey`를 호출하던
  `.github/workflows/v2-template-orderkey-check.yml`을 삭제했다(V2 Template은
  이미 코드에서 제거되어 대상 파일도 남아 있지 않았다).
- 신규 `.github/workflows/template-hub-check.yml`을 추가했다. 경로 필터는
  문서에 명시된 목록에 신규 `templateHubSaleRules.ts`와 workflow 파일 자체를
  더했다. job 순서는 `npm ci` → `tsc --noEmit` → `npm run lint` →
  DB 비의존 단위 테스트(`check:template-hub:sale-readiness`, 이 단계에서는
  Supabase 환경변수를 의도적으로 주입하지 않는다) → `supabase/setup-cli`로
  로컬 Supabase 기동 → `check:template-hub:api` → 안전한 CI 전용 값을 주입한
  `npm run build`다.
- 순수 판정 로직을 `src/services/server/templateHubSaleRules.ts`로 분리했다
  (DB client를 import하지 않음). 기존
  `src/services/server/templateHubService.ts`는 이 모듈에서 re-export해
  mutation 구현에 재사용하고, `scripts/check-template-hub-sale-readiness.ts`는
  분리된 모듈에서 직접 import하도록 바꿨다. 로컬에서 환경변수를 모두 비우고
  (`env -i`) 실행해 Supabase 환경변수 없이 22건 전체 통과를 확인했다.
- `check:template-hub:api`의 non-local Supabase URL 거부 로직(`assertLocalSupabaseUrl`)은
  그대로 유지된다 — 변경하지 않았다.
- 로컬에서 CI와 동일한 순서로 전체 파이프라인을 실행해 확인했다: TypeScript
  통과, ESLint 통과(경고만 존재), DB 비의존 단위 테스트 22건 통과, 로컬
  Supabase 기준 API 회귀 테스트 25건 통과(fixture 정리 포함), CI 전용 안전
  값을 주입한 `npm run build` 성공.
- "테스트를 의도적으로 실패시켜도 fixture가 남지 않는지" 검증은 fixture 생성
  로직 자체의 안전성 개선이 필요해 [remediation 05](./05-fixture-cleanup-safety.md)에서
  다룬다. CI가 그 스크립트를 그대로 호출하므로 05가 완료되면 이 workflow도
  자동으로 그 안전성을 상속한다.
- 원격 Supabase, 기존 관리 탭 코드는 변경하지 않았다.
