# 08. 원격 DB 최종 반영

상태: 최종 단계로 보류  
선행 조건: 07단계 로컬 출시 후보 승인

## 1. 목표

로컬에서 완성·검증된 schema와 사용자 UI 흐름을 원격 Supabase에 안전하게
반영한다.

이 단계는 UI 개발의 선행 조건이 아니다. 1~7단계가 완료되기 전에는 시작하지
않는다.

## 2. 현재 원격 기준점

2026-08-04 읽기 전용 확인 기준:

- 원격 마지막 migration: `20260518010000`
- `templates.template_engine` 없음
- `templates.template_kind` 없음
- `template_studio_documents` 없음
- `template_studio_user_states` 없음

실제 반영 직전에 다시 조회하고 이 문서의 기준점을 갱신한다. 과거 조회 결과만
믿고 migration을 적용하지 않는다.

## 3. 8.0 필수 원격 재감사

08단계를 시작하는 첫 작업은 migration 적용이 아니라 읽기 전용 재감사다.

재감사 결과에 포함할 항목:

- 원격 migration list와 로컬 차이
- `templates` 실제 컬럼과 제약
- Studio 관련 table·function·view 존재 여부
- 대상 table별 행 수와 최근 수정 시각
- 수동 DDL 또는 migration history 밖 변경 흔적
- 현재 배포된 앱 version과 Supabase key 사용 방식
- anon/authenticated의 table·function 권한
- v2 transitional data와 제거 가능 여부

재감사 결과가 2026-08-04 기준점과 다르면 migration 배치와 rollback 계획을 먼저
갱신한다. 재감사 기록이 승인되기 전에는 원격 쓰기 명령을 실행하지 않는다.

## 4. 반영 전 게이트

- 07단계 P0 0건
- 전체 로컬 migration 재현 성공
- 8.0 원격 재감사 완료와 결과 승인
- 대상 프로젝트 ref `ajlgjdwkjyayrnocdfpj` 확인
- `SB_TOKEN_TEMIS` 사용 확인
- 운영 데이터 백업 완료
- migration별 영향 행 수와 lock 위험 검토
- 보안 권한 회수 후 사용하는 모든 서버 API 확인
- 애플리케이션 배포와 schema 변경 순서 확정
- 사용자 명시 승인

## 5. migration 검토 배치

실제 migration은 파일 timestamp 순서를 바꾸지 않는다. 아래 배치는 검토,
백업, 승인과 smoke test의 의미 단위다.

| 배치                | migration                                                              | 의미                                             | 별도 확인                        |
| ------------------- | ---------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------- |
| A. 기반 DDL         | `20260705000000`, `20260707000000`, `20260709000000`, `20260715010000` | Studio 저장·asset, 공통 engine/status            | table 충돌, backfill 행 수       |
| B. 관계·권한 데이터 | `20260715020000`, `20260715040000`, `20260715050000`, `20260715060000` | Studio FK, entitlement, access 중복, 사용자 상태 | truncate/중복 삭제 백업, FK 고아 |
| C. 보안·구매 제약   | `20260715070000`, `20260715080000`, `20260715090000`                   | 직접 권한 회수, catalog write 차단, plan 검증    | 현재 배포 앱의 key 경계          |
| D. 파괴적 정리      | `20260715100000`, `20260716000000`                                     | v2 schema와 구 admin tab order 제거              | 실제 사용 데이터, 복구 불가 항목 |
| E. Hub 정합성       | `20260716010000`, `20260716020000`, `20260716030000`                   | 원자 mutation, unique, view                      | 중복 상품과 view 결과            |
| F. 종류 분류        | `20260802010000`                                                       | `template_kind`와 publish 검증                   | 기존 Studio timetable backfill   |

DROP이나 데이터 정리 migration은 CREATE/ALTER migration과 별도로 재검토한다.

## 6. 데이터 사전 감사

반영 전 최소 확인:

- `template_access` 중복 `(template_id, user_id)`
- 고아 `template_access`, `template_purchase_requests`
- plan과 template가 맞지 않는 구매 요청
- 중복 `shop_templates.template_id`
- `template_artists` 고아 관계
- v2 transitional table 실제 사용 데이터
- Studio table 이름 충돌 또는 수동 생성 흔적
- 사용자·관리자 id FK 유효성

감사 SQL과 결과 행 수를 이 문서 또는 별도 rollout 기록에 첨부한다.

## 7. 확정 배포 절차

원격 schema 전환 중 기존 앱과 신규 앱이 동시에 깨지지 않도록 bridge release를
먼저 준비한다.

```text
DB 백업
→ bridge release 배포(신규 UI 비활성, 구·신 schema 전환 대응)
→ migration dry-run과 최종 승인
→ migration을 timestamp 순서로 적용
→ 배치별 데이터·권한 확인
→ 최종 사용자 UI release 배포 또는 feature flag 활성화
→ smoke test
→ 모니터링
```

bridge release의 최소 책임:

- 신규 사용자 템플릿 UI를 feature flag로 비활성화
- migration 전 Legacy 마이페이지·상점 경로 유지
- migration 후 서버 API가 Secret key 경계로 동작할 준비
- migration 전후 health check 제공
- 최종 UI 활성화 전 새 컬럼·table 존재 확인

bridge release 없이 진행해야 한다면 승인된 maintenance window와 명확한
서비스 중단 공지를 대안으로 사용한다. 둘 중 어느 것도 준비되지 않은 상태에서는
원격 migration을 실행하지 않는다.

## 8. 원격 smoke test

- Legacy 시간표 기존 사용자 실행
- Studio 시간표 fixture 또는 승인된 파일럿 실행
- Studio 썸네일 파일럿 실행과 PNG 저장
- 구매 요청 생성
- 관리자 승인과 access 생성
- 마이페이지 3종 목록
- 작가 연결 목록
- 미권한 403
- draft/archived 미노출
- 상점 목록과 상품 상세
- anon key로 민감 테이블 직접 접근 거부

운영 데이터에 테스트 권한을 남기지 않도록 전용 파일럿 계정과 정리 절차를
사용한다.

## 9. rollback 원칙

- 배포 전 DB 백업 위치와 복구 책임자를 기록한다.
- 데이터 삭제 migration은 자동 rollback을 가정하지 않는다.
- 앱 rollback만으로 구 schema가 동작하는지 사전 확인한다.
- access 중복 정리처럼 비가역적인 변경은 삭제 대상 목록을 별도 백업한다.
- 권한 회수 후 장애가 발생해도 anon 직접 접근을 임시 복구하는 방식은 최후의
  수단으로만 사용한다. 서버 API 수정이 우선이다.

## 10. 완료 조건

- [ ] 8.0 원격 재감사 결과가 기록·승인됐다.
- [ ] migration이 의미 단위 배치로 검토됐고 timestamp 순서가 보존됐다.
- [ ] bridge release 또는 승인된 maintenance window가 준비됐다.
- [ ] 사용자 명시 승인 후 원격 migration이 적용됐다.
- [ ] local/remote migration list가 일치한다.
- [ ] 원격 smoke test가 세 템플릿 종류에서 통과한다.
- [ ] 기존 Legacy 사용자의 회귀가 없다.
- [ ] 민감 테이블의 직접 anon/authenticated 접근이 거부된다.
- [ ] 오류율과 구매·승인 실패를 모니터링할 수 있다.
- [ ] 백업과 rollback 기록이 보존된다.
