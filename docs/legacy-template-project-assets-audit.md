# 추가 이미지 146개와 보류 템플릿 3개 조사

조사일: 2026-10-04 JST. 소스 기준: `eb16710d`, 브랜치 `codex/legacy-template-r2-assets`.
운영 catalog는 temis 프로젝트 `ajlgjdwkjyayrnocdfpj`를 읽기 전용으로 대조했다.
이번 조사에서 앱 코드, 운영 DB, R2 객체, 배포 설정은 변경하지 않았다.

## 결론

기존에 "공통·샘플 이미지 146개"로 묶었던 파일 중 **97개는 실제 템플릿의 대표 썸네일**이다.
모든 파일이 운영 catalog의 부모와 정확히 하나씩 연결된다. 따라서 미사용 공통 이미지가 아니라
추가 R2 이관 및 관리 대상이다. 기존 887개 R2 업로드에는 이 97개가 포함되지 않았다.
`_sample` 역시 미사용 예제가 아니라 홈페이지에서 실행되는 체험 시간표다.

보류한 3개는 템플릿 최초 추가 때부터 남아 있던 누락 import 또는 메모 참조 문제다.
특히 히오리의 보드/메모는 현재 JSX에서 렌더되지 않는다. 이전 보고서의 설명을 이 점에 맞춰 보완했다.
세 템플릿 모두 원본 이미지를 반드시 새로 받아야 한다고 단정할 근거는 없다.

## 146개 분류

| 분류 | 개수 | 바이트 | 사용처 및 권장 처리 |
| --- | ---: | ---: | --- |
| 템플릿 대표 썸네일 | 97 | 206,574,623 | catalog/구매 내역/디자인 가이드. 템플릿별 대표 이미지로 R2 이관 |
| 앱 아이콘 | 13 | 164,491 | manifest 및 layout metadata. 안정적인 기존 경로 유지 권장 |
| 홈 체험 시간표 | 11 | 6,303,312 | `_sample` 이미지 8개와 홈 배경/달력/모바일 예시 3개. 공통 에셋으로 R2 이관 |
| 홈 기능 소개 이미지 | 3 | 61,053 | KeyFeatures. 공통 에셋으로 R2 이관 |
| 테스트 페이지 | 8 | 2,496,252 | `time-table-tester`. 개발용으로 별도 분류 |
| 개발용 템플릿 골격 | 8 | 3,731,702 | `time-table/_template`. 개발용으로 별도 분류 |
| 미사용 후보 | 6 | 16,690 | 현재 코드/manifest에서 참조 없음. 자동 삭제하지 않음 |
| 합계 | 146 | 219,348,123 | 기존 템플릿 내부 이미지 927개와 별도 집계 |

전체 파일별 경로, 크기, SHA-256, 분류, 정적 사용처, 동일 바이트의 템플릿 파일은
[파일별 JSON 목록](./legacy-template-project-assets-audit.json)에 기록했다.
`${id}`나 배열로 만드는 URL은 개별 파일의 literal 참조가 없을 수 있다.
JSON의 `references: []`만으로 미사용이라고 판단하면 안 된다.

## public 썸네일 97개

### 부모 대조

- `public/thumbnail`: 91개. 시간표 catalog `templates`와 연결되는 레거시 시간표 90개,
  구형 `thumbnails` catalog와 연결되는 미루루 ASMR 썸네일 1개다.
- `public/team-thumbnails`: 6개. 모두 `team_templates`의 팀 시간표와 연결된다.
- 97개 모두 부모가 하나씩 존재한다. 미연결/중복 부모는 없다.
- 운영 레거시 시간표 92개 중 43개는 DB의 `thumbnail_url`에 해당 정적 경로가 저장돼 있다.
  나머지 49개는 URL이 비어 있고, 그중 47개는 대응 파일이 있어 ID 기반 fallback으로 표시한다.
- 구형 썸네일 1개도 DB URL은 비어 있지만 파일은 존재한다. 팀 catalog에는 `thumbnail_url` 컬럼이 없다.

