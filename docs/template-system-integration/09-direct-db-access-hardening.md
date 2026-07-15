# 09. 브라우저 직접 DB 접근 축소

## 목적

RLS에 의존하지 않는 프로젝트 원칙에 맞춰 민감 테이블을 브라우저에서 직접 읽고
쓰는 경로를 제거하고, 서버 API를 권한 경계로 만든다.

## 현재 확인된 위험

원격 anon key로 private 템플릿을 포함한 `templates`, `template_access`, 구매 요청의
일부 필드를 직접 읽을 수 있었다. RLS를 사용하지 않는다면 이 권한은 애플리케이션
API 권한 검사로 보완되지 않는다.

## 변경 순서

1. 브라우저 Supabase 쿼리를 inventory한다.
2. 민감 쿼리를 Service → Next API → server Supabase client 흐름으로 옮긴다.
3. 서버 API에서 인증, role, resource entitlement를 검증한다.
4. 전환된 테이블과 RPC의 `anon`, 필요 시 `authenticated` 직접 권한을 revoke한다.
5. 허용한 공개 메타데이터는 좁은 view/API로 별도 제공한다.

우선 대상:

- `template_access`
- `template_purchase_requests`
- Studio documents, drafts, revisions, assets, user states
- 전체 문서를 반환하는 RPC

## 완료 조건

- anon REST 요청으로 민감 행을 읽거나 쓸 수 없다.
- 정상 UI는 서버 API를 통해 기존 기능을 유지한다.
- service-role key는 서버 환경 밖으로 노출되지 않는다.

