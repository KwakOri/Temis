# 운영 에셋 데이터 이관 기록

작업일: 2026-10-04 JST
작업 브랜치: `codex/legacy-template-r2-assets`
운영 Supabase ref: `ajlgjdwkjyayrnocdfpj`

사용자의 후속 승인에 따라 R2 파일 업로드와 새 에셋 테이블의 데이터 등록을 실행했다.
앱 배포, runtime flag 변경, R2 모드 적용, 기존 템플릿 데이터 변경, 원본 파일 삭제는 하지 않았다.
원래 체크아웃은 수정하지 않고 별도 워크트리에서 실행했다. 설정 파일은 복사하지 않고
원래 체크아웃의 환경 설정을 프로세스 메모리에만 읽었다.

## 등록 결과

| 종류 | 세트 | 이미지 버전 | 연결 슬롯 |
| --- | ---: | ---: | ---: |
| 시간표 | 88 | 827 | 899 |
| 팀 시간표 | 7 | 57 | 57 |
| 썸네일 | 1 | 3 | 3 |
| 합계 | 96 | 887 | 959 |

- 전체 등록 파일 크기: 896,541,047 bytes. 버전 887개는 콘텐츠 중복 제거 수가 아닌 DB 행 수다.
- 초기 revision 96개, 모든 세트 `mode=local`, 모든 active revision 번호 1.
- 저장 위치: `legacy-template-assets/production/<ownerKind>/<templateId>/assets/<assetId>/<sha256>.<ext>`.
- 각 업로드 후 R2에서 전체 파일을 다시 받아 원본 크기와 SHA-256을 확인하고 버전 행을 저장했다.
- 사후 읽기 전용 검사에서 모든 원본 asset ID/해시/크기/해상도, 테마/키/버전 연결과 expected_slots가 일치했다.
- 운영 부모 catalog에서는 조사한 99개 템플릿 모두의 부모가 존재했다. 로컬 catalog의 95/99와 구분한다.
- 첫 대표 템플릿 1개, 경고 보류 배치 69개, 검토 완료한 경고 배치 26개를 순차 등록했다. 이관 실패 0개.
- 공통/public/샘플 등 템플릿 외 146개 이미지는 이번 registry/관리 UI의 대상이 아니며 업로드하지 않았다.

## 경고 검토

정적 키 참조 경고가 있는 29개를 전부 무시하지 않았다. `page.tsx`에서 도달하는 import graph와
해당 참조를 포함하는 함수의 호출/렌더 여부를 확인했다. 미사용 지역 함수는 export되지 않으며
선언 외 참조가 없는지 확인했고, 미연결 모듈은 페이지 import graph에서 도달하지 않는지 확인했다.
다음 26개만 명시적 selection으로 `--reviewed` 등록했다. 기존 키나 조건문은 수정하지 않았다.

표의 U는 미사용 지역 함수, M은 페이지에서 연결되지 않는 모듈, C는 import만 있고 JSX 렌더가 주석 처리된 경우다.
이 검토는 모든 동적 참조/모든 사용자 옵션의 브라우저 검증을 의미하지 않는다.

| 종류 | 템플릿 ID | 근거 |
| --- | --- | --- |
| timetable | `0b96260c-d19a-41d5-99f0-ea1fe7b21699` | U |
| timetable | `1b097aba-1f4b-4633-9d30-64f2eba0cc50` | U |
| timetable | `1c8344c7-d5c1-487b-99e8-976ff28b96ed` | U |
| timetable | `35c8ce95-c718-4997-9cd6-328e22d37a45` | M |
| timetable | `3aec489f-da90-408a-a1dd-d75360867607` | M, U |
| timetable | `408415ea-e897-44dd-9c98-7499e5d40669` | U |
| timetable | `5bed0188-31e5-4fd1-bf52-a9a2c945ebf0` | U |
| timetable | `75ff19ce-8366-40de-b9a6-41d35045ec08` | U, M |
| timetable | `7c75387c-99c7-4971-9dcd-2931a0651016` | U |
| timetable | `94ee8efd-2991-4945-a024-06a29a96eebf` | U |
| timetable | `abb577db-3372-4d58-958d-ea99d02ba2ea` | U |
| timetable | `bfe9113e-5a17-4828-8eff-6227f344a876` | M |
| timetable | `c1f6bb18-d6c7-4319-b54e-b94d2be0f7dd` | M, U |
| timetable | `c42b8983-ebc1-4171-a89a-42392aa3c51d` | M |
| timetable | `c7ef5b16-45e6-497a-b163-b0715a065263` | C |
| timetable | `da4e0772-be71-42de-a1cd-7d64c7216064` | M |
| timetable | `db8f0082-b6c4-4b8c-9dfc-ec336bea0566` | U |
| timetable | `e5a17bc0-4036-4186-a017-9710edfd175a` | M, U |
| timetable | `e835b217-4081-4425-a157-9931e09f397f` | M |
| timetable | `f697c062-844a-48c7-aad4-c05cee320c4e` | U |
| timetable | `f8bb165b-a42b-4146-9322-64c6a2e78df5` | M |
| team_timetable | `34d14470-65c6-4e46-a76b-dec8e16c20e9` | M |
| team_timetable | `68a3f4af-626a-473a-8fdb-e2954e6873c7` | M |
| team_timetable | `c13d435c-27db-4712-a713-f18ca9d56674` | M |
| team_timetable | `ed524dfa-8477-4a2e-a117-4eb656a025be` | M |
| thumbnail | `3e94a961-d6de-4c59-aa6e-0375c4b75954` | M |

`c7ef5b16-45e6-497a-b163-b0715a065263`의 `_components/_uneditable/TimeTableContent.tsx`에서
TimeTableBoard는 import만 남아 있고 JSX 사용이 주석 처리돼 있다. 다른 호출은 없다.