이는 목록/참고용 대표 이미지다. 시간표 안에서 `Imgs`로 사용하는 이미지 및 Studio의
`template_kind=thumbnail` 편집 대상과 구분해서 관리해야 한다.

참고로 파일이 없는 부모는 레거시 시간표 테스트 데이터 2개와 팀 테스트 데이터 2개다.
현재 존재하는 97개 파일의 미연결 문제는 아니며, 이번 조사에서 이미지를 생성하지 않았다.

| 부모 종류 | ID | 이름 |
| --- | --- | --- |
| 시간표 | `bb2cc092-379f-4783-bad9-67b5f3ce67bd` | 테스트용 팀 시간표 ID |
| 시간표 | `0b51e484-9b34-4ec5-af97-f2b748a593f2` | 테스트용 시간표 |
| 팀 시간표 | `5ad4fad2-7b00-45e5-aa06-c3d42521792a` | 태스트 템플릿 |
| 팀 시간표 | `ec29cf40-d128-4e9b-b4e8-07c5930d3a47` | temp |

### 참조 코드와 전환 시 주의점

| 사용처 | 근거 | 현재 방식 |
| --- | --- | --- |
| 소비자 catalog | `src/utils/templates/consumer-template.ts:110` | DB URL 우선, 레거시는 `/thumbnail/${id}.png` fallback |
| 구매 내역 | `src/components/shop/PurchaseHistory.tsx:172` | `/thumbnail/${id}.png` 직접 생성 |
| 마이페이지 팀 | `src/app/(root)/my-page/page.tsx:491` | `/team-thumbnails/${id}.png` 직접 생성 |
| 시간표 가이드 | `src/components/tools/TimeTableDesignGuide.tsx:30` | `/thumbnail/${id}.png` 직접 생성 |
| 팀 시간표 가이드 | `src/components/tools/TeamTimeTableDesignGuide.tsx:30` | `/team-thumbnails/${id}.png` 직접 생성 |
| 관리자 썸네일 조회 API | `src/app/api/admin/templates/thumbnails/route.ts:25` | 로컬 파일 존재 확인 후 정적 URL 반환 |
| 기존 템플릿 관리 | `src/components/admin/TemplateManagement.tsx:407` | 생성 시 ID 기반 기본 URL |

가이드 표시는 `src/utils/time-table/data.ts`의 development 조건과 표시 설정을 따른다.
DB `thumbnail_url`만 변경해서는 위 모든 사용처가 전환되지 않는다. 공통 대표 이미지 resolver로
소비 경로를 연결하고 팀/구형 썸네일의 저장 계약도 정해야 한다. 검증 전 public 파일은 유지한다.

기존 `src/app/api/admin/templates/[id]/catalog-cover/route.ts`는 Studio 템플릿만 허용한다.
이를 레거시 대표 이미지 관리에 그대로 사용할 수는 없다. 또한 `src/lib/catalog-cover.ts`의
현재 업로드 제한은 10,000,000 bytes이며, 다음 2개 원본은 이를 초과한다.

| 파일 ID | 이름 | 크기 |
| --- | --- | ---: |
| `8f9bb89d-34f5-45c1-b923-16366197af33` | 동동님의 시간표 | 12,343,892 bytes |
| `c1f6bb18-d6c7-4319-b54e-b94d2be0f7dd` | 청하님의 시간표 | 12,395,150 bytes |

원본 유지와 웹용 최적화 버전 분리 또는 관리 업로드 제한 검토가 필요하다. 이번에는 재압축하지 않았다.

## 홈/아이콘/개발용/미사용 후보

### 홈 이미지 14개는 실제 사용 중

`src/app/(root)/page.tsx:393`에서 `_sample/TestComponent.tsx`를 렌더한다.
그 안의 `_components/_uneditable/TimeTableEditor.tsx`가 데스크톱/모바일 시간표를 표시하며
`_sample/_img/imgs.ts`의 이미지 8개를 사용한다.

- `_sample/_img/main`: `artist_Y2Kred`, `background_Y2Kred`, `memo_Y2Kred`, `offline_Y2Kred`,
  `online1_Y2Kred`, `online2_Y2Kred`, `profile_Y2Kred`, `topobject_Y2Kred` PNG 8개.
