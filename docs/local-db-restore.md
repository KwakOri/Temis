# 원격 데이터로 로컬 DB 복원

원격 Supabase의 데이터를 로컬 Docker Supabase에 복원할 때는 개발 서버와
복원 작업을 분리한다.

## 실행

```bash
# 원격 데이터 덤프 → 로컬 DB 교체 → 로컬 마이그레이션 → 무결성 검증
npm run db:restore:remote -- --fresh-local

# 복원 완료 후 앱 시작
npm run dev:local
```

`--fresh-local`은 로컬 Supabase의 DB 컨테이너와 DB 볼륨만 교체한다. 원격 DB에는
쓰기 작업을 하지 않으며, 로컬 Storage 볼륨은 삭제하지 않는다. 기존 DB를 유지한
채로 복원하려면 `--fresh-local`을 생략할 수 있지만, 재현 가능한 초기화에는
`--fresh-local`을 권장한다.

## 처리 순서

1. 연결된 Temis 원격 DB의 최신 migration 버전을 확인한다.
2. 원격 `public` 데이터를 먼저 덤프한다. 덤프에 실패하면 로컬 DB를 건드리지 않는다.
3. 원격 migration 버전까지 로컬 schema를 되돌린다.
4. 덤프 테이블이 해당 schema에 존재하는지 확인하고, 단일 트랜잭션으로 데이터를
   가져온다.
5. 최신 로컬 migration을 적용한다. 이 단계에서 `template_access` 중복 정리와
   신규 unique 제약 조건 적용이 수행된다.
6. 필수 객체, migration 버전, 핵심 중복 데이터를 검증한다.

## 중단되는 경우

- 원격 migration 버전이 로컬 `supabase/migrations`에 없거나 로컬보다 최신인 경우
- 원격 `shop_templates.template_id` 중복이 있는 경우
- 원격 pending 구매 요청에 `(user_id, template_id)` 중복이 있는 경우
- 원격 덤프의 테이블이 원격 migration 기준 로컬 schema에 없는 경우

마지막 경우에만 omission이 의도된 것을 확인한 뒤 다음 옵션을 사용할 수 있다.

```bash
npm run db:restore:remote -- --fresh-local --allow-missing-tables
```

실패 원인 확인을 위해 덤프를 보존하려면 `--keep-dump`를 함께 사용한다. 덤프에는
원격 데이터가 포함될 수 있으므로 공유하거나 커밋하지 않는다.
