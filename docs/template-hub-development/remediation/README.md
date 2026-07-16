# Template Hub 1~5단계 코드 점검 후속 수정사항

- 점검일: 2026-07-16
- 대상 브랜치: `features/template-system`
- 상태: 수정 계획 정리 완료, 구현 전

## 목적

Template Hub 1~5단계 구현을 코드·스키마·테스트·빌드·CI 기준으로 점검한 결과를
후속 수정 단위로 분리한다. 각 문서는 하나의 문제만 다루며, 수정 범위와 완료
조건을 독립적으로 검토하고 커밋할 수 있도록 작성했다.

이 문서들은 문제와 권장 수정 방향을 기록한 것이며, 아직 실제 수정이 반영됐다는
의미는 아니다. 원격 DB 변경은 별도 사용자 승인 없이 실행하지 않는다.

## 수정사항 목록

| 번호 | 우선순위 | 수정사항 | 현재 상태 |
| --- | --- | --- | --- |
| 01 | P1 | [판매 상태 변경의 원자성 보장](./01-atomic-sale-mutations.md) | 미수정 |
| 02 | P1 | [중단된 CI 복구와 Hub 검증 등록](./02-ci-and-hub-regression.md) | 미수정 |
| 03 | P2 | [readiness 필터 1,000건 상한 제거](./03-readiness-filter-pagination.md) | 미수정 |
| 04 | P2 | [비활성 미리보기 링크의 키보드 접근 차단](./04-disabled-preview-accessibility.md) | 미수정 |
| 05 | P2 | [API 테스트 fixture의 실패 안전 정리](./05-fixture-cleanup-safety.md) | 미수정 |
| 06 | P2 | [템플릿당 상품 1개 불변식 보장](./06-shop-template-uniqueness.md) | 미수정 |

## 권장 처리 순서

```text
01 원자성 보장
→ 02 CI 복구
→ 06 DB 중복 방지
→ 03 대용량 필터 정합성
→ 04 접근성
→ 05 테스트 정리 안전성
```

01과 06은 DB 불변식에 영향을 주므로 먼저 설계하되, migration을 원격에 적용하는
작업은 코드 작성·로컬 검증과 분리한다. 02에서는 나머지 수정이 다시 깨지지 않게
Hub 검증 명령을 CI에 고정한다.

## 공통 완료 기준

- 수정사항별 문서의 완료 조건과 검증 항목을 모두 충족한다.
- `npx tsc --noEmit --pretty false --incremental false`가 통과한다.
- 변경 파일 ESLint가 통과한다.
- `npm run check:template-hub:sale-readiness`가 별도 DB 환경 없이 통과한다.
- 로컬 Supabase에서 `npm run check:template-hub:api`가 통과하고 fixture가 남지 않는다.
- 필요한 환경변수를 주입한 `npm run build`가 통과한다.
- 기존 `/admin/templates`와 `/admin/template-studio` 동작을 변경하지 않는다.
- 원격 Supabase에는 사용자 명시 승인 없이 migration을 적용하지 않는다.