- `public/images/landing_bg.png`: SampleTimeTablePreview 및 MobileTimeTableView의 CSS 배경.
- `public/images/calendar.svg`: SampleTimeTablePreview의 달력.
- `public/landing/sample.png`: MobileTimeTableView의 모바일 예시.
- `public/landing/money.png`, `phone.png`, `calendar.png`: `KeyFeatures.tsx:14` 배열과
  `:90`의 동적 경로에서 사용. 홈페이지 `page.tsx:394`에서 해당 섹션을 렌더한다.

템플릿 ID를 임의 부여하기보다는 홈/공통 에셋으로 분류하는 것이 맞다.
달력 SVG는 현재 레거시 raster 이미지 업로드 계약과 다르므로 별도 취급해야 한다.

### 아이콘 13개

`public/icons`의 PNG 11개는 `public/manifest.json`에 연결돼 있고 `src/app/layout.tsx`에도
아이콘 metadata가 있다. `src/app/apple-icon.png`, `src/app/favicon.ico`는 파일 기반 metadata용이다.
템플릿 이미지 관리 화면의 대상과 구분하고, 기존 정적 경로 유지가 보수적인 선택이다.

### 개발용 16개

`time-table-tester/_img/main` 8개는 테스트 페이지에서 사용하며 홈 `_sample` 8개와
각각 SHA-256이 같다. 이름만 비슷한 것이 아니라 바이트가 동일하다.
`time-table/_template/_img/main` 8개는 내부 imgs.ts에서 연결되지만 외부 소비 경로는 찾지 못했다.
8개 모두 실제 템플릿 `39fc5668-36d2-4031-9ea5-6cae8b5f2cc6`의 대응 파일과 바이트가 같다.
개발 자료이므로 운영 에셋 이관 우선순위는 낮다. 동일 파일이라고 삭제하지 않는다.

### 미사용 후보 6개

`public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`, `public/images/calendar.png`.
현재 source와 public manifest의 정적 import/URL 및 CSS 경로 조사에서 참조를 찾지 못했다.
외부에서 정적 URL을 직접 사용하는 경우까지 부정하는 결과는 아니다.
특히 마지막 PNG는 실제 사용 중인 `public/images/calendar.svg`, `public/landing/calendar.png`와 다르다.

## 보류한 템플릿 3개

### 히오리님의 시간표

ID: `0c10c964-b83c-4309-a81b-76550aba17b0`. 실제 파일 7개.

- `_img/imgs.ts:4,12,13`이 없는 `board.png`, `week_dates.png`, `weekly_memo.png`를 import한다.
  세 변수는 현재 `Imgs` 객체에서 사용하지 않는다. 객체의 기존 7개 키는 모두 유효한 파일이다.
- `_components/_uneditable/TimeTableContent.tsx:57,59`의 메모/보드는 JSX가 주석 처리돼 있다.
  TimeTableGrid의 WeeklyMemoCard도 import만 남아 있고 렌더하지 않는다.
  따라서 잔여 컴포넌트의 `first.board`/`first.weekly_memo`를 현재 활성 렌더 오류로 설명하면 부정확하다.
- 최초 추가 `f337e9d7` (2026-09-13)부터 누락 import가 있었고 메모/보드 JSX는 이미 주석 상태였다.
  `9f13e637` (2026-09-15)에서 offline_frame과 기존 이미지를 갱신했지만 누락 3개는 추가하지 않았다.
  조사한 Git 전체 ref의 해당 누락 파일 경로 이력은 없다.
- 원래 체크아웃에도 세 파일이 없다. 저장소에서 별도 디자인 원본도 찾지 못했다.

**권장:** 미사용 누락 import 3개만 제거하고 기존 7개 키/레이아웃을 보존한 뒤 검증 및 이관한다.
원본 3개를 새로 받아야 하는 상황으로 보이지 않는다. 실제 수정은 이번 조사에서 하지 않았다.

### 아이 쿠먀먀님의 시간표

ID: `28c2b9fb-9d7e-4aaa-822d-96909d384032`. 실제 파일 16개 모두 존재.

