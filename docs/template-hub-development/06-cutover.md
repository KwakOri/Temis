# 06. 정식 전환

상태: 보류  
선행 단계: 05. Beta 등록과 병행 검증  
실행 조건: 개발 안정화와 사용자 승인

## 1. 목표

검증된 Hub를 정식 템플릿 관리 진입점으로 전환한다.

이 단계는 1~5단계와 같은 개발 PR에 포함하지 않는다. `dev` 병합이 안정되고
Beta 검증 결과를 사용자와 확인한 뒤 별도 PR로 진행한다.

## 2. 전환 전 필수 결정

| 항목 | 선택지 |
| --- | --- |
| 정식 표시명 | 템플릿 관리 / Template Hub / 기타 |
| 정식 URL | `/admin/template-hub` 유지 / `/admin/templates`로 전환 |
| Legacy 신규 생성 | 유지 / 중단 |
| 기존 Template Studio 목록 | 유지 / Hub로 redirect |
| 기존 템플릿 관리 목록 | 유지 / Hub로 redirect |
| 관찰 기간 | 배포 후 정한 기간 |

결정되지 않은 항목을 코드에서 임의로 확정하지 않는다.

## 3. 전환 진입 조건

- 05단계 완료 조건 충족
- 목록·상태 불일치 0건 또는 승인된 예외만 존재
- 일반 판매와 맞춤 제작 브라우저 시나리오 통과
- 판매 시작·중지 오류율 확인
- 운영자가 Hub만으로 주요 업무 수행 가능
- rollback 절차 검토 완료

## 4. 권장 전환 순서

### 1차: 사이드바 기본 진입 변경

- Hub의 Beta 표기 제거
- 정식 표시명 반영
- 기존 두 탭을 사이드바에서만 숨김
- 기존 route와 컴포넌트는 유지

### 2차: 관찰

- 기존 URL 직접 접근을 fallback으로 유지
- 목록 조회 실패와 mutation 오류 모니터링
- 상점 노출·구매 요청·권한 승인 회귀 확인
- 운영자 피드백 수집

### 3차: redirect

관찰 기간 이후 필요하면 기존 목록 URL만 Hub로 redirect한다.

- `/admin/templates`
- `/admin/template-studio`

Studio의 생성·편집·미리보기 하위 route는 redirect하지 않는다.

## 5. rollback

전환 PR은 데이터 migration 없이 UI 진입점만 변경하는 것을 원칙으로 한다.

문제가 발생하면:

1. 기존 두 탭을 사이드바에 다시 노출
2. 기존 root redirect 제거
3. Hub Beta 표기 복원
4. 기존 route로 운영 복귀

Hub mutation이 canonical 테이블을 사용하므로 rollback 시 데이터 변환은 하지
않는다.

## 6. 검증

- 사이드바 활성 탭 표시
- 직접 URL과 redirect
- Studio 생성·편집·미리보기 route 보존
- Legacy 실행 route 보존
- 브라우저 뒤로가기·북마크
- 관리자 권한 없는 사용자 접근 거부
- 배포 후 상점·구매·사용자 실행 smoke test

## 7. 완료 조건

- Hub가 정식 사이드바 진입점
- 기존 두 목록은 사이드바에서 숨김
- fallback 기간 동안 기존 route 유지
- rollback 가능한 상태
- 운영 관찰 결과 기록
- 07단계 정리 대상 목록 확정

