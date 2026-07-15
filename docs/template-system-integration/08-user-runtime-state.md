# 08. 사용자별 Studio 실행 상태

## 목적

발행된 Studio 문서는 공유하고, 사용자가 입력한 값만 사용자별로 분리해 저장한다.
관리자 draft 테이블을 사용자 데이터 저장소로 재사용하지 않는다.

## 제안 스키마

```text
template_studio_user_states
- id uuid primary key
- template_id uuid references templates(id)
- user_id bigint references users(id)
- base_revision_no integer
- runtime_values jsonb
- version integer
- created_at / updated_at
- unique(template_id, user_id)
```

## API

- `GET /api/user/templates/{id}/runtime`
- `PUT /api/user/templates/{id}/runtime`

두 API는 서버에서 다음 순서로 검증한다.

1. 로그인 사용자 확인
2. 공통 entitlement 확인
3. `template_engine = 'studio'`, `status = 'published'` 확인
4. 발행 문서 input contract에 맞게 runtime value 검증
5. token의 사용자 id로만 조회·upsert

## 원칙

- 사용자마다 전체 document를 복제하지 않는다.
- 템플릿 revision이 바뀌면 `base_revision_no`로 migration 필요 여부를 판단한다.
- 사용자 이미지 입력을 영구 저장한다면 별도 user asset 테이블과 R2 prefix를 둔다.
- 다른 사용자의 `user_id`를 request body로 받지 않는다.

## 완료 조건

- 저장 후 새로고침해도 사용자 입력이 복원된다.
- 사용자 간 runtime 값이 격리된다.
- 템플릿 개정 후 호환 가능한 값은 유지되고 제거된 input 값은 정리된다.