- `_components/TimeTableGrid.tsx:31`에서 메모 컴포넌트를 렌더한다.
  `TimeTableWeeklyMemo.tsx:13`에서 메모 비표시 시 null, `:45`에서 없는 `first.weekly_memo`를 읽는다.
- 편집기의 TimeTableForm에는 `isMemo`를 전달하지 않는다. 공통 form의 `isMemo=false`
  (`src/components/TimeTable/TimeTableForm.tsx:70`)에 따라 메모 설정 UI가 비활성이다.
- 최초 추가 `9e40f93e` (2026-08-16)부터 이 참조와 비활성 메모 UI가 있었다.
  해당 템플릿의 `weekly_memo.png` Git 이력은 없으며 16개 원본 중 별도 메모 파일도 없다.

**권장:** 메모 기능을 제공하지 않는 현재 의도를 유지한다면 잔여 메모 JSX/import 제거를 검토한다.
저장 옵션에서 메모가 활성화되면 미정의 키에 도달할 수 있으므로 단순히 경고를 무시해 이관하지 않는다.
새 메모 디자인을 추가하는 경우에만 의도/원본 확인이 필요하다.

### 동동님의 시간표

ID: `8f9bb89d-34f5-45c1-b923-16366197af33`. 실제 파일 17개 모두 존재.

- `_components/_uneditable/TimeTableContent.tsx:49`에서 메모를 렌더하고,
  `TimeTableWeeklyMemo.tsx:15` 조건이 참일 때 `:45`에서 없는 `first.memo`를 읽는다.
- 이 편집기도 TimeTableForm에 `isMemo`를 전달하지 않아 메모 설정 UI가 비활성이다.
- 최초 추가 `7d6fc6ce` (2026-07-07)부터 같은 참조/키 누락이 있었다.
  이후 `47e6dfe9`, `429202da`, `70a96073` 수정에서도 memo 이미지가 추가되지 않았다.
  해당 경로의 `memo.png` Git 이력은 없다.
- 최초 commit 메시지는 "벨모아 템플릿 완성"이지만 현재 운영 부모 이름과 대표 이미지는 동동이다.
  복사된 메시지를 현재 템플릿 식별 근거로 사용하지 않는다.

**권장:** 현재 비활성 메모 기능의 잔여 JSX/import 정리를 검토한다. 아이 쿠먀먀와 마찬가지로
저장된 메모 옵션에 대한 검증이 필요하며, 임의의 다른 템플릿 이미지로 대체하지 않는다.

세 대표 이미지도 확인했으나 이미지 외형만으로 원래 기능 의도를 확정하지 않았다.
두 메모 참조는 조건부 경로이므로 모든 신규 방문에서 반드시 오류가 난다고 단정하지 않는다.
공통 state의 저장 옵션 복원과 초기화 흐름은 `src/hooks/useTimeTableState.ts:174,261`에 있다.

## 다음 구현 범위 제안

1. 템플릿 내부 이미지를 위한 기존 registry는 유지하고, 대표 썸네일 97개에 별도 관리 목적/URL 계약을 둔다.
   레거시 시간표, 팀 시간표, 구형 썸네일 catalog를 모두 지원하고 하드코딩 소비 경로를 함께 연결한다.
2. 홈 이미지 14개는 공통 에셋 목록으로 관리한다. 아이콘 13개와 개발 이미지 16개는 분리한다.
3. 보류 3개는 잔여 코드 최소 정리 후 키/레이아웃 보존, 메모 옵션, 실제 표시/PNG를 검증한 뒤 이관한다.
4. 미사용 후보 6개는 별도 삭제 결정 전까지 보존한다. R2 활성화와 원본 파일 삭제는 별도 승인 단계다.

## 검증 범위

146개 원본의 크기/SHA-256, 분류 합계, 운영 부모 97개 매칭, 홈/테스트 import 연결과 Git 경로 이력을
확인했다. 전체 템플릿의 브라우저 옵션/PNG 재검증이나 업로드/DB 변경을 이번 조사에서 실행하지 않았다.
