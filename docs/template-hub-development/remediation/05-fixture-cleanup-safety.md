# 05. API 테스트 fixture의 실패 안전 정리

- 우선순위: P2
- 상태: 미수정
- 영향 영역: `check:template-hub:api`, 로컬 복제 DB 청결성

## 문제

`createFixtures()`는 내부 로컬 변수에 생성된 템플릿 ID를 기록하고 모든 fixture가
성공한 뒤에만 그 객체를 반환한다. 호출부는 반환값을 받은 다음 외부 `fixtures`에
할당한다.

fixture 5개 중 2번째 이후 insert가 실패하면 다음 상태가 된다.

```text
DB: 앞에서 생성된 fixture가 존재
createFixtures(): reject
호출부 fixtures: 여전히 빈 객체
finally: 삭제할 ID가 없다고 판단
```

결과적으로 실패한 테스트가 로컬 복제 DB에 `[hub-qa]` 데이터를 남길 수 있다.
이후 목록 count와 다른 테스트 결과도 오염된다.

## 수정 방향

생성된 ID를 성공 즉시 호출부와 공유되는 registry에 기록한다.

권장 형태:

```text
const fixtureRegistry = new Map()
try {
  await createFixtures(fixtureRegistry)
  await runChecks()
} finally {
  await deleteFixtures(fixtureRegistry)
}
```

추가로 다음을 적용한다.

- fixture 이름에 실행별 고유 suffix를 사용해 병렬 실행 충돌 방지
- 정리는 추적된 ID를 기준으로 수행
- 정리 실패 시 ID를 명확히 출력하고 process exit code를 실패로 유지
- 테스트 시작 전 같은 실행 ID의 잔여물이 없는지 확인
- 가능하다면 fixture 생성 자체를 DB 트랜잭션에 넣고 테스트 종료 시 rollback

현재 non-local Supabase URL 실행 거부는 그대로 유지한다.

## 완료 조건

- 어느 insert 단계에서 실패해도 앞서 생성된 fixture가 삭제된다.
- assertion 실패와 route 예외에서도 정리가 실행된다.
- 테스트를 병렬 또는 연속 실행해도 fixture가 충돌하지 않는다.
- 정리 실패는 성공 메시지로 덮이지 않고 테스트 실패로 보고된다.
- 테스트 종료 후 `[hub-qa]` 템플릿 수가 실행 전과 같다.

## 검증

- fixture 생성 2번째, 상품 생성, plan 생성, 작가 연결 단계에 각각 강제 실패를
  주입한다.
- 각 실패 직후 `templates`, `shop_templates`, `template_plans`,
  `template_artists`, 템플릿 전용 `artist_royalty_rules` 잔여물을 확인한다.
- 정상 경로에서도 전체 템플릿 수가 실행 전 값으로 복원되는지 확인한다.
