# 레거시 R2 에셋 구현 및 운영 전환

기준 커밋: `5e8dd916` (`.src` 정리와 구현 계획)
구현 브랜치: `codex/legacy-template-r2-assets`
작업 위치: `/Users/kwakori/.codex/worktrees/legacy-template-r2-assets/temis`

이 구현의 명령·수정은 위 워크트리에서만 수행한다. 원래 체크아웃
`/Users/kwakori/projects/promotion/temis`는 사용자 테스트용이다.

## 파일 조사 도구

```sh
npm run inventory:legacy-assets
npm run inventory:legacy-assets -- --owner-kind timetable --template-id <uuid> --json
npm run inventory:legacy-assets -- --output /tmp/temis-legacy-inventory.json
npm run check:legacy-assets:inventory
```

- TypeScript AST로 `Imgs` 연결을 읽으며 템플릿 코드를 실행하지 않는다.
- 파일 이름과 키는 그대로 보존하고 경로 기반 ID, 바이트 SHA-256, 해상도를 보고한다.
- shorthand, 별칭 import, 동일 파일 공유, 다중 테마를 처리한다.
- 누락 파일, 미연결 이미지, 잘못된 정적 키, 동적 이미지 선택을 표시한다.
- `public/` 및 샘플 등 `src/` 내 템플릿 외 이미지도 조사한다.
- 기본 실행은 읽기 전용이며 R2나 DB에 연결하지 않는다. `--output`은 새 보고서만 생성한다.
- 부모 대조는 `--catalog`의 `[{"ownerKind":"timetable","templateId":"..."}]` JSON snapshot을
  사용하는 방식으로 분리했다. snapshot 없이 DB 연결을 확인한 것으로 표시하지 않는다.
- `--strict`는 차단 항목, 미확인 부모, 동적 참조 등 검토할 대상이 남으면 실패한다.

registry migration, 업로드/검증 서비스, 관리자 화면, 레거시 resolver와 PNG 처리를 구현했다.
2026-10-04 사용자 승인 후 운영 DB에 신규 schema를 반영했고, 후속 승인으로 96개 템플릿의
이미지 887개를 production R2 경로에 업로드하고 DB에 등록했다. 초기 revision은 모두 local이다.
앱 배포와 runtime 활성화는 하지 않았다. [데이터 이관 기록](./legacy-template-r2-assets-migration-report.md)을 참고한다.

## 조사 결과와 검증

2026-10-04 실행 결과: 99개 템플릿, 이미지 927개, 연결 999개, 템플릿 외 이미지 146개.
누락 파일 3개와 미연결 실제 파일 7개를 재확인했다. 선언되지 않은 정적 키 참조 43곳도
확인돼 29개 템플릿을 검토 대상으로 표시한다. 미사용 컴포넌트의 참조일 수도 있으므로
자동 수정하거나 운영 장애로 단정하지 않는다. 동적 참조는 316곳이다.
로컬 DB를 읽기 전용으로 대조한 결과 부모가 일치하는 폴더는 95/99개다.
부모가 없는 시간표는 `0c10c964-b83c-4309-a81b-76550aba17b0`,
`aedc0cce-62ac-469e-932f-8598b5c36d58`, `c7ef5b16-45e6-497a-b163-b0715a065263`,
`f1ecd870-a161-4753-a726-d2c0fdf523c2`다. 이는 운영 catalog 확인이 아니다.
템플릿 외 146개 이미지(public/샘플/공통 등)는 조사만 했으며 resolver에 연결하지 않았다.
후속 운영 catalog 읽기 전용 대조에서는 99개 폴더 모두의 부모가 확인됐다.
정적 참조 경고 29개 중 미사용 함수/미연결 모듈 등의 26개를 검토 후 등록했고,
누락 import/메모 참조 경고가 남은 3개 템플릿은 이관하지 않았다.
후속 [파일별 사용처 및 Git 조사](./legacy-template-project-assets-audit.md)에서 템플릿 외 146개 중
97개는 실제 대표 썸네일, 14개는 홈 이미지로 확인했다. 보류 3개는 최초 추가 때부터 남은
잔여 코드로, 히오리의 보드/메모 JSX는 렌더되지 않으며 나머지 두 메모 설정 UI도 비활성이다.
원본 복구가 반드시 필요한 것으로 단정하지 않고 최소 정리/옵션 검증을 검토한다.

