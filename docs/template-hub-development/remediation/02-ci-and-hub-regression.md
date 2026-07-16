# 02. 중단된 CI 복구와 Hub 검증 등록

- 우선순위: P1
- 상태: 미수정
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
