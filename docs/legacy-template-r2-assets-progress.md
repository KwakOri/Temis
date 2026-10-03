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
운영 업로드와 원격 DB 변경은 아직 수행하지 않았다. 구현 완료는 운영 데이터 이관 완료를 의미하지 않는다.

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

inventory/계약/API fixture, 원본 키/조건/레이아웃 보존, lint와 TypeScript 검사가 통과했다.
Docker의 network-none 임시 PostgreSQL에서 FK, 권한, 원자적 적용/복원 검사도 통과했다.
사용자 로컬 DB와 원격 DB에는 migration을 적용하지 않았다. production build는 수행하지 않았다.
브라우저에서 관리자 업로드/후보 미리보기/적용/복원과 desktop/mobile 레이아웃을 확인했다.
CORS 없는 원격 이미지에서 프록시를 거쳐 1280x720 PNG 생성과 루트 배경 픽셀을 검증했다.
실제 R2 테스트는 사용자 승인 하에 verification 경로에만 파일을 생성하고 삭제한다.
실제 R2 presigned PUT/다운로드/검증 바이트 재업로드가 일치했고, 공개 이미지 표시와
1280x720 PNG 배경 픽셀 `[21,27,50,255]` 일치를 확인했다. 테스트 객체 2개는 모두 삭제했다.
`http://127.0.0.1:3108` 브라우저 PUT은 실패했다. 해당 개발 origin의 CORS를 확인/허용해야 한다.
화면 표시와 PNG 성공이 관리 화면 브라우저 업로드의 CORS 성공을 의미하지 않는다.

```sh
npm run check:legacy-assets:inventory
npm run check:legacy-assets -- --base-ref 5e8dd916
npm run check:legacy-assets:api
npm run check:legacy-assets:db -- --docker
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
2. 별도 승인 후 `20261004000000_create_legacy_template_assets.sql`을 대상 DB에 적용한다.
   원격 대상은 temis ref `ajlgjdwkjyayrnocdfpj`이며 temis 계정 토큰만 사용한다.
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
재실행은 기존 버전을 재사용하며 이미 active revision이 있으면 덮어쓰지 않는다.
운영 미참조 버전 삭제, 템플릿 외 이미지 이관, 원본 파일 제거는 이번 구현에 포함하지 않았다.
완료되지 않은 presigned 업로드는 staging 경로에 남을 수 있으므로
`legacy-template-asset-uploads/<env>/`에 만료 lifecycle 정책을 설정한다.

## R2 CORS

브라우저 presigned PUT에는 S3 API endpoint의 CORS가 필요하고, PNG의 직접 이미지 fetch에는
공개 도메인의 CORS가 필요하다. 동일 출처 프록시는 PNG fetch의 보조 경로이며 PUT CORS를 대체하지 않는다.
운영/preview/localhost origin을 명시해 GET/HEAD/PUT과 Content-Type을 허용한다.
다음은 localhost 검증용 예시이며 기존 정책의 origin을 지우지 않고 필요한 origin을 추가한다.

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "http://127.0.0.1:3108"],
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
