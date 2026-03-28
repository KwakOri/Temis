# temis 작업 규칙

이 문서는 `temis` 프로젝트에서 Codex가 따라야 할 프로젝트 로컬 규칙이다.

## 기본 작업 위치

- Supabase 관련 명령은 기본적으로 `temis` 루트에서 실행한다.
- Supabase 설정/마이그레이션 경로는 `supabase/`를 기준으로 본다.

## Supabase DB 사용 규칙 (temis)

- `temis` 프로젝트의 원격 Supabase 작업은 반드시 `temis` 계정 토큰으로만 실행한다.
  - 프로젝트 ref: `ajlgjdwkjyayrnocdfpj`
  - 작업 경로: `/Users/kwakori/projects/promotion/temis`
- 원격 연동 명령은 아래 패턴을 사용한다.
  - `SUPABASE_ACCESS_TOKEN="$SB_TOKEN_TEMIS" supabase link --project-ref ajlgjdwkjyayrnocdfpj`
  - `SUPABASE_ACCESS_TOKEN="$SB_TOKEN_TEMIS" supabase migration list --linked`
- 홈 쉘 helper를 사용할 때는 `sbt ...`/`sbt_link`를 우선 사용한다.
- `supabase login` 기반 계정 전환을 기본 사용 방식으로 삼지 않는다.
- 토큰 미주입 상태의 `supabase ...`(bare command) 실행은 지양한다.
- 원격 DB 변경 명령(`db push --linked`, 원격 대상 migration 복구/롤백 등)은 사용자 명시 요청이 있을 때만 실행한다.

## 안전 규칙

- 운영/스테이징 DB에 영향이 있는 명령은 목적과 대상(ref)을 먼저 확인한다.
- 비밀정보(PAT, DB URL, service role key)는 코드/문서/로그에 남기지 않는다.