inventory/계약/API fixture, 원본 키/조건/레이아웃 보존, lint와 TypeScript 검사가 통과했다.
Docker의 network-none 임시 PostgreSQL에서 FK, 권한, 원자적 적용/복원 검사도 통과했다.
사용자 로컬 DB에는 migration을 적용하지 않았다. 원격 적용 결과는 아래 운영 반영 기록을 참고한다.
production build는 수행하지 않았다.
브라우저에서 관리자 업로드/후보 미리보기/적용/복원과 desktop/mobile 레이아웃을 확인했다.
CORS 없는 원격 이미지에서 프록시를 거쳐 1280x720 PNG 생성과 루트 배경 픽셀을 검증했다.
실제 R2 테스트는 사용자 승인 하에 verification 경로에만 파일을 생성하고 삭제한다.
실제 R2 presigned PUT/다운로드/검증 바이트 재업로드가 일치했고, 공개 이미지 표시와
1280x720 PNG 배경 픽셀 `[21,27,50,255]` 일치를 확인했다. 테스트 객체 2개는 모두 삭제했다.
`http://127.0.0.1:3108` 브라우저 PUT은 실패했다. 이후 사용자가 기존 정책은 localhost:3000과
production만 허용한다고 확인했다. 허용된 `http://localhost:3000` origin의 실제 브라우저 PUT은
성공했고 업로드 바이트 및 원격 표시/PNG 검증도 통과했다. 3108을 추가 허용할 필요는 없다.
화면 표시와 PNG 성공이 관리 화면 브라우저 업로드의 CORS 성공을 의미하지 않는다.
실제 운영 DB/R2를 연결한 읽기 전용 브라우저 검증에서도 관리자 96개 목록, 대표 템플릿의
이미지 5개 로딩, desktop/mobile 화면, 원격 이미지 표시와 1280x720 PNG 픽셀 일치를 확인했다.
현재 R2 키의 bucket CORS 조회는 AccessDenied(403)이지만 기존 허용 origin의 업로드 검증은
통과했으므로 bucket 관리 권한 추가/정책 변경은 이번 작업의 선행 조건이 아니다.

```sh
npm run check:legacy-assets:inventory
npm run check:legacy-assets -- --base-ref 5e8dd916
npm run check:legacy-assets:api
npm run check:legacy-assets:db -- --docker
npm run check:legacy-assets:migration
npx tsc --noEmit --pretty false --incremental false
npm run lint
```

## 구현 구조

- 소유 종류와 템플릿 ID별 에셋 registry, 기존 테마와 이미지 키를 유지한 슬롯 바인딩.
- 경로 기반 asset ID와 SHA-256 버전, service role 전용 DB 접근과 append-only 이력.
- staging 업로드 후 크기/해시/MIME/해상도 검증, 검증한 바이트를 canonical 경로로 저장.
- 관리자 목록/검색, 공유 슬롯 선택, 후보 업로드/미리보기, 충돌 검사, 적용/이력 복원.
- 서비스 계층과 React Query 조회/갱신, 사용자별 query key와 권한 확인.
- 411개 레거시 소비 파일에 resolver hook 연결. 레이아웃/조건문/키는 보존.
- 원격 URL과 호환되지 않는 Next Image 소비부는 일반 img로 변경.
- Studio의 이미지 임베딩과 동일 출처 R2 프록시를 PNG/Tweet에 재사용.
  루트 DOM의 CSS 배경까지 수집하며 이미지와 폰트 로딩을 기다린다.
- R2 helper의 지원하지 않는 `ACL: public-read` 제거.

`NEXT_PUBLIC_LEGACY_TEMPLATE_R2_ENABLED=true`인 경우에만 runtime API를 사용한다.
기본값은 비활성화다. 미등록 템플릿과 local 모드는 기존 import를 사용한다.
활성화된 R2 모드의 오류는 표시하며 조용히 로컬로 되돌리지 않는다.
원본 파일과 import는 아직 보존했다. 전체 검증 후 파일 제거는 별도 작업이다.

## 운영 전환

1. 부모 catalog, 누락 파일/정적 참조/동적 선택을 검토한다.
2. `20261004000000_create_legacy_template_assets.sql`은 별도 승인 후 운영에 적용 완료했다.
   대상은 temis ref `ajlgjdwkjyayrnocdfpj`이며 temis 계정 토큰만 사용했다.
3. 기존 R2 환경 변수와 `LEGACY_TEMPLATE_ASSET_ENV`를 설정한다. staging/production은 다른
   env 경로를 사용한다. 공개 URL에는 custom domain 또는 공개 bucket 도메인을 설정한다.
4. 단일 템플릿 dry-run을 확인하고 초기 파일/바인딩을 이관한다. `--apply`는 DB/R2를 변경하므로
   대상과 승인을 확인한 뒤 실행한다. 초기 revision은 기본 local 모드이며 `--activate` 없이 시작한다.
