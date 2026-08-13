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

## 개발 검증 및 로컬 서비스 규칙

- 저장소에 큰 이미지 자산이 많으므로 개발 중 production build 및 build test는 기본 검증에서 제외한다.
- 대신 `npm run lint`, `npx tsc --noEmit`, 관련 `check:*` 스크립트와 브라우저 실측을 우선한다.
- sandbox에서 `tsx` IPC가 `EPERM`이면 같은 검사를 `node --import tsx scripts/<check-file>` 방식으로 실행한다.
- `npm run dev:local`은 기본적으로 local database, API gateway/PostgREST, Auth만 띄우고 Realtime, Storage, Studio, mail, analytics 등 선택 서비스를 제외한다. 선택 서비스가 필요한 작업에서만 `SUPABASE_START_EXCLUDE`를 명시적으로 덮어쓴다.

## 안전 규칙

- 운영/스테이징 DB에 영향이 있는 명령은 목적과 대상(ref)을 먼저 확인한다.
- 비밀정보(PAT, DB URL, service role key)는 코드/문서/로그에 남기지 않는다.

## Figma 좌표 보정 규칙 (수동 변환용, 임시)

- 이 섹션은 "자동화 로직 구현 전"에 Codex가 Figma 값을 수동으로 프리셋에 옮길 때 참고하는 기준이다.
- 현재 프로젝트 런타임 렌더는 CSS 기준(`left/top + transform: rotate`)을 사용하므로, Figma에서 읽은 좌표는 필요 시 CSS 좌표로 보정해서 기록한다.
- 보정은 **코드 로직이 아니라 수동 변환 단계에서만 1회 적용**한다.

### 적용 조건

- `rotateDeg`가 존재하고, `transform-origin`이 center 기준(기본값 포함)이며, `width/height`가 모두 있는 경우에만 적용한다.
- 위 조건이 아니면 좌표 보정을 하지 않고 원본 값을 사용한다.

### 보정 공식 (Figma -> CSS)

- `theta = rotateDeg * Math.PI / 180`
- `bw = abs(w * cos(theta)) + abs(h * sin(theta))`
- `bh = abs(w * sin(theta)) + abs(h * cos(theta))`
- `left_css = x_figma + (bw - w) / 2`
- `top_css = y_figma + (bh - h) / 2`

### 계산 예시

- `w=160`, `h=100`, `rotateDeg=-13.5`일 때:
  - `x` 보정량: `+9.46px`
  - `y` 보정량: `+16.52px`
- 예: Figma `(x=31, y=3)` -> CSS `(x=40.46, y=19.52)` (필요 시 소수 1자리 또는 정수 반올림)

### 기록 원칙

- 프리셋 데이터에는 보정된 최종 CSS 좌표만 저장한다.
- `origin/adjust` 분리 저장은 하지 않는다.
- 동일 노드에 보정을 중복 적용하지 않도록, 같은 소스에 대해 재계산 시 기존 값과 차이를 확인한다.
