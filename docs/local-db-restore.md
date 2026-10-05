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
5. 최신 로컬 migration을 적용하고 파생 데이터를 동기화한다. 이 단계에서
   `template_access` 중복 정리와 신규 unique 제약 조건 적용이 수행된다.
6. 로컬 테스트 관리자 `admin@admin.com`을 upsert하고 `is_admin_user()`가
   해당 계정을 인식하도록 보정한다.
7. 필수 객체, migration 버전, 핵심 중복 데이터를 검증한다.

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

## 로컬 R2 에셋 테스트

복원된 로컬 DB에는 운영 R2 객체의 경로가 포함된다. DB만 로컬이며 이미지는 실제
R2에서 읽는다. 로컬 `.env.local`에 다음 플래그를 설정하고 `npm run dev:local`로
앱을 시작한다. 기존 개발 서버가 있으면 사용 중인 작업을 확인한 뒤 재시작한다.

```dotenv
NEXT_PUBLIC_LEGACY_TEMPLATE_R2_ENABLED=true
NEXT_PUBLIC_PROJECT_ASSETS_R2_ENABLED=true
```

```bash
npm run check:project-assets:local-browser -- --allow-local-mode-changes
```

- 기본 대상은 `http://localhost:3000`이다. 다른 로컬 포트는
  `LOCAL_ASSET_TEST_URL`로 지정할 수 있다.
- 먼저 로컬 DB에 같은 바인딩/모드를 유지한 새 확인 이력을 추가한다. 앱 API에서
  그 이력이 보이는지 확인한 후에만 모드 변경 API를 호출한다. 앱이 운영 DB에
  연결되어 있으면 이 검증에서 중단하며 운영 API 변경을 실행하지 않는다.
- 대표 시간표 3개를 관리자 화면에서 전환하고 로컬/R2 PNG 픽셀을 비교한다.
  직접 fetch 실패도 재현하여 실제 동일 출처 R2 프록시 캡처를 확인한다.
- 검증 후 runtime 99개와 대표 썸네일 97개는 `r2` 모드로 남긴다. 홈페이지 세트는
  `local`로 유지한다. 연결된 시간표/대표 썸네일 원격 이미지의 HEAD 응답을 검사하고,
  일반 홈은 manifest 요청 없이 프로젝트의 샘플/배경/기능 이미지를 쓰는지 확인한다.
- 이미지 업로드/교체/삭제는 실행하지 않는다. 브라우저의 모드 전환 외 쓰기 요청도
  차단한다. 운영 DB의 모드는 이 검사로 바뀌지 않으며 앱 배포도 하지 않는다.
- 모드 전환과 연결 확인은 로컬에 새 이력을 추가한다. 파일 버전 수가 증가하거나
  R2 객체가 새로 생기는 것은 아니다. 재실행하면 로컬 이력이 더 생길 수 있다.
- PNG 비교는 폰트 완료 후 기존 글자 맞춤을 재측정한 조건에서 수행한다.
  기존 초기 폰트 맞춤 문제를 해결했다는 의미는 아니다.

스크린샷, PNG와 비밀정보를 포함하지 않는 집계 보고서는
`output/playwright/local-r2-assets/`에 생성한다. 덤프/키/인증 토큰은 기록하지 않는다.

### 2026-10-04 실행 결과

- 기존 로컬 DB를 비공개 임시 폴더에 백업한 뒤 운영 `public`의 44개 테이블을
  복원했다. migration `20261004010000`까지 적용하고 무결성 검사를 통과했다.
- 사용자 종료 후 원본 프로젝트의 `localhost:3000` 서버를 로컬 Docker DB로
  시작했다. 두 R2 조회 플래그는 로컬 `.env.local`에 설정했다.
- 로컬은 197개 세트 모두 `r2`, 파일 버전은 1,038개 그대로다. 연결 확인과
  모드 전환 재검사로 로컬 revision은 401개가 됐다. 운영을 읽기 전용으로
  사후 확인한 결과 운영 197개 세트는 모두 `local` 그대로였다.
- 99개 runtime manifest, 공개 cover 97개, 홈 14개 슬롯과 실제 사용되는
  고유 원격 URL 1,031개의 HEAD 200/image MIME 검사를 통과했다.
- 히오리/아이 쿠먀먀 PNG는 4000x2250, 동동 PNG는 4096x2304에서 로컬/R2
  픽셀 SHA-256이 일치했다. 직접 이미지 fetch 실패를 재현한 PNG도 같았고
  실제 동일 출처 R2 프록시 요청은 5개였다. desktop/mobile 표시와 홈 로딩,
  익명 관리자 API 401도 확인했다. 테스트 API/이미지를 대신 주입하지 않았다.
- Docker 자격 증명 helper 대기는 사용자 설정을 수정하지 않고 임시
  `DOCKER_CONFIG`로 우회했다. 생성한 별도 3109 서버는 종료했다.
- 운영 데이터 변경, R2 업로드/교체/삭제, 앱 배포는 실행하지 않았다.

### 같은 날 홈페이지 로컬 유지 정책 반영

- 일반 메인페이지의 샘플·배경·기능 이미지 14개는 프로젝트 원본을 사용한다.
  R2 조회 플래그와 DB 모드에 관계없이 홈페이지 provider는 manifest를 요청하거나
  기다리지 않는다. 관리자 후보 미리보기와 이미 등록한 R2 파일/이력은 유지한다.
- 재검사 후 로컬 DB는 runtime 99개와 cover 97개가 `r2`, 홈페이지 1개가 `local`이다.
  위의 197개 전체 R2 기록은 정책 변경 전의 결과다.
- desktop/mobile 홈페이지의 프로젝트 이미지 표시와 manifest 요청 0건을 확인했다.
  기존 포트폴리오 갤러리의 별도 데이터/이미지 경로는 변경하지 않았다.
- 시간표/대표 썸네일의 고유 원격 URL 1,017개가 HEAD 200/image MIME 검사를 통과했다.
  대표 시간표 3종의 로컬/R2 PNG 픽셀 비교와 직접 fetch 실패 시 프록시 캡처도 통과했다.
- 관련 에셋/API 검사, 변경 파일 ESLint(오류 없음), TypeScript 검사와 diff 검사를
  통과했다. 운영 DB/R2 변경 및 앱 배포는 실행하지 않았다.