5. runtime flag를 켜고 `/admin/legacy-template-assets`에서 실제 표시/PNG 검증 후 R2 모드를 켠다.
6. 문제 발생 시 local 모드로 전환하거나 이력을 복원한다. 복원은 새 revision을 추가한다.
7. 검증 범위를 넓혀 순차 이관한다. `--all`은 검토가 끝난 뒤 명시적으로만 사용한다.

```sh
npm run catalog:legacy-assets:local -- /tmp/temis-legacy-catalog.json
npm run inventory:legacy-assets -- --catalog /tmp/temis-legacy-catalog.json
npm run migrate:legacy-assets -- --owner-kind timetable --template-id <uuid>
# 대상 DB/R2 변경 승인 후에만 실행
npm run migrate:legacy-assets -- --owner-kind timetable --template-id <uuid> --apply
```

경고가 있는 템플릿은 사전 검토 후에만 `--reviewed`를 사용한다.
`--catalog`로 부모 snapshot을 지정하고 `--skip-blocked`로 경고 항목을 보류할 수 있다.
검토 완료한 템플릿만 `--selection <JSON>`으로 지정해 `--reviewed`와 함께 실행한다.
`--env-dir`은 apply 실행 시 기존 설정을 메모리에 읽으며 설정 파일을 복사하지 않는다.
`--concurrency 1~4`는 템플릿 내 파일 작업 수를 제한하며, 업로드 후 전체 바이트 해시를 검증한다.
재실행은 기존 버전을 재사용하며 이미 active revision이 있으면 덮어쓰지 않는다.
운영 미참조 버전 삭제, 템플릿 외 이미지 이관, 원본 파일 제거는 이번 구현에 포함하지 않았다.
완료되지 않은 presigned 업로드는 staging 경로에 남을 수 있으므로
`legacy-template-asset-uploads/<env>/`에 만료 lifecycle 정책을 설정한다.

## 운영 DB 반영 기록 (2026-10-04 JST)

- 승인 범위: 신규 에셋 schema migration만 적용. 이미지 업로드/seed/R2 활성화는 제외.
- 대상: `ajlgjdwkjyayrnocdfpj`, 계정: `SB_TOKEN_TEMIS`를 사용하는 `sbt` helper.
- 적용 소스: `77f29452`, migration: `20261004000000_create_legacy_template_assets.sql`.
- 적용 직전 migration list와 두 차례 dry-run에서 이번 파일 한 개만 대상임을 확인했다.
- 읽기 전용 사전 감사: 같은 이름의 에셋 테이블/함수 없음. 부모 세 템플릿의 ID는 uuid,
  운영 `users.id`는 bigint이므로 새 작성자 컬럼과 새 함수 인자를 bigint로 맞췄다.
  기존 사용자 테이블은 수정하지 않았다. 큰 작성자 ID `3000000000`의 격리 DB 검사도 통과했다.
- `sbt db push --linked --yes` 성공, 사후 migration list는 구현 브랜치와 운영이 일치한다.
- 사후 읽기 전용 감사: 신규 테이블 3개 RLS 활성화, anon/authenticated 테이블 접근 불가,
  함수 실행은 service_role만 허용. versions/revisions의 service_role UPDATE/DELETE도 불가.
- 신규 데이터 행 수: sets 0, versions 0, revisions 0. 데이터 이관이나 기존 데이터 DML은 실행하지 않았다.
- 애플리케이션 배포, runtime flag 활성화, bucket CORS 변경도 실행하지 않았다.
- 적용 확인 시각: `2026-10-03T21:13:51Z` (JST 2026-10-04 06:13).

```sh
# 모두 이 문서 상단의 별도 워크트리 루트에서 실행
sbt link --project-ref ajlgjdwkjyayrnocdfpj
sbt db push --linked --dry-run
sbt db push --linked --yes
sbt migration list --linked
```

실행 중 CLI v2.84.2가 두 `SET LOCAL`에 대해 `25P01` 경고를 출력했다.
schema 적용과 사후 검증은 성공했으나 운영에서 lock/statement timeout이 보장됐다고 보고하지 않는다.
이미 반영된 migration 파일은 이 경고를 숨기기 위해 다시 수정하거나 재실행하지 않았다.
향후 DDL 작업은 실행 도구에 맞는 명시적 transaction/connection timeout을 별도로 검증한다.
적용된 migration에는 기존 부모 테이블의 컬럼 변경/데이터 변경/삭제 SQL이 없다.