## 보류한 3개 시간표

| 템플릿 ID | 원본 문제 | 기존 파일 수 |
| --- | --- | ---: |
| `0c10c964-b83c-4309-a81b-76550aba17b0` | `_img/imgs.ts`가 import하는 `board.png`, `week_dates.png`, `weekly_memo.png` 누락. TimeTableBoard/WeeklyMemoCard의 `first.board`, `first.weekly_memo` 미정의 | 7 |
| `28c2b9fb-9d7e-4aaa-822d-96909d384032` | 실제 조건부 메모 렌더의 `_components/TimeTableWeeklyMemo.tsx`가 미정의 `first.weekly_memo` 참조 | 16 |
| `8f9bb89d-34f5-45c1-b923-16366197af33` | 실제 조건부 메모 렌더의 `_components/TimeTableWeeklyMemo.tsx`가 미정의 `first.memo` 참조 | 17 |

위 40개 실제 파일과 존재하지 않는 import 3개는 등록하지 않았다. 임의 대체 이미지나 키 변경을
추정해 넣지 않았다. 원본 확인/복구 후 해당 템플릿만 재조사하고 이관해야 한다.

## 실행 방식과 재실행

아래 명령의 apply는 운영 DB/R2를 변경한다. 실행 전 대상과 승인 범위를 확인한다.
catalog/selection은 `[{"ownerKind":"timetable","templateId":"<uuid>"}]` 형식의 JSON snapshot이다.
실제 실행에서 `--activate`는 사용하지 않았다. 이미 active revision이 있는 세트는 건너뛰며
관리자 변경을 덮어쓰지 않는다. 중단된 이관은 같은 asset ID/해시의 버전 행을 재사용한다.

```sh
# 별도 구현 워크트리 루트
node --import tsx scripts/migrate-legacy-template-assets.ts \
  --all --catalog <production-catalog.json> --skip-blocked

# 승인 후 데이터 등록: initial mode=local
LEGACY_TEMPLATE_ASSET_ENV=production \
node --import tsx scripts/migrate-legacy-template-assets.ts \
  --all --catalog <production-catalog.json> --skip-blocked \
  --env-dir /Users/kwakori/projects/promotion/temis --concurrency 3 --apply

# 경고 검토를 마친 ID만 선택
LEGACY_TEMPLATE_ASSET_ENV=production \
node --import tsx scripts/migrate-legacy-template-assets.ts \
  --all --catalog <production-catalog.json> --selection <reviewed-selection.json> \
  --reviewed --env-dir /Users/kwakori/projects/promotion/temis --concurrency 3 --apply
```

## 검증과 남은 작업

- `check:legacy-assets:migration`: CLI dry-run과 잘못된 인수 9개 거부 회귀 검사 통과.
  lint, TypeScript 검사도 통과했다.
- `check:legacy-assets -- --base-ref 5e8dd916`: 411개 레거시 파일의 키/조건/레이아웃 보존 통과.
- 실제 운영 DB/R2 읽기 전용 브라우저 검사: 관리자 목록 96개, 대표 에셋 이미지 5개 로딩,
  desktop/mobile 가로 넘침 없음, 대표 시간표 원격 이미지 표시 확인.
- admin preview에 현재 버전을 전달해 DB 모드를 변경하지 않고 원격 이미지로 렌더했다.
  PNG 1280x720, 원본/캡처 배경 픽셀 `[21,27,50,255]`, 동일 출처 이미지 proxy 요청 4개 확인.
  검사 전후 대표 active revision과 mode/local, 이력 1개가 동일했다.
- 검증 서버는 별도 3108 포트를 사용한 뒤 종료했다. 원래 체크아웃의 서버는 건드리지 않았다.
- PNG 대표 검증이 전체 템플릿의 모든 동적 이미지/조건부 옵션 검증을 의미하지 않는다.
- 현재 R2 object 권한 키는 GetBucketCors에 AccessDenied(403)를 반환한다.
  이전 브라우저 PUT 실패 origin은 `http://127.0.0.1:3108`이었다.
  이후 사용자가 기존 CORS는 localhost:3000/production만 허용한다고 확인했다.
  허용 origin `http://localhost:3000`의 실제 브라우저 presigned PUT과 바이트 재대조는 성공했다.
  원격 표시와 PNG 1280x720/배경 픽셀 일치도 재검증했고 검증 객체 2개는 모두 삭제했다.
  버킷 CORS는 변경하지 않았으며 bucket 관리자 권한 추가는 이번 작업에 필요하지 않다.
- 미완료 presigned 업로드의 staging lifecycle 설정 여부는 조회하지 못했다.
  기존 만료 정책 확인은 별도 운영 점검 항목이다.
- 실제 관리 화면 전체 교체/적용/복원 흐름 검증과 보류 원본 확인을 진행한다.
  앱 배포와 runtime flag/R2 활성화는 사용자 요청대로 이번 실행에서 제외했다.

```sh
# 허용 origin 검증. 사용자 localhost:3000 서버에는 요청/수정 없이 브라우저 문서만 재현한다.
# R2 verification 경로에만 생성/삭제하며 원격 DB는 사용하지 않는다.
npm run check:legacy-assets:r2 -- --allow-test-upload \
  --env-dir /Users/kwakori/projects/promotion/temis \
  --fixture <generated-browser-fixture.json> --browser-origin http://localhost:3000
```

관리 화면 경로는 `/admin/legacy-template-assets`다. 운영 앱에는 아직 배포되지 않았다.
기존 이미지 import/파일은 유지했으므로 이번 업로드가 번들 에셋 삭제나 운영 렌더 전환을 뜻하지 않는다.