사용자 테스트용 원래 브랜치에는 이 신규 migration 파일이 아직 없다.
그 체크아웃의 로컬/원격 migration 비교에 remote-only 항목이 나오는 것은 예상된 상태다.
후속 운영 DB 작업은 구현 브랜치 또는 이 변경을 병합한 브랜치에서 실행하며,
이를 해결하기 위해 migration repair/원격 rollback을 하지 않는다.

## R2 CORS

브라우저 presigned PUT에는 S3 API endpoint의 CORS가 필요하고, PNG의 직접 이미지 fetch에는
공개 도메인의 CORS가 필요하다. 동일 출처 프록시는 PNG fetch의 보조 경로이며 PUT CORS를 대체하지 않는다.
이번 버킷은 기존 localhost:3000/production 정책을 유지한다. 허용된 localhost:3000에서
실제 PUT 성공을 확인했다. 추가 preview origin이 필요할 때만 별도 설정을 검토한다.
다음은 localhost 검증용 예시이며 현재 버킷 정책을 조회한 결과나 대체할 설정이 아니다.

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

bucket 공개 설정과 CORS는 별개이며 R2는 객체별 public-read ACL로 공개하지 않는다.
[R2 CORS 문서](https://developers.cloudflare.com/r2/buckets/cors/),
[S3 호환성 문서](https://developers.cloudflare.com/r2/api/s3/api/)를 참고한다.
이번 검증에서는 bucket 공개/CORS 정책을 변경하지 않았다.

## 대표 썸네일 및 홈 에셋 확장

후속 승인에 따라 내부 이미지(`runtime`), 대표 썸네일(`cover`), 홈페이지(`site`) 목적을 분리했다.
부모 catalog는 변경하지 않으며 새 에셋 세트에 `purpose`/`site_key`를 추가하는 후속 migration을 사용한다.
기존 세트는 `purpose=runtime`이며 기존 경로와 슬롯 계약은 유지한다.

- 대표 썸네일 97개는 템플릿 종류/ID별 `first.cover` 슬롯으로 관리한다.
- 홈 이미지 14개는 `site/homepage` 세트로 관리한다. 샘플의 기존 8개 키는 바꾸지 않았다.
- `/admin/legacy-template-assets`에서 종류/용도별 필터, 업로드/미리보기/적용/복원을 재사용한다.
  대표 이미지도 32MiB 검증 계약을 사용하므로 기존 원본 12MB 이미지 2개를 재압축하지 않는다.
- 사용자가 승인한 공개 범위는 `/api/project-assets`의 GET만 허용한다.
  소스의 명시적 허용 목록 97개와 홈페이지 14개 키만 공개하고 내부 이미지/이력/관리 작업은 제외한다.
  기존 template entitlement와 관리자 인증, DB RLS/service-role 접근 제한은 유지한다.
- 소비자 cover, 구매 내역, 팀 마이페이지, 가이드, 관리자 썸네일 조회를 연결했다.
  홈 배경과 샘플 시간표/모바일 예시/기능 이미지도 같은 데이터에 연결했다.
- `NEXT_PUBLIC_PROJECT_ASSETS_R2_ENABLED=true`일 때만 공개 에셋 manifest를 사용한다.
  기본 꺼짐이며 `NEXT_PUBLIC_LEGACY_TEMPLATE_R2_ENABLED`와 별도다.
- 초기 데이터 모드는 local을 유지하고 원본 파일/import도 보존한다. 앱 배포/활성화는 제외한다.
- 신뢰한 저장소 달력 SVG 한 개는 경로와 SHA-256을 고정하여 seed한다.
  브라우저 SVG 업로드는 계속 거부하며 관리 화면에서는 검증된 raster로 교체할 수 있다.
- 히오리의 누락 미사용 import 3개, 아이 쿠먀먀/동동의 비활성 메모 잔여 JSX/import만 제거했다.
  회귀 검사에서 지정한 제거 외 변경이 없고 원본 40개가 유지되는지 확인한다.

```sh
npm run check:legacy-assets:held-cleanup
npm run check:project-assets
npm run check:legacy-assets:migration
npm run check:legacy-assets:db -- --docker
npm run migrate:project-assets
# 실제 운영 DB/R2 등록은 대상/승인 확인 후 실행, 활성화하지 않음
LEGACY_TEMPLATE_ASSET_ENV=production npm run migrate:project-assets -- \
  --apply --env-dir /Users/kwakori/projects/promotion/temis --concurrency 3
```

앱 아이콘 13개, 개발용 16개, 미사용 후보 6개는 이 확장에서도 이동/삭제하지 않는다.
